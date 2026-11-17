// Pedestrians, traffic cars, police cars, bullets and particles.
// Traffic follows the road grid; pedestrians stroll the sidewalks and flee
// gunfire; police chase the player and ram them when the wanted level is up.
import { CAR_COLORS, PED_SHIRTS, PED_SKINS, TUNING } from './config.js';
import { angleTo, clamp, distance, pick, turnToward } from './random.js';
import { collidesWithBuildings, isOnRoad, nearestRoadPoint, ROAD_X, ROAD_Y } from './world.js';

export const KIND_TRAFFIC = 'traffic';
export const KIND_POLICE = 'police';

export function makeCar(x, y, angle, color, kind) {
  return {
    kind: kind || KIND_TRAFFIC, x, y, angle, speed: 0, color,
    width: 52, height: 26, hp: 100, driver: true, siren: 0,
    targetAngle: angle, stuck: 0,
  };
}

export function makePedestrian(random, x, y) {
  return {
    x, y, angle: random() * Math.PI * 2, speed: TUNING.pedSpeed * (0.7 + random() * 0.6),
    skin: pick(random, PED_SKINS), shirt: pick(random, PED_SHIRTS),
    walkPhase: random() * 6, flee: 0, targetX: x, targetY: y, retarget: 0,
  };
}

