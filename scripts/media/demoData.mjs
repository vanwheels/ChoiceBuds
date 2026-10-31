// Fixed demo dataset for `npm run media` - invented teams only, never real
// user data. Timestamps are constants so repeated runs seed identical state.
// Stat Points are on Champions' 0-32 scale (66 total), not Gen9 EVs.
// Built by hand to the Team shape in types/pokemon.ts instead of imported
// through the app, so media generation needs no PokeAPI round-trip.

const FIXED_TIME = Date.UTC(2026, 0, 1);

const sprite = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

const stats = (hp, attack, defense, specialAttack, specialDefense, speed) => ({
  hp,
  attack,
  defense,
  specialAttack,
  specialDefense,
  speed,
});

const ROSTER = [
  {
    species: 'Garchomp',
    dex: 445,
    types: ['dragon', 'ground'],
    base: stats(108, 130, 95, 80, 85, 102),
    item: 'Sitrus Berry',
    ability: 'Rough Skin',
    nature: 'Jolly',
    sp: stats(2, 32, 0, 0, 0, 32),
    moves: ['Earthquake', 'Dragon Claw', 'Rock Slide', 'Protect'],
  },
  {
    species: 'Incineroar',
    gender: 'M',
    dex: 727,
    types: ['fire', 'dark'],
    base: stats(95, 115, 90, 80, 90, 60),
    item: 'Sitrus Berry',
    ability: 'Intimidate',
    nature: 'Careful',
    sp: stats(32, 8, 12, 0, 14, 0),
    moves: ['Fake Out', 'Flare Blitz', 'Parting Shot', 'Protect'],
  },
  {
    species: 'Lucario',
    gender: 'M',
    dex: 448,
    types: ['fighting', 'steel'],
    base: stats(70, 110, 70, 115, 70, 90),
    item: 'Lucarionite',
    ability: 'Inner Focus',
    nature: 'Modest',
    sp: stats(2, 0, 0, 32, 0, 32),
    moves: ['Aura Sphere', 'Flash Cannon', 'Vacuum Wave', 'Protect'],
  },
  {
    species: 'Sylveon',
    gender: 'F',
    dex: 700,
    types: ['fairy'],
    base: stats(95, 65, 65, 110, 130, 60),
    item: 'Leftovers',
    ability: 'Pixilate',
    nature: 'Modest',
    sp: stats(32, 0, 2, 32, 0, 0),
    moves: ['Hyper Voice', 'Moonblast', 'Helping Hand', 'Protect'],
  },
  {
    species: 'Kingambit',
    gender: 'M',
    dex: 983,
    types: ['dark', 'steel'],
    base: stats(100, 135, 120, 60, 85, 50),
    item: 'Focus Sash',
    ability: 'Defiant',
    nature: 'Adamant',
    sp: stats(32, 32, 2, 0, 0, 0),
    moves: ['Sucker Punch', 'Kowtow Cleave', 'Iron Head', 'Protect'],
  },
  {
    species: 'Whimsicott',
    gender: 'M',
    dex: 547,
    types: ['grass', 'fairy'],
    base: stats(60, 67, 85, 77, 75, 116),
    item: 'Lum Berry',
    ability: 'Prankster',
    nature: 'Timid',
    sp: stats(32, 0, 2, 0, 0, 32),
    moves: ['Tailwind', 'Moonblast', 'Encore', 'Protect'],
  },
];

function buildPokemon(teamId, slot, p) {
  return {
    showdownData: {
      species: p.species,
      gender: p.gender ?? '',
      item: p.item,
      ability: p.ability,
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      nature: p.nature,
      evs: p.sp,
      moves: p.moves,
    },
    pokedexNumber: p.dex,
    nationalDexNumber: p.dex,
    types: p.types,
    baseStats: p.base,
    spriteUrl: sprite(p.dex),
    importedAt: FIXED_TIME,
    id: `${teamId}-mon-${slot}`,
  };
}

export const DEMO_TEAM_NAME = 'Rain Goodstuffs';

/** Value for the 'teams-database' key; mirrors TeamsDatabase (schemaVersion 2). */
export const DEMO_TEAMS_DATABASE = {
  schemaVersion: 2,
  teams: [
    {
      id: 'demo-team-1',
      name: DEMO_TEAM_NAME,
      format: 'Reg M-A',
      pokemon: ROSTER.map((p, i) => buildPokemon('demo-team-1', i, p)),
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
      author: 'Demo',
    },
  ],
  tombstones: [],
  lastModified: FIXED_TIME,
};
