// The DOM HUD handles the crosshair, hit marker, match status, health, and the single
// overlay panel. It never touches simulation state; main.js pushes values in and reads
// only the play-button callback back out.

const OVERLAY_COPY = {
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

const PHASE_LABELS = {
  buy: 'Buy',
  combat: 'Combat',
  roundEnd: 'Round Over',
  idle: 'Ready',
};

const DEFAULT_CACHED_VALUES = {
  mag: -1,
  reserve: -1,
  round: -1,
  playerWins: -1,
  botWins: -1,
  phase: '',
  seconds: -1,
  health: -1,
  money: -1,
  grenades: -1,
  weapon: '',
  armor: null,
  bombPrompt: '',
};

function element(id) {
  return document.getElementById(id);
}

export function createHud() {
  const dom = {
    overlay: element('overlay'),
    overlayTitle: element('overlay-title'),
    overlayCopy: element('overlay-copy'),
    play: element('play'),
    ammo: element('ammo'),
    ammoMag: element('ammo-mag'),
    ammoReserve: element('ammo-reserve'),
    round: element('round'),
    phaseLabel: element('phase-label'),
    timer: element('timer'),
    score: element('score-value'),
    healthFill: element('health-fill'),
    healthValue: element('health-value'),
    money: element('money-value'),
    grenades: element('grenade-count'),
    weaponName: element('weapon-name'),
    armor: element('armor-status'),
    bombPrompt: element('bomb-prompt'),
    hitmarker: element('hitmarker'),
    damage: element('damage-indicator'),
    killToast: element('kill-toast'),
    roundOutcome: element('round-outcome'),
  };

  const cached = { ...DEFAULT_CACHED_VALUES };
  let hitTimer = 0;
  let damageTimer = 0;
  let killTimer = 0;

  function flashHitmarker(killed, holdMs = 90) {
    dom.hitmarker.classList.add('on');
    dom.hitmarker.style.transform = killed
      ? 'translate(-50%, -50%) rotate(45deg) scale(1.25)'
      : '';
    clearTimeout(hitTimer);
    hitTimer = setTimeout(() => {
      dom.hitmarker.classList.remove('on');
      dom.hitmarker.style.transform = '';
    }, holdMs);
  }

  function flashDamage(screenAngle) {
    dom.damage.style.transform = `translate(-50%, -50%) rotate(${screenAngle.toFixed(1)}rad)`;
    dom.damage.classList.add('on');
    clearTimeout(damageTimer);
    damageTimer = setTimeout(() => dom.damage.classList.remove('on'), 420);
  }

  function flashKill(reward) {
    dom.killToast.textContent = `Kill confirmed +$${reward}`;
    dom.killToast.classList.add('on');
    clearTimeout(killTimer);
    killTimer = setTimeout(() => dom.killToast.classList.remove('on'), 900);
  }

  function setRoundOutcome(winner, phase, summary = '') {
    if (phase !== 'roundEnd') {
      dom.roundOutcome.classList.remove('on', 'player', 'bots');
      return;
    }

    const outcome = winner === 'player' ? 'Round Won' : 'Round Lost';
    dom.roundOutcome.textContent = summary ? `${outcome} — ${summary}` : outcome;
    dom.roundOutcome.classList.add('on', winner === 'player' ? 'player' : 'bots');
  }

  function showOverlay(mode, matchState) {
    const copy = OVERLAY_COPY[mode];
    dom.overlayTitle.textContent = copy.title;
    dom.overlayCopy.textContent = copy.copy;

    if (matchState && mode !== 'start' && mode !== 'paused') {
      dom.overlayCopy.textContent += ` Final score: ${matchState.playerWins} : ${matchState.botWins}.`;
    }

    dom.play.textContent = copy.action;
    dom.overlay.hidden = false;
    dom.play.focus();
  }

  return {
    setAmmo(mag, reserve) {
      if (mag === cached.mag && reserve === cached.reserve) return;
      cached.mag = mag;
      cached.reserve = reserve;
      dom.ammoMag.textContent = String(mag);
      dom.ammoReserve.textContent = `/ ${reserve}`;
      dom.ammo.classList.toggle('empty', mag === 0);
    },

    setMatch(nextRound, playerWins, botWins, phase, seconds) {
      if (nextRound !== cached.round) {
        cached.round = nextRound;
        dom.round.dataset.round = String(nextRound);
      }

      if (playerWins !== cached.playerWins || botWins !== cached.botWins) {
        cached.playerWins = playerWins;
        cached.botWins = botWins;
        dom.score.textContent = `${playerWins} : ${botWins}`;
      }

      if (phase !== cached.phase) {
        cached.phase = phase;
        dom.phaseLabel.textContent = PHASE_LABELS[phase] || PHASE_LABELS.idle;
        dom.round.classList.toggle('buy', phase === 'buy');
        dom.round.classList.toggle('round-end', phase === 'roundEnd');
      }

      if (seconds !== cached.seconds) {
        cached.seconds = seconds;
        dom.timer.textContent = String(seconds);
      }
    },

    setHealth(health) {
      if (health === cached.health) return;
      cached.health = health;
      dom.healthFill.style.width = `${health}%`;
      dom.healthValue.textContent = String(health);
    },

    setLoadout(weapon, armor) {
      if (weapon !== cached.weapon) {
        cached.weapon = weapon;
        dom.weaponName.textContent = weapon;
      }

      if (armor !== cached.armor) {
        cached.armor = armor;
        dom.armor.textContent = armor ? 'Armor 50%' : 'Armor —';
        dom.armor.classList.toggle('on', armor);
      }
    },

    setEconomy(money, grenadeCount) {
      if (money !== cached.money) {
        cached.money = money;
        dom.money.textContent = `$${money}`;
      }

      if (grenadeCount !== cached.grenades) {
        cached.grenades = grenadeCount;
        dom.grenades.textContent = `Frag × ${grenadeCount}`;
        dom.grenades.classList.toggle('empty', grenadeCount === 0);
      }
    },

    setBombPrompt(text) {
      if (text === cached.bombPrompt) return;
      cached.bombPrompt = text;
      dom.bombPrompt.textContent = text;
      dom.bombPrompt.hidden = !text;
    },

    hitMarker: flashHitmarker,
    damageIndicator: flashDamage,
    killConfirmed: flashKill,
    setRoundOutcome,
    showOverlay,

    hideOverlay() {
      dom.overlay.hidden = true;
    },

    onPlay(handler) {
      dom.play.addEventListener('click', handler);
    },
  };
}
