document.addEventListener('DOMContentLoaded', () => {
  // ------------------------
  // 1ï¸âƒ£ Initialize map
  // ------------------------
  const map = L.map('map', { zoomControl: false }).setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);

  // ------------------------
  // 2ï¸âƒ£ MarkerCluster group
  // ------------------------
  const markerCluster = L.markerClusterGroup();
  map.addLayer(markerCluster);

  // ------------------------
  // 3ï¸âƒ£ Icons
  // ------------------------
  const icons = {
    droneBrown: L.icon({ iconUrl: 'icons/brown_drone.png', iconSize: [28,28] }),
    droneRed: L.icon({ iconUrl: 'icons/red_drone.png', iconSize: [28,28] }),
    droneOrange: L.icon({ iconUrl: 'icons/orange_drone.png', iconSize: [28,28] }),
    droneYellow: L.icon({ iconUrl: 'icons/yellow_drone.png', iconSize: [28,28] }),
    droneGreen: L.icon({ iconUrl: 'icons/green_drone.png', iconSize: [28,28] }),
    droneBlue: L.icon({ iconUrl: 'icons/blue_drone.png', iconSize: [28,28] }),

    jetBrown: L.icon({ iconUrl: 'icons/brown_jet.png', iconSize: [28,28] }),
    jetRed: L.icon({ iconUrl: 'icons/red_jet.png', iconSize: [28,28] }),
    jetOrange: L.icon({ iconUrl: 'icons/orange_jet.png', iconSize: [28,28] }),
    jetYellow: L.icon({ iconUrl: 'icons/yellow_jet.png', iconSize: [28,28] }),
    jetGreen: L.icon({ iconUrl: 'icons/green_jet.png', iconSize: [28,28] }),
    jetBlue: L.icon({ iconUrl: 'icons/blue_jet.png', iconSize: [28,28] }),

    balloonBrown: L.icon({ iconUrl: 'icons/brown_balloon.png', iconSize: [28,28] }),
    balloonRed: L.icon({ iconUrl: 'icons/red_balloon.png', iconSize: [28,28] }),
    balloonOrange: L.icon({ iconUrl: 'icons/orange_balloon.png', iconSize: [28,28] }),
    balloonYellow: L.icon({ iconUrl: 'icons/yellow_balloon.png', iconSize: [28,28] }),
    balloonGreen: L.icon({ iconUrl: 'icons/green_balloon.png', iconSize: [28,28] }),
    balloonBlue: L.icon({ iconUrl: 'icons/blue_balloon.png', iconSize: [28,28] }),

    borderBrown: L.icon({ iconUrl: 'icons/brown_soldier.png', iconSize: [28,28] }),
    borderRed: L.icon({ iconUrl: 'icons/red_soldier.png', iconSize: [28,28] }),
    borderOrange: L.icon({ iconUrl: 'icons/orange_soldier.png', iconSize: [28,28] }),
    borderYellow: L.icon({ iconUrl: 'icons/yellow_soldier.png', iconSize: [28,28] }),
    borderGreen: L.icon({ iconUrl: 'icons/green_soldier.png', iconSize: [28,28] }),
    borderBlue: L.icon({ iconUrl: 'icons/blue_soldier.png', iconSize: [28,28] }),
  };

  // ------------------------
  // 4ï¸âƒ£ Markers array
  // ------------------------
  const markers = [];

  // ------------------------
  // 5ï¸âƒ£ Your incidents go here
  // ------------------------
  // Incident data now lives in incidents-data.js (shared with heatmap.js)
  const incidents = incidentsData;

  function riskCap(r){ return r.charAt(0).toUpperCase() + r.slice(1); }
  function getIcon(i){
    const key = i.type + riskCap(i.risk);
    if (icons[key]) return icons[key];
    // No dedicated icon set for this type (e.g. 'rocket') - fall back to the
    // drone icon in the correct risk color, so the actor/verification color
    // coding stays accurate even without a matching icon.
    return icons['drone' + riskCap(i.risk)] || icons.droneYellow;
  }

  // ------------------------
  // Derive real year-month periods from each incident's date text (same
  // approach as heatmap.js) instead of trusting the separate year/month
  // fields, which are easy to get out of sync by hand on multi-date entries.
  // ------------------------
  const MONTH_ABBR = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
  function extractPeriodsFromDateString(str) {
    if (!str) return [];
    const re = /([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/g;
    const out = [];
    let m;
    while ((m = re.exec(str)) !== null) {
      const mon = MONTH_ABBR[m[1].toLowerCase()];
      if (mon) out.push(`${m[2]}-${String(mon).padStart(2, '0')}`);
    }
    return out;
  }
  function formatPeriod(year, month) {
    if (year === undefined || year === null) return null;
    const y = String(year).trim();
    let mnum;
    if (month === undefined || month === null) mnum = 1;
    else {
      const digits = String(month).replace(/\D/g, '');
      mnum = digits === '' ? 1 : parseInt(digits, 10);
      if (Number.isNaN(mnum) || mnum < 1 || mnum > 12) mnum = 1;
    }
    return `${y}-${String(mnum).padStart(2, '0')}`;
  }
  // Fallback used only when an entry has no parseable date text at all.
  function periodsFromYearMonthFields(entry) {
    const years = Array.isArray(entry.year) ? entry.year : (entry.year !== undefined ? [entry.year] : []);
    const months = Array.isArray(entry.month) ? entry.month : (entry.month !== undefined ? [entry.month] : []);
    if (years.length === 0 && months.length === 0) return [];
    if (years.length === 1 && months.length > 1) return months.map(m => formatPeriod(years[0], m));
    if (months.length === 1 && years.length > 1) return years.map(y => formatPeriod(y, months[0]));
    return months.length > 0
      ? months.map((m, i) => formatPeriod(years[i] !== undefined ? years[i] : years[0], m)).filter(Boolean)
      : years.map(y => formatPeriod(y, 1)).filter(Boolean);
  }
  function periodsOf(entry) {
    let periods = [];
    if (Array.isArray(entry.incidents)) {
      entry.incidents.forEach(sub => periods.push(...extractPeriodsFromDateString(sub.date)));
    } else {
      periods.push(...extractPeriodsFromDateString(entry.date));
    }
    if (periods.length === 0) periods = periodsFromYearMonthFields(entry);
    return [...new Set(periods)];
  }

  // ------------------------
  // Weekly-granularity periods for the Timeline slider (separate from the
  // monthly _periods above, which the month/year dropdown filters use).
  // Same "Monday of week" system as heatmap.js, so playback there and here
  // lines up week-for-week.
  // ------------------------
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const REF_MONDAY = Date.UTC(2020, 0, 6);
  function weekStartMs(ms) {
    const weeksSinceRef = Math.floor((ms - REF_MONDAY) / MS_PER_WEEK);
    return REF_MONDAY + weeksSinceRef * MS_PER_WEEK;
  }
  function weekKeyFromYMD(year, month, day) {
    const ms = weekStartMs(Date.UTC(year, month - 1, day));
    const d = new Date(ms);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  function extractWeekKeysFromDateString(str) {
    if (!str) return [];
    const cleaned = str.replace(/\?/g, '');
    const re = /(\d{1,2})(?:\s*[-/]\s*\d{1,2})?\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})/g;
    const out = [];
    let m;
    while ((m = re.exec(cleaned)) !== null) {
      const day = parseInt(m[1], 10);
      const mon = MONTH_ABBR[m[2].toLowerCase()];
      const year = parseInt(m[3], 10);
      if (mon && day >= 1 && day <= 31) out.push(weekKeyFromYMD(year, mon, day));
    }
    return out;
  }
  function weekKeysFromYearMonthFields(entry) {
    const years = Array.isArray(entry.year) ? entry.year : (entry.year !== undefined ? [entry.year] : []);
    const months = Array.isArray(entry.month) ? entry.month : (entry.month !== undefined ? [entry.month] : []);
    if (years.length === 0 && months.length === 0) return [];
    function toWeek(y, m) {
      const digits = m === undefined || m === null ? '' : String(m).replace(/\D/g, '');
      let mnum = digits === '' ? 1 : parseInt(digits, 10);
      if (Number.isNaN(mnum) || mnum < 1 || mnum > 12) mnum = 1;
      return weekKeyFromYMD(parseInt(y, 10), mnum, 1);
    }
    if (years.length === 1 && months.length > 1) return months.map(m => toWeek(years[0], m));
    if (months.length === 1 && years.length > 1) return years.map(y => toWeek(y, months[0]));
    return months.length > 0
      ? months.map((m, i) => toWeek(years[i] !== undefined ? years[i] : years[0], m))
      : years.map(y => toWeek(y, 1));
  }
  function weekPeriodsOf(entry) {
    let weeks = [];
    if (Array.isArray(entry.incidents)) {
      entry.incidents.forEach(sub => weeks.push(...extractWeekKeysFromDateString(sub.date)));
    } else {
      weeks.push(...extractWeekKeysFromDateString(entry.date));
    }
    if (weeks.length === 0) weeks = weekKeysFromYearMonthFields(entry);
    return [...new Set(weeks)];
  }

  // ------------------------
  // 6ï¸âƒ£ Add markers to cluster (handles multi-incidents)
  // ------------------------
  function riskDotColor(risk) {
    const colors = {
      brown: '#8A5A3C', red: 'var(--red, #A13D33)', orange: 'var(--amber, #B8862E)',
      yellow: '#D9B94A', green: '#4C8A5E', blue: '#3B6EA5'
    };
    return colors[risk] || '#8A909B';
  }

  incidents.forEach(i => {
    const riskDot = `<span class="popup-risk-dot" style="background:${riskDotColor(i.risk)}"></span>`;
    let popupHtml = `<b>${i.link ? `<a href="${i.link}" target="_blank">${i.country}</a>` : i.country}</b><br>`;
    
    if(i.note) {
      popupHtml += `<em>${i.note}</em>`;
      if(i.noteLink) popupHtml += ` <a href="${i.noteLink}" target="_blank">Source</a>`;
      popupHtml += '<br><br>';
    }

    if(Array.isArray(i.incidents)) {
      i.incidents.forEach((inc, idx) => {
        popupHtml += `<b>Incident ${idx + 1}</b><br>
                      ${riskDot}<span class="popup-meta-label">Type</span> ${inc.popupType}<br>
                      <span class="popup-meta-label">Date</span> ${inc.date}<br>
                      <span class="popup-meta-label">Details</span> ${inc.details}<br>
                      ${inc.link ? `<a href="${inc.link}" target="_blank">Source</a>` : ''}
                      <hr>`;
      });
    } else {
      popupHtml += `${riskDot}<span class="popup-meta-label">Type</span> ${i.popupType}<br>
                    <span class="popup-meta-label">Date</span> ${i.date}<br>
                    <span class="popup-meta-label">Details</span> ${i.details}<br>
                    ${i.link ? `<a href="${i.link}" target="_blank">Source</a>` : ''}`;
    }

    const marker = L.marker([i.lat, i.lng], { icon: getIcon(i) }).bindPopup(popupHtml, {
      maxHeight: 300,
      autoPan: true
    });

    marker.meta = i;
    marker.meta._periods = periodsOf(i);
    marker.meta._weekPeriods = weekPeriodsOf(i);
    markers.push(marker);
    markerCluster.addLayer(marker);
  });

  // ------------------------
  // Timeline slider setup - collapsed by default (see the panel's own
  // "collapsed" class in map.html), so nothing changes for anyone who
  // doesn't open it: the slider starts at the last period with Cumulative
  // checked, which shows every marker exactly like before this existed.
  // ------------------------
  const weekPeriodSet = new Set();
  markers.forEach(m => m.meta._weekPeriods.forEach(p => { if (p) weekPeriodSet.add(p); }));
  const weekPeriods = Array.from(weekPeriodSet).sort();
  const monthAbbrShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function weekPeriodLabel(p) {
    const [y, m, d] = p.split('-').map(n => parseInt(n, 10));
    const start = new Date(Date.UTC(y, m - 1, d));
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const sM = monthAbbrShort[start.getUTCMonth()], sD = start.getUTCDate(), sY = start.getUTCFullYear();
    const eM = monthAbbrShort[end.getUTCMonth()], eD = end.getUTCDate(), eY = end.getUTCFullYear();
    if (sY !== eY) return `${sM} ${sD}, ${sY} – ${eM} ${eD}, ${eY}`;
    if (sM !== eM) return `${sM} ${sD} – ${eM} ${eD}, ${sY}`;
    return `${sM} ${sD}–${eD}, ${sY}`;
  }

  const timeSlider = document.getElementById('time-slider');
  const timeLabel = document.getElementById('time-label');
  const cumulativeBox = document.getElementById('cumulative');
  timeSlider.max = Math.max(weekPeriods.length - 1, 0);
  timeSlider.value = timeSlider.max;

  function updateTimeLabel() {
    if (weekPeriods.length === 0) { timeLabel.textContent = 'No dated incidents'; return; }
    const idx = parseInt(timeSlider.value, 10);
    timeLabel.textContent = cumulativeBox.checked
      ? `Through ${weekPeriodLabel(weekPeriods[idx])}`
      : weekPeriodLabel(weekPeriods[idx]);
  }
  updateTimeLabel();

  // ------------------------
  // 6.5: Deep link support - if we arrived from the calendar's "View on
  // map" button (map.html?link=<source url>), find the matching incident,
  // zoom the cluster open to reveal it, and pop its popup.
  // ------------------------
  (function openLinkedIncident() {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('link');
    if (!target) return;
    let decoded;
    try { decoded = decodeURIComponent(target); } catch (e) { decoded = target; }

    // Normalize away the differences that shouldn't matter for matching:
    // surrounding whitespace/quote typos, a trailing URL fragment (which can
    // get garbled by copy-paste encoding issues), and letter case.
    function normalizeLink(l) {
      if (!l) return '';
      return l.trim().replace(/^['"\s]+|['"\s]+$/g, '').split('#')[0].toLowerCase();
    }
    const normalizedTarget = normalizeLink(decoded);
    const match = markers.find(m => {
      const meta = m.meta;
      if (normalizeLink(meta.link) === normalizedTarget) return true;
      if (Array.isArray(meta.incidents)) {
        return meta.incidents.some(sub => normalizeLink(sub.link) === normalizedTarget);
      }
      return false;
    });

    if (match) {
      markerCluster.zoomToShowLayer(match, () => {
        match.openPopup();
      });
    }
  })();

  // ------------------------
  // 7ï¸âƒ£ Filter logic
  // ------------------------
function applyFilters() {
  markerCluster.clearLayers();

  const fActor = document.getElementById('f-actor').value;
  const fType = document.getElementById('f-type').value;
  const fLocation = document.getElementById('f-location').value;
  const fMonth = document.getElementById('f-month').value;
  const fYear = document.getElementById('f-year').value;

  const timeIdx = weekPeriods.length ? parseInt(timeSlider.value, 10) : null;
  const timeCumulative = cumulativeBox.checked;
  const timeCutoff = timeIdx !== null ? weekPeriods[timeIdx] : null;

  const visible = markers.filter(m => {
    const { risk, type, place } = m.meta;

    const matchActor = fActor === 'any' || risk === fActor;
    const matchType = fType === 'any' || type === fType;
    const matchPlace = fLocation === 'any' || place === fLocation;

    // Match year+month together against the same real date - fixes
    // multi-date entries (e.g. one location hit in both Nov 2025 and
    // Jan 2026) that separate year/month array checks could mismatch.
    let matchMonthYear;
    if (fMonth === 'any' && fYear === 'any') {
      matchMonthYear = true;
    } else {
      const paddedMonth = fMonth === 'any' ? null : fMonth.padStart(2, '0');
      matchMonthYear = (m.meta._periods || []).some(p => {
        const [py, pm] = p.split('-');
        const matchY = fYear === 'any' || py === fYear;
        const matchM = paddedMonth === null || pm === paddedMonth;
        return matchY && matchM;
      });
    }

    // Timeline slider: a marker qualifies if any of its incidents fall on
    // (or, when Cumulative is on, on or before) the selected week.
    const matchTime = timeCutoff === null || (m.meta._weekPeriods || []).some(p =>
      timeCumulative ? p <= timeCutoff : p === timeCutoff
    );

    return matchActor && matchType && matchPlace && matchMonthYear && matchTime;
  });

  markerCluster.addLayers(visible);
}

  // ------------------------
  // 8ï¸âƒ£ Attach event listeners to filters
  // ------------------------
  document.querySelectorAll('#filters select').forEach(sel => {
    sel.addEventListener('change', applyFilters);
  });

  // ------------------------
  // Timeline slider controls - same play/pause/prev/next/cumulative
  // pattern as the Intensity page, but driving marker visibility instead
  // of a choropleth. Never opens popups on its own - it only adds/removes
  // markers from the cluster, so playback never "plasters" the map.
  // ------------------------
  timeSlider.addEventListener('input', () => { updateTimeLabel(); applyFilters(); });
  cumulativeBox.addEventListener('change', () => { updateTimeLabel(); applyFilters(); });
  document.getElementById('prevPeriod').addEventListener('click', () => {
    timeSlider.value = Math.max(0, parseInt(timeSlider.value, 10) - 1);
    updateTimeLabel(); applyFilters();
  });
  document.getElementById('nextPeriod').addEventListener('click', () => {
    timeSlider.value = Math.min(timeSlider.max, parseInt(timeSlider.value, 10) + 1);
    updateTimeLabel(); applyFilters();
  });
  let playTimer = null;
  const playBtn = document.getElementById('playPause');
  playBtn.addEventListener('click', () => {
    if (playTimer) { clearInterval(playTimer); playTimer = null; playBtn.textContent = '\u25b6 Play'; return; }
    playBtn.textContent = '\u23f8 Pause';
    playTimer = setInterval(() => {
      let next = parseInt(timeSlider.value, 10) + 1;
      if (next > parseInt(timeSlider.max, 10)) next = 0;
      timeSlider.value = next;
      updateTimeLabel(); applyFilters();
    }, 900);
  });
});
