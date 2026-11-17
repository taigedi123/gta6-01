// Screenshot scenes behind ?shot=start|drive|chase|mission (with &seed=N).
// Each one sets the real game state to a staged moment — title screen,
// driving through Downtown, a police chase at three stars, a mission in
// progress — then paints it twice and sets window.__shotReady.
import { PLACES } from './config.js';
import { makeCar } from './entities.js';
import { enterCar } from './player.js';
import { startMission } from './missions.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function placePlayerAtRoad(game, x, y) {
  game.player.x = x;
  game.player.y = y;
  game.player.health = 100;
  game.player.cash = 1240;
}

function giveCar(game, x, y, color) {
  const car = makeCar(x, y, Math.PI / 2, color || '#d84a4a', 'traffic');
  game.entities.traffic.push(car);
  enterCar(game.player, car, null);
  const idx = game.entities.traffic.indexOf(car);
  if (idx >= 0) game.entities.traffic.splice(idx, 1);
  return car;
}

function chaseSetup(game) {
  placePlayerAtRoad(game, 1440, 864);
  giveCar(game, 1440, 864, '#4a7dd8');
  game.player.wanted = 3;
  game.player.cash = 2480;
  game.entities.spawnPolice(1300, 800);
  game.entities.spawnPolice(1560, 960);
  game.entities.spawnPolice(1440, 700);
  game.message = 'Three stars! Lose the Bay PD — get to Sunset Pier.';
  game.message2 = 'Bay Trust Job: escape to Sunset Pier with the cash';
  game.messageTimer = 30;
  game.objective = 'Bay Trust Job: Three stars! Escape to Sunset Pier';
  game.marker = PLACES.pier;
}

function missionSetup(game) {
  placePlayerAtRoad(game, 1120, 1280);
  giveCar(game, 1120, 1280, '#e8c84a');
  game.player.cash = 640;
  startMission(game.missions, null);
  game.missions.step = 1;
  game.message = "Rico: 'Three parcels across town, fast. Neon Diner first.'";
  game.message2 = 'Sunset Courier: Deliver parcel 1: Neon Diner';
  game.messageTimer = 30;
  game.objective = 'Sunset Courier: Deliver parcel 1: Neon Diner';
  game.marker = PLACES.diner;
}

function driveSetup(game) {
  placePlayerAtRoad(game, 1440, 1184);
  giveCar(game, 1440, 1184, '#d84a4a');
  game.player.cash = 890;
  game.player.inCar.speed = 320;
  game.message = 'Downtown, Sunset Bay — traffic, pedestrians and the whole city to explore.';
  game.messageTimer = 30;
  game.objective = 'Free roam: press Q to start the next job for Rico';
}

export function stageShot(name, game, random) {
  game.time = 42;
  if (name === 'chase') {
    chaseSetup(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    missionSetup(game);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'drive') {
    driveSetup(game);
    return { screen: SCREEN_PLAY };
  }
  // start: title screen over a living city backdrop.
  placePlayerAtRoad(game, 800, 864);
  game.player.cash = 40;
  game.objective = '';
  return { screen: SCREEN_TITLE };
}
