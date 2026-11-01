// REFERENCE ONLY: not loaded by the app. Copied from the Claude Design
// project "Privo ATC Design" (radar.js) on 2026-11-01, mock scenes omitted. See docs/design/README.md.
//
// Privo ATC — shared radar renderer, theme tokens, airport geometry and mock scenes.
(function () {
const D = Math.PI / 180;

const THEMES = {
  radar: {
    name: 'Radar',
    background: '#0f1b26', rangeRing: '#22364a', centreline: '#34506b', runway: '#e8eef4', runwayLabel: '#b5d9fd',
    fix: '#5f7f9e', fixLabel: '#8aa6c1', plane: '#d6ebff', planeSelected: '#ffffff', planeConflict: '#ffb547',
    trail: '#4f7090', route: '#94bce3', routeCleared: '#6fe3c6', routeDraft: '#ffffff',
    panel: '#162534', panelBorder: '#2c455d', text: '#eef6ff', textDim: '#97adc2', accent: '#749dc4',
    danger: '#ffb547', good: '#6fe3c6', button: '#1f3245', buttonPressed: '#2c455d', buttonText: '#eef6ff',
    // new tokens
    labelBg: 'rgba(15,27,38,0.84)', snapHalo: '#b5d9fd', onDanger: '#1a1206', scrim: 'rgba(6,12,18,0.72)', sweep: 'rgba(148,188,227,0.30)'
  },
  paper: {
    name: 'Paper',
    background: '#f2f2f3', rangeRing: '#d4d4d7', centreline: '#a9b0b7', runway: '#1d1f20', runwayLabel: '#2c455d',
    fix: '#7a7a7d', fixLabel: '#5d5d60', plane: '#1d2d3d', planeSelected: '#000000', planeConflict: '#c2410c',
    trail: '#a9b3bd', route: '#597ea3', routeCleared: '#0b7a63', routeDraft: '#1d1f20',
    panel: '#e9e9ea', panelBorder: '#cfcfd2', text: '#1d1f20', textDim: '#5d5d60', accent: '#5980a6',
    danger: '#c2410c', good: '#0b7a63', button: '#f5f5f8', buttonPressed: '#d6ebff', buttonText: '#1d1f20',
    labelBg: 'rgba(242,242,243,0.88)', snapHalo: '#416180', onDanger: '#ffffff', scrim: 'rgba(29,31,32,0.45)', sweep: 'rgba(89,128,166,0.22)'
  }
};

// LHBP geometry, nautical miles, x east / y south, origin = airport reference point
const H = 132, U = [Math.sin(H * D), -Math.cos(H * D)], N = [U[1], -U[0]];
const neg = a => [-a[0], -a[1]];
const rw = (off, stag, len) => { const cx = N[0] * off + U[0] * stag, cy = N[1] * off + U[1] * stag; return [[cx - U[0] * len / 2, cy - U[1] * len / 2], [cx + U[0] * len / 2, cy + U[1] * len / 2]]; };
// real threshold positions (nm from ARP 47.4302N 19.2624E): 13L/31R 3,707 m, 13R/31L 3,010 m, centrelines 0.86 nm (1.6 km) apart, 13R staggered 1.2 nm NW
const R1 = [[-0.199, -0.912], [1.278, 0.432]], R2 = [[-1.688, -1.110], [-0.495, -0.018]];
const RUNWAYS = [{ a: R1[0], b: R1[1], side: 1 }, { a: R2[0], b: R2[1], side: -1 }];
const THR = {
  '13L': { p: R1[0], out: neg(U), side: 1, hdg: 132 }, '31R': { p: R1[1], out: U, side: 1, hdg: 312 },
  '13R': { p: R2[0], out: neg(U), side: -1, hdg: 132 }, '31L': { p: R2[1], out: U, side: -1, hdg: 312 }
};
const FIXES = [['BADOV', -9, -16.5], ['NALAG', 9, -16.5], ['EPARI', -6.9, -9.2], ['NIPUR', 20.8, -10], ['NORAH', 15.4, -6.2], ['ETARO', -6.3, -1.5], ['TPS', 5.4, -1.4], ['JBR', 17.6, -1.5], ['BALUX', -2.9, 4.6], ['MNR', 4.3, 5], ['VEBOS', -16, 5.9], ['ABONY', 20, 7.4], ['ERLOS', 1, 15.4], ['BABOX', 10.8, 19.2]];
const RINGS = [5, 10, 20, 30];
const F = {
  label: '600 13px "Barlow Condensed", sans-serif', label2: '500 12px "Barlow Condensed", sans-serif',
  fix: '500 10px "Barlow Condensed", sans-serif', rwy: '600 11px "Barlow Condensed", sans-serif', chip: '600 10px "Barlow Condensed", sans-serif'
};
const pad3 = n => String(Math.max(0, Math.round(n / 100))).padStart(3, '0');
const P = (v, x, y) => [v.ox + x * v.k, v.oy + y * v.k];
const hv = h => [Math.sin(h * D), -Math.cos(h * D)];
const thrPt = (n, d) => { const T = THR[n]; return [T.p[0] + T.out[0] * d, T.p[1] + T.out[1] * d]; };

function setup(cv, w, h) {
  const r = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(w * r); cv.height = Math.round(h * r);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); return c;
}

function line(c, v, pts, col, lw, dash) {
  c.strokeStyle = col; c.lineWidth = lw; c.setLineDash(dash || []); c.beginPath();
  pts.forEach((q, i) => { const [x, y] = P(v, q[0], q[1]); i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.stroke(); c.setLineDash([]);
}
function chevron(c, v, a, b, col) {
  const [x1, y1] = P(v, a[0], a[1]), [x2, y2] = P(v, b[0], b[1]);
  const ang = Math.atan2(y2 - y1, x2 - x1), s = 6;
  c.strokeStyle = col; c.lineWidth = 2; c.beginPath();
  c.moveTo(x2 - Math.cos(ang - 0.6) * s, y2 - Math.sin(ang - 0.6) * s); c.lineTo(x2, y2);
  c.lineTo(x2 - Math.cos(ang + 0.6) * s, y2 - Math.sin(ang + 0.6) * s); c.stroke();
}

function plane(c, p, t, v) {
  const [x, y] = P(v, p.x, p.y), d = hv(p.hdg);
  const col = p.conf ? t.planeConflict : p.sel ? t.planeSelected : t.plane;
  const gap = Math.max(5, 0.45 * v.k);
  c.fillStyle = t.trail;
  for (let i = 1; i <= 5; i++) { c.globalAlpha = 1 - i * 0.16; c.beginPath(); c.arc(x - d[0] * gap * i, y - d[1] * gap * i, 1.5, 0, 7); c.fill(); }
  c.globalAlpha = 1;
  const L = Math.max(14, p.spd / 60 * v.k);
  c.strokeStyle = col; c.lineWidth = 1.25; c.beginPath(); c.moveTo(x + d[0] * 6, y + d[1] * 6); c.lineTo(x + d[0] * L, y + d[1] * L); c.stroke();
  if (p.conf) { c.setLineDash([5, 4]); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, Math.max(16, 1.5 * v.k), 0, 7); c.stroke(); c.setLineDash([]); }
  const S = 5.5;
  if (p.sel) {
    c.fillStyle = col; c.fillRect(x - S, y - S, 2 * S, 2 * S);
    const B = 13, A = 5; c.lineWidth = 1.5; c.beginPath();
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) { c.moveTo(x + sx * B, y + sy * (B - A)); c.lineTo(x + sx * B, y + sy * B); c.lineTo(x + sx * (B - A), y + sy * B); }
    c.stroke();
  } else {
    c.lineWidth = 1.5; c.strokeRect(x - S, y - S, 2 * S, 2 * S);
    if (p.clr) { c.fillStyle = t.routeCleared; c.fillRect(x - 1.75, y - 1.75, 3.5, 3.5); }
  }
}

function world(c, s, t, v, W, Hh, inLoupe) {
  c.lineWidth = 1; c.strokeStyle = t.rangeRing; c.setLineDash([]);
  for (const r of RINGS) { c.beginPath(); c.arc(v.ox, v.oy, r * v.k, 0, 7); c.stroke(); }
  if (!inLoupe && !s.minimal) {
    c.font = F.fix; c.fillStyle = t.fixLabel; c.textAlign = 'left'; c.globalAlpha = 0.75;
    for (const r of RINGS) { const a = -50 * D; c.fillText(String(r), v.ox + Math.cos(a) * r * v.k + 3, v.oy + Math.sin(a) * r * v.k - 3); }
    c.globalAlpha = 1;
  }
  if (s.sweep != null) {
    const a = s.sweep * D - Math.PI / 2, R = Math.hypot(W, Hh), span = 0.8;
    if (c.createConicGradient) {
      const g = c.createConicGradient(a - span, v.ox, v.oy);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(span / (2 * Math.PI), t.sweep); g.addColorStop(span / (2 * Math.PI) + 0.0001, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(v.ox, v.oy); c.arc(v.ox, v.oy, R, a - span, a); c.closePath(); c.fill();
    }
    c.strokeStyle = t.snapHalo; c.globalAlpha = 0.6; c.lineWidth = 1.25; c.beginPath(); c.moveTo(v.ox, v.oy); c.lineTo(v.ox + Math.cos(a) * R, v.oy + Math.sin(a) * R); c.stroke(); c.globalAlpha = 1;
  }
  const rwW = Math.min(7, Math.max(3, v.k * 0.22));
  if (!s.minimal) {
    for (const n in THR) {
      const a = thrPt(n, 0.25), b = thrPt(n, 12);
      line(c, v, [a, b], t.centreline, 1, [4, 6]);
      for (const d of [5, 10]) { const q = thrPt(n, d), [x, y] = P(v, q[0], q[1]); c.strokeStyle = t.centreline; c.lineWidth = 1; c.beginPath(); c.moveTo(x - N[0] * 4, y - N[1] * 4); c.lineTo(x + N[0] * 4, y + N[1] * 4); c.stroke(); }
    }
  }
  if (s.cands) for (const n of s.cands) { const T = THR[n], [x, y] = P(v, T.p[0], T.p[1]); c.strokeStyle = t.accent; c.lineWidth = 1.25; c.setLineDash([3, 3]); c.beginPath(); c.arc(x, y, 9, 0, 7); c.stroke(); c.setLineDash([]); }
  if (s.snap) {
    const T = THR[s.snap], R = RUNWAYS[T.side > 0 ? 0 : 1];
    c.globalAlpha = 0.28; line(c, v, [R.a, R.b], t.snapHalo, rwW + 12); c.globalAlpha = 1;
    line(c, v, [T.p, thrPt(s.snap, 12)], t.snapHalo, 2);
    const [x, y] = P(v, T.p[0], T.p[1]); c.strokeStyle = t.snapHalo; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 10, 0, 7); c.stroke();
  }
  c.lineCap = 'butt';
  for (const R of RUNWAYS) line(c, v, [R.a, R.b], t.runway, rwW);
  if (!s.minimal || s.rwyLabels) {
    c.font = F.rwy; c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const n in THR) {
      const T = THR[n], [x, y] = P(v, T.p[0], T.p[1]);
      const lx = x + T.out[0] * -0 + (T.out[0] * 13) + N[0] * T.side * 9, ly = y + T.out[1] * 13 + N[1] * T.side * 9;
      if (s.snap === n) { const w = c.measureText(n).width + 8; c.fillStyle = t.snapHalo; c.fillRect(lx - w / 2, ly - 8, w, 16); c.fillStyle = t.background; }
      else { c.fillStyle = t.runwayLabel; c.globalAlpha = s.snap && THR[s.snap].out === T.out ? 0.45 : 1; }
      c.fillText(n, lx, ly); c.globalAlpha = 1;
    }
    c.textBaseline = 'alphabetic';
  }
  if (s.minimal) return;
  c.font = F.fix; c.textAlign = 'left';
  try { c.letterSpacing = '0.6px'; } catch (e) {}
  for (const [n, fx, fy] of FIXES) {
    const [x, y] = P(v, fx, fy); if (x < -40 || x > W + 40 || y < -20 || y > Hh + 20) continue;
    c.strokeStyle = t.fix; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - 4.5); c.lineTo(x + 4, y + 2.5); c.lineTo(x - 4, y + 2.5); c.closePath(); c.stroke();
    if (!inLoupe) { c.fillStyle = t.fixLabel; c.fillText(n, x + 7, y + 3.5); }
  }
  try { c.letterSpacing = '0px'; } catch (e) {}
  for (const r of s.routes || []) {
    if (r.kind === 'cleared') { const pts = r.pts.concat([THR[r.to].p]); line(c, v, pts, t.routeCleared, 2.5); chevron(c, v, pts[pts.length - 2], pts[pts.length - 1], t.routeCleared); }
    else { line(c, v, r.pts, t.route, 2, [7, 5]); chevron(c, v, r.pts[r.pts.length - 2], r.pts[r.pts.length - 1], t.route); }
  }
  if (s.draft && s.draft.pts.length > 1) {
    const pts = s.draft.pts; line(c, v, pts, t.routeDraft, 2.5, [2, 5]);
    if (s.snap) line(c, v, [pts[pts.length - 1], THR[s.snap].p], t.snapHalo, 2.5);
    const e = pts[pts.length - 1], [x, y] = P(v, e[0], e[1]);
    c.fillStyle = t.labelBg; c.strokeStyle = t.routeDraft; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill(); c.stroke();
  }
  for (const [i, j, txt] of s.pairs || []) {
    const a = s.planes[i], b = s.planes[j];
    line(c, v, [[a.x, a.y], [b.x, b.y]], t.danger, 1.25, [3, 3]);
  }
  for (const p of s.planes || []) plane(c, p, t, v);
  for (const [i, j, txt] of s.pairs || []) {
    const a = s.planes[i], b = s.planes[j];
    if (!inLoupe && txt) {
      const [x1, y1] = P(v, a.x, a.y), [x2, y2] = P(v, b.x, b.y), mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + 26;
      c.font = F.chip; const w = c.measureText(txt).width + 8;
      c.fillStyle = t.danger; c.fillRect(mx - w / 2, my - 7, w, 14); c.fillStyle = t.onDanger; c.textAlign = 'center'; c.fillText(txt, mx, my + 3.5); c.textAlign = 'left';
    }
  }
}

