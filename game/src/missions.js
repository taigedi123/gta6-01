// Missions and side work for Sunset Bay: a five-job story chain from Rico,
// plus taxi fares and hidden cash packages. Each mission is a list of steps
// with a marker, dialogue and a cash reward; completing one unlocks the next.
import { PLACES } from './config.js';
import { distance } from './random.js';

export const MISSION_DEFS = [
  {
    id: 'wheels', title: 'First Wheels', giver: 'Rico',
    briefing: "Rico: 'Welcome home, Mara. You need wheels. Take any car on the street — E to get in — and bring it to my garage.'",
    reward: 150,
    steps: [
      { type: 'stealCar', text: 'Steal a car (walk up to one, press E)' },
      { type: 'goto', place: PLACES.garage, text: "Drive to Rico's Garage" },
    ],
  },
  {
    id: 'courier', title: 'Sunset Courier', giver: 'Rico',
    briefing: "Rico: 'A client needs three parcels across town, fast. Take the Neon Diner, then the Marina, then Palm Court. $250 if you are quick.'",
    reward: 250,
    steps: [
      { type: 'goto', place: PLACES.diner, text: 'Deliver parcel 1: Neon Diner' },
      { type: 'goto', place: PLACES.marina, text: 'Deliver parcel 2: Marina' },
      { type: 'goto', place: PLACES.contact, text: 'Deliver parcel 3: Palm Court' },
    ],
  },
  {
    id: 'pickup', title: 'The Pickup', giver: 'Rico',
    briefing: "Rico: 'Meet my contact at Palm Court. The Bay PD will be watching — expect heat, and lose them at the Safehouse.'",
    reward: 400,
    steps: [
      { type: 'goto', place: PLACES.contact, text: 'Meet the contact at Palm Court' },
      { type: 'wanted', level: 2, text: 'The cops are on you! Lose the heat' },
      { type: 'goto', place: PLACES.safehouse, text: 'Get to the Safehouse' },
    ],
  },
  {
    id: 'bank', title: 'Bay Trust Job', giver: 'Rico',
    briefing: "Rico: 'The big one. Grab the cash at Bay Trust Bank, then shake a three-star chase and bring it to the Pier. No mistakes.'",
    reward: 900,
    steps: [
      { type: 'goto', place: PLACES.bank, text: 'Reach Bay Trust Bank' },
      { type: 'collect', text: 'Grab the cash (stand on the marker)' },
      { type: 'wanted', level: 3, text: 'Three stars! Escape to Sunset Pier' },
      { type: 'goto', place: PLACES.pier, text: 'Reach Sunset Pier with the cash' },
    ],
  },
  {
    id: 'king', title: 'King of the Bay', giver: 'Rico',
    briefing: "Rico: 'Last job, Mara. A rival crew is waiting at the Pier. Deal with them, then meet me at the garage. Do this and the Bay is yours.'",
    reward: 1500,
    steps: [
      { type: 'goto', place: PLACES.pier, text: 'Reach Sunset Pier' },
      { type: 'combat', count: 3, text: 'Deal with the rival crew (3 left)' },
      { type: 'goto', place: PLACES.garage, text: "Return to Rico's Garage" },
    ],
  },
];

export function createMissionState() {
  return {
    index: 0, step: 0, active: false, done: false, allDone: false,
    message: '', messageTimer: 0, timer: 0, taxi: null, taxiTimer: 0,
    packages: [], packagesFound: 0,
  };
}

export function currentMission(state) {
  return state.index < MISSION_DEFS.length ? MISSION_DEFS[state.index] : null;
}

export function currentStep(state) {
  const m = currentMission(state);
  return m ? m.steps[state.step] : null;
}

export function startMission(state, sound) {
  const m = currentMission(state);
  if (!m) { state.allDone = true; return; }
  state.active = true;
  state.step = 0;
  state.timer = 0;
  state.message = `${m.title} — ${m.briefing}`;
  state.messageTimer = 7;
  if (sound) sound.mission();
}

