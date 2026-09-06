/**
 * TacticalAudioEngine — Sintetizador de áudio procedural via Web Audio API
 * Sem arquivos externos, gera cliques mecânicos de relé, beeps de radar e zumbido de CRT.
 */
export class TacticalAudioEngine {
  constructor() {
    this.ctx = null;
    this.isEnabled = true;
    this.humGain = null;
  }

  _ensureContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Clique mecânico de comutador/relé industrial
   */
  playRelayClick(isOn = true) {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(isOn ? 380 : 260, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  /**
   * Clique suave de pino / disjuntor do switchboard
   */
  playPinClick(freq = 800) {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.025);
  }

  /**
   * Chirp de travamento de alvo no retículo
   */
  playTargetLock() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1760, now + 0.04);
    osc.frequency.setValueAtTime(2640, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.12);
  }

  /**
   * Pulso de rotação de dial de sensor
   */
  playDialPulse() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(680, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  }

  /**
   * Ping de Sonar/Radar de varredura topográfica
   */
  playRadarPing() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.35);
  }

  /**
   * Bipe de telemetria e recepção de pacote marciano
   */
  playTelemetryBeep(highPitch = false) {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(highPitch ? 2200 : 1250, now);
    osc.frequency.exponentialRampToValueAtTime(highPitch ? 1800 : 950, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.05);
  }

  /**
   * Zumbido de ressonância bio-molecular e varredura de DNA
   */
  playDnaScanHum() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.3);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.3);
  }

  /**
   * Bipe harmônico de sequenciamento de códon/nucleotídeo
   */
  playCodonBeep(idx = 0) {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
    const freq = notes[idx % notes.length];
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.08);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.08);
  }

  /**
   * Travamento de gene / sequência completa
   */
  playGeneLock() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";
    osc1.frequency.setValueAtTime(880, now);
    osc2.frequency.setValueAtTime(1320, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  /**
   * Pulso eletromagnético / disparo de contenção de plasma do reator
   */
  playPlasmaPulse() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const oscSub = ctx.createOscillator();
    const oscChirp = ctx.createOscillator();
    const gain = ctx.createGain();

    // Grave de impacto eletromagnético
    oscSub.type = "sine";
    oscSub.frequency.setValueAtTime(140, now);
    oscSub.frequency.exponentialRampToValueAtTime(35, now + 0.35);

    // Chirp brilhante de ionização
    oscChirp.type = "sawtooth";
    oscChirp.frequency.setValueAtTime(1200, now);
    oscChirp.frequency.exponentialRampToValueAtTime(320, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    oscSub.connect(gain);
    oscChirp.connect(gain);
    gain.connect(ctx.destination);

    oscSub.start();
    oscChirp.start();
    oscSub.stop(now + 0.38);
    oscChirp.stop(now + 0.18);
  }

  /**
   * Zumbido ressonante de turbina / confinamento magnético
   */
  playReactorHum() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "triangle";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(65, now);
    osc2.frequency.setValueAtTime(130, now);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  /**
   * Clique estático de radiação / contador Geiger
   */
  playRadiationTick() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(2400 + Math.random() * 800, now);

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.015);
  }

  /**
   * Giro ressonante do visualizador atômico (ATOM_VIEW)
   */
  playAtomSpin() {
    if (!this.isEnabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.12);
  }

  toggleMute() {
    this.isEnabled = !this.isEnabled;
    return this.isEnabled;
  }
}

export const soundFx = new TacticalAudioEngine();
