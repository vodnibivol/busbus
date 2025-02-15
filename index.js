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
let BUS_DATA = []; // bus data with driver ids; has to be updated whenever /zemljevid or / is launched

const DB = {
  drivers: new Datastore({ filename: 'db/drivers.db', autoload: true, timestampData: true }),
  buses: new Datastore({ filename: 'db/buses.db', autoload: true, timestampData: true }),
};

async function refreshBusData() {
  const lpp_data = await fetchLPP('https://data.lpp.si/api/bus/bus-details', 1000 * 60 * 5);
  const db_bus_data = await DB.buses.findAsync({});
  const db_driver_data = await DB.drivers.findAsync({});

  BUS_DATA = lpp_data.data.map((bus_entry) => {
    const db_driver = db_driver_data.find((d) => d.driver_id === bus_entry.driver_id) || {};
    const db_bus = db_bus_data.find((d) => d.bus_id === bus_entry.bus_unit_id) || {};
    const user_edited = ['driver_description', 'driver_nickname', 'driver_rating', 'bus_description'].some(
      (key) => !!{ ...db_driver, ...db_bus }[key]
    );

    return {
      bus_unit_id: bus_entry.bus_unit_id,
      bus_name: bus_entry.bus_name,
      // odo: bus_entry.odo,
      driver_id: bus_entry.driver_id,

      driver_nickname: db_driver.driver_nickname,
      driver_rating: db_driver.driver_rating,
      driver_description: db_driver.driver_description,

      bus_description: db_bus.bus_description,

      user_edited,
    };
  });
}

refreshBusData();

// --- ROUTES

app.get('/', (req, res) => {
  refreshBusData();
  return res.render('iskanje');
});

app.get('/zemljevid', (req, res) => {
  const station_loc = STATIONS[req.query.station_code];

  res.render('zemljevid', { station_loc });
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

app.post('/objavi', async (req, res) => {
  const { bus_id, bus_description, driver_id, driver_description, driver_nickname, driver_rating, author } = req.body;
  // console.log(req.body);

  // update bus & driver data
  await DB.buses.updateAsync({ bus_id }, { bus_id, bus_description, author }, { upsert: true });
  await DB.drivers.updateAsync(
    { driver_id },
    { driver_id, driver_description, driver_nickname, driver_rating, author },
    { upsert: true }
  );

  await refreshBusData();
  res.redirect(req.query.from_url);
});

app.get('/log', async (req, res) => {
  const db_bus_data = await DB.buses.findAsync({});
  const db_driver_data = await DB.drivers.findAsync({});

  res.render('log', { data: { buses: db_bus_data, drivers: db_driver_data } });
});

// --- API

app.get('/api/arrival', async (req, res) => {
  const data = await fetchLPP('https://data.lpp.si/api/station/arrival?station-code=' + req.query.station_code, 1000);

  const dataFormatted = data.data.arrivals.reduce((acc, cur) => {
    acc[cur.route_name] = acc[cur.route_name] || [];
    acc[cur.route_name].push({
      key: cur.route_name,
      trip_id: cur.trip_id,
      minutes: cur.eta_min,
      time: timeAfterMinutes(cur.eta_min),
      v_garazo: !!cur.depot,
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
  const data = await fetchLPP('https://data.lpp.si/api/route/routes?shape=1&route_id=' + route_id, 1000 * 3600 * 24);

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
  const bus_data = await fetchLPP(
    'https://data.lpp.si/api/bus/buses-on-route?specific=1&route-group-number=' + route_name,
    1000 * 3
  );

  if (bus_data.success) {
    const tripBuses = bus_data.data
      .filter((bus) => bus.trip_id === trip_id)
      .map((bus) => {
        // združi s podatki iz serverja
        const cachedData = BUS_DATA.find((b) => b.bus_unit_id === bus.bus_unit_id);
        const bus_data_age = Math.round((new Date() - new Date(bus.bus_timestamp)) / 1000);
        return { ...cachedData, ...bus, bus_data_age };
      });

    res.json(tripBuses);
  } else {
    res.status(400).json({ success: false });
  }
});

// --- ERRORS

app.get('/busbus', (req, res) => {
  if (req.hostname === 'localhost') res.redirect('/');
});

app.use((req, res, next) => {
  res.status(404).end('error 404');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.end('internal server error\n\n---\n' + err);
});

// --- UTILS

function timeAfterMinutes(minutes) {
  const time = new Date();
  time.setMinutes(time.getMinutes() + minutes);

  const hours = String(time.getHours()).padStart(2, '0');
  const mins = String(time.getMinutes()).padStart(2, '0');

  return `${hours}:${mins}`;
}

function routeIdFromTripId(trip_id) {
  return ROUTES.find((r) => r.trip_id === trip_id)?.route_id;
}

async function cachedFetch(url, options, cacheTime) {
  try {
    let data = dstore.get(url);
    if (!data) {
      const r = await fetch(url, options);
      data = await r.json();
      dstore.set(url, data, cacheTime);
    }
    return data;
  } catch (error) {
    return 'ERROR';
  }
}

async function fetchLPP(url, cacheTime = 0) {
  const options = {
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
      'User-Agent': 'travana/4 CFNetwork/1568.300.101 Darwin/24.2.0',
    },
  };

  const response = await cachedFetch(url, options, cacheTime);
  return response; // return response.json();
}
