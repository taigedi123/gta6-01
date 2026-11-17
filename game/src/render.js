// Drawing only: the scrolling city, cars, people, police, bullets and
// particles, then the HUD (cash, health, wanted stars, minimap, mission
// objective, speed) and the title, pause and game-over screens.
import { FONT, PALETTE, PLACES, ROAD, WORLD_H, WORLD_W } from './config.js';
import { ROAD_X, ROAD_Y } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const camera = { x: 0, y: 0 };
  const view = { w: 1280, h: 720 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
  }

  function text(value, x, y, size, color, align, bold) {
    ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawCarShape(car, isPlayer) {
    ctx.save();
    ctx.translate(camera.x + car.x, camera.y + car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-26, -13, 54, 28);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-26, -14, 52, 28, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,30,50,0.85)';
    ctx.beginPath();
    ctx.roundRect(-8, -11, 18, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(24, -11, 3, 7);
    ctx.fillRect(24, 4, 3, 7);
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(-27, -11, 3, 6);
    ctx.fillRect(-27, 5, 3, 6);
    if (car.kind === 'police') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -14, 14, 4);
      ctx.fillStyle = '#222';
      ctx.font = `700 8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('PD', 5, -4);
      const blink = Math.floor(car.siren * 3) % 2 === 0;
      ctx.fillStyle = blink ? '#ff3a3a' : '#3a7bff';
      ctx.beginPath();
      ctx.arc(-14, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = blink ? '#3a7bff' : '#ff3a3a';
      ctx.beginPath();
      ctx.arc(-6, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (isPlayer) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(camera.x + car.x, camera.y + car.y, 36, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPedestrian(ped) {
    const bob = Math.sin(ped.walkPhase) * 2;
    ctx.save();
    ctx.translate(camera.x + ped.x, camera.y + ped.y + bob * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(0, -2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWorld(game) {
    const { city, entities, player, missions } = game;
    const camX = camera.x;
    const camY = camera.y;
    // Ground: grass, beach and sea at the south edge.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(camX, camY, WORLD_W, WORLD_H);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(camX, camY + 1824, WORLD_W, 336);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(camX, camY + 2050, WORLD_W, 110);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let x = 0; x < WORLD_W; x += 120) {
      ctx.fillRect(camX + x + ((game.time * 20 + x) % 120), camY + 2080, 50, 4);
    }
    // Bay Park.
    ctx.fillStyle = PALETTE.park;
    ctx.fillRect(camX + 208, camY + 208, 224, 224);
    // Sidewalks and roads.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of ROAD_X) ctx.fillRect(camX + rx - ROAD / 2 - 10, camY, ROAD + 20, WORLD_H);
    for (const ry of ROAD_Y) ctx.fillRect(camX, camY + ry - ROAD / 2 - 10, WORLD_W, ROAD + 20);
    ctx.fillStyle = PALETTE.road;
    for (const rx of ROAD_X) ctx.fillRect(camX + rx - ROAD / 2, camY, ROAD, WORLD_H);
    for (const ry of ROAD_Y) ctx.fillRect(camX, camY + ry - ROAD / 2, WORLD_W, ROAD);
    // Road centre dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const rx of ROAD_X) {
      for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(camX + rx - 2, camY + y, 4, 30);
    }
    for (const ry of ROAD_Y) {
      for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(camX + x, camY + ry - 2, 30, 4);
    }
    // Buildings with roofs, walls and windows.
    for (const b of city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(camX + b.x + 6, camY + b.y + 8, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(camX + b.x, camY + b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(camX + b.x + 8, camY + b.y + 8, b.w - 16, b.h - 16);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < b.windows; i += 1) {
        ctx.fillRect(camX + b.x + 14 + i * 18, camY + b.y + 14, 10, 8);
      }
    }
    // Trees and lamps.
    for (const t of city.trees) {
      ctx.fillStyle = '#2a5a2a';
      ctx.beginPath();
      ctx.arc(camX + t.x, camY + t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a8a3a';
      ctx.beginPath();
      ctx.arc(camX + t.x - 3, camY + t.y - 3, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const l of city.lamps) {
      ctx.fillStyle = '#666';
      ctx.fillRect(camX + l.x, camY + l.y, 4, 4);
    }
    // Place labels.
    ctx.font = `700 15px ${FONT}`;
    ctx.textAlign = 'center';
    for (const key of Object.keys(PLACES)) {
      const p = PLACES[key];
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(p.name, camX + p.x, camY + p.y - 8);
    }
    // Hidden packages.
    for (const p of missions.packages) {
      if (p.found) continue;
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.arc(camX + p.x, camY + p.y + Math.sin(game.time * 3) * 3, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a6a00';
      ctx.font = `700 12px ${FONT}`;
      ctx.fillText('$', camX + p.x, camY + p.y + 4);
    }
    // Mission / taxi marker.
    const marker = game.marker;
    if (marker) {
      const bob = Math.sin(game.time * 4) * 8;
      ctx.strokeStyle = '#ffd94a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(camX + marker.x, camY + marker.y + bob, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.moveTo(camX + marker.x, camY + marker.y - 34 + bob);
      ctx.lineTo(camX + marker.x - 10, camY + marker.y - 52 + bob);
      ctx.lineTo(camX + marker.x + 10, camY + marker.y - 52 + bob);
      ctx.closePath();
      ctx.fill();
      // Guide arrow at the screen edge pointing to the marker.
      drawEdgeArrow(marker);
    }
    // Pickups, pedestrians, cars, police, bullets, particles.
    for (const p of entities.pedestrians) drawPedestrian(p);
    for (const car of entities.traffic) drawCarShape(car, false);
    for (const car of entities.police) drawCarShape(car, false);
    if (player.inCar) drawCarShape(player.inCar, true);
    else drawPlayerOnFoot(player);
    for (const b of entities.bullets) {
      ctx.fillStyle = '#ffe94a';
      ctx.beginPath();
      ctx.arc(camX + b.x, camY + b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of entities.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(camX + p.x, camY + p.y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
    // Rival crew (mission 5 combat targets).
    for (const e of game.enemies) {
      ctx.fillStyle = '#3a1a1a';
      ctx.beginPath();
      ctx.arc(camX + e.x, camY + e.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5a4a';
      ctx.beginPath();
      ctx.arc(camX + e.x, camY + e.y - 3, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff5a4a';
      ctx.fillRect(camX + e.x - 12, camY + e.y - 18, 24 * (e.hp / 100), 4);
    }
  }

  function drawPlayerOnFoot(player) {
    const bob = player.moving ? Math.sin(player.walkPhase) * 2 : 0;
    ctx.save();
    ctx.translate(camera.x + player.x, camera.y + player.y + bob * 0.3);
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 10) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 7, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b88a';
    ctx.beginPath();
    ctx.arc(0, -3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a4a8a';
    ctx.beginPath();
    ctx.arc(0, 2, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Aim line when armed.
    if (player.aimAngle !== undefined && player.aimAngle !== null) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(camera.x + player.x, camera.y + player.y);
      ctx.lineTo(camera.x + player.x + Math.cos(player.aimAngle) * 60, camera.y + player.y + Math.sin(player.aimAngle) * 60);
      ctx.stroke();
    }
  }

  function drawEdgeArrow(marker) {
    // Screen-space arrow: project marker into view, clamp to the edge.
    const px = marker.x + camera.x;
    const py = marker.y + camera.y;
    if (px > 40 && px < view.w - 40 && py > 40 && py < view.h - 40) return;
    const cx = Math.max(50, Math.min(view.w - 50, px));
    const cy = Math.max(50, Math.min(view.h - 50, py));
    const a = Math.atan2(py - view.h / 2, px - view.w / 2);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(a);
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -12);
    ctx.lineTo(-10, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMinimap(game) {
    const mw = 190;
    const mh = Math.round(mw * (WORLD_H / WORLD_W));
    const mx = view.w - mw - 14;
    const my = 14;
    const sx = mw / WORLD_W;
    const sy = mh / WORLD_H;
    ctx.fillStyle = 'rgba(10,16,24,0.85)';
    ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.fillStyle = '#3a5a2a';
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#2f7fb8';
    ctx.fillRect(mx, my + mh - 12, mw, 12);
    ctx.strokeStyle = '#8a8a8a';
    ctx.lineWidth = 1;
    for (const rx of ROAD_X) { ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + mh); ctx.stroke(); }
    for (const ry of ROAD_Y) { ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + mw, my + ry * sy); ctx.stroke(); }
    ctx.fillStyle = '#5a5a5a';
    for (const b of game.city.buildings) ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
    const marker = game.marker;
    if (marker) {
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.arc(mx + marker.x * sx, my + marker.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3a7bff';
    for (const car of game.entities.police) { ctx.beginPath(); ctx.arc(mx + car.x * sx, my + car.y * sy, 3, 0, Math.PI * 2); ctx.fill(); }
    const p = game.player;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx + p.x * sx, my + p.y * sy, 6, 0, Math.PI * 2);
    ctx.stroke();
    return { x: mx, y: my, w: mw, h: mh };
  }

  function drawHud(game) {
    const p = game.player;
    const mm = drawMinimap(game);
    // Wanted stars under the minimap.
    const starY = mm.y + mm.h + 26;
    for (let i = 0; i < 5; i += 1) {
      ctx.font = `700 26px ${FONT}`;
      ctx.fillStyle = i < p.wanted ? '#ffd94a' : 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'left';
      ctx.fillText('★', view.w - 14 - (5 - i) * 30, starY);
    }
    text('WANTED', view.w - 14, starY + 22, 12, 'rgba(255,255,255,0.7)', 'right', true);
    // Top-left: cash, health, armor, ammo.
    ctx.fillStyle = 'rgba(10,16,24,0.75)';
    ctx.fillRect(12, 12, 250, 108);
    text(`$${p.cash}`, 24, 44, 30, '#7be07b', 'left', true);
    text(`Mara Voss  •  Rep ${p.reputation}`, 24, 66, 14, '#fff');
    ctx.fillStyle = '#333';
    ctx.fillRect(24, 76, 180, 10);
    ctx.fillStyle = p.health > 30 ? '#4ad88a' : '#d84a4a';
    ctx.fillRect(24, 76, 180 * Math.max(0, p.health) / 100, 10);
    text(`HP ${Math.max(0, Math.round(p.health))}`, 212, 86, 12, '#fff');
    ctx.fillStyle = '#333';
    ctx.fillRect(24, 92, 180, 8);
    ctx.fillStyle = '#7bb8e8';
    ctx.fillRect(24, 92, 180 * Math.min(100, p.armor) / 100, 8);
    text(`Armor ${Math.round(p.armor)}  •  Ammo ${p.ammo}`, 24, 114, 12, '#fff');
    // Mission objective bar at the bottom.
    const objective = game.objective;
    if (objective) {
      ctx.fillStyle = 'rgba(10,16,24,0.8)';
      const w = Math.min(view.w - 40, 760);
      ctx.fillRect((view.w - w) / 2, view.h - 64, w, 44);
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect((view.w - w) / 2, view.h - 64, 5, 44);
      text(objective, (view.w - w) / 2 + 18, view.h - 36, 16, '#fff', 'left', true);
    }
    // Speedometer while driving.
    if (p.inCar) {
      const mph = Math.round(Math.abs(p.inCar.speed) * 0.12);
      text(`${mph} mph`, view.w - 24, view.h - 84, 34, '#fff', 'right', true);
      text('W/S drive • A/D steer • E exit • Space handbrake', view.w - 24, view.h - 60, 13, 'rgba(255,255,255,0.8)', 'right');
    } else {
      text('WASD move • Shift run • E steal car • Click shoot • F punch • Q mission • P pause', 16, view.h - 16, 13, 'rgba(255,255,255,0.75)');
    }
    // Clock and district, under the cash panel.
    const hour = 17 + Math.floor(game.time / 120) % 4;
    text(`Sunset Bay  •  ${hour}:00  •  ${game.district}`, 16, 140, 13, 'rgba(255,255,255,0.75)');
    // Message banner.
    if (game.message && game.messageTimer > 0) {
      ctx.fillStyle = 'rgba(10,16,24,0.85)';
      const w = Math.min(view.w - 80, 860);
      ctx.fillRect((view.w - w) / 2, 90, w, 52);
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect((view.w - w) / 2, 90, 5, 52);
      text(game.message, (view.w - w) / 2 + 18, 112, 15, '#fff', 'left', true);
      if (game.message2) text(game.message2, (view.w - w) / 2 + 18, 132, 13, 'rgba(255,255,255,0.85)');
    }
    // Busted / low health flash.
    if (p.health < 30 && p.health > 0) {
      ctx.fillStyle = `rgba(216,74,74,${0.08 + 0.05 * Math.sin(game.time * 6)})`;
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const w = Math.min(view.w - 40, 680);
    const h = 150 + lines.length * 30;
    const x = (view.w - w) / 2;
    const y = (view.h - h) / 2;
    ctx.fillStyle = 'rgba(8,12,20,0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = accent || '#ffd94a';
    ctx.fillRect(x, y, w, 5);
    text(title, view.w / 2, y + 62, 44, '#fff', 'center', true);
    lines.forEach((line, i) => text(line, view.w / 2, y + 104 + i * 30, 17, 'rgba(255,255,255,0.85)', 'center'));
    text(prompt, view.w / 2, y + h - 26, 17, '#ffd94a', 'center', true);
  }

  function updateCamera(player) {
    camera.x = Math.round(view.w / 2 - player.x);
    camera.y = Math.round(view.h / 2 - player.y);
    camera.x = Math.min(0, Math.max(view.w - WORLD_W, camera.x));
    camera.y = Math.min(0, Math.max(view.h - WORLD_H, camera.y));
  }

  function draw(game, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a2432';
    ctx.fillRect(0, 0, view.w, view.h);
    updateCamera(game.player);
    drawWorld(game);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(8,10,18,0.55)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawPanel('SUNSET BAY', [
        'An open-world crime game. Original city, original story.',
        'Mara Voss is back in town with $40 and a grudge.',
        'Steal cars, outrun the Bay PD, run jobs for Rico,',
        'and take the crown of the Bay.',
        '',
        'WASD move / drive  •  Shift run  •  E steal car  •  Click shoot',
        'F punch  •  Q start mission  •  P pause  •  M mute',
      ], game.hasSave ? 'Press Enter or click: Continue / New game' : 'Press Enter or click to start', '#ffd94a');
      return;
    }
    drawHud(game);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8,10,18,0.6)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawPanel('Paused', ['The Bay waits for no one — except now.', `Cash $${game.player.cash}  •  Missions done: ${game.player.missionsDone}/5`, 'Progress saves automatically.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(40,8,8,0.6)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawPanel('BUSTED', ['The Bay PD caught up with Mara.', `Cash kept: $${game.player.cash}  •  Missions done: ${game.player.missionsDone}/5`], 'Press Enter to start over at the Safehouse');
    } else if (screen === SCREEN_WIN) {
      ctx.fillStyle = 'rgba(8,20,10,0.55)';
      ctx.fillRect(0, 0, view.w, view.h);
      drawPanel('KING OF THE BAY', ['Every job done. The Bay is yours, Mara.', `Final cash: $${game.player.cash}  •  Packages ${game.missions.packagesFound}/8`], 'Press Enter to keep playing in free roam');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, camera };
}
