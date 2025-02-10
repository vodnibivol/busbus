import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import compression from 'compression';
import bodyParser from 'body-parser';
import 'dotenv/config';

import Datastore from '@seald-io/nedb';

import Store from './js/Store_node.js';
const dstore = new Store();

const app = express();

const PORT = process.env.PORT || 2200;
const API_KEY = process.env.API_KEY;

app.listen(PORT, () => console.log('http://localhost:' + PORT + '/'));

app.use(compression());
app.use('/public/', express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- DATA

const ROUTES = JSON.parse(fs.readFileSync('db/routes.json'));
const STATIONS = JSON.parse(fs.readFileSync('db/station_locations.json'));

const DB = {
  drivers: new Datastore({ filename: 'db/drivers.db', autoload: true, timestampData: true }),
  buses: new Datastore({ filename: 'db/buses.db', autoload: true, timestampData: true }),
};

// --- ROUTES

app.get('/', (req, res) => {
  return res.render('iskanje');
});

app.get('/zemljevid', (req, res) => {
  const station_loc = STATIONS[req.query.station_code];

  res.render('zemljevid', { station_loc });
});

app.get('/objavi', async (req, res) => {
  const { bus_id, driver_id } = req.query;
  console.log(req.query);

  const db_driver_data = (await DB.drivers.findOneAsync({ driver_id })) || {};
  const db_bus_data = (await DB.buses.findOneAsync({ bus_id })) || {};

  // if (!bus_id && !driver_id) {
  //   return res.redirect('/');
  // }

  res.render('objavi', {
    bus_id,
    driver_id,
    bus_description: db_bus_data.bus_description,
    driver_description: db_driver_data.driver_description,
    driver_nickname: db_driver_data.driver_nickname,
    driver_rating: db_driver_data.driver_rating,
  });
});

app.post('/objavi', async (req, res) => {
  const { bus_id, bus_description, driver_id, driver_description, driver_nickname, driver_rating, author } = req.body;
  console.log('+' + bus_id + '+');

  // update bus data
  if (bus_description) {
    const res1 = await DB.buses.updateAsync({ bus_id }, { bus_id, bus_description, author }, { upsert: true });
  }

  // update driver data
  if (driver_description || driver_nickname || driver_rating) {
    const res2 = await DB.drivers.updateAsync(
      { driver_id },
      { driver_id, driver_description, driver_nickname, driver_rating, author },
      { upsert: true }
    );
  }

  res.redirect(req.query.from_url);
});

// --- API

app.get('/api/arrival', async (req, res) => {
  const data = await fetchLPP('https://data.lpp.si/api/station/arrival?station-code=' + req.query.station_code, 3000);

  // const formatted = {
  //   '3B': [
  //     {
  //       eta_min: 3,
  //       time: '22:14', // izračunaj
  //       v_garazo: true,
  //       trip_id: '12381adasy982e198ad', // za open-map
  //     },
  //   ],
  // };

  // console.log(data);

  const dataFormatted = data.data.arrivals.reduce((acc, cur) => {
    const name = cur.route_name;
    acc[name] = acc[name] || [];
    acc[name].push({
      key: cur.route_name,
      minutes: cur.eta_min,
      time: timeAfterMinutes(cur.eta_min),
      v_garazo: !!cur.depot,
      trip_id: cur.trip_id,
      // route_id: cur.route_id,
    });

    return acc;
  }, {});

  res.json(Object.values(dataFormatted));
});

// --- zemljevid

app.get('/api/route-shape/', async (req, res) => {
  const trip_id = req.query.trip_id;
  const route_id = routeIdFromTripId(trip_id);

  // get shape
  const data = await fetchLPP('https://data.lpp.si/api/route/routes?shape=1&route_id=' + route_id);

  if (data.success) {
    const trip = data.data.find((r) => r.trip_id === trip_id);
    res.json(trip);
  } else {
    res.status(400).json({ success: false });
  }
});

app.get('/api/bus/buses-on-route/', async (req, res) => {
  const trip_id = req.query.trip_id;
  const route_name = ROUTES.find((r) => r.trip_id === trip_id)?.route_number;

  // get bus data
  const data = await fetchLPP('https://data.lpp.si/api/bus/buses-on-route?specific=1&route-group-number=' + route_name);

  if (data.success) {
    const tripBuses = data.data.filter((bus) => bus.trip_id === trip_id);
    res.json(tripBuses);
  } else {
    res.status(400).json({ success: false });
  }
});

app.get('/api/bus/bus-details/', async (req, res) => {
  const bus_id = req.query.bus_id;

  const data = await fetchLPP('https://data.lpp.si/api/bus/bus-details?&bus-id=' + bus_id);

  // pridobi svoje podatke in jih zzdruži z ibzbranini podatki lpp.

  if (data.success) {
    const d = data.data?.[0] || {};

    console.log(d);

    const db_driver_data = (await DB.drivers.findOneAsync({ driver_id: d.driver_id })) || {};
    const db_bus_data = (await DB.buses.findOneAsync({ bus_id: d.bus_unit_id })) || {};

    const response_data = {
      bus_unit_id: d.bus_unit_id,
      bus_name: d.name,
      odo: d.odo,
      driver_id: d.driver_id,

      bus_description: db_bus_data.bus_description,
      driver_description: db_driver_data.driver_description,
      driver_nickname: db_driver_data.driver_nickname,
      driver_rating: db_driver_data.driver_rating,
    };

    console.log(db_bus_data);
    console.log(response_data);

    res.json(response_data);
  } else {
    res.status(400).json({ success: false });
  }
});

// --- ERRORS

app.use((req, res, next) => {
  res.status(404).end('error 404');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.end('internal server error\n\n---\n' + err);
});

// --- UTILS

async function cachedFetch(url, cacheTime) {
  try {
    let data = dstore.get(url);
    if (!data) {
      const r = await fetch(url);
      data = await r.json();
      dstore.set(url, data, cacheTime);
    }
    return data;
  } catch (error) {
    return 'ERROR';
  }
}

function timeAfterMinutes(minutes) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);

  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');

  return `${hours}:${mins}`;
}

function routeIdFromTripId(trip_id) {
  return ROUTES.find((r) => r.trip_id === trip_id)?.route_id;
}

async function fetchLPP(url) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
      'User-Agent': 'travana/4 CFNetwork/1568.300.101 Darwin/24.2.0',
    },
  });

  return response.json();
}
