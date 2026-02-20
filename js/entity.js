import { TILE_SIZE } from './world.js';

const ISLANDER_NAMES = [
  'Kai', 'Lani', 'Moana', 'Koa', 'Nalu', 'Hina', 'Makoa', 'Alohi',
  'Keanu', 'Malia', 'Tane', 'Aria', 'Reef', 'Coral', 'Sunny', 'Wave',
];
const ISLANDER_COLORS = ['#e06040', '#4080e0', '#40c060', '#c0a040', '#c040c0', '#40c0c0'];

let nextId = 0;

export class Islander {
  constructor(x, y) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.name = ISLANDER_NAMES[this.id % ISLANDER_NAMES.length];
    this.color = ISLANDER_COLORS[this.id % ISLANDER_COLORS.length];

    // Needs (0 = critical, 100 = full)
    this.hunger = 80 + Math.random() * 20;
    this.thirst = 80 + Math.random() * 20;
    this.rest = 80 + Math.random() * 20;

    this.currentTask = 'idle';
    this.taskTimer = 0;
    this.selected = false;
    this.path = [];
    this.moveTimer = 0;
  }

  update(world, buildings, resources) {
    // Decay needs
    this.hunger = Math.max(0, this.hunger - 0.02);
    this.thirst = Math.max(0, this.thirst - 0.03);
    this.rest = Math.max(0, this.rest - 0.015);

    // Decide task based on needs
    if (this.taskTimer > 0) {
      this.taskTimer--;
      if (this.taskTimer === 0) {
        this.completeTask(resources);
      }
      return;
    }

    // Priority: critical needs first
    if (this.thirst < 30) {
      this.startTask('drink', world, buildings);
    } else if (this.hunger < 30) {
      this.startTask('eat', world, buildings);
    } else if (this.rest < 20) {
      this.startTask('sleep', world, buildings);
    } else if (this.currentTask === 'idle') {
      // Pick a useful task
      const tasks = ['gather', 'fish', 'idle'];
      this.startTask(tasks[Math.floor(Math.random() * tasks.length)], world, buildings);
    }

    // Move along path
    this.moveTimer++;
    if (this.path.length > 0 && this.moveTimer >= 8) {
      this.moveTimer = 0;
      const next = this.path.shift();
      if (next && !world.isSolid(next.x, next.y)) {
        this.x = next.x;
        this.y = next.y;
      }
    }

    // Wander if idle
    if (this.currentTask === 'idle' && this.path.length === 0 && Math.random() < 0.02) {
      const dx = Math.random() < 0.5 ? -1 : 1;
      const nx = this.x + dx;
      if (world.isWalkable(nx, this.y)) {
        this.x = nx;
      }
    }

    // Fall if no ground below
    if (this.y + 1 < world.height && !world.isSolid(this.x, this.y + 1)) {
      this.y++;
    }
  }

  startTask(task, world, buildings) {
    this.currentTask = task;
    switch (task) {
      case 'drink':
        // Find nearest collector or go to water
        this.taskTimer = 60;
        break;
      case 'eat':
        this.taskTimer = 80;
        break;
      case 'sleep':
        this.taskTimer = 120;
        break;
      case 'gather':
        this.taskTimer = 90;
        this.wanderToward(world, 'random');
        break;
      case 'fish':
        this.taskTimer = 100;
        break;
      default:
        this.taskTimer = 60 + Math.floor(Math.random() * 60);
    }
  }

  completeTask(resources) {
    switch (this.currentTask) {
      case 'drink':
        this.thirst = Math.min(100, this.thirst + 50);
        if (resources.water > 0) resources.water--;
        break;
      case 'eat':
        this.hunger = Math.min(100, this.hunger + 45);
        if (resources.fish > 0) resources.fish--;
        else if (resources.coconut > 0) resources.coconut--;
        break;
      case 'sleep':
        this.rest = Math.min(100, this.rest + 60);
        break;
      case 'gather':
        const r = Math.random();
        if (r < 0.3) resources.wood = (resources.wood || 0) + 1;
        else if (r < 0.6) resources.coconut = (resources.coconut || 0) + 1;
        else resources.coral = (resources.coral || 0) + 1;
        break;
      case 'fish':
        if (Math.random() < 0.7) {
          resources.fish = (resources.fish || 0) + 1;
        }
        break;
    }
    this.currentTask = 'idle';
  }

  wanderToward(world, target) {
    // Simple random walk toward a direction
    const dir = Math.random() < 0.5 ? -1 : 1;
    const steps = 2 + Math.floor(Math.random() * 4);
    this.path = [];
    let cx = this.x;
    for (let i = 0; i < steps; i++) {
      cx += dir;
      if (world.isWalkable(cx, this.y)) {
        this.path.push({ x: cx, y: this.y });
      } else {
        break;
      }
    }
  }
}

export function createStartingIslanders(world, count = 3) {
  const islanders = [];
  const centerX = Math.floor(world.width / 2);

  for (let i = 0; i < count; i++) {
    const x = centerX - 2 + i * 2;
    const surfaceY = world.getSurfaceY(x);
    islanders.push(new Islander(x, surfaceY - 1));
  }

  return islanders;
}
