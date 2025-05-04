import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import compression from 'compression';
import bodyParser from 'body-parser';
import 'dotenv/config';
import path from 'path';
import cookieParser from 'cookie-parser';

import { identifyUser } from './js/collectData.js';
import DB from './js/db.js';
import Store from './js/Store_node.js';
const dstore = new Store();

const app = express();

const PORT = process.env.PORT || 2200;
const API_KEY = process.env.API_KEY;

app.listen(PORT, () => console.log('server running on: http://localhost:' + PORT + '/'));

app.use(compression());
app.use('/public/', express.static('public'));
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// --- DATA

const STATIONS = JSON.parse(fs.readFileSync('db/station_locations.json'));

// --- ROUTES

import apiRoutes from './routes/api.js';
import logRoutes from './routes/log.js';

app.use('/api', apiRoutes);
app.use('/log', logRoutes);

app.get('/', identifyUser, (req, res) => {
  if (req.user) res.cookie('BUSBUS_STOP_HISTORY', req.user.stationHistoryCookie, { maxAge: 31536000000 });

  return res.render('iskanje', { userscript: res.userscript });
});

app.get('/zemljevid', async (req, res) => {
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

app.get('/bus', async (req, res) => {
  const lpp_bus_data = await fetchLPP('https://data.lpp.si/api/bus/bus-details?trip-info=1', 1000 * 60 * 10);
  const active_buses = lpp_bus_data.data.filter((bus) => bus.trip_id && bus.ignition_value);
  res.render('bus-iskanje', { active_buses });
});

app.get('/objavi', async (req, res) => {
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

// TODO: move to /api
app.post('/objavi', async (req, res) => {
  const { bus_id, bus_description, driver_id, driver_description, driver_nickname, driver_rating, author } = req.body;

  // update bus & driver data
  await DB.buses.updateAsync({ bus_id }, { bus_id, bus_description, author }, { upsert: true });
  await DB.drivers.updateAsync(
    { driver_id },
    { driver_id, driver_description, driver_nickname, driver_rating, author },
    { upsert: true }
  );

  res.redirect(req.query.from_url);
});

app.get('/sendmsg', identifyUser, async (req, res) => {
  const messages = await DB.messages.findAsync({});

  res.render('send-msg', { messages });
});

app.get('/test', (req, res) => {
  res.render('test');
});

// --- SW

app.get('/sw.js', (req, res) => {
  res.sendFile(path.resolve('sw.js'));
});

// --- ERRORS

app.get('/busbus', (req, res) => {
  if (/localhost|192|172/.test(req.hostname)) res.redirect('/');
});

app.use((req, res, next) => {
  res.status(404).render('error', { msg: 'ERROR 404: NOT FOUND' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.end('internal server error\n\n---\n' + err);
});

// --- UTILS

// function timeAfterMinutes(minutes) {
//   const time = new Date();
//   time.setMinutes(time.getMinutes() + minutes);

//   const hours = String(time.getHours()).padStart(2, '0');
//   const mins = String(time.getMinutes()).padStart(2, '0');

//   return `${hours}:${mins}`;
// }

// function routeIdFromTripId(trip_id) {
//   return ROUTES.find((r) => r.trip_id === trip_id)?.route_id;
// }

// async function tripIdFromBusName(bus_name) {
//   const lpp_bus_data = await fetchLPP('https://data.lpp.si/api/bus/bus-details?trip-info=1', 1000 * 60 * 15); // 10 minutes
//   const bus = lpp_bus_data.data.find((bus) => bus.name === bus_name);
//   return bus?.trip_id;
// }

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
