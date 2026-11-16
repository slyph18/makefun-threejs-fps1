// The DOM HUD: crosshair, hit marker, round status, health and the one overlay panel. It never
// touches the simulation; main.js pushes numbers in and reads the play callback out.
const COPY = {
  start: {
    title: 'Steel Corridor',
    copy: 'Buy gear, then defend Site A. First to three rounds wins.',
    action: 'Click to play',
  },
  paused: {
    title: 'Steel Corridor',
    copy: 'Paused. Click to resume.',
    action: 'Click to resume',
  },
  win: {
    title: 'Operation Won',
    copy: 'Three rounds secured. Site A held.',
    action: 'Play again',
  },
  loss: {
    title: 'Operation Lost',
    copy: 'Vantage took three rounds. Regroup and try again.',
    action: 'Play again',
  },
};

const PHASES = {
  buy: 'Buy',
  combat: 'Combat',
  roundEnd: 'Round Over',
  idle: 'Ready',
};

export function createHud() {
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlay-title');
  const copy = document.getElementById('overlay-copy');
  const play = document.getElementById('play');
  const ammo = document.getElementById('ammo');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoReserve = document.getElementById('ammo-reserve');
  const round = document.getElementById('round');
  const phaseLabel = document.getElementById('phase-label');
  const timer = document.getElementById('timer');
  const scoreValue = document.getElementById('score-value');
  const healthFill = document.getElementById('health-fill');
  const healthValue = document.getElementById('health-value');
  const moneyValue = document.getElementById('money-value');
  const grenadeCount = document.getElementById('grenade-count');
  const weaponName = document.getElementById('weapon-name');
  const armorStatus = document.getElementById('armor-status');
  const bombPrompt = document.getElementById('bomb-prompt');
  const hitmarker = document.getElementById('hitmarker');
  const damageIndicator = document.getElementById('damage-indicator');
  const killToast = document.getElementById('kill-toast');
  const roundOutcome = document.getElementById('round-outcome');
  let hitTimer = 0;
  let damageTimer = 0;
  let killTimer = 0;
  let lastMag = -1;
  let lastReserve = -1;
  let lastRound = -1;
  let lastPlayerWins = -1;
  let lastBotWins = -1;
  let lastPhase = '';
  let lastSeconds = -1;
  let lastHealth = -1;
  let lastMoney = -1;
  let lastGrenades = -1;
  let lastWeapon = '';
  let lastArmor = null;
  let lastPrompt = '';

  return {
    setAmmo(mag, reserve) {
      if (mag === lastMag && reserve === lastReserve) return;
      lastMag = mag;
      lastReserve = reserve;
      ammoMag.textContent = String(mag);
      ammoReserve.textContent = `/ ${reserve}`;
      ammo.classList.toggle('empty', mag === 0);
    },
    setMatch(nextRound, playerWins, botWins, phase, seconds) {
      if (nextRound !== lastRound) {
        lastRound = nextRound;
        round.dataset.round = String(nextRound);
      }
      if (playerWins !== lastPlayerWins || botWins !== lastBotWins) {
        lastPlayerWins = playerWins;
        lastBotWins = botWins;
        scoreValue.textContent = `${playerWins} : ${botWins}`;
      }
      if (phase !== lastPhase) {
        lastPhase = phase;
        phaseLabel.textContent = PHASES[phase] || PHASES.idle;
        round.classList.toggle('buy', phase === 'buy');
        round.classList.toggle('round-end', phase === 'roundEnd');
      }
      if (seconds !== lastSeconds) {
        lastSeconds = seconds;
        timer.textContent = String(seconds);
      }
    },
    setHealth(value) {
      if (value === lastHealth) return;
      lastHealth = value;
      healthFill.style.width = `${value}%`;
      healthValue.textContent = String(value);
    },
    setLoadout(weapon, armor) {
      if (weapon !== lastWeapon) {
        lastWeapon = weapon;
        weaponName.textContent = weapon;
      }
      if (armor !== lastArmor) {
        lastArmor = armor;
        armorStatus.textContent = armor ? 'Armor 50%' : 'Armor —';
        armorStatus.classList.toggle('on', armor);
      }
    },
    hitMarker(killed, holdMs = 90) {
      hitmarker.classList.add('on');
      hitmarker.style.transform = killed ? 'translate(-50%, -50%) rotate(45deg) scale(1.25)' : '';
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => {
        hitmarker.classList.remove('on');
        hitmarker.style.transform = '';
      }, holdMs);
    },
    damageIndicator(screenAngle) {
      damageIndicator.style.transform = `translate(-50%, -50%) rotate(${screenAngle.toFixed(1)}rad)`;
      damageIndicator.classList.add('on');
      clearTimeout(damageTimer);
      damageTimer = setTimeout(() => damageIndicator.classList.remove('on'), 420);
    },
    killConfirmed(reward) {
      killToast.textContent = `Kill confirmed +$${reward}`;
      killToast.classList.add('on');
      clearTimeout(killTimer);
      killTimer = setTimeout(() => killToast.classList.remove('on'), 900);
    },
    setRoundOutcome(winner, phase) {
      if (phase === 'roundEnd') {
        roundOutcome.textContent = winner === 'player' ? 'Round Won' : 'Round Lost';
        roundOutcome.classList.add('on', winner === 'player' ? 'player' : 'bots');
      } else {
        roundOutcome.classList.remove('on', 'player', 'bots');
      }
    },
    showOverlay(mode, matchState) {
      const text = COPY[mode];
      title.textContent = text.title;
      copy.textContent = text.copy;
      if (matchState && mode !== 'start' && mode !== 'paused') {
        copy.textContent += ` Final score: ${matchState.playerWins} : ${matchState.botWins}.`;
      }
      play.textContent = text.action;
      overlay.hidden = false;
      play.focus();
    },
    hideOverlay() {
      overlay.hidden = true;
    },
    setEconomy(value, grenades) {
      if (value !== lastMoney) {
        lastMoney = value;
        moneyValue.textContent = `$${value}`;
      }
      if (grenades !== lastGrenades) {
        lastGrenades = grenades;
        grenadeCount.textContent = `Frag × ${grenades}`;
        grenadeCount.classList.toggle('empty', grenades === 0);
      }
    },
    setBombPrompt(text) {
      if (text === lastPrompt) return;
      lastPrompt = text;
      bombPrompt.textContent = text;
      bombPrompt.hidden = !text;
    },
    onPlay(handler) {
      play.addEventListener('click', handler);
    },
  };
}
