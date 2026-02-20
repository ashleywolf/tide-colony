import { World, TILE_SIZE } from './world.js';
import { Renderer } from './renderer.js';
import { WaterSim } from './water.js';
import { createStartingIslanders } from './entity.js';
import { BuildingManager } from './building.js';
import { createResources } from './resources.js';
import { UI } from './ui.js';

// --- Game State ---
const canvas = document.getElementById('game');
const world = new World();
const renderer = new Renderer(canvas, world);
const waterSim = new WaterSim(world);
const buildingMgr = new BuildingManager(world);
const ui = new UI();
const resources = createResources();
const islanders = createStartingIslanders(world, 3);

let paused = false;
let selectedBuilding = null;
let mouseWorld = null;
let frame = 0;
let day = 1;
const DAY_LENGTH = 900; // frames per day (~30 seconds at 30fps)

// --- Input ---
const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;

  if (e.key === ' ') {
    paused = !paused;
    ui.showPause(paused);
    e.preventDefault();
  }

  // Build hotkeys
  const buildKeys = { '1': 'hut', '2': 'seawall', '3': 'collector', '4': 'fishing', '5': 'bridge' };
  if (buildKeys[e.key]) {
    selectedBuilding = selectedBuilding === buildKeys[e.key] ? null : buildKeys[e.key];
  }

  // Dig with 'x'
  if (e.key === 'x' && mouseWorld) {
    const { x, y } = mouseWorld;
    if (world.isSolid(x, y)) {
      const tile = world.get(x, y);
      world.set(x, y, 0); // AIR
      // Give resource
      if (tile === 2) resources.rock = (resources.rock || 0) + 1;   // ROCK
      if (tile === 3) resources.coral = (resources.coral || 0) + 1;  // CORAL
      if (tile === 1) resources.wood = (resources.wood || 0) + 1;    // SAND → wood (driftwood)
    }
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  mouseWorld = renderer.screenToWorld(e.clientX, e.clientY);
});

canvas.addEventListener('click', (e) => {
  const pos = renderer.screenToWorld(e.clientX, e.clientY);

  if (selectedBuilding) {
    buildingMgr.place(pos.x, pos.y, selectedBuilding, resources);
  } else {
    // Select/deselect islanders
    let found = false;
    for (const isl of islanders) {
      if (isl.x === pos.x && isl.y === pos.y) {
        isl.selected = !isl.selected;
        found = true;
      } else {
        isl.selected = false;
      }
    }
    // Click near an islander (within 1 tile)
    if (!found) {
      for (const isl of islanders) {
        if (Math.abs(isl.x - pos.x) <= 1 && Math.abs(isl.y - pos.y) <= 1) {
          isl.selected = true;
          found = true;
          break;
        } else {
          isl.selected = false;
        }
      }
    }
  }
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  const pos = renderer.screenToWorld(e.clientX, e.clientY);
  if (world.isSolid(pos.x, pos.y)) {
    const tile = world.get(pos.x, pos.y);
    world.set(pos.x, pos.y, 0);
    if (tile === 2) resources.rock = (resources.rock || 0) + 1;
    if (tile === 3) resources.coral = (resources.coral || 0) + 1;
  }
});

canvas.addEventListener('wheel', (e) => {
  const zoomSpeed = 0.1;
  const oldZoom = renderer.camera.zoom;
  renderer.camera.zoom = Math.max(0.5, Math.min(6, renderer.camera.zoom - e.deltaY * zoomSpeed * 0.01));

  // Zoom toward mouse
  const zoomRatio = renderer.camera.zoom / oldZoom;
  renderer.camera.x = e.clientX / renderer.camera.zoom + renderer.camera.x - e.clientX / renderer.camera.zoom;
  e.preventDefault();
}, { passive: false });

// Build menu clicks
document.querySelectorAll('.build-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.building;
    selectedBuilding = selectedBuilding === type ? null : type;
  });
});

// --- Game Loop ---
function update() {
  if (paused) return;

  frame++;

  // Camera movement
  const camSpeed = 4 / renderer.camera.zoom;
  if (keys['w'] || keys['arrowup']) renderer.camera.y -= camSpeed;
  if (keys['s'] || keys['arrowdown']) renderer.camera.y += camSpeed;
  if (keys['a'] || keys['arrowleft']) renderer.camera.x -= camSpeed;
  if (keys['d'] || keys['arrowright']) renderer.camera.x += camSpeed;

  // Day/night cycle
  const dayPhase = (frame % DAY_LENGTH) / DAY_LENGTH;
  if (frame > 0 && frame % DAY_LENGTH === 0) day++;

  // Water simulation
  waterSim.update();

  // Buildings
  buildingMgr.update(resources);

  // Islanders
  for (const isl of islanders) {
    isl.update(world, buildingMgr.buildings, resources);
  }

  // Rain collector bonus (water resource every 10 seconds)
  if (frame % 300 === 0) {
    const collectors = buildingMgr.buildings.filter(b => b.type === 'collector');
    resources.water = (resources.water || 0) + collectors.length;
  }

  return dayPhase;
}

function gameLoop() {
  const dayPhase = update() ?? ((frame % DAY_LENGTH) / DAY_LENGTH);

  renderer.render({
    dayPhase,
    tideLevel: waterSim.tideLevel,
    buildings: buildingMgr.buildings,
    islanders,
    selectedBuilding,
    mouseWorld,
  });

  ui.update({
    resources,
    tideNormalized: waterSim.tideNormalized,
    dayPhase,
    day,
    islanders,
    selectedBuilding,
  });

  requestAnimationFrame(gameLoop);
}

// Start
gameLoop();
