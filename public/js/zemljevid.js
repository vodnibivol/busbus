const Main = (async function () {
  // --- ZEMLJEVID (MAP)
  const map = L.map('map', {
    center: [46.05, 14.507],
    zoom: 13,
    zoomControl: false,
  });
  // .setView([46.05, 14.52], 13);

  const tileLayer = L.tileLayer(
    'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'),
    {
      attribution: '',
      subdomains: 'abcd',
    }
  ).addTo(map);

  // --- POSTAJA

  // if (stopData.location) {
  //   const stopMarker = L.marker(stopData.location, {
  //     icon: Icons.station,
  //     zIndexOffset: -1000,
  //   });

  //   stopMarker.addTo(map);
  //   map.setView(stopData.location, 14);
  //   stopMarker.addEventListener('click', () => map.setView(stopData.location, 15));
  // }
})();

// --- ICONS

const Icons = {
  bus: L.icon({
    iconUrl: 'static/img/busek_arrow.png',
    iconSize: [48, 48],
  }),
  station: L.icon({
    iconUrl: 'static/img/postaja.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  }),
};
