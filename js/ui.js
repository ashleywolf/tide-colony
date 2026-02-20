import { BUILDING_TYPES } from './building.js';

export class UI {
  constructor() {
    this.buildMenu = document.getElementById('build-menu');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.islanderInfo = document.getElementById('islander-info');
    this.buttons = this.buildMenu.querySelectorAll('.build-btn');

    this.elements = {
      wood: document.getElementById('res-wood'),
      coral: document.getElementById('res-coral'),
      coconut: document.getElementById('res-coconut'),
      fish: document.getElementById('res-fish'),
      water: document.getElementById('res-water'),
      tideFill: document.getElementById('tide-fill'),
      tideLabel: document.getElementById('tide-label'),
      timeIcon: document.getElementById('time-icon'),
      timeLabel: document.getElementById('time-label'),
      islanderCount: document.getElementById('islander-count'),
      islanderName: document.getElementById('islander-name'),
      hungerBar: document.getElementById('hunger-bar'),
      hungerVal: document.getElementById('hunger-val'),
      thirstBar: document.getElementById('thirst-bar'),
      thirstVal: document.getElementById('thirst-val'),
      restBar: document.getElementById('rest-bar'),
      restVal: document.getElementById('rest-val'),
      islanderTask: document.getElementById('islander-task'),
    };
  }

  update(gameState) {
    const { resources, tideNormalized, dayPhase, day, islanders, selectedBuilding } = gameState;

    // Resources
    this.elements.wood.textContent = resources.wood || 0;
    this.elements.coral.textContent = resources.coral || 0;
    this.elements.coconut.textContent = resources.coconut || 0;
    this.elements.fish.textContent = resources.fish || 0;
    this.elements.water.textContent = resources.water || 0;

    // Tide
    this.elements.tideFill.style.width = `${tideNormalized * 100}%`;
    if (tideNormalized < 0.3) this.elements.tideLabel.textContent = 'Low';
    else if (tideNormalized < 0.7) this.elements.tideLabel.textContent = 'Mid';
    else this.elements.tideLabel.textContent = 'High';

    // Time
    if (dayPhase < 0.25) this.elements.timeIcon.textContent = '🌅';
    else if (dayPhase < 0.5) this.elements.timeIcon.textContent = '☀️';
    else if (dayPhase < 0.75) this.elements.timeIcon.textContent = '🌅';
    else this.elements.timeIcon.textContent = '🌙';
    this.elements.timeLabel.textContent = `Day ${day}`;

    // Islander count
    this.elements.islanderCount.textContent = `👤 ${islanders.length}`;

    // Build menu highlight
    this.buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.building === selectedBuilding);
    });

    // Selected islander info
    const selected = islanders.find(i => i.selected);
    if (selected) {
      this.islanderInfo.style.display = 'block';
      this.elements.islanderName.textContent = `${selected.name}`;
      this.elements.hungerBar.style.width = `${selected.hunger}%`;
      this.elements.hungerBar.style.background = selected.hunger < 30 ? '#e04040' : '#e8a040';
      this.elements.hungerVal.textContent = `${Math.round(selected.hunger)}%`;
      this.elements.thirstBar.style.width = `${selected.thirst}%`;
      this.elements.thirstBar.style.background = selected.thirst < 30 ? '#e04040' : '#40a0e8';
      this.elements.thirstVal.textContent = `${Math.round(selected.thirst)}%`;
      this.elements.restBar.style.width = `${selected.rest}%`;
      this.elements.restBar.style.background = selected.rest < 30 ? '#e04040' : '#a040e8';
      this.elements.restVal.textContent = `${Math.round(selected.rest)}%`;
      this.elements.islanderTask.textContent = `Task: ${selected.currentTask}`;
    } else {
      this.islanderInfo.style.display = 'none';
    }
  }

  showPause(show) {
    this.pauseOverlay.style.display = show ? 'block' : 'none';
  }
}
