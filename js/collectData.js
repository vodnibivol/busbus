import { randomUUID } from 'crypto';
import DB from './db.js';
import DeviceDetector from 'node-device-detector';
// import ClientHints from 'node-device-detector/client-hints.js';
import fs from 'fs';

const STATION_DATA = JSON.parse(fs.readFileSync('db/stations.json'));

export function identifyUser(req, res, next) {
  const userIdentifiers = {
    userId: req.cookies.BUSBUS_USER_ID,
    // ip: req.ip,
    // stopHistory: req.cookies.BUSBUS_STOP_HISTORY,
    // userAgent: req.headers['user-agent'],
  };

  if (!userIdentifiers.userId) {
    res.cookie('BUSBUS_USER_ID', randomUUID(), { maxAge: 31536000000 });
  }

  next();
}

export async function collectData(req, res, next) {
  const userIdentifiers = {
    userId: req.cookies.BUSBUS_USER_ID,
    ip: req.ip,
    stopHistory: req.cookies.BUSBUS_STOP_HISTORY,
    userAgent: req.headers['user-agent'],
  };

  if (userIdentifiers.userId) {
    await DB.users.updateAsync({ userId: userIdentifiers.userId }, userIdentifiers, { upsert: true });
  }

  next();
}

// --- helpers

export function parseUserData(dbEntry) {
  const userData = dbEntry.userAgent && new DeviceDetector().detect(dbEntry.userAgent);

  return {
    userId: dbEntry.userId,
    ip: dbEntry.ip,
    stopHistory: countStops(dbEntry.stopHistory),
    userData: userData && {
      os: `${userData.os.name} v${userData.os.version}`,
      client: `${userData.client.name} v${userData.client.version}`,
      device: `${userData.device.brand} ${userData.device.model}`.trimEnd(),
    },
  };
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
