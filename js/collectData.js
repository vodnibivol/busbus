import { randomUUID } from 'crypto';
import Datastore from '@seald-io/nedb';

const DB = {
  users: new Datastore({ filename: 'db/users.db', autoload: true, timestampData: true }),
};

export function identifyUser(req, res, next) {
  const userIdentifiers = {
    userId: req.cookies.BUSBUS_USER_ID,
    ip: req.ip,
    stopHistory: req.cookies.BUSBUS_STOP_HISTORY,
    userAgent: req.headers['user-agent'],
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
