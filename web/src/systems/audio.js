// Web Audio API로 전부 절차적으로 합성하는 사운드 엔진 — 외부 오디오 파일을 전혀 쓰지 않는다
// (단일 HTML 아티팩트라 외부 리소스를 가져올 수 없다). 파도/항구 앰비언트 루프와 포격·충돌·
// 백병전·격침 등 원샷 효과음을 모두 노이즈/오실레이터 합성으로 만든다.
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.ambientGain = null;
    this.muted = false;
    this._noiseBuffer = null;
    this._ocean = null; // { src, filter, gain }
    this._harbor = null; // { oscA, oscB, filter, gain, gullTimer }
  }

  ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.value = 0.5;
    this.ambientGain.connect(this.master);
    this._noiseBuffer = this._makeNoiseBuffer(2);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.06);
  }

  _makeNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02; // 갈색 소음에 가깝게 스무딩(고주파 성분 억제)
      data[i] = last * 3.5;
    }
    return buf;
  }

  // ---- 바다 앰비언트(파도) — 폭풍 세기에 따라 필터/볼륨이 실시간으로 변한다 ----
  startOcean() {
    this.ensureContext();
    if (!this.ctx || this._ocean) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.32;
    src.connect(filter).connect(gain).connect(this.ambientGain);
    src.start();
    this._ocean = { src, filter, gain };
  }

  stopOcean() {
    if (!this._ocean) return;
    try { this._ocean.src.stop(); } catch { /* 이미 정지됐을 수 있음 */ }
    this._ocean = null;
  }

  updateOcean(stormIntensity) {
    if (!this._ocean) return;
    const t = this.ctx.currentTime;
    this._ocean.filter.frequency.setTargetAtTime(500 + stormIntensity * 1900, t, 0.6);
    this._ocean.gain.gain.setTargetAtTime(0.3 + stormIntensity * 0.4, t, 0.6);
  }

  // ---- 항구 앰비언트(잔잔한 화음 패드 + 이따금 우는 갈매기) ----
  startHarbor() {
    this.ensureContext();
    if (!this.ctx || this._harbor) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain).connect(this.ambientGain);
    gain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 1.2);

    const oscA = this.ctx.createOscillator();
    oscA.type = 'sine'; oscA.frequency.value = 110;
    const oscB = this.ctx.createOscillator();
    oscB.type = 'triangle'; oscB.frequency.value = 165; // 완전5도 위
    const mixA = this.ctx.createGain(); mixA.gain.value = 0.5;
    const mixB = this.ctx.createGain(); mixB.gain.value = 0.3;
    oscA.connect(mixA).connect(filter);
    oscB.connect(mixB).connect(filter);
    oscA.start(); oscB.start();

    const harbor = { oscA, oscB, filter, gain, alive: true };
    this._harbor = harbor;
    this._scheduleGull(harbor);
  }

  _scheduleGull(harbor) {
    if (!harbor.alive) return;
    const delay = 3000 + Math.random() * 6000;
    setTimeout(() => {
      if (!harbor.alive || this._harbor !== harbor) return;
      this._playGull();
      this._scheduleGull(harbor);
    }, delay);
  }

  _playGull() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain).connect(this.sfxGain);
    osc.frequency.setValueAtTime(1400 + Math.random() * 300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    gain.gain.linearRampToValueAtTime(0.06, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t); osc.stop(t + 0.45);
  }

  stopHarbor() {
    if (!this._harbor) return;
    const h = this._harbor;
    h.alive = false;
    const t = this.ctx.currentTime;
    h.gain.gain.setTargetAtTime(0, t, 0.3);
    try { h.oscA.stop(t + 1); h.oscB.stop(t + 1); } catch { /* no-op */ }
    this._harbor = null;
  }

  // ---- 원샷 효과음 ----
  playCannon() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // 저역 "쿵" — 급격히 아래로 떨어지는 사인파
    const thump = this.ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, t);
    thump.frequency.exponentialRampToValueAtTime(35, t + 0.28);
    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(0.55, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    thump.connect(thumpGain).connect(this.sfxGain);
    thump.start(t); thump.stop(t + 0.35);

    // 발사 순간의 노이즈 크랙
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass'; noiseFilter.frequency.value = 800;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    noise.connect(noiseFilter).connect(noiseGain).connect(this.sfxGain);
    noise.start(t); noise.stop(t + 0.16);
  }

  playHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 700;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    noise.connect(filter).connect(gain).connect(this.sfxGain);
    noise.start(t); noise.stop(t + 0.42);
  }

  _stinger(freqs, t0) {
    if (!this.ctx) return;
    freqs.forEach((f, i) => {
      const t = t0 + i * 0.09;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(t); osc.stop(t + 0.4);
    });
  }

  playWinStinger() { if (this.ctx) this._stinger([440, 554, 659, 880], this.ctx.currentTime); }
  playLoseStinger() { if (this.ctx) this._stinger([392, 349, 294], this.ctx.currentTime); }
  // 네 칭호 축(교역/모험/전투/악명) 중 하나가 최종 칭호에 닿을 때 울리는 팡파르(systems/fame.js).
  playTitleFanfare() { if (this.ctx) this._stinger([523, 659, 784, 1047], this.ctx.currentTime); }
}

export const audio = new AudioEngine();
