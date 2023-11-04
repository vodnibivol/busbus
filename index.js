import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';

import Store from './js/Store_node.js';
const dstore = new Store();

const app = express();

const PORT = process.env.PORT || 2200;

app.listen(PORT, () => console.log('::' + PORT));

app.use(compression());
app.use('/static', express.static('public'));
app.set('view engine', 'ejs');
app.use(cors());

// --- DATA

const STOPS = JSON.parse(fs.readFileSync(path.resolve('db', 'stops.json')));
const TRIPS = JSON.parse(fs.readFileSync(path.resolve('db', 'trips_ascii.json')));
const tripFileIndex = JSON.parse(fs.readFileSync(path.resolve('db', 'trips', 'index.json')));

// for each trip: get coordinates
for (let trip of TRIPS) {
  // find trip id in
  const coordsFilename = tripFileIndex.find((entry) => entry.trip_id === trip.trip_id)?.filename;
  if (coordsFilename) {
    trip.coordinates = JSON.parse(fs.readFileSync(path.resolve('db', 'trips', coordsFilename)));
  }
}

// --- ROUTES

app.get('/', (req, res) => {
  res.render('form');
});

app.get('/206', (req, res) => {
  res.render('206');
});

app.get('/getBus/:plateNum', (req, res) => {
  res.render('getBus', { plateNum: req.params.plateNum });
});

app.get('/map', (req, res) => {
  // /map?route=11&stop=303001
  if (!req.query.route) return res.redirect('/');

  // get STOP DATA
  const stopId = req.query.stop;
  const stopData = stopId ? STOPS.find((p) => p.ref_id === stopId) : null;

  // get TRIP DATA
  const routeNumbers = req.query.route.split(','); // ["2", "9"]

  const tripsData = TRIPS.filter((t) => routeNumbers.includes(t.number));

  res.render('map', { tripsData, stopData });
});

// --- API

app.get('/api/getBusData/:routeNo', async (req, res) => {
  const data = await cachedFetch('https://bus-ljubljana.eu/app/busDetails?n=' + req.params.routeNo, 3000);
  const tripId = req.query.trip; // TODO: rename to TRIP
  if (tripId && data.success) {
    data.data = data.data.filter((d) => d.trip_id === tripId);
  }
  res.json(data);
});

app.get('/api/getStopData/:stopId', async (req, res) => {
  const data = await cachedFetch('https://www.lpp.si/lpp/ajax/1/' + req.params.stopId, 3000);
  res.json(data);
});

app.get('/api/getTripData/:tripId', async (req, res) => {
  const data = await cachedFetch('https://www.lpp.si/lpp/ajax/2/' + req.params.tripId, 3000);
  res.json(data);
});

// --- find bus 206

app.get('/api/getBus/:plateNum', async (req, res) => {
  const PLATE_NUM = req.params.plateNum;

  const LINE_NUMBERS = [...new Set(TRIPS.map((t) => t.number))];
  const bus_data = { success: false };

  for (let num of LINE_NUMBERS) {
    const data = await cachedFetch('https://bus-ljubljana.eu/app/busDetails?n=' + num, 30_000);
    const targetBus = data.data.find((route) => route.bus_name.includes(PLATE_NUM));

    if (targetBus) return res.json({ success: true, ...targetBus });
    else bus_data[num] = data.data.map((route) => route.bus_name);
  }

  res.json(bus_data);
});

// --- ERRORS

app.use((req, res, next) => {
  res.end('error 404');
});

app.use((err, req, res, next) => {
  console.error(err);
  res.end('internal server error\n\n---\n' + err);
});

// --- utils

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

function CSVtoJSON(string, header = true) {
  const trips = string.trim().split('\n');
  const fieldnames = trips.shift().trim().split(',');

  const json = [];

  for (let trip of trips) {
    const rowData = {};

    for (let i = 0; i < fieldnames.length; i++) {
      const fname = fieldnames[i];
      const value = trip.trim().split(',')[i];
      rowData[fname] = value;
    }

    json.push(rowData);
  }

  return json;
}
