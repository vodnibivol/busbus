import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
const app = express();

app.listen(3000, () => console.log('listening on port : 3000'));
app.use(cors());
app.use('/public', express.static('public'));
app.set('view engine', 'ejs');

// --- vars

const STATIONS = JSON.parse(fs.readFileSync(path.resolve('db', 'stations.json')));

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

  routeFiles = routeFiles.map(f => {
    const coords = JSON.parse(fs.readFileSync(path.resolve('db', 'routes', f.filename)))
    return {...f, coordinates: coords};
  })

  // console.log(routeFiles.map(f => f.trip_id))

  res.render('map', { routes: routeFiles });
});

// --- API

app.get('/api/getBusData/:routeNo', async (req, res) => {
  const url = `https://bus-ljubljana.eu/app/busDetails?n=${req.params.routeNo}`;
  const busData = await getJSON(url);
  res.json(busData);
});

app.get('/api/getNearbyStations', (req, res) => {
  const { lat, lon, d } = req.query; // d: maxDistance
  const nearby = STATIONS.filter((s) => haversineDistance(s.latlon, [lat, lon]) < d);
  res.json(nearby);
});

app.get('/api/getStationData/:stationId', async (req, res) => {
  const url = `https://www.lpp.si/lpp/ajax/1/${req.params.stationId}`;
  const stationData = await getJSON(url);
  res.json(stationData);
});

app.get('/api/getRoute/:routeNo', (req, res) => {
  const routeNo = req.params.routeNo.split(','); // ["2", "11", "11b"]
  const filenames = fs.readdirSync(path.resolve('db', 'routes'));
  const routeFiles = filenames.filter((fn) => {
    return routeNo.some((no) => fn.startsWith(no + '_'));
  });

  console.log(routeFiles);

  return res.end();

  let coords = {};

  if (routeFiles.length) {
    const file = JSON.parse(fs.readFileSync(path.resolve('db', route)));
    const coords = file.features[0].geometry.coordinates;

    const depth = JSON.stringify(coords)
      .substring(0, 5)
      .split('')
      .reduce((acc, cur) => {
        return cur === '[' ? ++acc : acc;
      }, 0);

    res.json(coords.flat(depth - 2).map(([lat, lon]) => [lon, lat]));
  } else res.status(404).end('no routes found.');
});

// --- f(x)

async function getJSON(url) {
  const r = await fetch(url);
  const j = await r.json();
  return j;
}

function haversineDistance([lat1, lon1], [lat2, lon2]) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const deltaLon = lon2 - lon1;
  const deltaLambda = (deltaLon * Math.PI) / 180;
  const d = Math.acos(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(deltaLambda)) * R;
  return d;
}
