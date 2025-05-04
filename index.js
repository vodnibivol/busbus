import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import 'dotenv/config';
import path from 'path';
import cookieParser from 'cookie-parser';

const app = express();

const PORT = process.env.PORT || 2200;

app.listen(PORT, () => console.log('server running on: http://localhost:' + PORT + '/'));

app.use(compression());
app.use('/public/', express.static('public'));
app.set('view engine', 'ejs');
app.set('trust proxy', true);
app.use(bodyParser.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

// --- ROUTES

import mainRoutes from './routes/main.js';
import apiRoutes from './routes/api.js';
import logRoutes from './routes/log.js';

app.use('/', mainRoutes);
app.use('/api', apiRoutes);
app.use('/log', logRoutes);

// --- SW

app.get('/sw.js', (req, res) => {
  res.sendFile(path.resolve('sw.js'));
});

// --- ERRORS

app.get('/busbus', (req, res) => {
  if (/localhost|192|172/.test(req.hostname)) res.redirect('/');
});

app.use((req, res, next) => {
  res.status(404).render('error', { msg: 'ERROR 404: NOT FOUND' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.end('internal server error\n\n---\n' + err);
});
