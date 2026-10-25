// UI text from design/COPY.md. Patois is on by default; every line has a plain version.

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
const word = (n: number) => WORDS[n] ?? String(n);
/** How dice are called at the table in Patois: a 1 is an "ace", a 2 a "deuce". */
const DIE_WORDS = ['zero', 'ace', 'deuce', 'three', 'four', 'five', 'six'];
const dieWord = (n: number) => DIE_WORDS[n] ?? String(n);
const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function copy(patois: boolean) {
  return {
    double: (n: number, blockCanMove: boolean) =>
      patois
        ? `Double ${dieWord(n)}!${blockCanMove ? ' Move di block!' : ''}`
        : `Double ${word(n)}!${blockCanMove ? ' Move your block!' : ''}`,
    killShout: patois ? 'Dead!' : 'Killed!',
    killSub: (yard: string) => (patois ? `Back a yard to ${yard} yuh go.` : `It goes back to the ${yard} yard.`),
    bornShout: patois ? 'Yuh born!' : 'Born!',
    blockShout: patois ? 'Block!' : 'Blocked!',
    heavenShout: patois ? 'Reach heaven!' : 'Home!',
    winShout: 'Run yard!',
    ready: patois ? 'Mi ready' : "I'm ready",
    bountyShout: patois ? 'Bounty!' : 'Bounty!',
    bountyLine: (who: string) =>
      patois ? `${who} man did nearly reach home. Not again!` : `${who}'s man was nearly home. Not anymore!`,
    bountyHunt: (who: string) =>
      patois ? `Bounty: kill ${who} man before him reach home!` : `Bounty: you can kill ${who}'s man before he gets home!`,
    bountyWatch: (who: string) =>
      patois ? `${who} man close to home. Go fi him!` : `${who}'s man is close to home. Go get him!`,
    bountyMine: patois ? 'Yuh man close to home. Everybody a come fi him!' : 'Your man is close to home. Everyone is coming for him!',
    hunted: (who: string, n: number) =>
      patois ? `${who} kill yuh ${n} time dis game.` : `${who} has killed you ${n} times this game.`,
    hunter: (who: string, n: number) =>
      patois ? `Yuh sen ${who} back a yard ${n} time. Keep it up!` : `You've sent ${who} home ${n} times. Keep it up!`,
  };
}

export const countWord = (n: number) => word(n);
export const CountWord = (n: number) => capital(word(n));
