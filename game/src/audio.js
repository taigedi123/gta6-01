// Synthesised sound with WebAudio only: no audio files, no network.
// Engine hum, siren, gunshot, punch, pickup, mission jingle and UI clicks.
export function createSound() {
  let ctx = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    } catch { return null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
      gain.gain.setValueAtTime(vol || 0.08, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      osc.connect(gain).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + dur);
    } catch { /* audio is a garnish, never a crash */ }
  }

  function noise(dur, vol, lowpass) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    try {
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const gain = c.createGain();
      gain.gain.value = vol || 0.15;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
    } catch { /* ignore */ }
  }

  return {
    unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    click() { tone(660, 0.06, 'sine', 0.06); },
    coin() { tone(880, 0.09, 'sine', 0.09); tone(1320, 0.14, 'sine', 0.07); },
    mission() { tone(523, 0.12, 'triangle', 0.1); setTimeout(() => tone(659, 0.12, 'triangle', 0.1), 120); setTimeout(() => tone(784, 0.22, 'triangle', 0.1), 240); },
    missionFail() { tone(330, 0.2, 'sawtooth', 0.07, 180); },
    gunshot() { noise(0.12, 0.22, 900); tone(180, 0.08, 'square', 0.08, 60); },
    punch() { noise(0.08, 0.16, 500); },
    crash() { noise(0.25, 0.2, 400); },
    steal() { tone(440, 0.08, 'square', 0.06); setTimeout(() => tone(550, 0.1, 'square', 0.06), 90); },
    siren(dt, wanted) {
      if (muted || wanted <= 0) { sirenTimer = 0; return; }
      sirenTimer -= dt;
      if (sirenTimer <= 0) {
        sirenTimer = 0.55;
        tone(740, 0.5, 'sine', 0.035, 980);
      }
    },
    engine(on, speedRatio) {
      const c = ensure();
      if (!c) return;
      if (!on) {
        if (engineOsc) { try { engineOsc.stop(); } catch { /* ignore */ } engineOsc = null; engineGain = null; }
        return;
      }
      if (!engineOsc) {
        try {
          engineOsc = c.createOscillator();
          engineGain = c.createGain();
          engineOsc.type = 'sawtooth';
          engineOsc.frequency.value = 60;
          engineGain.gain.value = 0.0;
          engineOsc.connect(engineGain).connect(c.destination);
          engineOsc.start();
        } catch { engineOsc = null; }
      }
      if (engineOsc && engineGain) {
        engineOsc.frequency.setTargetAtTime(55 + speedRatio * 140, c.currentTime, 0.08);
        engineGain.gain.setTargetAtTime(muted ? 0 : 0.02 + speedRatio * 0.03, c.currentTime, 0.1);
      }
    },
  };
}
