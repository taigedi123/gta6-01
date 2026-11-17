// Boot and the one loop: input every frame, the world in fixed 1/60 s steps,
// the renderer painting what is there. Screens: title, play, paused, busted,
// story-complete. ?shot=start|drive|chase|mission stages a scene for a
// screenshot; ?seed=N fixes the city. Progress saves to localStorage.
import { PLACES, SAVE_KEY, STEP, TUNING } from './config.js';
import { createRandom, distance, angleTo } from './random.js';
import { buildCity } from './world.js';
import { createEntities } from './entities.js';
import { createPlayer, stepPlayerOnFoot, stepPlayerInCar, nearestCar, enterCar, exitCar, addWanted, decayWanted, damagePlayer } from './player.js';
import { createMissionState, currentMission, currentStep, startMission, advanceStep, completeMission, missionMarker, missionObjective, startTaxi, stepTaxi, spawnPackages, checkPackages } from './missions.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER_CAR, ACTION_PUNCH, ACTION_INTERACT, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createSound } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const city = buildCity(random);
const entities = createEntities(random, city);
const player = createPlayer(PLACES.safehouse.x, PLACES.safehouse.y);
const missions = createMissionState();
const sound = createSound();
const renderer = createRenderer(canvas);

const game = {
  city, entities, player, missions, time: 0,
  marker: null, objective: '', message: '', message2: '', messageTimer: 0,
  district: 'Downtown', enemies: [], gunfireTimer: 0, policeSpawnTimer: 0,
  hasSave: false,
};

entities.spawnTraffic(14);
entities.spawnPedestrians(26);
spawnPackages(missions, random);

function districtAt(x, y) {
  if (y > 1824) return 'Old Pier';
  if (x < 960 && y > 1504) return 'Marina Row';
  if (x >= 960 && x < 2240 && y >= 640 && y < 1504) return 'Downtown';
  if (x >= 2240 && y < 640) return 'Palm Heights';
  if (x >= 320 && x < 960 && y >= 320 && y < 640) return 'Bay Park';
  return 'Northside';
}

function saveGame() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: player.cash, missionsDone: player.missionsDone, reputation: player.reputation,
      missionIndex: missions.index, packagesFound: missions.packagesFound,
      x: player.x, y: player.y, health: player.health,
    }));
  } catch { /* storage off: progress lasts this visit only */ }
}

function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    player.cash = s.cash ?? 40;
    player.missionsDone = s.missionsDone ?? 0;
    player.reputation = s.reputation ?? 0;
    missions.index = s.missionIndex ?? 0;
    missions.packagesFound = s.packagesFound ?? 0;
    player.x = s.x ?? PLACES.safehouse.x;
    player.y = s.y ?? PLACES.safehouse.y;
    player.health = s.health ?? 100;
    game.hasSave = true;
    return true;
  } catch { return false; }
}

function showMessage(text, seconds, second) {
  game.message = text;
  game.message2 = second || '';
  game.messageTimer = seconds || 5;
}

function spawnPoliceUnit() {
  const angle = Math.random() * Math.PI * 2;
  const x = player.x + Math.cos(angle) * 700;
  const y = player.y + Math.sin(angle) * 700;
  entities.spawnPolice(Math.max(80, Math.min(2800, x)), Math.max(80, Math.min(2080, y)));
}

function updateWanted(dt) {
  const want = player.wanted;
  const targetPolice = want === 0 ? 0 : Math.min(4, want);
  game.policeSpawnTimer -= dt;
  if (entities.police.length < targetPolice && game.policeSpawnTimer <= 0) {
    spawnPoliceUnit();
    game.policeSpawnTimer = 2.5;
  }
  if (want === 0 && entities.police.length > 0) {
    // Heat gone: units give up and drive off.
    entities.police.length = 0;
  }
  const hidden = !player.inCar && entities.police.every((c) => distance(c.x, c.y, player.x, player.y) > 500);
  decayWanted(player, dt, hidden);
  sound.siren(dt, want);
}

function onCrime(amount, reason) {
  addWanted(player, amount);
  if (reason) showMessage(reason, 3);
}

function onCrash(car, isCrime) {
  sound.crash();
  entities.addParticles(car.x, car.y, '#e8c84a', 8, 140);
  if (isCrime) onCrime(1, 'Reckless driving! The Bay PD noticed.');
}

function punch() {
  if (player.punchCooldown > 0 || player.inCar) return;
  player.punchCooldown = 0.45;
  sound.punch();
  const reach = TUNING.punchRange;
  const px = player.x + Math.cos(player.angle) * reach;
  const py = player.y + Math.sin(player.angle) * reach;
  for (let i = entities.pedestrians.length - 1; i >= 0; i -= 1) {
    const ped = entities.pedestrians[i];
    if (distance(px, py, ped.x, ped.y) < 26) {
      ped.flee = 3;
      entities.addParticles(ped.x, ped.y, '#ff8a8a', 6, 120);
      onCrime(1, 'Assault! A witness called the Bay PD.');
      return;
    }
  }
  for (const e of game.enemies) {
    if (distance(px, py, e.x, e.y) < 30) {
      e.hp -= TUNING.punchDamage;
      entities.addParticles(e.x, e.y, '#ff8a8a', 6, 120);
      if (e.hp <= 0) e.dead = true;
      return;
    }
  }
}

