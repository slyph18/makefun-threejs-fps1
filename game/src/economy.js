// The player's purse persists across rounds. buy.js validates purchases against this
// state; match rewards and kill income are applied here.

const START_MONEY = 800;
const WIN_REWARD = 300;
const LOSS_REWARD = 1400;
const LOSS_STREAK_BONUS = 500;
const KILL_REWARD = 300;
const MAX_LOSS_REWARD = 3400;
const MAX_MONEY = 16000;

export function createEconomy() {
  const state = {
    money: START_MONEY,
    lossStreak: 0,
  };

  function addMoney(amount) {
    state.money = Math.min(MAX_MONEY, state.money + amount);
    return state.money;
  }

  function spend(cost) {
    if (state.money < cost) return false;
    state.money -= cost;
    return true;
  }

  function lossReward() {
    return Math.min(MAX_LOSS_REWARD, LOSS_REWARD + (state.lossStreak - 1) * LOSS_STREAK_BONUS);
  }

  function awardRound(winner) {
    if (winner === 'player') {
      state.lossStreak = 0;
      addMoney(WIN_REWARD);
      return;
    }

    state.lossStreak += 1;
    addMoney(lossReward());
  }

  return {
    state,
    spend,
    awardRound,
    addKillReward() {
      return addMoney(KILL_REWARD);
    },
    resetMatch() {
      state.money = START_MONEY;
      state.lossStreak = 0;
    },
  };
}
