import express from 'express';
import fs from 'fs';

import DB from '../js/db.js';
import Store from '../js/Store_node.js';
import { collectData } from '../js/collectData.js';

const router = express.Router();
const dstore = new Store();

const ROUTES = JSON.parse(fs.readFileSync('db/routes.json'));
const API_KEY = process.env.API_KEY;

// --- ZEMLJEVID

router.get('/arrival', collectData, async (req, res) => {
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

router.get('/route-shape/', async (req, res) => {
  const bus_name = req.query.bus_name;
  const trip_id = req.query.trip_id || (await tripIdFromBusName(bus_name));
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

router.get('/buses-on-route/', async (req, res) => {
  const bus_name = req.query.bus_name;
  const trip_id = req.query.trip_id || (await tripIdFromBusName(bus_name));
  const route = ROUTES.find((r) => r.trip_id === trip_id);

  // get bus data
  const lpp_bus_data = await fetchLPP('https://data.lpp.si/api/bus/bus-details?trip-info=1', 1000 * 3);

  const db_driver_data = await DB.drivers.findAsync({});
  const db_bus_data = await DB.buses.findAsync({});

  if (lpp_bus_data.success) {
    let tripBuses = lpp_bus_data.data
      .filter((bus) => bus.trip_id === trip_id)
      .map((bus) => {
        // združi s podatki iz serverja
        const db_bus = db_bus_data.find((b) => b.bus_id === bus.bus_unit_id);
        const db_driver = db_driver_data.find((b) => b.driver_id === bus.driver_id);

        return {
          bus_description: db_bus?.bus_description || undefined,
          driver_description: db_driver?.driver_description || undefined,
          driver_nickname: db_driver?.driver_nickname || undefined,
          driver_rating: db_driver?.driver_rating || undefined,

          trip_id: bus.trip_id,
          bus_unit_id: bus.bus_unit_id,
          bus_name: bus.name,
          driver_id: bus.driver_id,
          latitude: bus.coordinate_y,
          longitude: bus.coordinate_x,
          cardinal_direction: bus.cardinal_direction,
          // odo: bus.odo,
          // ground_speed: bus.ground_speed,

          route_number: route?.route_number,
          route_id: route?.route_id,
          route_name: route?.route_name,

          bus_data_age: Math.round((new Date() - new Date(bus.timestamp)) / 1000),
        };
      });

    if (bus_name) tripBuses = tripBuses.filter((b) => b.bus_name === bus_name);
    res.json(tripBuses);
  } else {
    res.status(400).json({ success: false });
  }
});

// --- OBJAVE

router.post('/objavi', async (req, res) => {
  const { bus_id, bus_description, driver_id, driver_description, driver_nickname, driver_rating, author } = req.body;

  // update bus & driver data
  await DB.buses.updateAsync({ bus_id }, { bus_id, bus_description, author }, { upsert: true });
  await DB.drivers.updateAsync(
    { driver_id },
    { driver_id, driver_description, driver_nickname, driver_rating, author },
    { upsert: true }
  );

  res.redirect(req.query.from_url);
});

// --- MESSAGES

router.post('/sendmsg', async (req, res) => {
  const { recipient, content } = req.body;

  const msg = { recipient, content, timestamp: new Date().valueOf() };
  await DB.messages.insertAsync(msg);

  res.redirect('sendmsg');
});

router.get('/deletemsg', async (req, res) => {
  const count = await DB.messages.removeAsync({ _id: req.query.id });

  res.send(`<pre>izbrisal ${count} sporočil.\n\n<a href="/sendmsg">nazaj</a></pre>`);
});

// --- UTILS

async function cachedFetch(url, options, maxAge) {
  try {
    let data = dstore.get(url, maxAge);
    if (!data) {
      const r = await fetch(url, options);
      data = await r.json();
      dstore.set(url, data);
    }
    return data;
  } catch (error) {
    return 'CACHED FETCH ERROR';
  }
}

async function fetchLPP(url, maxAge = 0) {
  const options = {
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
      'User-Agent': 'travana/4 CFNetwork/1568.300.101 Darwin/24.2.0',
    },
  };

  const response = await cachedFetch(url, options, maxAge);
  return response; // return response.json();
}

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

async function tripIdFromBusName(bus_name) {
  const lpp_bus_data = await fetchLPP('https://data.lpp.si/api/bus/bus-details?trip-info=1', 1000 * 60 * 15); // 10 minutes
  const bus = lpp_bus_data.data.find((bus) => bus.name === bus_name);
  return bus?.trip_id;
}

// --- export

export default router;
