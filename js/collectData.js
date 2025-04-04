import { randomUUID } from 'crypto';
import DB from './db.js';
import { users } from './userscripts.js';
import { UAParser } from 'ua-parser-js';
import fs from 'fs';
import dns from 'dns';
import TimeAgo from 'javascript-time-ago';

// --- DATA

const STATION_DATA = JSON.parse(fs.readFileSync('db/stations.json'));
import en from 'javascript-time-ago/locale/en';
TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo('sl-SI');

// --- FUNCTIONS

export function identifyUser(req, res, next) {
  if (!req.cookies.BUSBUS_USER_ID) {
    res.cookie('BUSBUS_USER_ID', randomUUID(), { maxAge: 31536000000 });
  } else {
    // user exists
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
    userId: req.cookies.BUSBUS_USER_ID,
    ip: req.ip,
    stopHistory: req.cookies.BUSBUS_STOP_HISTORY,
    userAgent: req.headers['user-agent'],
    resolution: req.cookies.SCREEN_RESOLUTION,
    APN: null,
  };

  const requestData = {
    userId: userIdentifiers.userId,
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
    if (userIdentifiers.userId) {
      DB.requests.insert(requestData);
      DB.users.update({ userId: userIdentifiers.userId }, userIdentifiers, { upsert: true });
    }
  });

  next();
}

// --- helpers

export function parseUserData(dbEntry) {
  const uaData = UAParser(dbEntry.userAgent);

  const data = {
    userName: users.find((u) => u.ids.includes(dbEntry.userId))?.name || null,
    userId: dbEntry.userId || null,
    ip: dbEntry.ip || null,
    stopHistory: JSON.stringify(countStops(dbEntry.stopHistory) || null),
    // userAgent: dbEntry.userAgent || null,
    userAgentData: uaData
      ? `${uaData.device.model} (${uaData.os.name} ${uaData.os.version}; ${uaData.browser.name})`
      : null, // ${uaData.device.vendor}
    apn: dbEntry.APN || null,
    resolution: dbEntry.resolution || null,
  };

  return data;
}

export function parseReqData(data) {
  const instances = {};

  for (let req of data) {
    const instanceId = req.userId;
    instances[instanceId] = instances[instanceId] || { ips: [], stations: [], lastRequest: [] };
    instances[instanceId].ips.push(req.ip);
    instances[instanceId].stations.push(req.stationCode);
    instances[instanceId].lastRequest.push(req.timestamp);
  }
  
  
  for (let instanceId in instances) {
    instances[instanceId].ips = [...new Set(instances[instanceId].ips)]; // remove duplicates
    instances[instanceId].stations = countStops(instances[instanceId].stations.join(','));
    instances[instanceId].lastRequest = Math.max(...instances[instanceId].lastRequest);
  }

  let text = '';
  for (let instanceId in instances) {
    text += instanceId;
    text += '\n\n';

    text += instances[instanceId].ips.join('\n');
    text += '\n\n';

    text += Object.entries(instances[instanceId].stations)
      .sort((a, b) => b[1] - a[1])
      .map((e) => `${e[1]}x ${e[0]}`)
      .join('\n');
    text += '\n\n';

    text += timeAgo.format(instances[instanceId].lastRequest);
    text += '\n\n------------------------------------\n\n';
  }

  return text;
}

function countStops(stopHistory) {
  // stopHistory: "802011,802011,802011,..."
  const stops = stopHistory?.split(',').reduce((acc, cur) => {
    const stopName = STATION_DATA.find((s) => s.ref_id === cur)?.name;
    acc[stopName] = acc[stopName] || 0;
    acc[stopName]++;
    return acc;
  }, {});

  return stops;
}
