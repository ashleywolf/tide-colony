import { SEA_LEVEL, TILE } from './world.js';

const TIDE_PERIOD = 600; // frames per full tide cycle (~20 seconds at 30fps)
const TIDE_AMPLITUDE = 3; // tiles of tide swing

export class WaterSim {
  constructor(world) {
    this.world = world;
    this.tidePhase = 0;
    this.tideLevel = 0; // -AMPLITUDE to +AMPLITUDE relative to SEA_LEVEL
    this.tideNormalized = 0.5; // 0-1 for HUD
  }

  update() {
    this.tidePhase += 1;
    const t = (this.tidePhase % TIDE_PERIOD) / TIDE_PERIOD;
    this.tideLevel = Math.sin(t * Math.PI * 2) * TIDE_AMPLITUDE;
    this.tideNormalized = (Math.sin(t * Math.PI * 2) + 1) / 2;

    this.applyTide();
    this.flowWater();
  }

  applyTide() {
    const world = this.world;
    const effectiveSeaLevel = SEA_LEVEL + Math.round(this.tideLevel);

    // Fill/drain ocean edges based on tide
    for (let x = 0; x < world.width; x++) {
      for (let y = Math.max(0, SEA_LEVEL - TIDE_AMPLITUDE - 1); y < world.height; y++) {
        const isOceanColumn = x < 12 || x > world.width - 12;
        if (!isOceanColumn) continue;

        if (!world.isSolid(x, y)) {
          if (y >= effectiveSeaLevel) {
            world.setWater(x, y, 1.0);
          } else if (y >= SEA_LEVEL - TIDE_AMPLITUDE) {
            world.setWater(x, y, 0);
          }
        }
      }
    }

    // Also fill water at the tide line for the beach area
    for (let x = 0; x < world.width; x++) {
      const surfaceY = world.getSurfaceY(x);
      if (surfaceY >= effectiveSeaLevel && surfaceY <= SEA_LEVEL + TIDE_AMPLITUDE + 2) {
        for (let y = effectiveSeaLevel; y < surfaceY; y++) {
          if (!world.isSolid(x, y)) {
            world.setWater(x, y, 0.8);
          }
        }
        // Drain above tide
        for (let y = SEA_LEVEL - TIDE_AMPLITUDE - 1; y < effectiveSeaLevel; y++) {
          if (y >= 0 && !world.isSolid(x, y) && world.getWater(x, y) > 0) {
            world.setWater(x, y, Math.max(0, world.getWater(x, y) - 0.05));
          }
        }
      }
    }
  }

  flowWater() {
    const world = this.world;
    // Simple cellular automaton water flow (run a subset each frame for perf)
    const startX = Math.floor(Math.random() * (world.width - 20));
    const range = 20;

    for (let x = startX; x < startX + range && x < world.width; x++) {
      for (let y = world.height - 2; y >= 0; y--) {
        const water = world.getWater(x, y);
        if (water <= 0 || world.isSolid(x, y)) continue;

        // Flow down
        if (y + 1 < world.height && !world.isSolid(x, y + 1)) {
          const below = world.getWater(x, y + 1);
          if (below < 1) {
            const flow = Math.min(water, 1 - below, 0.2);
            world.setWater(x, y, water - flow);
            world.setWater(x, y + 1, below + flow);
            continue;
          }
        }

        // Flow sideways
        for (const dx of [-1, 1]) {
          const nx = x + dx;
          if (nx < 0 || nx >= world.width) continue;
          if (world.isSolid(nx, y)) continue;
          const neighbor = world.getWater(nx, y);
          if (neighbor < water - 0.01) {
            const flow = Math.min((water - neighbor) * 0.25, 0.1);
            world.setWater(x, y, world.getWater(x, y) - flow);
            world.setWater(nx, y, neighbor + flow);
          }
        }
      }
    }
  }
}