export function createEntities(random, city) {
  const traffic = [];
  const police = [];
  const pedestrians = [];
  const bullets = [];
  const particles = [];
  const pickups = [];

  function spawnTraffic(count) {
    for (let i = 0; i < count; i += 1) {
      const rx = ROAD_X[Math.floor(random() * ROAD_X.length)];
      const ry = ROAD_Y[Math.floor(random() * ROAD_Y.length)];
      const horizontal = random() < 0.5;
      traffic.push(makeCar(
        horizontal ? rx + (random() - 0.5) * 600 : rx,
        horizontal ? ry : ry + (random() - 0.5) * 600,
        horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
        pick(random, CAR_COLORS),
      ));
    }
  }

  function spawnPedestrians(count) {
    for (let i = 0; i < count; i += 1) {
      const x = 200 + random() * 2400;
      const y = 200 + random() * 1600;
      pedestrians.push(makePedestrian(random, x, y));
    }
  }

  function spawnPolice(x, y) {
    const car = makeCar(x, y, 0, '#1a2a4a', KIND_POLICE);
    car.speed = 200;
    police.push(car);
    return car;
  }

  function addParticles(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const s = (speed || 120) * (0.4 + Math.random() * 0.8);
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 2 + Math.random() * 3 });
    }
  }

  function fireBullet(x, y, angle, friendly) {
    bullets.push({ x, y, vx: Math.cos(angle) * TUNING.bulletSpeed, vy: Math.sin(angle) * TUNING.bulletSpeed, dist: 0, friendly });
  }

  function stepTraffic(dt, player) {
    for (const car of traffic) {
      // Follow the road: at an intersection, sometimes turn; otherwise keep lane.
      const onRoad = isOnRoad(car.x, car.y);
      if (!onRoad) {
        const p = nearestRoadPoint(car.x, car.y);
        car.targetAngle = angleTo(car.x, car.y, p.x, p.y);
      } else if (Math.abs(car.x - Math.round(car.x / 320) * 320) < 6 || Math.abs(car.y - Math.round(car.y / 320) * 320) < 6) {
        if (Math.random() < dt * 0.5) {
          const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
          car.targetAngle = dirs[Math.floor(Math.random() * dirs.length)];
        }
      }
      car.angle = turnToward(car.angle, car.targetAngle, 2.2 * dt);
      const targetSpeed = TUNING.trafficSpeed;
      car.speed += clamp(targetSpeed - car.speed, -300 * dt, 200 * dt);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!collidesWithBuildings(city.buildings, nx, ny, 24)) { car.x = nx; car.y = ny; }
      else car.targetAngle = car.angle + Math.PI / 2;
      // Avoid piling into the player: brake when close ahead.
      if (player && distance(car.x, car.y, player.x, player.y) < 90) car.speed = Math.max(0, car.speed - 400 * dt);
      if (car.x < 60 || car.x > 2820 || car.y < 60 || car.y > 2100) car.targetAngle = angleTo(car.x, car.y, 1440, 1080);
    }
  }

  function stepPedestrians(dt, player, gunfire) {
    for (const ped of pedestrians) {
      ped.retarget -= dt;
      if (gunfire || (player && distance(ped.x, ped.y, player.x, player.y) < 70 && player.speed > 200)) ped.flee = 2;
      if (ped.flee > 0) {
        ped.flee -= dt;
        const a = angleTo(player ? player.x : ped.x, player ? player.y : ped.y, ped.x, ped.y);
        ped.angle = a;
        ped.x += Math.cos(a) * ped.speed * 2.2 * dt;
        ped.y += Math.sin(a) * ped.speed * 2.2 * dt;
      } else {
        if (ped.retarget <= 0) {
          ped.targetX = clamp(ped.x + (Math.random() - 0.5) * 500, 120, 2760);
          ped.targetY = clamp(ped.y + (Math.random() - 0.5) * 500, 120, 2040);
          ped.retarget = 3 + Math.random() * 4;
        }
        ped.angle = angleTo(ped.x, ped.y, ped.targetX, ped.targetY);
        if (distance(ped.x, ped.y, ped.targetX, ped.targetY) > 12) {
          ped.x += Math.cos(ped.angle) * ped.speed * dt;
          ped.y += Math.sin(ped.angle) * ped.speed * dt;
          ped.walkPhase += dt * 8;
        }
        if (collidesWithBuildings(city.buildings, ped.x, ped.y, 10)) {
          ped.x -= Math.cos(ped.angle) * ped.speed * dt * 2;
          ped.y -= Math.sin(ped.angle) * ped.speed * dt * 2;
          ped.retarget = 0;
        }
      }
      const c = { x: ped.x, y: ped.y };
      ped.x = clamp(c.x, 80, 2800);
      ped.y = clamp(c.y, 80, 2080);
    }
  }

  function stepPolice(dt, player, onRam) {
    for (const car of police) {
      const d = distance(car.x, car.y, player.x, player.y);
      const target = angleTo(car.x, car.y, player.x, player.y);
      car.angle = turnToward(car.angle, target, 3.2 * dt);
      const want = d > 320 ? TUNING.policeMaxSpeed : TUNING.policeMaxSpeed * 0.85;
      car.speed += clamp(want - car.speed, -600 * dt, 420 * dt);
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!collidesWithBuildings(city.buildings, nx, ny, 24)) { car.x = nx; car.y = ny; }
      car.siren += dt;
      if (d < 60 && onRam) onRam(car, d);
      if (d > 1400) { // too far away: despawn and let a fresh unit spawn closer
        car.dead = true;
      }
    }
    for (let i = police.length - 1; i >= 0; i -= 1) if (police[i].dead) police.splice(i, 1);
  }

  function stepBullets(dt, player, cars, onHitPed, onHitCar) {
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      const b = bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.dist += TUNING.bulletSpeed * dt;
      let dead = b.dist > TUNING.bulletRange || b.x < 0 || b.x > 2880 || b.y < 0 || b.y > 2160;
      if (!dead && collidesWithBuildings(city.buildings, b.x, b.y, 2)) { addParticles(b.x, b.y, '#c8c8c8', 4, 80); dead = true; }
      if (!dead && b.friendly) {
        for (const ped of pedestrians) {
          if (distance(b.x, b.y, ped.x, ped.y) < 14) { onHitPed(ped); dead = true; break; }
        }
      }
      if (!dead && !b.friendly && player && distance(b.x, b.y, player.x, player.y) < 14) {
        onHitCar(null, TUNING.gunDamage);
        dead = true;
      }
      if (!dead) {
        for (const car of cars) {
          if (distance(b.x, b.y, car.x, car.y) < 30) { onHitCar(car, TUNING.gunDamage); dead = true; break; }
        }
      }
      if (dead) bullets.splice(i, 1);
    }
  }

  function stepParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  return {
    traffic, police, pedestrians, bullets, particles, pickups,
    spawnTraffic, spawnPedestrians, spawnPolice, addParticles, fireBullet,
    stepTraffic, stepPedestrians, stepPolice, stepBullets, stepParticles,
  };
}
