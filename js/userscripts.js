// NOTE: skripti, ki se injectajo uporabnikom + njihova imena
import birthday from './scripts/birthday.js';

export const userscripts = [
  // actual data on strojcek.ftp.sh
  {
    name: 'jakob',
    ids: ['3b049f92-a2c7-48e4-ab21-b6d5f9d4cafe'],
    script: birthday,
  },
  {
    name: 'lara',
    ids: ['35da7902-93a2-4b82-b5f3-c518f392eb2f'],
    // script: function () {
    //   document.querySelector('#input .reset').style.background = 'lightpink';
    // },
    script: birthday,
  },
  {
    name: 'filip',
    ids: [
      '020f66c0-8a02-419e-9ba1-3e3bfdfc74c2', // iphone safari/pwa
      '5290aa95-43cb-43ca-8fbc-ec6e5e2b0c98', // iphone pwa
      'a756086e-53c6-446a-a595-ed53e5328cb1', // mac safari
    ],
    // script: function () {
    //   document.querySelector('#input .reset').style.background = 'lightblue';
    // },
    script: birthday,
  },
  {
    name: 'ana',
    ids: ['6a4fb73c-bacd-4ff5-87fb-a0061af05534'],
    script: birthday,
  },
  {
    name: 'anina babica',
    ids: ['661a93e4-acec-4268-b5d2-d4884178771e'],
  },
  {
    name: 'filip', // LOCALHOST
    ids: [
      '51d24fa8-ab6e-4342-8e2a-4fc689d57124', // mac safari localhost
      'f5078f7c-fcdf-4a1c-9a8a-7c4e969d8024', // iphone localhost (pwa?)
    ],
    script: birthday,
  },
];
