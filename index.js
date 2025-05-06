import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import 'dotenv/config';
import path from 'path';
import cookieParser from 'cookie-parser';

const app = express();

const PORT = process.env.PORT || 2200;

app.listen(PORT, () => console.log('server running on: http://localhost:' + PORT + '/'));

app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(compression());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.all('/busbus/*', editLocalhost);
app.use('/public/', express.static('public'));

// --- ROUTES

import mainRoutes from './routes/main.js';
import apiRoutes from './routes/api.js';
import logRoutes from './routes/log.js';
import msgRoutes from './routes/msg.js';

app.use('/', mainRoutes);
app.use('/api', apiRoutes);
app.use('/log', logRoutes);
app.use('/msg', msgRoutes);

// --- SW

app.get('/sw.js', (req, res) => {
  res.sendFile(path.resolve('sw.js'));
});

// --- FUNCTIONS

function editLocalhost(req, res, next) {
  if (isLocalhost(req.hostname)) {
    req.url = req.url.replace('busbus/', '');
  }

  next();
}

function isLocalhost(hostname) {
  return /localhost|192|172/.test(hostname);
}

// --- ERRORS

app.use((req, res, next) => {
  res.status(404).render('error', { msg: 'ERROR 404: NOT FOUND' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.end('internal server error\n\n---\n' + err);
});
