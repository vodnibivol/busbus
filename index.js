import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

import Store from './js/Store_node.js';
const dstore = new Store();

const app = express();

app.listen(3000, () => console.log('listening on port : 3000'));
app.use('/public', express.static('public'));
app.set('view engine', 'ejs');

// --- ROUTES

app.get('/', (_, res) => {
  res.render('form');
});

app.get('/map', (req, res) => {
  const routeNos = req.query.line.split(','); // ["2", "9"]
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
    data = await getJSON(url);
    dstore.set(url, data, dstore.SECOND * 4.5);
  } else {
    // console.log('dstore');
  }

  res.json(data);
});

// --- f(x)

async function getJSON(url) {
  const r = await fetch(url);
  const j = await r.json();
  return j;
}
