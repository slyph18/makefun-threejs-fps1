// Procedural Web Audio feedback. The game ships with no sound assets, and the
// audio system owns no simulation state beyond its bomb-tick timer.
const MASTER_GAIN = 0.28;
const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export function createAudio() {
  let context = null;
  let masterGain = null;
  let noiseBuffer = null;
  let secondsUntilBombBeep = 0;

  function currentTime() {
    return context.currentTime;
  }

  function ensureContext() {
    if (!AudioContextClass) return null;

    if (!context) {
      context = new AudioContextClass();
      masterGain = context.createGain();
      masterGain.gain.value = MASTER_GAIN;
      masterGain.connect(context.destination);

      const noiseSamples = context.sampleRate * 0.4;
      noiseBuffer = context.createBuffer(1, noiseSamples, context.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      for (let index = 0; index < channel.length; index += 1) {
        channel[index] = Math.random() * 2 - 1;
      }
    }

    return context;
  }

  function fadeOut(node, floor, duration) {
    const start = currentTime();
    node.gain.setValueAtTime(node.gain.value, start);
    node.gain.exponentialRampToValueAtTime(floor, start + duration);
  }

  function playNoise({ duration, gain, frequency, quality = 2 }) {
    if (!context || context.state !== 'running') return;

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const output = context.createGain();

    source.buffer = noiseBuffer;
    source.playbackRate.value = 1 + Math.random() * 0.2;
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = quality;
    output.gain.value = gain;

    source.connect(filter).connect(output).connect(masterGain);
    source.start();
    fadeOut(output, 0.001, duration);
    source.stop(currentTime() + duration);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      output.disconnect();
    };
  }

  function playTone({ type = 'sine', start, end, duration, gain, delay = 0 }) {
    if (!context || context.state !== 'running') return;

    const oscillator = context.createOscillator();
    const output = context.createGain();
    const startTime = currentTime() + delay;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, startTime);
    if (end) oscillator.frequency.exponentialRampToValueAtTime(end, startTime + duration);
    output.gain.setValueAtTime(gain, startTime);
    output.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(output).connect(masterGain);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      output.disconnect();
    };
  }

  return {
    unlock() {
      const audioContext = ensureContext();
      if (!audioContext || audioContext.state === 'running') return;
      Promise.resolve(audioContext.resume()).catch(() => {});
    },

    gunshot(distance = 0) {
      const falloff = 1 / (1 + distance * 0.075);
      playNoise({ duration: 0.14, gain: 0.55 * falloff, frequency: 950, quality: 0.8 });
      playTone({ type: 'triangle', start: 240, end: 68, duration: 0.07, gain: 0.3 * falloff });
    },

    reload() {
      playNoise({ duration: 0.06, gain: 0.28, frequency: 2500, quality: 6 });
      playTone({ type: 'square', start: 320, end: 190, duration: 0.035, gain: 0.1, delay: 0.11 });
    },

    bombTick(dt, fuse) {
      const interval = Math.max(0.16, Math.min(0.9, fuse * 0.038));
      secondsUntilBombBeep -= dt;
      if (secondsUntilBombBeep > 0) return;
      secondsUntilBombBeep = interval;
      playTone({ type: 'square', start: 1450, end: 1180, duration: 0.055, gain: 0.2 });
    },

    roundStart() {
      playTone({ type: 'sine', start: 310, end: 520, duration: 0.24, gain: 0.22 });
      playTone({ type: 'sine', start: 620, end: 780, duration: 0.16, gain: 0.13, delay: 0.18 });
    },

    roundEnd(winner) {
      const playerWon = winner === 'player';
      playTone({
        type: 'sine',
        start: playerWon ? 640 : 430,
        end: playerWon ? 340 : 180,
        duration: 0.48,
        gain: 0.24,
      });
    },
  };
}
