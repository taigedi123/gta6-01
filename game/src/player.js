// The player: Mara Voss on foot and behind the wheel. On foot she walks,
// sprints, punches and shoots; in a car she accelerates, steers and brakes
// with simple arcade physics, and can ram traffic and police.
import { TUNING } from './config.js';
import { clamp, distance, turnToward } from './random.js';
import { collidesWithBuildings, clampToWorld } from './world.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, health: 100, armor: 0,
    cash: 40, ammo: 24, inCar: null, wanted: 0, wantedTimer: 0,
    punchCooldown: 0, shootCooldown: 0, bustedTimer: 0, invulnerable: 0,
    walkPhase: 0, moving: false, reputation: 0, missionsDone: 0,
  };
}

export function stepPlayerOnFoot(player, input, dt, city, sound) {
  const mx = input.moveX();
  const my = input.moveY();
  const len = Math.hypot(mx, my) || 1;
  const speed = input.sprint() ? TUNING.sprintSpeed : TUNING.walkSpeed;
  player.moving = mx !== 0 || my !== 0;
  if (player.moving) {
    player.angle = Math.atan2(my / len, mx / len);
    const nx = player.x + (mx / len) * speed * dt;
    const ny = player.y + (my / len) * speed * dt;
    if (!collidesWithBuildings(city.buildings, nx, player.y, 12)) player.x = nx;
    if (!collidesWithBuildings(city.buildings, player.x, ny, 12)) player.y = ny;
    player.walkPhase += dt * 10;
  }
  const clamped = clampToWorld(player.x, player.y, 24);
  player.x = clamped.x;
  player.y = clamped.y;
  player.speed = player.moving ? speed : 0;
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  if (sound) sound.engine(false, 0);
}

export function stepPlayerInCar(player, input, dt, city, entities, onCrash) {
  const car = player.inCar;
  const forward = input.moveY() < 0 ? 1 : input.moveY() > 0 ? -0.6 : 0;
  const steer = input.moveX();
  const accel = forward > 0 ? TUNING.carAccel : forward < 0 ? TUNING.carBrake : 0;
  if (forward !== 0) car.speed += accel * dt * (forward > 0 ? 1 : -1) * (car.speed < 0 ? 1.6 : 1);
  else car.speed *= Math.pow(0.4, dt); // rolling drag
  if (input.sprint()) car.speed += TUNING.carAccel * 0.4 * dt; // handbrake boost of grip, not speed
  car.speed = clamp(car.speed, -TUNING.carMaxReverse, TUNING.carMaxSpeed);
  const steerAmount = steer * TUNING.carTurn * dt * clamp(Math.abs(car.speed) / 180, 0, 1) * (car.speed < 0 ? -1 : 1);
  car.angle += steerAmount;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hitBuilding = collidesWithBuildings(city.buildings, nx, ny, 24);
  if (hitBuilding) {
    if (Math.abs(car.speed) > 260 && onCrash) onCrash(car);
    car.speed *= -0.25;
  } else {
    car.x = nx;
    car.y = ny;
  }
  const clamped = clampToWorld(car.x, car.y, 30);
  car.x = clamped.x;
  car.y = clamped.y;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  player.speed = Math.abs(car.speed);
  // Ramming traffic and pedestrians while driving fast is a crime.
  for (const t of entities.traffic) {
    if (distance(car.x, car.y, t.x, t.y) < 46 && Math.abs(car.speed) > 120) {
      t.x += Math.cos(car.angle) * 60;
      t.y += Math.sin(car.angle) * 60;
      t.speed = Math.abs(car.speed) * 0.5;
      entities.addParticles(t.x, t.y, '#e8c84a', 8, 160);
      if (onCrash) onCrash(t, true);
    }
  }
  for (const ped of entities.pedestrians) {
    if (distance(car.x, car.y, ped.x, ped.y) < 34 && Math.abs(car.speed) > 80) {
      ped.flee = 3;
      ped.x += Math.cos(car.angle) * 90;
      ped.y += Math.sin(car.angle) * 90;
      if (onCrash) onCrash(ped, true);
    }
  }
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
}

export function nearestCar(player, cars, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = distance(player.x, player.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(player, car, sound) {
  player.inCar = car;
  car.driver = true;
  if (sound) sound.steal();
}

export function exitCar(player, city) {
  const car = player.inCar;
  if (!car) return;
  player.inCar = null;
  const side = { x: car.x + Math.cos(car.angle + Math.PI / 2) * 40, y: car.y + Math.sin(car.angle + Math.PI / 2) * 40 };
  if (!collidesWithBuildings(city.buildings, side.x, side.y, 12)) { player.x = side.x; player.y = side.y; }
  else { player.x = car.x - Math.cos(car.angle + Math.PI / 2) * 40; player.y = car.y - Math.sin(car.angle + Math.PI / 2) * 40; }
  car.speed = 0;
}

export function addWanted(player, amount) {
  player.wanted = clamp(player.wanted + amount, 0, 5);
  player.wantedTimer = 0;
}

export function decayWanted(player, dt, hidden) {
  if (player.wanted === 0) return;
  player.wantedTimer += dt * (hidden ? 2 : 1);
  if (player.wantedTimer > TUNING.wantedDecaySeconds) {
    player.wanted -= 1;
    player.wantedTimer = 0;
  }
}

export function damagePlayer(player, amount) {
  if (player.invulnerable > 0) return;
  let rest = amount;
  if (player.armor > 0) {
    const absorbed = Math.min(player.armor, rest);
    player.armor -= absorbed;
    rest -= absorbed;
  }
  player.health -= rest;
  player.invulnerable = 0.6;
}
