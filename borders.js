// Adds NATO (solid blue) and EU (dashed gold) country borders to a Leaflet map.
// Uses bordersData from borders-data.js. Lines sit above the map but below markers,
// and don't catch clicks/hovers, so popups and tooltips keep working.
const BORDER_STYLE = {
  nato: { color: '#1F4FD8', weight: 3, opacity: 0.9 },
  eu:   { color: '#F2B705', weight: 1.8, opacity: 1, dashArray: '7 6' }
};

function addEuNatoBorders(map) {
  map.createPane('bordersPane');
  const pane = map.getPane('bordersPane');
  pane.style.zIndex = 450;
  pane.style.pointerEvents = 'none';

  const make = (flag, style) => L.geoJSON(bordersData, {
    pane: 'bordersPane',
    interactive: false,
    filter: f => f.properties[flag],
    style: () => Object.assign({ fill: false, lineJoin: 'round' }, style)
  }).addTo(map);

  make('nato', BORDER_STYLE.nato);
  make('eu', BORDER_STYLE.eu); // drawn on top so the dashes show over the blue line
}
