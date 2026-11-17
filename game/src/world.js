// Sunset Bay city generation: a fixed road grid, blocks of buildings,
// Bay Park, the beach and pier at the south edge, and the marina.
// Collision is against building rectangles only; roads and sidewalks are open.
import { BLOCK, PALETTE, PLACES, ROAD, ROOF_COLORS, WALL_COLORS, WORLD_H, WORLD_W } from './config.js';
import { clamp, pick } from './random.js';

export const ROAD_X = [];
export const ROAD_Y = [];
for (let x = 160; x < WORLD_W; x += BLOCK) ROAD_X.push(x);
for (let y = 160; y < WORLD_H; y += BLOCK) ROAD_Y.push(y);

export function isOnRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) < ROAD / 2 + 8) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) < ROAD / 2 + 8) return true;
  return false;
}

export function nearestRoadPoint(x, y) {
  let bestX = ROAD_X[0];
  let bestY = ROAD_Y[0];
  let bestDx = Infinity;
  let bestDy = Infinity;
  for (const rx of ROAD_X) { const d = Math.abs(x - rx); if (d < bestDx) { bestDx = d; bestX = rx; } }
  for (const ry of ROAD_Y) { const d = Math.abs(y - ry); if (d < bestDy) { bestDy = d; bestY = ry; } }
  return bestDx < bestDy ? { x: bestX, y } : { x, y: bestY };
}

export function buildCity(random) {
  const buildings = [];
  const trees = [];
  const lamps = [];
  // Blocks between roads: one or two buildings per block, skipping the park
  // and the beach strip at the south edge.
  for (let bx = 0; bx < 8; bx += 1) {
    for (let by = 0; by < 6; by += 1) {
      const blockX = 160 + bx * BLOCK + ROAD / 2;
      const blockY = 160 + by * BLOCK + ROAD / 2;
      const blockW = BLOCK - ROAD;
      const blockH = BLOCK - ROAD;
      const centreX = blockX + blockW / 2;
      const centreY = blockY + blockH / 2;
      // Bay Park occupies the block at (1,1); the beach is below y=1824.
      if (bx === 1 && by === 1) {
        for (let i = 0; i < 14; i += 1) {
          trees.push({ x: blockX + 20 + random() * (blockW - 40), y: blockY + 20 + random() * (blockH - 40), r: 12 + random() * 8 });
        }
        continue;
      }
      if (blockY > 1700) continue;
      const count = random() < 0.5 ? 1 : 2;
      for (let i = 0; i < count; i += 1) {
        const w = count === 1 ? blockW - 40 : (blockW - 60) / 2;
        const h = count === 1 ? blockH - 40 : blockH - 40;
        const x = count === 1 ? centreX - w / 2 : blockX + 20 + i * (w + 20);
        const y = centreY - h / 2;
        buildings.push({
          x, y, w, h,
          roof: pick(random, ROOF_COLORS),
          wall: pick(random, WALL_COLORS),
          height: 1 + Math.floor(random() * 3),
          windows: Math.floor(random() * 4),
        });
      }
      if (random() < 0.7) trees.push({ x: blockX + 16 + random() * 30, y: blockY + 16 + random() * 30, r: 10 + random() * 6 });
    }
  }
  // Street lamps along the roads.
  for (const rx of ROAD_X) for (const ry of ROAD_Y) lamps.push({ x: rx + ROAD / 2 - 6, y: ry + ROAD / 2 - 6 });
  // Palm trees along the beach.
  for (let x = 120; x < WORLD_W; x += 160) trees.push({ x: x + random() * 60, y: 1880 + random() * 60, r: 13 });
  return { buildings, trees, lamps };
}

export function collidesWithBuildings(buildings, x, y, radius) {
  for (const b of buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return b;
  }
  return null;
}

export function clampToWorld(x, y, margin) {
  return {
    x: clamp(x, margin, WORLD_W - margin),
    y: clamp(y, margin, WORLD_H - margin),
  };
}

// Free spawn points: on a road, away from buildings.
export function roadSpawn(random, minX, maxX, minY, maxY) {
  const rx = ROAD_X[Math.floor(random() * ROAD_X.length)];
  const ry = ROAD_Y[Math.floor(random() * ROAD_Y.length)];
  return {
    x: clamp(rx + (random() - 0.5) * 40, minX ?? 200, maxX ?? WORLD_W - 200),
    y: clamp(ry + (random() - 0.5) * 40, minY ?? 200, maxY ?? WORLD_H - 200),
  };
}

export { PALETTE, PLACES };
