import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';

import { identifyUser } from '../js/collectData.js';
import DB from '../js/db.js';
import Store from '../js/Store_node.js';
const dstore = new Store();

// --- DATA

const STATIONS = JSON.parse(fs.readFileSync('db/station_locations.json'));
const API_KEY = process.env.API_KEY;

// --- ROUTES

const router = express.Router();

router.get('/', identifyUser, (req, res) => {
  if (req.user) res.cookie('BUSBUS_STOP_HISTORY', req.user.stationHistoryCookie, { maxAge: 31536000000 });

  return res.render('iskanje', { userscript: res.userscript });
});

router.get('/zemljevid', async (req, res) => {
  // IF: BUS_NAME
  if (req.query.bus_name) {
    const lpp_bus_data = await fetchLPP('https://data.lpp.si/api/bus/bus-details?trip-info=1', 1000 * 3);
    const bus = lpp_bus_data.data.find((b) => b.name === req.query.bus_name);
    if (!bus) return res.redirect('bus');
  }

  // ELSE: NORMAL ZEMLJEVID
  const station_loc = STATIONS[req.query.station_code];
  res.render('zemljevid', { station_loc });
});

router.get('/bus', async (req, res) => {
  const lpp_bus_data = await fetchLPP('https://data.lpp.si/api/bus/bus-details?trip-info=1', 1000 * 60 * 10);
  const active_buses = lpp_bus_data.data.filter((bus) => bus.trip_id && bus.ignition_value);
  res.render('bus-iskanje', { active_buses });
});

router.get('/objavi', async (req, res) => {
  const { bus_id, driver_id, from_url } = req.query;

  const db_driver_data = (await DB.drivers.findOneAsync({ driver_id })) || {};
  const db_bus_data = (await DB.buses.findOneAsync({ bus_id })) || {};

  res.render('objavi', {
    from_url,
    bus_id,
    driver_id,
    bus_description: db_bus_data.bus_description,
    driver_description: db_driver_data.driver_description,
    driver_nickname: db_driver_data.driver_nickname,
    driver_rating: db_driver_data.driver_rating,
  });
});

router.get('/sendmsg', identifyUser, async (req, res) => {
  const messages = await DB.messages.findAsync({});

  res.render('send-msg', { messages });
});

router.get('/test', (req, res) => {
  res.render('test');
});

// --- UTILS

async function cachedFetch(url, options, maxAge) {
  try {
    let data = dstore.get(url, maxAge);
    if (!data) {
      const r = await fetch(url, options);
      data = await r.json();
      dstore.set(url, data);
    }
    return data;
  } catch (error) {
    return 'CACHED FETCH ERROR';
  }
}

async function fetchLPP(url, maxAge = 0) {
  const options = {
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
      'User-Agent': 'travana/4 CFNetwork/1568.300.101 Darwin/24.2.0',
    },
  };

  const response = await cachedFetch(url, options, maxAge);
  return response; // return response.json();
}

// --- EXPORT

export default router;
