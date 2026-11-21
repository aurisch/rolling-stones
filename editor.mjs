import {center, columns, example, key, path, rows, simulate, start, tallExample, vertex, rise} from './track.mjs';

const $ = id => document.getElementById(id);
const board = $('board');
const types = [
  ['select', '☝', 'Auswählen'], ['straight', '━', 'Gerade'],
  ['curve120', '╭', 'Weite Kurve'], ['curve60', '↶', 'Enge Kurve'],
  ['down', '↘', 'Gefälle'], ['up', '↗', 'Steigung'],
  ['support', '▣', 'Stütze'], ['end', '⚑', 'Ziel'], ['erase', '×', 'Entfernen'],
];
const colors = {support: '#bdc9bd', end: '#85d3a4', down: '#ffda85', up: '#ffda85'};
const startKey = key(...start);
const storageKey = 'rolling-stones-v1';
const savedTypes = new Set(types.slice(1, -1).map(([type]) => type));
const openTallExample = new URLSearchParams(location.search).get('bahn') === 'hoch';
const tallExampleNotice = 'Die hohe Beispielbahn startet auf Ebene 12. Drück auf ▶.';
let tiles = openTallExample ? tallExample() : example();
let selection = null;
let tool = 'straight';
let rotation = 0;
let ball;
let frame;
let playing = false;
let view3d = false;
let load3d;
const history = [];
const cells = new Map();
const notice = text => { $('status').textContent = text; };

function svg(tag, attributes, parent) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  parent.append(element);
  return element;
}

for (let y = 0; y < rows; y++) {
  for (let x = 0; x < columns; x++) {
    const id = key(x, y);
    const c = center(x, y);
    const group = svg('g', {class: 'cell', role: 'button', tabindex: 0}, board);
    svg('polygon', {
      points: Array.from({length: 6}, (_, i) => {
        const p = vertex(c, i);
        return p.x + ',' + p.y;
      }).join(' '),
    }, group);
    group.addEventListener('click', () => place(id));
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        place(id);
      }
    });
    cells.set(id, {group, c, x, y});
  }
}
const marble = svg('circle', {r: 9, fill: '#2761dd', stroke: '#fff', 'stroke-width': 2, 'pointer-events': 'none'}, board);

