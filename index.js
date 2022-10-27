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

// --- routes

app.get('/', (req, res) => {
  res.render('form');
});

app.get('/map', (req, res) => {
  res.render('map');
});

// --- API

app.get('/api/getBusData/:routeNo', async (req, res) => {
  const url = `https://bus-ljubljana.eu/app/busDetails?n=${req.params.routeNo}`;
  let data = await getJson(url);
  res.json(data);
});

app.get('/api/getNearbyStations', (req, res) => {
  let { lat, lon, d } = req.query; // d: distance // TODO: "radius" / "distance"
  let data = getNearbyStations([lat, lon], d);
  res.json(data);
});

app.get('/api/getStationData/:stationId', async (req, res) => {
  let url = `https://www.lpp.si/lpp/ajax/1/${req.params.stationId}`;
  let data = await getJson(url);
  res.json(data);
});

// --- f(x)

async function getJson(url) {
  let r = await fetch(url);
  let j = await r.json();
  return j;
}

function getNearbyStations(latlon, maxDistance = 500) {
  return STATIONS.filter((s) => haversineDistance(s.latlon, latlon) < maxDistance);
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
