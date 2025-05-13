import { randomUUID, createHash } from 'crypto';
import { UAParser } from 'ua-parser-js';
import fs from 'fs';
// import dns from 'dns';
import TimeAgo from 'javascript-time-ago';

import DB from './db.js';
import { userscripts } from './userscripts.js';
const STATION_DATA = JSON.parse(fs.readFileSync('db/stations.json'));

import en from 'javascript-time-ago/locale/en';
TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('sl-SI');

const INSTANCE_ID_COOKIE = 'BUSBUS_USER_ID';

// --- FUNCTIONS

export async function identifyUser(req, res, next) {
  const instanceId = req.cookies[INSTANCE_ID_COOKIE] || randomUUID();
  res.cookie(INSTANCE_ID_COOKIE, instanceId, { maxAge: 31536000000 });

  const user = await getUser(instanceId);
  req.user = user;

  next();
}

export async function collectData(req, res, next) {
  if (!req.query.log) return next();

  const userIdentifiers = {
    instanceId: req.cookies[INSTANCE_ID_COOKIE],
    ip: req.ip,
    stopHistory: req.cookies.BUSBUS_STOP_HISTORY,
    userAgent: req.headers['user-agent'],
    resolution: req.cookies.SCREEN_RESOLUTION,
    deviceFingerprint: req.cookies.DEVICE_FINGERPRINT,
    APN: null,
  };

  const requestData = {
    instanceId: req.cookies[INSTANCE_ID_COOKIE],
    ip: req.ip,
    stationCode: req.query.station_code,
    deviceFingerprint: req.cookies.DEVICE_FINGERPRINT,
    timestamp: new Date().valueOf(),
  };

  if (userIdentifiers.instanceId) {
    DB.requests.insert(requestData);
    DB.users.update({ instanceId: userIdentifiers.instanceId }, userIdentifiers, { upsert: true });
  }

  const username = ((await getUser(userIdentifiers.instanceId))?.name || 'someone')?.toUpperCase();
  const stopName = getStopName(requestData.stationCode);
  const time = new Date(requestData.timestamp).toTimeString().match(/\d+:\d+/)[0];
  if (username) {
    fetch('https://ntfy.sh/busbus-admin-log', {
      method: 'POST',
      body: `${username}: ${stopName} (${time})`,
      headers: {
        Title: 'New Search',
      },
    });
  }

  next();
}

export async function getUserData() {
  // used in "/log/users"
  const users = await DB.users.findAsync({});

  return users.map((user) => {
    const uaData = UAParser(user.userAgent);

    const data = {
      userName: userscripts.find((u) => u.ids.includes(user.instanceId))?.name || null,
      instanceId: user.instanceId || null,
      ip: user.ip || null,
      stopHistory: JSON.stringify(countStops(user.stopHistory?.split(',')) || null),
      // userAgent: user.userAgent || null,
      userAgentData: uaData
        ? `${uaData.device.model} (${uaData.os.name} ${uaData.os.version}; ${uaData.browser.name})`
        : null, // ${uaData.device.vendor}
      apn: user.APN || null,
      resolution: user.resolution || null,
    };

    return data;
  });
}

export async function getRequestDataString() {
  // used in "/log/requests"

  const users = await getUsers();
  // return JSON.stringify(users, null, 2);

  return users
    .map((user) => {
      let text = '';
      text += user.name;
      text += '\n\n';

      text += user.deviceFingerprint.map((s) => trimString(s, 36)).join('\n');
      text += '\n\n';

      text += user.instances.join('\n');
      text += '\n\n';

      text += user.ips.join('\n');
      text += '\n\n';

      text += Object.entries(user.stationHistoryCounted)
        .sort((a, b) => b[1] - a[1])
        .map((e) => `${e[1]}x ${e[0]}`)
        .join('\n');
      text += '\n\n';

      text += timeAgo.format(user.lastRequest);
      return text;
    })
    .join('\n\n------------------------------------\n\n');
}

function countStops(stopHistory = []) {
  const stops = stopHistory.reduce((acc, cur) => {
    const stopName = getStopName(cur);
    if (!stopName) return acc;

    acc[stopName] = (acc[stopName] || 0) + 1;
    return acc;
  }, {});

  return stops;
}

function getStopName(stopId) {
  return STATION_DATA.find((s) => s.ref_id === stopId)?.name;
}

// --- request grouping

async function getUser(instanceId) {
  const users = await getUsers();
  const user = users.find((u) => u.instances.includes(instanceId)) || null;
  return user;
}

async function getUsers() {
  // used in: "request data string"; "identify user"
  const requestData = await DB.requests.findAsync({});

  requestData.forEach((r) => {
    r.username = userscripts.find((u) => u.ids.includes(r.instanceId))?.name;
  });

  // console.log(requestData);

  const users = groupObjectsByValue(requestData, ['instanceId', 'username'])
    .map((requests) => {
      const oldestRequest = requests.reduce((acc, cur) => (acc.timestamp > cur.timestamp ? cur : acc));

      return {
        name: requests[0].username || 'NEW USER',
        deviceFingerprint: [...new Set(requests.map((r) => r.deviceFingerprint))].filter((v) => !!v),
        instances: [...new Set(requests.map((r) => r.instanceId))],
        ips: [...new Set(requests.map((r) => r.ip))],
        stationHistoryCookie: requests
          .sort((a, b) => b.timestamp - a.timestamp)
          .map((r) => r.stationCode)
          .join(','),
        stationHistoryCounted: countStops(requests.map((r) => r.stationCode)),
        lastRequest: Math.max(...requests.map((r) => r.timestamp)),
        firstRequest: oldestRequest.timestamp,
      };
    })
    .sort((a, b) => a.firstRequest - b.firstRequest);

  return users;
}

function groupObjectsByValue(requests, keysToCompare) {
  const uf = new UnionFind();

  // Step 1: Union all values that appear together in the same request
  for (const req of requests) {
    const values = keysToCompare.map((key) => req[key]).filter((v) => v !== undefined);
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        uf.union(values[i], values[j]);
      }
    }
  }

  // Step 2: Assign each request to a group ID based on any of its values
  const groups = new Map();
  for (const req of requests) {
    const validKey = keysToCompare.map((k) => req[k]).find((v) => v !== undefined);
    if (validKey === undefined) {
      continue;
    }
    const groupKey = uf.find(validKey);
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(req);
  }

  return [...groups.values()];
}

class UnionFind {
  constructor() {
    this.parent = new Map();
  }

  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)));
    }
    return this.parent.get(x);
  }

  union(x, y) {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) this.parent.set(rootY, rootX);
  }
}

// --- utils

function trimString(str, maxLength) {
  try {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 8) + '..' + str.slice(str.length - 6);
  } catch (error) {
    return null;
  }
}
