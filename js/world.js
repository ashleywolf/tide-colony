// Tile types
export const TILE = {
  AIR: 0,
  SAND: 1,
  ROCK: 2,
  CORAL: 3,
  WATER: 4,
  DIRT: 5,
  PALM_TRUNK: 6,
  PALM_LEAVES: 7,
};

// Colors for each tile type (day / night variants)
export const TILE_COLORS = {
  [TILE.AIR]:         { day: 'rgba(0,0,0,0)',      night: 'rgba(0,0,0,0)' },
  [TILE.SAND]:        { day: '#e8d5a3',            night: '#8a7a5a' },
  [TILE.ROCK]:        { day: '#7a7a7a',            night: '#4a4a4a' },
  [TILE.CORAL]:       { day: '#e87070',            night: '#8a4040' },
  [TILE.WATER]:       { day: 'rgba(40,120,200,0.7)', night: 'rgba(20,60,120,0.7)' },
  [TILE.DIRT]:        { day: '#8a6a3a',            night: '#5a4020' },
  [TILE.PALM_TRUNK]:  { day: '#6a4a2a',            night: '#3a2a1a' },
  [TILE.PALM_LEAVES]: { day: '#2a8a2a',            night: '#1a4a1a' },
};

export const WORLD_WIDTH = 80;
export const WORLD_HEIGHT = 50;
export const TILE_SIZE = 16;
export const SEA_LEVEL = 35; // row index where ocean starts

export class World {
  constructor() {
    this.width = WORLD_WIDTH;
    this.height = WORLD_HEIGHT;
    this.tiles = new Uint8Array(this.width * this.height);
    this.waterLevel = new Float32Array(this.width * this.height); // 0-1 water amount per tile
    this.generate();
  }

  idx(x, y) {
    return y * this.width + x;
  }

  get(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return TILE.ROCK;
    return this.tiles[this.idx(x, y)];
  }

  set(x, y, tile) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.tiles[this.idx(x, y)] = tile;
  }

  getWater(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.waterLevel[this.idx(x, y)];
  }

  setWater(x, y, amount) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.waterLevel[this.idx(x, y)] = Math.max(0, Math.min(1, amount));
  }

  isSolid(x, y) {
    const t = this.get(x, y);
    return t === TILE.SAND || t === TILE.ROCK || t === TILE.CORAL ||
           t === TILE.DIRT || t === TILE.PALM_TRUNK;
  }

  isWalkable(x, y) {
    // Walkable if tile is air/water and tile below is solid
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    const tile = this.get(x, y);
    if (this.isSolid(x, y)) return false;
    // Must have ground below (or be at bottom)
    if (y >= this.height - 1) return true;
    return this.isSolid(x, y + 1);
  }

  generate() {
    // Create island shape using layered sine waves
    const islandCenter = this.width / 2;
    const islandWidth = this.width * 0.6;

    for (let x = 0; x < this.width; x++) {
      // Island height profile: bell curve + noise
      const distFromCenter = Math.abs(x - islandCenter) / (islandWidth / 2);
      const baseHeight = Math.max(0, 1 - distFromCenter * distFromCenter);
      const noise = Math.sin(x * 0.5) * 0.08 + Math.sin(x * 1.3) * 0.04 + Math.sin(x * 3.7) * 0.02;
      const heightFraction = baseHeight * 0.5 + noise;
      const surfaceY = SEA_LEVEL - Math.floor(heightFraction * 18);

      for (let y = 0; y < this.height; y++) {
        if (y < surfaceY) {
          this.set(x, y, TILE.AIR);
        } else if (y === surfaceY && y < SEA_LEVEL) {
          this.set(x, y, TILE.SAND);
        } else if (y < SEA_LEVEL) {
          // Below surface but above sea: dirt then rock
          if (y - surfaceY < 3) {
            this.set(x, y, TILE.SAND);
          } else if (y - surfaceY < 6) {
            this.set(x, y, TILE.DIRT);
          } else {
            this.set(x, y, TILE.ROCK);
          }
        } else if (y === SEA_LEVEL && surfaceY <= SEA_LEVEL) {
          // Beach sand at sea level
          this.set(x, y, distFromCenter < 0.7 ? TILE.SAND : TILE.AIR);
        } else {
          // Below sea level: water or seabed
          if (distFromCenter < 0.5 && y < SEA_LEVEL + 3) {
            this.set(x, y, TILE.SAND);
          } else if (y > this.height - 4) {
            this.set(x, y, TILE.ROCK);
          } else {
            this.set(x, y, TILE.AIR);
            this.setWater(x, y, 1.0);
          }
        }
      }
    }

    // Add coral patches underwater
    for (let i = 0; i < 15; i++) {
      const cx = Math.floor(Math.random() * this.width);
      const cy = SEA_LEVEL + 2 + Math.floor(Math.random() * 8);
      if (cx < 10 || cx > this.width - 10) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (Math.random() > 0.4) {
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                if (this.get(nx, ny) === TILE.AIR && this.getWater(nx, ny) > 0) {
                  this.set(nx, ny, TILE.CORAL);
                }
              }
            }
          }
        }
      }
    }

    // Add palm trees on the island surface
    for (let x = 15; x < this.width - 15; x += 4 + Math.floor(Math.random() * 6)) {
      // Find surface
      for (let y = 0; y < SEA_LEVEL; y++) {
        if (this.get(x, y) === TILE.SAND && this.get(x, y - 1) === TILE.AIR) {
          // Place trunk (3 tiles tall)
          const trunkHeight = 3 + Math.floor(Math.random() * 2);
          for (let h = 1; h <= trunkHeight; h++) {
            if (y - h >= 0) this.set(x, y - h, TILE.PALM_TRUNK);
          }
          // Place leaves
          const topY = y - trunkHeight - 1;
          if (topY >= 0) this.set(x, topY, TILE.PALM_LEAVES);
          if (topY >= 0 && x > 0) this.set(x - 1, topY, TILE.PALM_LEAVES);
          if (topY >= 0 && x < this.width - 1) this.set(x + 1, topY, TILE.PALM_LEAVES);
          if (topY - 1 >= 0) this.set(x, topY - 1, TILE.PALM_LEAVES);
          break;
        }
      }
    }

    // Fill ocean on both sides
    for (let x = 0; x < this.width; x++) {
      for (let y = SEA_LEVEL; y < this.height; y++) {
        if (!this.isSolid(x, y) && this.getWater(x, y) === 0) {
          this.setWater(x, y, 1.0);
        }
      }
    }
  }

  // Find the surface Y for a given X (topmost solid tile)
  getSurfaceY(x) {
    for (let y = 0; y < this.height; y++) {
      if (this.isSolid(x, y)) return y;
    }
    return this.height;
  }
}