function labelSpec(p, busy) {
  const tr = p.cmd != null && p.cmd > p.alt + 50 ? '↑' : p.cmd != null && p.cmd < p.alt - 50 ? '↓' : '';
  const full = p.sel || p.conf, min = (busy || p.busyMin) && !full;
  const l1 = [{ t: p.cs, f: F.label }]; if (full) l1.push({ t: p.type, f: F.label2, dim: 1 });
  const chips = []; if (p.conf) chips.push({ t: '!', k: 'danger' }); if (p.clr) chips.push({ t: p.clr, k: 'good' }); if (p.ga) chips.push({ t: 'GA', k: 'danger' });
  if (min) { if (tr) l1.push({ t: tr, f: F.label }); return { lines: [l1], chips }; }
  const alt = pad3(p.alt) + tr + (tr && p.cmd > 0 ? pad3(p.cmd) : '');
  return { lines: [l1, [{ t: alt, f: F.label2 }, { t: String(p.spd), f: F.label2 }]], chips };
}

const ov = (a, b) => Math.max(0, Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]));
const PREF = [7, 0, 2, 5, 7, 4, 3, 3];

function labels(c, s, t, v, W, Hh) {
  const out = []; if (!s.planes) return out;
  const ps = s.planes.map((p, i) => ({ p, i, xy: P(v, p.x, p.y) })).filter(o => o.xy[0] > -30 && o.xy[0] < W + 30 && o.xy[1] > -30 && o.xy[1] < Hh + 30);
  const obst = ps.map(o => [o.xy[0] - 10, o.xy[1] - 10, 20, 20]);
  const safe = s.safe || [0, 0, 0, 0];
  const area = [safe[3], safe[0], W - safe[1] - safe[3], Hh - safe[0] - safe[2]];
  const placed = [];
  for (const [i, j, txt] of s.pairs || []) { if (!txt) continue; const a = P(v, s.planes[i].x, s.planes[i].y), b = P(v, s.planes[j].x, s.planes[j].y); c.font = F.chip; const w = c.measureText(txt).width + 8; placed.push([(a[0] + b[0]) / 2 - w / 2 - 2, (a[1] + b[1]) / 2 + 17, w + 4, 18]); }
  const rank = p => (p.sel ? 4 : 0) + (p.conf ? 2 : 0);
  ps.sort((a, b) => rank(b.p) - rank(a.p));
  for (const o of ps) {
    const sp = labelSpec(o.p, s.busy);
    const lw = sp.lines.map((ln, li) => ln.reduce((w, seg) => { c.font = seg.f; return w + c.measureText(seg.t).width + 4; }, 0) + (li === 0 ? sp.chips.reduce((w, ch) => { c.font = F.chip; return w + c.measureText(ch.t).width + 10; }, 0) : 0));
    const w = Math.ceil(Math.max(...lw)) + 4, h = sp.lines.length * 15 + 4;
    const [x, y] = o.xy, d = hv(o.p.hdg);
    let best = null, bs = 1e12;
    for (const R of [12, 30]) for (let j = 0; j < 8; j++) {
      const ux = Math.sin(j * 45 * D), uy = -Math.cos(j * 45 * D);
      const rx = ux > 0.1 ? x + R * ux : ux < -0.1 ? x + R * ux - w : x - w / 2;
      const ry = uy > 0.1 ? y + R * uy : uy < -0.1 ? y + R * uy - h : y - h / 2;
      const r = [rx, ry, w, h];
      let sc = PREF[j] + (R > 12 ? 40 : 0) + (ux * d[0] + uy * d[1] > 0.4 ? 120 : 0);
      for (const q of placed) sc += ov(r, q) * 5;
      obst.forEach((q, k) => { if (ps[k] !== o) sc += ov(r, q) * 4; });
      sc += (w * h - ov(r, area)) * 6;
      if (sc < bs) { bs = sc; best = r; }
    }
    placed.push(best); out.push({ i: o.i, rect: best });
    const [rx, ry] = best, conf = o.p.conf, sel = o.p.sel;
    const nx = Math.max(rx, Math.min(x, rx + w)), ny = Math.max(ry, Math.min(y, ry + h)), dl = Math.hypot(nx - x, ny - y);
    if (dl > 9) { c.strokeStyle = conf ? t.danger : t.textDim; c.globalAlpha = 0.7; c.lineWidth = 1; c.beginPath(); c.moveTo(x + (nx - x) / dl * 8, y + (ny - y) / dl * 8); c.lineTo(nx, ny); c.stroke(); c.globalAlpha = 1; }
    c.fillStyle = conf ? t.danger : t.labelBg; c.fillRect(rx, ry, w, h);
    if (sel && !conf) { c.strokeStyle = t.planeSelected; c.lineWidth = 1; c.strokeRect(rx + 0.5, ry + 0.5, w - 1, h - 1); }
    const base = conf ? t.onDanger : sel ? t.planeSelected : t.plane;
    c.textAlign = 'left';
    sp.lines.forEach((ln, li) => {
      let cx = rx + 3; const by = ry + 2 + 12 + li * 15;
      for (const seg of ln) { c.font = seg.f; c.fillStyle = seg.dim ? (conf ? t.onDanger : t.fixLabel) : base; c.fillText(seg.t, cx, by); cx += c.measureText(seg.t).width + 4; }
      if (li === 0) for (const ch of sp.chips) {
        c.font = F.chip; const cw = c.measureText(ch.t).width + 6, col = conf ? t.onDanger : t[ch.k];
        c.strokeStyle = col; c.lineWidth = 1; c.strokeRect(cx + 0.5, by - 10.5, cw, 12); c.fillStyle = col; c.fillText(ch.t, cx + 3.5, by - 1); cx += cw + 4;
      }
    });
  }
  return out;
}