export function advanceStep(state, sound) {
  state.step += 1;
  const m = currentMission(state);
  if (!m) return;
  if (state.step >= m.steps.length) {
    state.active = false;
    state.done = true;
    state.message = `Mission complete: ${m.title}! +$${m.reward}`;
    state.messageTimer = 5;
    if (sound) sound.mission();
    return 'complete';
  }
  state.message = m.steps[state.step].text;
  state.messageTimer = 4;
  return 'step';
}

export function completeMission(state, player, sound) {
  const m = currentMission(state);
  if (!m) return;
  player.cash += m.reward;
  player.missionsDone += 1;
  player.reputation += 1;
  state.index += 1;
  state.done = false;
  if (state.index >= MISSION_DEFS.length) {
    state.allDone = true;
    state.message = 'You are the King of the Bay! Story complete — free roam, taxis and packages remain.';
    state.messageTimer = 8;
  }
}

export function missionMarker(state) {
  const step = currentStep(state);
  if (!state.active || !step || !step.place) return null;
  return step.place;
}

export function missionObjective(state) {
  const m = currentMission(state);
  if (!m) return state.allDone ? 'Story complete — free roam!' : '';
  if (!state.active) return `Next: ${m.title} — press Q to start`;
  const step = currentStep(state);
  return `${m.title}: ${step ? step.text : ''}`;
}

// Taxi fares: pick up a marked pedestrian and drive them to a random place.
export function startTaxi(state, random, places, pedestrians) {
  const fares = Object.values(places);
  const dest = fares[Math.floor(random() * fares.length)];
  const ped = pedestrians[Math.floor(random() * pedestrians.length)];
  state.taxi = { ped, dest, timer: 90 };
  state.message = 'Taxi fare! Pick up the passenger (drive close), then reach the marker.';
  state.messageTimer = 5;
  return state.taxi;
}

export function stepTaxi(state, dt, player, sound) {
  const taxi = state.taxi;
  if (!taxi) return null;
  taxi.timer -= dt;
  if (taxi.timer <= 0) {
    state.taxi = null;
    state.message = 'Fare cancelled — too slow.';
    state.messageTimer = 4;
    return 'failed';
  }
  if (!taxi.pickedUp) {
    if (player.inCar && distance(player.x, player.y, taxi.ped.x, taxi.ped.y) < 70) {
      taxi.pickedUp = true;
      state.message = `Passenger aboard! Drive to ${taxi.dest.name}.`;
      state.messageTimer = 4;
      if (sound) sound.coin();
    }
    return null;
  }
  if (distance(player.x, player.y, taxi.dest.x, taxi.dest.y) < 90) {
    const fare = 60 + Math.floor(Math.random() * 90);
    player.cash += fare;
    state.taxi = null;
    state.message = `Fare paid: +$${fare}`;
    state.messageTimer = 4;
    if (sound) sound.coin();
    return 'paid';
  }
  return null;
}

export function spawnPackages(state, random) {
  const spots = [
    { x: 480, y: 1440 }, { x: 2080, y: 480 }, { x: 1120, y: 480 },
    { x: 2400, y: 1184 }, { x: 800, y: 2016 }, { x: 1760, y: 1504 },
    { x: 480, y: 864 }, { x: 2720, y: 864 },
  ];
  state.packages = spots.map((s) => ({ x: s.x, y: s.y, found: false }));
}

export function checkPackages(state, player, sound) {
  for (const p of state.packages) {
    if (!p.found && distance(player.x, player.y, p.x, p.y) < 40) {
      p.found = true;
      state.packagesFound += 1;
      player.cash += 100;
      state.message = `Hidden package found! +$100 (${state.packagesFound}/8)`;
      state.messageTimer = 4;
      if (sound) sound.coin();
    }
  }
}
