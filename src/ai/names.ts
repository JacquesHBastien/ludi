// Common Jamaican names for computer players, men and women.
export const BOT_NAMES = [
  'Andre', 'Anthony', 'Courtney', 'Damion', 'Delroy', 'Desmond', 'Devon', 'Dwayne', 'Errol', 'Everton',
  'Fitzroy', 'Garfield', 'Kemar', 'Leroy', 'Marlon', 'Nathaniel', "O'Neil", 'Omar', 'Ricardo', 'Rohan',
  'Tyrone', 'Winston', 'Clive', 'Junior', 'Shane',
  'Andrea', 'Beverley', 'Claudette', 'Donna', 'Gloria', 'Hyacinth', 'Janet', 'Jennifer', 'Joan', 'Kadian',
  'Keisha', 'Latoya', 'Marcia', 'Monique', 'Nadine', 'Paulette', 'Sasha-Kay', 'Shanice', 'Simone', 'Tanisha',
  'Yvonne', 'Cherise', 'Shelly-Ann', 'Natalie', 'Kimberley',
];

/** A name not already taken at the table. */
export function botName(taken: string[], random: () => number = Math.random): string {
  const free = BOT_NAMES.filter((n) => !taken.includes(n));
  const pool = free.length ? free : BOT_NAMES;
  return pool[Math.floor(random() * pool.length)]!;
}