function shoot(mouse) {
  if (player.shootCooldown > 0 || player.ammo <= 0) return;
  player.shootCooldown = 0.28;
  player.ammo -= 1;
  sound.gunshot();
  game.gunfireTimer = 1.5;
  // Aim from the player toward the mouse in world space.
  const cam = renderer.camera;
  const wx = mouse.x - cam.x;
  const wy = mouse.y - cam.y;
  const angle = angleTo(player.x, player.y, wx, wy);
  player.aimAngle = angle;
  entities.fireBullet(player.x + Math.cos(angle) * 20, player.y + Math.sin(angle) * 20, angle, true);
  onCrime(1, '');
}

function stepMission(dt) {
  if (!missions.active) return;
  const m = currentMission(missions);
  const step = currentStep(missions);
  if (!m || !step) return;
  missions.timer += dt;
  if (step.type === 'stealCar') {
    if (player.inCar) { advanceStep(missions, sound); }
  } else if (step.type === 'goto') {
    if (distance(player.x, player.y, step.place.x, step.place.y) < 90) {
      const r = advanceStep(missions, sound);
      if (r === 'complete') completeMission(missions, player, sound);
      else if (missions.active) {
        const next = currentStep(missions);
        if (next && next.type === 'wanted') addWanted(player, next.level);
      }
      if (m.id === 'king' && step.place === PLACES.pier && missions.active) spawnEnemies();
    }
  } else if (step.type === 'collect') {
    if (distance(player.x, player.y, PLACES.bank.x, PLACES.bank.y) < 90) {
      const r = advanceStep(missions, sound);
      if (r === 'complete') completeMission(missions, player, sound);
      else { const next = currentStep(missions); if (next && next.type === 'wanted') addWanted(player, next.level); }
    }
  } else if (step.type === 'wanted') {
    if (player.wanted <= 0) {
      const r = advanceStep(missions, sound);
      if (r === 'complete') completeMission(missions, player, sound);
    }
  } else if (step.type === 'combat') {
    const left = game.enemies.filter((e) => !e.dead).length;
    if (left === 0 && game.enemies.length > 0) {
      const r = advanceStep(missions, sound);
      if (r === 'complete') completeMission(missions, player, sound);
    } else {
      step.text = `Deal with the rival crew (${left} left)`;
    }
  }
  if (missions.allDone) saveGame();
}

function spawnEnemies() {
  if (game.enemies.length > 0) return;
  for (let i = 0; i < 3; i += 1) {
    game.enemies.push({ x: PLACES.pier.x - 120 + i * 120, y: PLACES.pier.y - 60, hp: 100, shootTimer: 1 + i, dead: false });
  }
  showMessage('Rival crew! Take them down — click to shoot, F to punch.', 5);
}

function stepEnemies(dt) {
  for (const e of game.enemies) {
    if (e.dead) continue;
    const d = distance(e.x, e.y, player.x, player.y);
    if (d > 220) {
      const a = angleTo(e.x, e.y, player.x, player.y);
      e.x += Math.cos(a) * 70 * dt;
      e.y += Math.sin(a) * 70 * dt;
    } else {
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = 1.6;
        const a = angleTo(e.x, e.y, player.x, player.y);
        entities.fireBullet(e.x, e.y, a, false);
        sound.gunshot();
      }
    }
  }
  game.enemies = game.enemies.filter((e) => !e.dead);
}