function draw(c, W, Hh, s, t) {
  c.save(); c.fillStyle = t.background; c.fillRect(0, 0, W, Hh);
  world(c, s, t, s.view, W, Hh, false);
  const placed = s.minimal ? [] : labels(c, s, t, s.view, W, Hh);
  if (s.loupe) {
    const L = s.loupe; c.save(); c.beginPath(); c.arc(L.sx, L.sy, L.r, 0, 7); c.clip();
    c.fillStyle = t.background; c.fillRect(L.sx - L.r, L.sy - L.r, L.r * 2, L.r * 2);
    world(c, Object.assign({}, s, { sweep: null }), t, { ox: L.sx - L.wx * L.k, oy: L.sy - L.wy * L.k, k: L.k }, W, Hh, true);
    c.restore();
    c.strokeStyle = t.accent; c.lineWidth = 2; c.beginPath(); c.arc(L.sx, L.sy, L.r, 0, 7); c.stroke();
    c.font = F.chip; const tx = '×' + (L.k / s.view.k).toFixed(1).replace('.0', ''), w = c.measureText(tx).width + 8;
    c.fillStyle = t.accent; c.fillRect(L.sx - w / 2, L.sy + L.r - 7, w, 14); c.fillStyle = t.background; c.textAlign = 'center'; c.fillText(tx, L.sx, L.sy + L.r + 3.5); c.textAlign = 'left';
  }
  c.restore(); return placed;
}

