// Sunset Bay configuration: world size, districts, palette and tuning.
// Every name, place and character in this game is an original invention.
export const WORLD_W = 2880;
export const WORLD_H = 2160;
export const ROAD = 96;
export const BLOCK = 320;
export const STEP = 1 / 60;
export const SAVE_KEY = 'sunset-bay.save.v1';

export const PALETTE = {
  grass: '#7fae5a',
  grassDark: '#6f9e4e',
  park: '#5d9b4a',
  sand: '#e8cf9a',
  water: '#2f7fb8',
  waterDeep: '#256a9e',
  road: '#3a3a40',
  roadLine: '#e8d44d',
  sidewalk: '#9a9a92',
};

export const ROOF_COLORS = ['#c96f4a', '#d9a05b', '#7d8aa8', '#a8586e', '#5b8a7a', '#b07a3f', '#8a6a9a'];
export const WALL_COLORS = ['#e8d8b8', '#d8c8a8', '#c8d0d8', '#e0b8a0', '#d8b8c8'];

// Named story places (all original).
export const PLACES = {
  garage: { name: "Rico's Garage", x: 1120, y: 1184 },
  safehouse: { name: 'Safehouse', x: 480, y: 480 },
  pier: { name: 'Sunset Pier', x: 1440, y: 2016 },
  bank: { name: 'Bay Trust Bank', x: 1600, y: 864 },
  contact: { name: 'Palm Court', x: 2400, y: 320 },
  diner: { name: 'Neon Diner', x: 800, y: 864 },
  marina: { name: 'Marina', x: 480, y: 1632 },
  park: { name: 'Bay Park', x: 640, y: 480 },
};

export const TUNING = {
  walkSpeed: 210,
  sprintSpeed: 330,
  carAccel: 540,
  carBrake: 950,
  carMaxSpeed: 660,
  carMaxReverse: 230,
  carTurn: 2.7,
  policeMaxSpeed: 620,
  trafficSpeed: 150,
  pedSpeed: 55,
  wantedDecaySeconds: 26,
  bulletSpeed: 950,
  bulletRange: 540,
  punchRange: 48,
  punchDamage: 34,
  gunDamage: 45,
};

export const CAR_COLORS = ['#d84a4a', '#4a7dd8', '#e8c84a', '#4ad88a', '#d88a4a', '#9a4ad8', '#e8e8e8', '#2a2a2e'];
export const PED_SHIRTS = ['#d84a4a', '#4a7dd8', '#e8c84a', '#4ad88a', '#d88a4a', '#9a4ad8', '#e8e8e8', '#5a8a5a'];
export const PED_SKINS = ['#e8b88a', '#c88a5a', '#8a5a3a', '#f0d0a0'];

export const STORY = {
  hero: 'Mara Voss',
  heroBlurb: 'A wheelwoman fresh out of the county lockup, back in Sunset Bay with $40 and a grudge.',
  fixer: 'Rico',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
