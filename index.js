import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

import Store from './js/Store_node.js';
const dstore = new Store();

const app = express();

const PORT = process.env.PORT || 2200;

app.listen(PORT, () => console.log('::' + PORT));

app.use(compression());
app.use('/static', express.static('public'));
app.set('view engine', 'ejs');
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());

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

// --- USERS

const userStore = {
  data: null,
  get(id) {
    return this.data[id];
  },
  setHistory(id, stopHistory) {
    const user = this.data[id] || {};
    user.stopHistory = stopHistory;
    this.data[id] = user;
    this.saveFile();
  },
  pushStop(userId, stopId) {
    const user = this.data[userId] || { stopHistory: [] };
    user.stopHistory.push(stopId);
    this.data[userId] = user;
    this.saveFile();
  },
  saveFile() {
    fs.writeFileSync(path.resolve('db', 'users.json'), JSON.stringify(this.data));
  },

  init() {
    if (!fs.existsSync(path.resolve('db', 'users.json'))) {
      fs.writeFileSync(path.resolve('db', 'users.json'), '{}');
    }

    this.data = JSON.parse(fs.readFileSync(path.resolve('db', 'users.json')));
  },
};

userStore.init();

// --- ROUTES

app.get('/', (req, res) => {
  if (!req.query.userId) return res.render('form');

  // first time: only when ?userId=xxxxx // also: push history
  console.log('log user: ' + req.query.userId);

  // get user data;
  res.cookie('userId', req.query.userId);
  const stopHistory = userStore.get(req.query.userId)?.stopHistory || [];
  console.log(stopHistory);
  return res.render('form', { stopHistory: stopHistory });
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

app.post('/api/updateUserData', (req, res) => {
  const userId = req.cookies.userId;
  console.log('update user data: ' + userId);

  if (!userId) return res.end();

  console.log(req.body.stopHistory);
  const MAX_LENGTH = 20;
  userStore.setHistory(userId, req.body.stopHistory.slice(0, MAX_LENGTH));
  console.log('pushed data: ' + userId);

  res.status(200).end('success');
});

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
