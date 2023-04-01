import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import cors from 'cors';

import Store from './js/Store_node.js';
const dstore = new Store();

const app = express();

const PORT = process.env.PORT || 2200;

app.listen(PORT, () => console.log('::' + PORT));
app.use('/static', express.static('public'));
app.set('view engine', 'ejs');
app.use(cors());

// --- ROUTES

app.get('/', async (_, res) => {
  res.render('form');
});

app.get('/map', (req, res) => {
  const routeNos = req.query.route.split(','); // ["2", "9"]
  const stopId = req.query.stop;

  const routeF = JSON.parse(fs.readFileSync(path.resolve('db', 'routes', 'routes.json')));

  let routeFiles = routeF.filter((fn) => {
    return routeNos.some((no) => fn.filename.startsWith(no + '_'));
  });

  routeFiles = routeFiles.map((f) => {
    const coords = JSON.parse(fs.readFileSync(path.resolve('db', 'routes', f.filename)));
    return { ...f, coordinates: coords };
  });

  res.render('map', { routes: routeFiles });
});

// --- API

app.get('/api/getBusData/:routeNo', async (req, res) => {
  const { routeNo } = req.params;
  const url = `https://bus-ljubljana.eu/app/busDetails?n=${routeNo}`;

  let data = dstore.get(url);
  if (!data) {
    // console.log('fetch');
    data = await ffetch(url);
    dstore.set(url, data, dstore.SECOND * 4.5);
  } else {
    // console.log('dstore');
  }

  res.json(data);
});

app.get('/api/getRoute/:routeNo', async (req, res) => {
  const routeNos = req.params.routeNo.split(','); // ["2", "9"]
  const routeF = JSON.parse(fs.readFileSync(path.resolve('db', 'routes', 'routes.json')));

  let routeFiles = routeF.filter((fn) => {
    return routeNos.some((no) => fn.filename.startsWith(no + '_'));
  });

  routeFiles = routeFiles.map((f) => {
    const coords = JSON.parse(fs.readFileSync(path.resolve('db', 'routes', f.filename)));
    return { ...f, coordinates: coords };
  });

  res.json(routeFiles);
});

app.get('/api/getRouteData/:routeNo', async (req, res) => {
  res.end('success');
});

app.get('/api/getStopData/:stopId', async (req, res) => {
  const fres = await ffetch('https://www.lpp.si/lpp/ajax/1/' + req.params.stopId);
  res.json(fres);
});

// --- f(x)

async function ffetch(url) {
  const r = await fetch(url);
  const j = await r.json();
  return j;
}
