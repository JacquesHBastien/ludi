import { useState } from 'react';
import { createGame, type GameState } from './engine';
import { clearGame, loadGame, saveGame } from './storage/persist';
import { loadPrefs, savePrefs, type Prefs } from './storage/prefs';
import { getTheme } from './theme/themes';
import { Game } from './ui/screens/Game';
import { Home } from './ui/screens/Home';
import { Setup, type SetupResult } from './ui/screens/Setup';
import { setMuted } from './ui/sound';

type Screen = 'home' | 'setup' | 'game';

// Dev builds only: add ?testdice to the address to choose dice values by hand.
const TEST_DICE = import.meta.env.DEV && new URLSearchParams(location.search).has('testdice');

export default function App() {
  const [prefs, setPrefsState] = useState<Prefs>(loadPrefs);
  const [game, setGameState] = useState<GameState | null>(loadGame);
  // A game in progress comes straight back (to the handoff screen) after a refresh.
  const [screen, setScreen] = useState<Screen>(() => (game?.status === 'playing' ? 'game' : 'home'));
  // Bumped for every new game so the game screen starts fresh.
  const [round, setRound] = useState(0);
  const [vsComputer, setVsComputer] = useState(false);

  const setPrefs = (next: Prefs) => {
    setPrefsState(next);
    savePrefs(next);
  };
  setMuted(prefs.muted);
  const setGame = (next: GameState) => {
    setGameState(next);
    saveGame(next);
  };

  const start = (players: GameState['players'], rules: GameState['rules']) => {
    setGame(createGame({ players, rules }));
    setRound((r) => r + 1);
    setScreen('game');
  };

  if (screen === 'setup') {
    return (
      <Setup
        initial={prefs}
        vsComputer={vsComputer}
        onBack={() => setScreen('home')}
        onStart={(r: SetupResult) => {
          setPrefs({ ...prefs, themeId: r.themeId, rules: r.rules, names: r.typed, patois: r.patois, competitive: r.competitive });
          start(
            r.seats.map((s) => ({ id: s.color, name: s.name, color: s.color, ...(s.computer ? { computer: s.computer } : {}) })),
            r.rules,
          );
        }}
      />
    );
  }

  if (screen === 'game' && game) {
    return (
      <Game
        key={round}
        game={game}
        theme={getTheme(prefs.themeId)}
        patois={prefs.patois}
        muted={prefs.muted}
        competitive={prefs.competitive}
        onToggleCompetitive={() => setPrefs({ ...prefs, competitive: !prefs.competitive })}
        closeUp={prefs.closeUp}
        onToggleCloseUp={() => setPrefs({ ...prefs, closeUp: !prefs.closeUp })}
        testDice={TEST_DICE}
        onChange={setGame}
        onTogglePatois={() => setPrefs({ ...prefs, patois: !prefs.patois })}
        onToggleSound={() => setPrefs({ ...prefs, muted: !prefs.muted })}
        onChangeTheme={(themeId) => setPrefs({ ...prefs, themeId })}
        onHome={() => {
          if (game.status === 'over') clearGame();
          setScreen('home');
        }}
        onPlayAgain={() => start(game.players, game.rules)}
      />
    );
  }

  return (
    <Home
      canContinue={game?.status === 'playing'}
      onContinue={() => {
        setRound((r) => r + 1);
        setScreen('game');
      }}
      onNewGame={() => {
        setVsComputer(false);
        setScreen('setup');
      }}
      onVsComputer={() => {
        setVsComputer(true);
        setScreen('setup');
      }}
    />
  );
}
