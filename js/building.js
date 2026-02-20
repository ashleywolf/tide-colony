import { TILE } from './world.js';

export const BUILDING_TYPES = {
  hut: {
    name: 'Hut',
    cost: { wood: 3, coral: 1 },
    solid: true,
    description: 'Shelter for islanders to rest',
  },
  seawall: {
    name: 'Seawall',
    cost: { rock: 2, coral: 2 },
    solid: true,
    blocksWater: true,
    description: 'Blocks water flow',
  },
  collector: {
    name: 'Rain Collector',
    cost: { wood: 2, coral: 1 },
    solid: false,
    produces: 'water',
    description: 'Collects fresh water when it rains',
  },
  fishing: {
    name: 'Fishing Station',
    cost: { wood: 3 },
    solid: false,
    produces: 'fish',
    description: 'Islanders fish here for food',
  },
  bridge: {
    name: 'Bridge',
    cost: { wood: 4 },
    solid: false,
    walkable: true,
    description: 'Walk over water',
  },
};

export class Building {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = BUILDING_TYPES[type];
    this.productionTimer = 0;
  }

  update(resources) {
    // Production buildings generate resources over time
    if (this.config.produces) {
      this.productionTimer++;
      if (this.productionTimer >= 200) { // ~6.5 seconds at 30fps
        this.productionTimer = 0;
        const res = this.config.produces;
        resources[res] = (resources[res] || 0) + 1;
      }
    }
  }
}

export class BuildingManager {
  constructor(world) {
    this.world = world;
    this.buildings = [];
  }

  canPlace(x, y, type) {
    // Can't place on solid tiles
    if (this.world.isSolid(x, y)) return false;
    // Can't place where a building already exists
    if (this.buildings.some(b => b.x === x && b.y === y)) return false;
    // Must have solid ground below (except fishing station — needs water)
    if (type === 'fishing') {
      return this.world.getWater(x, y) > 0 || this.world.getWater(x, y + 1) > 0;
    }
    return y + 1 < this.world.height && this.world.isSolid(x, y + 1);
  }

  canAfford(type, resources) {
    const cost = BUILDING_TYPES[type].cost;
    for (const [res, amount] of Object.entries(cost)) {
      if ((resources[res] || 0) < amount) return false;
    }
    return true;
  }

  place(x, y, type, resources) {
    if (!this.canPlace(x, y, type)) return false;
    if (!this.canAfford(type, resources)) return false;

    // Deduct cost
    const cost = BUILDING_TYPES[type].cost;
    for (const [res, amount] of Object.entries(cost)) {
      resources[res] -= amount;
    }

    const building = new Building(x, y, type);
    this.buildings.push(building);

    // Seawalls block water
    if (building.config.blocksWater) {
      this.world.set(x, y, TILE.ROCK);
      this.world.setWater(x, y, 0);
    }

    return true;
  }

  update(resources) {
    for (const b of this.buildings) {
      b.update(resources);
    }
  }
}
