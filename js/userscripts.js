// NOTE: skripti, ki se injectajo uporabnikom + njihova imena

export const userscripts = [
  // actual data on strojcek.ftp.sh
  { name: 'jakob', ids: ['3b049f92-a2c7-48e4-ab21-b6d5f9d4cafe'] },
  {
    name: 'lara',
    ids: ['35da7902-93a2-4b82-b5f3-c518f392eb2f'],
    script: function () {
      const time = new Date().getHours();

      if (time < 12) {
        openModal('Dobro jutro, miska! Zelim ti lep lep danek:)\n\nCrvek 🪱');
      } else if (time < 20) {
        openModal('🐛✨🌸');
      } else {
        openModal('Upam da se peljes domov na cartke! :)');
      }
    },
  },
  {
    name: 'filip',
    ids: [
      '5290aa95-43cb-43ca-8fbc-ec6e5e2b0c98', // iphone pwa
      '020f66c0-8a02-419e-9ba1-3e3bfdfc74c2', // iphone safari
      'a756086e-53c6-446a-a595-ed53e5328cb1', // mac safari
      '7893693e-2e04-477f-afbb-e1460443bbe6', // mac chrome
    ],
    script: function () {
      document.querySelector('#input .reset').style.background = 'lightblue';
    },
  },
  {
    name: 'ana',
    ids: ['6a4fb73c-bacd-4ff5-87fb-a0061af05534'],
  },
  // ---------------------------------------------
  {
    name: 'filip_localhost',
    ids: [
      'b32fa828-ad7f-4fcc-9c82-19953ba567a1',
      'e52c983b-e573-430e-bd16-3ba146fda6c4',
      '125424e1-2bff-4ed7-823e-c2fcb0bdfe8f', // mac chrome localhost
      '51d24fa8-ab6e-4342-8e2a-4fc689d57124', // mac safari localhost
      'f5078f7c-fcdf-4a1c-9a8a-7c4e969d8024', // iphone localhost (pwa?)
    ],
    script: function () {
      document.querySelector('#input .reset').style.background = 'orchid';
    },
  },
];
