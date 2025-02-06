import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import 'dotenv/config';

import Store from './js/Store_node.js';
const dstore = new Store();

const app = express();

const PORT = process.env.PORT || 2200;

app.listen(PORT, () => console.log('http://localhost:' + PORT + '/'));

// --- SUBPATH REROUTE

const SUBPATH = '/busbus';
app.use(SUBPATH, (req, res, next) => {
  req.url = req.url.replace(SUBPATH, '');
  next();
});

app.use(compression());
app.use('/static/', express.static('public'));
app.set('view engine', 'ejs');
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());

// --- ROUTES

app.get('/', (req, res) => {
  return res.render('prihod');
});

app.get('/zemljevid', (req, res) => {
  // /zemljevid?linija=3&center=1 // &postaja=303001
  if (!req.query.route) return res.redirect('/');

  res.render('zemljevid');
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

app.get('/api/arrival/:stopId', async (req, res) => {
  // const data = await cachedFetch('https://www.lpp.si/lpp/ajax/1/' + req.params.stopId, 3000);
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
    });

    return acc;
  }, {});

  res.json(Object.values(dataFormatted));
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