function initialBall() {
  return path(...start, tiles.get(startKey)).point(0.5);
}
function updateBall() {
  const p = ball ?? initialBall();
  marble.setAttribute('cx', p.x);
  marble.setAttribute('cy', p.y);
  if (view3d) window.dispatchEvent(new CustomEvent('rolling-update', {detail: {tiles, ball: p}}));
}
function draw() {
  for (const [id, {group, c, x, y}] of cells) {
    const tile = tiles.get(id);
    const polygon = group.firstElementChild;
    while (group.lastElementChild !== polygon) group.lastElementChild.remove();
    const label = tile?.locked ? 'Start' : types.find(([type]) => type === tile?.type)?.[2] ?? 'Freies Feld';
    group.setAttribute('aria-label', `${label}, Spalte ${x+1}, Reihe ${y+1}`);
    group.setAttribute('aria-pressed', String(id === selection));
    polygon.setAttribute('fill', tile?.locked ? '#f4ae66' : tile ? colors[tile.type] ?? '#ffefc9' : '#f4f9f2');
    polygon.setAttribute('stroke', id === selection ? '#146454' : '#9db6a6');
    polygon.setAttribute('stroke-width', id === selection ? 3 : 1.4);
    if (!tile) continue;
    if (tile.type !== 'support') {
      const track = {d: path(x, y, tile).svg, fill: 'none', 'stroke-linecap': 'round'};
      svg('path', {...track, stroke: '#254d53', 'stroke-width': 10}, group);
      svg('path', {...track, stroke: '#fcffef', 'stroke-width': 3}, group);
      if (rise(tile)) {
        const high = path(x, y, tile).point(rise(tile) > 0 ? 0.78 : 0.22);
        svg('circle', {cx: high.x, cy: high.y, r: 5, fill: '#254d53', stroke: '#fff', 'stroke-width': 1.5}, group);
      }
    }
    svg('text', {x: c.x, y: c.y + 22, 'text-anchor': 'middle', fill: '#142d33', 'font-size': 13, 'font-weight': 700}, group)
      .textContent = tile.type === 'end' ? '⚑' : tile.type === 'support' ? '▣' : tile.z || '';
  }
  for (const id of ['rotate', 'lower', 'raise']) $(id).disabled = playing || !tiles.has(selection) || tiles.get(selection).locked;
  $('undo').disabled = !history.length;
  $('play').disabled = playing;
  updateBall();
}
function remember() {
  history.push(new Map(tiles));
  if (history.length > 60) history.shift();
  ball = undefined;
}
function place(id) {
  if (playing) return;
  selection = id;
  const tile = tiles.get(id);
  if (tile?.locked) notice('Hier startet die Kugel.');
  else if (tool === 'erase' && tile) {
    remember();
    tiles.delete(id);
  } else if (tool !== 'erase' && tool !== 'select' && tile?.type !== tool) {
    remember();
    tiles.set(id, {type: tool, rot: rotation, z: Math.max(tool === 'down' ? 1 : 0, tile?.z ?? 0)});
  }
  draw();
}
function edit(update) {
  const tile = tiles.get(selection);
  if (playing || !tile || tile.locked) return;
  const next = update(tile);
  if (next.z === tile.z && next.rot === tile.rot) return;
  remember();
  tiles.set(selection, next);
  draw();
  notice(`Ausrichtung ${next.rot * 60}°, Höhe ${next.z}.`);
}
function stop() {
  cancelAnimationFrame(frame);
  playing = false;
  ball = undefined;
}
function run() {
  if (playing) return;
  const {frames, message} = simulate(tiles);
  const end = frames.at(-1);
  let started;
  let index = 0;
  playing = true;
  notice('Die Kugel rollt …');
  draw();
  function tick(now) {
    started ??= now;
    const time = (now - started) / 1000;
    if (time >= end.time) {
      ball = end;
      playing = false;
      draw();
      notice(message);
      return;
    }
    while (frames[index + 1].time <= time) index++;
    const a = frames[index], b = frames[index + 1];
    const t = (time - a.time) / (b.time - a.time);
    ball = {x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t, height: a.height + (b.height-a.height)*t};
    updateBall();
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
}

for (const [id, icon, label] of types) {
  const button = document.createElement('button');
  button.className = 'tool';
  const symbol = document.createElement('span');
  symbol.setAttribute('aria-hidden', 'true');
  symbol.textContent = icon;
  button.append(symbol, label);
  button.dataset.tool = id;
  button.setAttribute('aria-pressed', String(id === tool));
  button.onclick = () => {
    tool = id;
    for (const item of $('tools').children) item.setAttribute('aria-pressed', String(item.dataset.tool === tool));
  };
  $('tools').append(button);
}

$('rotate').onclick = () => edit(tile => {
  rotation = (tile.rot + 1) % 6;
  return {...tile, rot: rotation};
});
function changeHeight(delta) {
  edit(tile => ({...tile, z: Math.max(tile.type === 'down' ? 1 : 0, Math.min(12, tile.z + delta))}));
}
$('lower').onclick = () => changeHeight(-1);
$('raise').onclick = () => changeHeight(1);
$('play').onclick = run;
$('reset').onclick = () => { stop(); draw(); notice('Die Kugel ist wieder am Start.'); };
$('undo').onclick = () => {
  if (!history.length) return;
  stop();
  tiles = history.pop();
  draw();
  notice('Letzte Änderung rückgängig gemacht.');
};
function replace(next, message) {
  stop();
  remember();
  tiles = next;
  selection = null;
  draw();
  notice(message);
}
$('clear').onclick = () => replace(example(), 'Die Beispielbahn ist bereit.');
$('tall').onclick = () => replace(tallExample(), tallExampleNotice);
$('empty').onclick = () => replace(new Map([[startKey, example().get(startKey)]]), 'Setz das erste Bauteil hinter den Start.');
$('save').onclick = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify({version: 2, tiles: [...tiles]}));
    notice('Bahn gespeichert.');
  } catch {
    notice('Diese Bahn konnte nicht gespeichert werden.');
  }
};
$('load').onclick = () => {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) { notice('Es gibt noch keine gespeicherte Bahn.'); return; }
    const saved = JSON.parse(raw);
    const legacy = Array.isArray(saved);
    const next = new Map(legacy ? saved : saved.tiles);
    for (const [id, tile] of next) {
      if (!cells.has(id) || !savedTypes.has(tile?.type) ||
          !Number.isInteger(tile.rot) || tile.rot < 0 || tile.rot > 5 ||
          !Number.isInteger(tile.z) || tile.z < 0 || tile.z > 12) throw new Error('Invalid tile');
      const locked = id === startKey;
      next.set(id, {...tile, locked, rot: legacy && locked ? (tile.rot + 3) % 6 : tile.rot});
    }
    if (next.get(startKey)?.type !== 'down') throw new Error('Invalid start');
    replace(next, 'Bahn geladen.');
  } catch {
    notice('Die gespeicherte Bahn konnte nicht geladen werden.');
  }
};

$('toggle3d').onclick = async () => {
  if (!view3d) {
    $('toggle3d').disabled = true;
    try {
      load3d ??= import('./render3d.js');
      await load3d;
    } catch {
      notice('3D ist auf diesem Gerät gerade nicht verfügbar.');
      return;
    } finally {
      $('toggle3d').disabled = false;
    }
  }
  view3d = !view3d;
  $('toggle3d').setAttribute('aria-pressed', String(view3d));
  $('toggle3d').textContent = view3d ? '⬡ Bauen' : '◇ 3D';
  board.classList.toggle('hidden', view3d);
  $('view3d').classList.toggle('active', view3d);
  updateBall();
};
draw();
if (openTallExample) notice(tallExampleNotice);
