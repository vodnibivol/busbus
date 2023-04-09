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

const linije = JSON.parse(fs.readFileSync(path.resolve('db', 'linije.json')));
const postajalisca = JSON.parse(fs.readFileSync(path.resolve('db', 'postajalisca.json')));

// --- ROUTER

app.get('/', (req, res) => {
  res.render('form');
});

app.get('/map', (req, res) => {
  if (!req.query.route) return res.redirect('/');
  const routeNos = req.query.route.split(','); // ["2", "9"]

  const stopId = req.query.stop;
  const tripId = linije.find((l) => l.stops.find((s) => s.ref_id == stopId))?.id || null;
  const stop = stopId ? postajalisca.find((p) => p.ref_id === stopId) : {};
  if (stop) stop.trip_id = tripId;

  const routeF = JSON.parse(fs.readFileSync(path.resolve('db', 'routes', 'routes.json')));

  let routeFiles = routeF
    .filter((fn) => {
      return routeNos.some((no) => fn.filename.startsWith(no + '_'));
    })
    .map((f) => {
      const coords = JSON.parse(fs.readFileSync(path.resolve('db', 'routes', f.filename)));
      return { ...f, coordinates: coords };
    });

  res.render('map', { routes: routeFiles, stopData: stop });
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

// --- ERRORS

app.use((req, res, next) => {
  res.end('error 404');
});

app.use((err, req, res, next) => {
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
