import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
// import cors from 'cors';
import compression from 'compression';
// import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import 'dotenv/config';

import Store from './js/Store_node.js';
const dstore = new Store();

const app = express();

const PORT = process.env.PORT || 2200;
const API_KEY = process.env.API_KEY;

app.listen(PORT, () => console.log('http://localhost:' + PORT + '/'));

// --- SUBPATH REROUTE

const SUBPATH = '/busbus';
app.use(SUBPATH, (req, res, next) => {
  req.url = req.url.replace(SUBPATH, '');
  next();
});

app.use(compression());
app.use('/static/', express.static('static'));
app.set('view engine', 'ejs');
// app.use(cors());
// app.use(cookieParser());
app.use(bodyParser.json());

// --- DATA

const ROUTES = JSON.parse(fs.readFileSync('db/routes.json'));

// --- ROUTES

app.get('/', (req, res) => {
  return res.render('iskanje');
});

app.get('/zemljevid', (req, res) => {
  // /zemljevid?linija=3&center=1 // &postaja=303001
  // if (!req.query.route) return res.redirect('/');

  res.render('zemljevid');
});

// --- API

app.get('/api/arrival/:stopId', async (req, res) => {
  const data = await cachedFetch('https://data.lpp.si/api/station/arrival?station-code=' + req.params.stopId, 3000);

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

  const data = await fetchLPP('https://data.lpp.si/api/bus/bus-details?trip-info=1&bus-id=' + bus_id);

  if (data.success) {
    res.json(data.data?.[0]);
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
