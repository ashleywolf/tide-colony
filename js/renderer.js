import { TILE, TILE_COLORS, TILE_SIZE, SEA_LEVEL } from './world.js';

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.camera = {
      x: (world.width * TILE_SIZE) / 2 - window.innerWidth / 2,
      y: (SEA_LEVEL * TILE_SIZE) - window.innerHeight / 2,
      zoom: 2,
    };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  // Convert screen coords to world tile coords
  screenToWorld(sx, sy) {
    return {
      x: Math.floor((sx / this.camera.zoom + this.camera.x) / TILE_SIZE),
      y: Math.floor((sy / this.camera.zoom + this.camera.y) / TILE_SIZE),
    };
  }

  render(gameState) {
    const { ctx, canvas, camera, world } = this;
    const { dayPhase, tideLevel, buildings, islanders, selectedBuilding, mouseWorld } = gameState;

    // Sky gradient based on time of day
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (dayPhase < 0.25) { // sunrise
      const t = dayPhase / 0.25;
      skyGrad.addColorStop(0, lerpColor('#0a1628', '#2a4a8a', t));
      skyGrad.addColorStop(1, lerpColor('#1a2a4a', '#e8a040', t));
    } else if (dayPhase < 0.5) { // day
      skyGrad.addColorStop(0, '#4a8ae0');
      skyGrad.addColorStop(1, '#87ceeb');
    } else if (dayPhase < 0.75) { // sunset
      const t = (dayPhase - 0.5) / 0.25;
      skyGrad.addColorStop(0, lerpColor('#4a8ae0', '#2a1a4a', t));
      skyGrad.addColorStop(1, lerpColor('#87ceeb', '#e85040', t));
    } else { // night
      skyGrad.addColorStop(0, '#0a1628');
      skyGrad.addColorStop(1, '#1a2a4a');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const isNight = dayPhase > 0.7 || dayPhase < 0.15;
    const colorKey = isNight ? 'night' : 'day';

    // Calculate visible tile range
    const startX = Math.max(0, Math.floor(camera.x / TILE_SIZE) - 1);
    const startY = Math.max(0, Math.floor(camera.y / TILE_SIZE) - 1);
    const endX = Math.min(world.width, Math.ceil((camera.x + canvas.width / camera.zoom) / TILE_SIZE) + 1);
    const endY = Math.min(world.height, Math.ceil((camera.y + canvas.height / camera.zoom) / TILE_SIZE) + 1);

    // Draw tiles
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = world.get(x, y);
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        // Draw tile
        if (tile !== TILE.AIR) {
          ctx.fillStyle = TILE_COLORS[tile][colorKey];
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          // Tile border for solids
          if (world.isSolid(x, y)) {
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
          }
        }

        // Draw water overlay
        const waterAmt = world.getWater(x, y);
        if (waterAmt > 0) {
          const alpha = 0.3 + waterAmt * 0.4;
          const waveOffset = Math.sin(Date.now() / 800 + x * 0.5) * 1.5;
          ctx.fillStyle = isNight
            ? `rgba(15,40,80,${alpha})`
            : `rgba(40,120,220,${alpha})`;
          const waterHeight = TILE_SIZE * waterAmt;
          ctx.fillRect(px, py + TILE_SIZE - waterHeight + waveOffset, TILE_SIZE, waterHeight);
        }
      }
    }

    // Draw buildings
    for (const b of buildings) {
      this.drawBuilding(b, isNight);
    }

    // Draw build preview
    if (selectedBuilding && mouseWorld) {
      ctx.globalAlpha = 0.5;
      this.drawBuildingAt(mouseWorld.x, mouseWorld.y, selectedBuilding, isNight);
      ctx.globalAlpha = 1;
    }

    // Draw islanders
    for (const islander of islanders) {
      this.drawIslander(islander, isNight);
    }

    ctx.restore();
  }

  drawBuilding(b, isNight) {
    const px = b.x * TILE_SIZE;
    const py = b.y * TILE_SIZE;
    this.drawBuildingAt(b.x, b.y, b.type, isNight);
  }

  drawBuildingAt(x, y, type, isNight) {
    const { ctx } = this;
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const s = TILE_SIZE;

    switch (type) {
      case 'hut':
        ctx.fillStyle = isNight ? '#5a3a1a' : '#a07040';
        ctx.fillRect(px + 1, py + 4, s - 2, s - 4);
        // Roof
        ctx.fillStyle = isNight ? '#3a5a3a' : '#60a060';
        ctx.beginPath();
        ctx.moveTo(px, py + 4);
        ctx.lineTo(px + s / 2, py - 2);
        ctx.lineTo(px + s, py + 4);
        ctx.fill();
        break;
      case 'seawall':
        ctx.fillStyle = isNight ? '#4a4a5a' : '#8a8aa0';
        ctx.fillRect(px, py, s, s);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 1, py + 1, s - 2, s - 2);
        break;
      case 'collector':
        ctx.fillStyle = isNight ? '#2a4a6a' : '#5090c0';
        ctx.fillRect(px + 2, py + 6, s - 4, s - 6);
        // Funnel top
        ctx.beginPath();
        ctx.moveTo(px, py + 2);
        ctx.lineTo(px + s / 2, py + 6);
        ctx.lineTo(px + s, py + 2);
        ctx.strokeStyle = isNight ? '#4a7a9a' : '#70b0e0';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        break;
      case 'fishing':
        // Dock
        ctx.fillStyle = isNight ? '#4a3a2a' : '#8a7050';
        ctx.fillRect(px, py + s - 4, s, 4);
        // Pole
        ctx.strokeStyle = isNight ? '#5a4a3a' : '#a08060';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + s - 3, py + s - 4);
        ctx.lineTo(px + s + 4, py - 2);
        ctx.stroke();
        // Line
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(px + s + 4, py - 2);
        ctx.lineTo(px + s + 2, py + s);
        ctx.stroke();
        break;
      case 'bridge':
        ctx.fillStyle = isNight ? '#4a3a2a' : '#907050';
        ctx.fillRect(px, py + s / 2 - 2, s, 4);
        // Supports
        ctx.fillRect(px + 2, py + s / 2, 2, s / 2);
        ctx.fillRect(px + s - 4, py + s / 2, 2, s / 2);
        break;
    }
  }

  drawIslander(islander, isNight) {
    const { ctx } = this;
    const px = islander.x * TILE_SIZE + TILE_SIZE / 2;
    const py = islander.y * TILE_SIZE + TILE_SIZE;
    const bobY = Math.sin(Date.now() / 300 + islander.id) * 1;

    // Body
    ctx.fillStyle = isNight ? '#6a5a4a' : islander.color;
    ctx.fillRect(px - 3, py - 12 + bobY, 6, 8);

    // Head
    ctx.fillStyle = isNight ? '#8a7a60' : '#e8c890';
    ctx.beginPath();
    ctx.arc(px, py - 14 + bobY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Selection indicator
    if (islander.selected) {
      ctx.strokeStyle = '#4ac0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py - 8 + bobY, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Task icon
    if (islander.currentTask) {
      ctx.font = '8px sans-serif';
      ctx.fillStyle = '#fff';
      const icons = { eat: '🍽', drink: '💧', sleep: '💤', build: '🔨', gather: '🪣', fish: '🎣', idle: '💭' };
      ctx.fillText(icons[islander.currentTask] || '❓', px - 4, py - 20 + bobY);
    }
  }
}

function lerpColor(a, b, t) {
  const ah = parseInt(a.replace('#', ''), 16);
  const bh = parseInt(b.replace('#', ''), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}
