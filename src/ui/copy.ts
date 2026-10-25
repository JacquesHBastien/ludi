// UI text from design/COPY.md. Patois is on by default; every line has a plain version.

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
const word = (n: number) => WORDS[n] ?? String(n);
const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1);

export function copy(patois: boolean) {
  return {
    double: (n: number, blockCanMove: boolean) =>
      patois ? `Double ${word(n)}!${blockCanMove ? ' Move di block!' : ''}` : `You rolled a double ${n}`,
    killShout: patois ? 'Dead!' : 'Killed!',
    killSub: (yard: string) => (patois ? `Back a yard to ${yard} yuh go.` : `It goes back to the ${yard} yard.`),
    bornShout: patois ? 'Yuh born!' : 'Born!',
    blockShout: patois ? 'Block!' : 'Blocked!',
    heavenShout: patois ? 'Reach heaven!' : 'Home!',
    winShout: 'Run yard!',
    ready: patois ? 'Mi ready, mek mi roll' : "I'm ready",
  };
}

export const countWord = (n: number) => word(n);
export const CountWord = (n: number) => capital(word(n));