function step(dt, input, actions) {
  game.time += dt;
  game.gunfireTimer = Math.max(0, game.gunfireTimer - dt);
  game.messageTimer = Math.max(0, game.messageTimer - dt);
  if (actions & ACTION_MUTE) {
    const muted = sound.toggleMute();
    showMessage(muted ? 'Sound muted (M to unmute).' : 'Sound on.', 2);
  }
  const mouse = input.mouse();

  if (actions & ACTION_ENTER_CAR) {
    if (player.inCar) exitCar(player, city);
    else {
      const car = nearestCar(player, [...entities.traffic, ...entities.police], 80);
      if (car) {
        enterCar(player, car, sound);
        const idx = entities.traffic.indexOf(car);
        if (idx >= 0) entities.traffic.splice(idx, 1);
        if (car.kind === 'police') onCrime(2, 'You stole a police cruiser! The Bay PD is furious.');
        else if (missions.active && currentStep(missions)?.type === 'stealCar') { /* mission step advances below */ }
        else onCrime(1, 'Grand theft auto! Someone called it in.');
        showMessage('Car taken. W/S drive, A/D steer, E to get out.', 4);
      }
    }
  }
  if (actions & ACTION_PUNCH) punch();
  if (mouse.down && !player.inCar) shoot(mouse);
  if (actions & ACTION_INTERACT) {
    if (!missions.active) {
      const m = currentMission(missions);
      if (m) { startMission(missions, sound); saveGame(); }
      else if (!missions.taxi) startTaxi(missions, random, PLACES, entities.pedestrians);
    }
  }

  if (player.inCar) stepPlayerInCar(player, input, dt, city, entities, onCrash);
  else stepPlayerOnFoot(player, input, dt, city, sound);
  if (player.inCar) sound.engine(true, Math.abs(player.inCar.speed) / TUNING.carMaxSpeed);

  entities.stepTraffic(dt, player);
  entities.stepPedestrians(dt, player, game.gunfireTimer > 0);
  entities.stepPolice(dt, player, (car) => {
    damagePlayer(player, 12 * dt * 10);
    if (player.inCar) { player.inCar.speed *= 0.96; }
    entities.addParticles(player.x, player.y, '#ff5a4a', 2, 80);
  });
  entities.stepBullets(dt, player, [...entities.traffic, ...entities.police, ...(player.inCar ? [player.inCar] : [])], (ped) => {
    ped.flee = 3;
    entities.addParticles(ped.x, ped.y, '#ff8a8a', 6, 120);
    onCrime(1, 'You shot a civilian! The Bay PD is coming.');
  }, (car, dmg) => {
    if (car === null) { damagePlayer(player, dmg); return; }
    car.hp -= dmg;
    entities.addParticles(car.x, car.y, '#e8c84a', 5, 120);
    if (car.hp <= 0) {
      entities.addParticles(car.x, car.y, '#ff8a4a', 20, 220);
      sound.crash();
      const pi = entities.police.indexOf(car);
      if (pi >= 0) entities.police.splice(pi, 1);
      const ti = entities.traffic.indexOf(car);
      if (ti >= 0) entities.traffic.splice(ti, 1);
      if (player.inCar === car) { player.inCar = null; player.health -= 20; }
      onCrime(2, 'You wrecked a car in a shootout!');
    }
  });
  entities.stepParticles(dt);
  stepEnemies(dt);
  stepMission(dt);
  stepTaxi(missions, dt, player, sound);
  checkPackages(missions, player, sound);
  updateWanted(dt);

  // Busted: police close and player slow for a while, or health gone.
  if (player.health <= 0) {
    player.health = 0;
    return 'over';
  }
  if (player.wanted > 0 && player.speed < 40 && !player.inCar) {
    const near = entities.police.some((c) => distance(c.x, c.y, player.x, player.y) < 70);
    if (near) {
      player.bustedTimer += dt;
      if (player.bustedTimer > 2) return 'over';
    } else player.bustedTimer = 0;
  } else player.bustedTimer = 0;

  game.marker = missionMarker(missions) || (missions.taxi ? missions.taxi.dest : null);
  if (missions.taxi && !missions.taxi.pickedUp) game.marker = { x: missions.taxi.ped.x, y: missions.taxi.ped.y, name: 'Passenger' };
  game.objective = missionObjective(missions);
  game.district = districtAt(player.x, player.y);
  if (missions.allDone && game.time > 2) return 'win';
  return null;
}

function runShot(name) {
  const scene = stageShot(name, game, random);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  loadGame();

  function announce(message) { status.textContent = message; }

  function startGame() {
    sound.unlock();
    sound.click();
    screen = SCREEN_PLAY;
    showMessage('Welcome back to Sunset Bay, Mara. Press Q to start the next job for Rico.', 6, 'Taxis: press Q again when no mission is active. Packages pay $100.');
    announce('Playing Sunset Bay.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE && (actions & ACTION_CONFIRM)) startGame();
    else if (screen === SCREEN_OVER && (actions & ACTION_CONFIRM)) {
      player.health = 100;
      player.wanted = 0;
      entities.police.length = 0;
      player.x = PLACES.safehouse.x;
      player.y = PLACES.safehouse.y;
      if (player.inCar) player.inCar = null;
      screen = SCREEN_PLAY;
    } else if (screen === SCREEN_WIN && (actions & ACTION_CONFIRM)) screen = SCREEN_PLAY;
    else if (screen === SCREEN_PLAY && (actions & ACTION_PAUSE)) screen = SCREEN_PAUSED;
    else if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM))) screen = SCREEN_PLAY;
    if (screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP) {
        const result = step(STEP, input, firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
        if (result === 'over') { screen = SCREEN_OVER; saveGame(); announce('Busted. Game over.'); break; }
        if (result === 'win') { screen = SCREEN_WIN; saveGame(); break; }
      }
      saveTimer += STEP;
      if (saveTimer > 10) { saveTimer = 0; saveGame(); }
    } else accumulator = 0;
    renderer.draw(game, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
  });

  announce('Sunset Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

// Debug handle for play-testing (read-only state inspection).
window.__game = game;

if (shot) runShot(shot);
else runGame();
