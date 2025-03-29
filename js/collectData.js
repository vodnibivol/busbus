import { randomUUID } from 'crypto';
import DB from './db.js';
import { users } from './userscripts.js';
import { UAParser } from 'ua-parser-js';
import fs from 'fs';
import dns from 'dns';

const STATION_DATA = JSON.parse(fs.readFileSync('db/stations.json'));

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
  const userIdentifiers = {
    userId: req.cookies.BUSBUS_USER_ID,
    ip: req.ip,
    stopHistory: req.cookies.BUSBUS_STOP_HISTORY,
    userAgent: req.headers['user-agent'],
    APN: null,
  };

  dns.reverse(req.ip, (err, domains) => {
    if (err) {
      console.error(err);
      return;
    }

    if (domains.length) userIdentifiers.APN = domains.join('+');
    if (userIdentifiers.userId) {
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
  };

  return data;
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
