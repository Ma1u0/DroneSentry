// Draws the NATO outer border (solid blue) and the dashed line where EU members
// meet non-EU NATO members. Data comes from borders-data.js (bordersData).
// Lines sit above the map but below markers, and don't catch clicks/hovers,
// so popups and tooltips keep working.
const BORDER_STYLE = {
  'nato-outer': { color: '#1F4FD8', weight: 3, opacity: 0.9 },
  'eu-divider': { color: '#F2B705', weight: 2, opacity: 1, dashArray: '7 6' }
};

function addEuNatoBorders(map) {
  map.createPane('bordersPane');
  const pane = map.getPane('bordersPane');
  pane.style.zIndex = 450;
  pane.style.pointerEvents = 'none';

  Object.keys(BORDER_STYLE).forEach(kind => {
    L.geoJSON(bordersData, {
      pane: 'bordersPane',
      interactive: false,
      filter: f => f.properties.kind === kind,
      style: () => Object.assign({ fill: false, lineJoin: 'round' }, BORDER_STYLE[kind])
    }).addTo(map);
  });
}