function drawIcon(c, S) {
  const t = THEMES.radar; c.fillStyle = '#132331'; c.fillRect(0, 0, S, S);
  const v = { ox: S * 0.5, oy: S * 0.5, k: S / 46 };
  c.strokeStyle = '#2c455d'; c.lineWidth = Math.max(1, S * 0.012);
  for (const r of [7, 13, 19]) { c.beginPath(); c.arc(v.ox, v.oy, r * v.k, 0, 7); c.stroke(); }
  const a = -40 * D - Math.PI / 2;
  if (c.createConicGradient) {
    const g = c.createConicGradient(a - 1, v.ox, v.oy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1 / (2 * Math.PI), 'rgba(148,188,227,0.45)'); g.addColorStop(1 / (2 * Math.PI) + 0.001, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(v.ox, v.oy); c.arc(v.ox, v.oy, S, a - 1, a); c.closePath(); c.fill();
  }
  c.lineCap = 'butt';
  const k2 = { ox: v.ox, oy: v.oy, k: S / 9 };
  for (const R of RUNWAYS) line(c, k2, [R.a, R.b], t.runway, S * 0.05);
  c.fillStyle = '#b5d9fd'; const b = S * 0.045; c.fillRect(S * 0.7 - b, S * 0.27 - b, b * 2, b * 2);
}

const LAYOUTS = {
  LHBP: { rw: [[128, 1.6, 0.5, 0.35, '13L', '31R'], [128, 1.6, -0.5, -0.35, '13R', '31L']] },
  LOWW: { rw: [[115, 1.9, 0.2, -0.6, '11', '29'], [164, 1.95, -0.9, 0.9, '16', '34']] },
  EPWA: { rw: [[113, 2.0, 0, 0, '11', '29'], [150, 1.5, 0.1, 0.2, '15', '33']] }
};
function drawLayout(c, W, Hh, id, t) {
  c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, W, Hh);
  const L = LAYOUTS[id], k = Math.min(W, Hh) / 3.4, v = { ox: W / 2, oy: Hh / 2, k };
  c.strokeStyle = t.rangeRing; c.lineWidth = 1; c.beginPath(); c.arc(v.ox, v.oy, Math.min(W, Hh) / 2 - 4, 0, 7); c.stroke();
  c.font = F.chip; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const [h, len, off, stag, n1, n2] of L.rw) {
    const u = hv(h), n = [u[1], -u[0]], cx = n[0] * off + u[0] * stag, cy = n[1] * off + u[1] * stag;
    const a = [cx - u[0] * len / 2, cy - u[1] * len / 2], b = [cx + u[0] * len / 2, cy + u[1] * len / 2];
    line(c, v, [a, b], t.runway, 3);
    const [ax, ay] = P(v, a[0], a[1]), [bx, by] = P(v, b[0], b[1]);
    c.fillStyle = t.runwayLabel; c.fillText(n1, ax - u[0] * 10, ay - u[1] * 10); c.fillText(n2, bx + u[0] * 10, by + u[1] * 10);
  }
  c.textBaseline = 'alphabetic';
}

// Mock scenes (scenes(), drawStates, renderOne/renderAll) omitted from this
// reference copy: they only drive the design canvas. See the design project.

window.PrivoRadar = { THEMES, THR, RUNWAYS, FIXES, RINGS, U, N, hv, thrPt, pad3, setup, draw, labelSpec, drawIcon, drawLayout };
})();
