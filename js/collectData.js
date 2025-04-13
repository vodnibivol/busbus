import { randomUUID } from 'crypto';
import { UAParser } from 'ua-parser-js';
import fs from 'fs';
import dns from 'dns';
import TimeAgo from 'javascript-time-ago';

import DB from './db.js';
import { users as USERS } from './userscripts.js';

// --- DATA

const STATION_DATA = JSON.parse(fs.readFileSync('db/stations.json'));

import en from 'javascript-time-ago/locale/en';
TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('sl-SI');

// --- FUNCTIONS

export async function identifyUser(req, res, next) {
  if (!req.cookies.BUSBUS_USER_ID) {
    res.cookie('BUSBUS_USER_ID', randomUUID(), { maxAge: 31536000000 });
  } else {
    // user exists
    const { users } = await import(`./userscripts.js?update=${Date.now()}`);

    const existingUser = users.find((u) => u.ids.includes(req.cookies.BUSBUS_USER_ID));
    if (existingUser && existingUser.script) {
      req.userscript = existingUser.script;
    }
  }

  next();
}

export function collectData(req, res, next) {
  if (!req.query.log) return next();

  const userIdentifiers = {
    instanceId: req.cookies.BUSBUS_USER_ID,
    ip: req.ip,
    stopHistory: req.cookies.BUSBUS_STOP_HISTORY,
    userAgent: req.headers['user-agent'],
    resolution: req.cookies.SCREEN_RESOLUTION,
    APN: null,
  };

  const requestData = {
    instanceId: userIdentifiers.instanceId,
    ip: userIdentifiers.ip,
    stationCode: req.query.station_code,
    timestamp: new Date().valueOf(),
  };

  dns.reverse(req.ip, (err, domains) => {
    if (err) {
      console.error(err);
      // return;
    }

    if (domains.length) userIdentifiers.APN = domains.join('+');
    if (userIdentifiers.instanceId) {
      DB.requests.insert(requestData);
      DB.users.update({ instanceId: userIdentifiers.instanceId }, userIdentifiers, { upsert: true });
    }
  });

  next();
}

export async function getUserData() {
  // used in "/log/users"
  const users = await DB.users.findAsync({});

  return users.map((user) => {
    const uaData = UAParser(user.userAgent);

    const data = {
      userName: USERS.find((u) => u.ids.includes(user.instanceId))?.name || null,
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

export async function getRequestData() {
  // used in "/log/requests"
  const data = await DB.requests.findAsync({});

  const users = groupObjectsByValue(data, ['instanceId', 'ip']).map((requests, index) => {
    const existingUser = USERS.find((u) => u.ids.includes(requests[0].instanceId));

    return {
      name: existingUser?.name || 'USER-' + (index + 1),
      instances: [...new Set(requests.map((r) => r.instanceId))],
      ips: [...new Set(requests.map((r) => r.ip))],
      stations: countStops(requests.map((r) => r.stationCode)),
      lastRequest: Math.max(...requests.map((r) => r.timestamp)),
    };
  });

  return users
    .map((user) => {
      let text = '';
      text += user.name;
      text += '\n\n';

      text += user.instances.join('\n');
      text += '\n\n';

      text += user.ips.join('\n');
      text += '\n\n';

      text += Object.entries(user.stations)
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
    const stopName = STATION_DATA.find((s) => s.ref_id === cur)?.name;
    if (!stopName) return acc;

    acc[stopName] = (acc[stopName] || 0) + 1;
    return acc;
  }, {});

  return stops;
}

// --- request grouping

// function getUsers() {
//   const groups = groupObjectsByValue(data, ['instanceId', 'ip']).map((requests, index) => {
//     const existingUser = users.find((u) => u.ids.includes(requests[0].instanceId));

//     return {
//       user: existingUser?.name || 'USER-' + (index + 1),
//       instances: [...new Set(requests.map((r) => r.instanceId))],
//       ips: [...new Set(requests.map((r) => r.ip))],
//       stations: countStops(requests.map((r) => r.stationCode)),
//       lastRequest: Math.max(...requests.map((r) => r.timestamp)),
//     };
//   });
// }

function groupObjectsByValue(requests, keysToCompare) {
  const uf = new UnionFind();

  // Step 1: Union all values that appear together in the same request
  for (const req of requests) {
    for (let i = 0; i < keysToCompare.length; i++) {
      for (let j = i + 1; j < keysToCompare.length; j++) {
        uf.union(req[keysToCompare[i]], req[keysToCompare[j]]);
      }
    }
  }

  // Step 2: Assign each request to a group ID based on any of its values
  const groups = new Map();
  for (const req of requests) {
    const groupKey = uf.find(req[keysToCompare[0]]); // You could also hash all keys
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
