import express from 'express';
import DB from '../js/db.js';

import { identifyUser, getRequestDataString, getUserData } from '../js/collectData.js';

const router = express.Router();

// --- routes

router.get('/requests', identifyUser, async (req, res) => {
  if (req.user?.name !== 'filip') {
    return res.status(401).render('error', { msg: 'ERROR 401: UNAUTHORIZED ACCESS' });
  }

  const data = await getRequestDataString();
  res.send('<pre>' + data + '</pre>');
});

router.get('/users', async (req, res) => {
  const data = await getUserData();
  res.render('log-users', { data: { users: data } });
});

router.get('/objave', identifyUser, async (req, res) => {
  if (req.user?.name !== 'filip') {
    return res.status(401).render('error', { msg: 'ERROR 401: UNAUTHORIZED ACCESS' });
  }

  const db_bus_data = await DB.buses.findAsync({});
  const db_driver_data = await DB.drivers.findAsync({});

  res.render('log-objave', { data: { buses: db_bus_data, drivers: db_driver_data } });
});

// --- exports

export default router;
