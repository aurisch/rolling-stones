export const radius = 36;
export const hexHeight = Math.sqrt(3) * radius;
export const columns = 11;
export const rows = 8;
export const start = [1, 3];
export const key = (x, y) => x + ',' + y;
export const center = (x, y) => ({
  x: 52 + x * 1.5 * radius,
  y: 55 + (y + (x % 2) / 2) * hexHeight,
});
export const vertex = (c, i) => ({
  x: c.x + radius * Math.cos(Math.PI * i / 3),
  y: c.y + radius * Math.sin(Math.PI * i / 3),
});
export const opposite = side => (side + 3) % 6;
export function neighbor(x, y, side) {
  const parity = x % 2;
  const [dx, dy] = [[1, parity], [0, 1], [-1, parity], [-1, parity - 1], [0, -1], [1, parity - 1]][side];
  return [x + dx, y + dy];
}
export function ports(tile) {
  const span = tile.type === 'curve60' ? 1 : tile.type === 'curve120' ? 2 : 3;
  return [tile.rot, (tile.rot + span) % 6];
}
export function rise(tile) {
  return tile.type === 'down' ? -1 : tile.type === 'up' ? 1 : 0;
}
export function heightAt(tile, side) {
  return tile.z + (side === ports(tile)[1] ? rise(tile) : 0);
}
export function path(x, y, tile) {
  const c = center(x, y);
  const [a, b] = ports(tile);
  const edge = i => {
    const p = vertex(c, i), q = vertex(c, i + 1);
    return {x: (p.x + q.x) / 2, y: (p.y + q.y) / 2};
  };
  const p = edge(a), q = edge(b);
  const curved = tile.type === 'curve60' || tile.type === 'curve120';
  // Radial endpoint tangents let paired rails meet without a sideways step.
  const handle = t => ({x: t.x + (c.x - t.x) * 0.55, y: t.y + (c.y - t.y) * 0.55});
  const h1 = handle(p), h2 = handle(q);
  const cubic = (a, b, c, d, t, u) => u*u*u*a + 3*u*u*t*b + 3*u*t*t*c + t*t*t*d;
  const point = t => {
    const u = 1 - t;
    return {
      x: curved ? cubic(p.x, h1.x, h2.x, q.x, t, u) : u*p.x + t*q.x,
      y: curved ? cubic(p.y, h1.y, h2.y, q.y, t, u) : u*p.y + t*q.y,
      height: (tile.z + rise(tile)*t)*15 + 9,
    };
  };
  return {point, svg: `M${p.x} ${p.y} ${curved ? `C${h1.x} ${h1.y} ${h2.x} ${h2.y}` : 'L'} ${q.x} ${q.y}`};
}

function exampleTiles(pieces) {
  return new Map(pieces.map(([x, y, type, rot, z], index) =>
    [key(x, y), {type, rot, z, locked: index === 0}]));
}

export function example() {
  return exampleTiles([
    [1, 3, 'down', 3, 2], [2, 4, 'straight', 3, 1],
    [3, 4, 'curve120', 1, 1], [3, 5, 'curve120', 4, 1],
    [4, 6, 'down', 3, 1], [5, 6, 'straight', 3, 0],
    [6, 7, 'end', 3, 0],
  ]);
}

export function tallExample() {
  return exampleTiles([
    [1, 3, 'down', 3, 12],
    [2, 4, 'down', 3, 11],
    [3, 4, 'curve60', 3, 10],
    [3, 3, 'down', 1, 10],
    [3, 2, 'down', 1, 9],
    [3, 1, 'straight', 1, 8],
    [3, 0, 'curve60', 0, 8],
    [4, 1, 'curve120', 1, 8],
    [4, 2, 'down', 4, 8],
    [4, 3, 'down', 4, 7],
    [4, 4, 'down', 4, 6],
    [4, 5, 'straight', 4, 5],
    [4, 6, 'down', 4, 5],
    [4, 7, 'curve60', 4, 4],
    [5, 6, 'curve120', 2, 4],
    [5, 5, 'down', 1, 4],
    [5, 4, 'up', 1, 3],
    [5, 3, 'down', 1, 4],
    [5, 2, 'straight', 1, 3],
    [5, 1, 'curve60', 0, 3],
    [6, 2, 'curve120', 1, 3],
    [6, 3, 'straight', 4, 3],
    [6, 4, 'down', 4, 3],
    [6, 5, 'straight', 4, 2],
    [6, 6, 'down', 4, 2],
    [6, 7, 'curve60', 4, 1],
    [7, 6, 'straight', 2, 1],
    [8, 6, 'curve120', 0, 1],
    [9, 6, 'straight', 3, 1],
    [10, 7, 'curve60', 3, 1],
    [10, 6, 'down', 1, 1],
    [10, 5, 'straight', 1, 0],
    [10, 4, 'straight', 1, 0],
    [10, 3, 'end', 1, 0],
  ]);
}

export function simulate(tiles) {
  let [x, y] = start;
  let entry = null;
  let energy = 0;
  let duration = 0;
  const frames = [];
  const visited = new Set();
  let message;
  while (true) {
    const tile = tiles.get(key(x, y));
    const id = key(x, y) + ',' + entry;
    if (visited.has(id)) {
      message = 'Die Bahn führt im Kreis.';
      break;
    }
    visited.add(id);
    const [a, b] = ports(tile);
    const forward = entry !== b;
    const begin = entry === null ? 0.5 : forward ? 0 : 1;
    const end = tile.type === 'end' ? 0.5 : forward ? 1 : 0;
    const {point} = path(x, y, tile);
    let previous = point(begin);
    const loss = tile.type === 'curve60' ? 0.28 : tile.type === 'curve120' ? 0.16 : 0.06;
    frames.push({...previous, time: duration});
    for (let step = 1; step <= 32; step++) {
      const next = point(begin + (end - begin) * step / 32);
      const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
      // Squared speed is proportional to rolling kinetic energy, including rotation.
      const change = (previous.height - next.height) * 0.12 - loss * distance / hexHeight;
      const nextEnergy = Math.max(0, energy + change);
      const fraction = energy + change < 0 ? energy / -change : 1;
      const speed = Math.sqrt(energy) + Math.sqrt(nextEnergy);
      if (speed > 0) duration += 2 * distance * fraction / (speed * 85);
      frames.push({
        x: previous.x + (next.x - previous.x) * fraction,
        y: previous.y + (next.y - previous.y) * fraction,
        height: previous.height + (next.height - previous.height) * fraction,
        time: duration,
      });
      if (nextEnergy === 0) return {frames, message: 'Die Kugel bleibt stehen. Probier mehr Gefälle.'};
      energy = nextEnergy;
      previous = next;
    }
    if (tile.type === 'end') {
      message = 'Geschafft! Die Kugel ist im Ziel.';
      break;
    }
    const exit = forward ? b : a;
    const [nx, ny] = neighbor(x, y, exit);
    const next = tiles.get(key(nx, ny));
    entry = opposite(exit);
    if (!next || next.type === 'support' || !ports(next).includes(entry)) {
      message = 'Hier fehlt ein passender Anschluss.';
      break;
    }
    if (heightAt(tile, exit) !== heightAt(next, entry)) {
      message = 'Hier treffen die Schienen auf unterschiedlichen Höhen aufeinander.';
      break;
    }
    [x, y] = [nx, ny];
  }
  return {frames, message};
}
