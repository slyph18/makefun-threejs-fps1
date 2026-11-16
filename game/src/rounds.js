// Match flow only: phase timing, round outcomes, and the first-to-three result. main.js
// owns spawning; rounds.js advances state and publishes a one-line post-round summary.
const BUY_TIME = 7;
const COMBAT_TIME = 75;
const ROUND_END_TIME = 1.4;
const WIN_TARGET = 3;
const BOTS_TOTAL = 4;

export function createRounds() {
  const state = {
    round: 0,
    playerWins: 0,
    botWins: 0,
    phase: 'idle',
    phaseTime: 0,
    roundReset: false,
    matchOver: false,
    winner: '',
    lastRoundWinner: '',
    lastRoundSummary: '',
  };

  function beginRound() {
    state.round += 1;
    state.phase = 'buy';
    state.phaseTime = 0;
    state.roundReset = true;
    state.lastRoundWinner = '';
    state.lastRoundSummary = '';
  }

  function beginMatch() {
    state.playerWins = 0;
    state.botWins = 0;
    state.matchOver = false;
    state.winner = '';
    beginRound();
  }

  function finishRound(winner, summary) {
    state.lastRoundWinner = winner;
    if (winner === 'player') state.playerWins += 1;
    else state.botWins += 1;
    state.phase = 'roundEnd';
    state.phaseTime = 0;
    state.lastRoundSummary = summary;
  }

  function step(dt, playerAlive, botsRemaining, objectiveWinner = '', objectiveActive = false) {
    if (!state.matchOver) state.phaseTime += dt;
    if (state.phase === 'buy') {
      if (state.phaseTime >= BUY_TIME) {
        state.phase = 'combat';
        state.phaseTime = 0;
      }
      return;
    }
    if (state.phase === 'combat') {
      if (objectiveWinner) {
        finishRound(objectiveWinner, 'Detonation confirmed at Site A.');
      } else if (botsRemaining === 0) {
        finishRound('player', `Squad cleared — ${BOTS_TOTAL - botsRemaining}/4 bots down.`);
      } else if (!objectiveActive && !playerAlive) {
        finishRound('bots', 'Player eliminated before detonation.');
      } else if (!objectiveActive && state.phaseTime >= COMBAT_TIME) {
        finishRound('bots', 'Time expired — Site A holds.');
      }
      return;
    }
    if (state.phase === 'roundEnd' && state.phaseTime >= ROUND_END_TIME) {
      if (state.playerWins >= WIN_TARGET) {
        state.matchOver = true;
        state.winner = 'player';
      } else if (state.botWins >= WIN_TARGET) {
        state.matchOver = true;
        state.winner = 'bots';
      } else {
        beginRound();
      }
    }
  }

  return {
    state,
    beginMatch,
    step,
    remainingTime() {
      if (state.phase === 'buy') return Math.max(0, BUY_TIME - state.phaseTime);
      if (state.phase === 'combat') return Math.max(0, COMBAT_TIME - state.phaseTime);
      return Math.max(0, ROUND_END_TIME - state.phaseTime);
    },
    pressure() {
      if (state.phase !== 'combat') return 0;
      return Math.min(1, state.phaseTime / COMBAT_TIME);
    },
  };
}
