import { soundFx } from "./sound-fx.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * TesteHudApp — Console da Oficina Tática (Workshop Module HUD)
 * Reconstrução em alta fidelidade funcional e visual da imagem tática militar.
 */
export class TesteHudApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "teste-hud-app",
    classes: ["teste-hud-window"],
    position: {
      width: 1280,
      height: 720
    },
    window: {
      title: "OFICINA TÁTICA // MÓDULO DE VERIFICAÇÃO DE SISTEMA [МАСТЕРСКАЯ]",
      icon: "fa-solid fa-microchip",
      resizable: true
    },
    actions: {
      toggleRelay: TesteHudApp.#onToggleRelay,
      togglePin: TesteHudApp.#onTogglePin,
      toggleSound: TesteHudApp.#onToggleSound,
      resetCircuit: TesteHudApp.#onResetCircuit,
      toggleDrone: TesteHudApp.#onToggleDrone
    }
  };

  static PARTS = {
    main: {
      template: "modules/teste-hud/templates/hud.hbs"
    }
  };

  constructor(options = {}) {
    super(options);

    // Estado dos relés do circuito
    this.relays = {
      asd: false,
      pod: true,       // Ativo por padrão como na imagem
      ptu: true,       // Semi-automático
      web: false,
      doi: false,
      openTop: false,
      mainOpen: true,  // Bloco OPEN ativado
      mainClose: false,
      auto: false,
      botAsd: false,
      botPod: true,    // Ativo por padrão
      botWeb: false,
      botDoi: false
    };

    // Estado dos sliders manuais SYS-01 e SYS-02
    this.sys1 = { channelA: 68, channelB: 42 };
    this.sys2 = { channelA: 52, channelB: 74 };

    // Estado dos 36 pinouts com LEDs
    this.pinStates = new Map();
    this._initPinStates();

    // Dials e Retículos
    this.activeDialId = "dial-3";
    this.activeReticleId = null;

    // Loop de animação da forma de onda e dot-matrix
    this._animFrameId = null;
    this.waveformHeights = [
      18, 26, 32, 22, 14, 28, 42, 54, 38, 29,
      46, 58, 62, 48, 35, 24, 39, 52, 41, 28,
      19, 31, 44, 36, 25, 17, 33, 49, 37, 21
    ];
  }

  _initPinStates() {
    // Inicializa estados fiéis à imagem:
    // Painel Esquerdo Superior: 90(ON), 80(OFF), 70(ON), 60(ON), 50(ON), 40(ON), 30(ON), 20(ON), 10(ON)
    const leftTopActive = [90, 70, 60, 50, 40, 30, 20, 10];
    const leftBotActive = [90, 80, 70, 60, 50, 40, 30, 20, 10];

    // Painel Direito Superior: 10(OFF), 20(ON), 30(ON), 40(ON), 50(ON), 60(ON), 70(OFF), 80(ON), 90(ON)
    const rightTopActive = [20, 30, 40, 50, 60, 80, 90];
    const rightBotActive = [20, 30, 40, 50, 60, 70, 80, 90];

    for (const val of [90, 80, 70, 60, 50, 40, 30, 20, 10]) {
      this.pinStates.set(`lt-${val}`, leftTopActive.includes(val));
      this.pinStates.set(`lb-${val}`, leftBotActive.includes(val));
    }

    for (const val of [10, 20, 30, 40, 50, 60, 70, 80, 90]) {
      this.pinStates.set(`rt-${val}`, rightTopActive.includes(val));
      this.pinStates.set(`rb-${val}`, rightBotActive.includes(val));
    }
  }

  async _prepareContext(options) {
    // 1. Os 15 Dials Circulares (3x5) com dados fiéis à imagem
    const dialData = [
      { id: "dial-1",  code: "5691712", val: "7181.4", pct: 75, rot: 45 },
      { id: "dial-2",  code: "5465255", val: "85845",  pct: 60, rot: 110 },
      { id: "dial-3",  code: "5595529", val: "85125",  pct: 90, rot: 210, isActive: true },
      { id: "dial-4",  code: "3712667", val: "81927",  pct: 45, rot: 280 },
      { id: "dial-5",  code: "2459872", val: "47261",  pct: 80, rot: 90 },

      { id: "dial-6",  code: "3517412", val: "58955",  pct: 35, rot: 15 },
      { id: "dial-7",  code: "5249155", val: "89239",  pct: 65, rot: 160 },
      { id: "dial-8",  code: "5147511", val: "85239",  pct: 85, rot: 260 },
      { id: "dial-9",  code: "1859318", val: "61978",  pct: 50, rot: 35 },
      { id: "dial-10", code: "7124729", val: "23632",  pct: 70, rot: 180 },

      { id: "dial-11", code: "7485-871-3", val: "58.555", pct: 40, rot: 60 },
      { id: "dial-12", code: "62417841",   val: "63441",  pct: 75, rot: 225 },
      { id: "dial-13", code: "45917812",   val: "85628",  pct: 88, rot: 315 },
      { id: "dial-14", code: "471397829",  val: "712582", pct: 55, rot: 105 },
      { id: "dial-15", code: "839401485",  val: "278054", pct: 30, rot: 195 }
    ];

    const dials = dialData.map(d => {
      // Perímetro do círculo r=14 é 2 * PI * 14 ≈ 87.96
      const perimeter = 87.96;
      const arcLen = (d.pct / 100) * perimeter;
      return {
        ...d,
        dashOffset: perimeter - arcLen
      };
    });

    // 2. Barras da Forma de Onda (30 barras)
    const waveformBars = this.waveformHeights.map((h, i) => ({
      height: h,
      isOrange: i === 6 || i === 7 || i === 11 || i === 12 || i === 22 || i === 27
    }));

    // 3. Pinouts (2 Matrizes de 18 pinos)
    const leftVals = [90, 80, 70, 60, 50, 40, 30, 20, 10];
    const pinoutsLeftTop = leftVals.map(v => ({
      id: `lt-${v}`,
      val: v,
      isActive: this.pinStates.get(`lt-${v}`) ?? true
    }));

    const pinoutsLeftBottom = leftVals.map(v => ({
      id: `lb-${v}`,
      val: v,
      isActive: this.pinStates.get(`lb-${v}`) ?? true
    }));

    const rightVals = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const pinoutsRightTop = rightVals.map(v => ({
      id: `rt-${v}`,
      val: v,
      isActive: this.pinStates.get(`rt-${v}`) ?? true
    }));

    const pinoutsRightBottom = rightVals.map(v => ({
      id: `rb-${v}`,
      val: v,
      isActive: this.pinStates.get(`rb-${v}`) ?? true
    }));

    // 4. Os 8 Retículos Gimbal com arcos e coordenadas exatas
    // Circunferência do círculo r=18 é 2 * PI * 18 ≈ 113.1
    const reticles = [
      { id: "r1", coordA: "1112", coordB: "53", hasArc: false, barPct: 65 },
      { id: "r2", coordA: "0001", coordB: "27", hasArc: true, arcType: "red", arcRot: 30, arcOffset: 113.1 * 0.65, barPct: 80 },
      { id: "r3", coordA: "1113", coordB: "27", hasArc: false, barPct: 50 },
      { id: "r4", coordA: "0002", coordB: "87", hasArc: true, arcType: "red", arcRot: 210, arcOffset: 113.1 * 0.7, barPct: 85 },
      { id: "r5", coordA: "1114", coordB: "64", hasArc: false, barPct: 40 },
      { id: "r6", coordA: "0003", coordB: "01", hasArc: false, barPct: 75 },
      { id: "r7", coordA: "1115", coordB: "50", hasArc: false, barPct: 60 },
      { id: "r8", coordA: "0004", coordB: "99", hasArc: false, barPct: 90 }
    ];

    return {
      dials,
      waveformBars,
      relays: this.relays,
      sys1: this.sys1,
      sys2: this.sys2,
      pinoutsLeftTop,
      pinoutsLeftBottom,
      pinoutsRightTop,
      pinoutsRightBottom,
      reticles,
      soundEnabled: soundFx.isEnabled
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);

    // Inicializa interatividade dos Dials Circulares
    const dialElements = this.element.querySelectorAll(".tactical-dial-cell");
    dialElements.forEach(el => {
      el.addEventListener("click", () => {
        soundFx.playDialPulse();
        dialElements.forEach(d => d.classList.remove("is-active"));
        el.classList.add("is-active");

        const id = el.getAttribute("data-dial-id");
        this.activeDialId = id;
      });
    });

    // Inicializa interatividade dos 8 Retículos Gimbal
    const reticleNodes = this.element.querySelectorAll(".gimbal-reticle-unit");
    reticleNodes.forEach(rn => {
      rn.addEventListener("click", () => {
        soundFx.playTargetLock();
        reticleNodes.forEach(r => r.classList.remove("is-locked"));
        rn.classList.add("is-locked");

        const id = rn.getAttribute("data-reticle-id");
        this.activeReticleId = id;
      });
    });

    // Inicializa Sliders Manuais SYS-01 e SYS-02 com clique e arrasto
    this._initSliderInteractions();

    // Inicia a animação ao vivo da forma de onda e do display de matriz de pontos
    this._startLiveAnimations();
  }

  _initSliderInteractions() {
    const channels = this.element.querySelectorAll(".channel-col");
    channels.forEach(ch => {
      const sliderKey = ch.getAttribute("data-slider"); // ex: sys1A, sys1B, sys2A, sys2B
      if (!sliderKey) return;

      const updateSlider = (clientY) => {
        const rect = ch.getBoundingClientRect();
        const offsetY = clientY - rect.top;
        const pct = Math.clamp(Math.round((1 - (offsetY / rect.height)) * 100), 5, 100);

        if (sliderKey === "sys1A") this.sys1.channelA = pct;
        else if (sliderKey === "sys1B") this.sys1.channelB = pct;
        else if (sliderKey === "sys2A") this.sys2.channelA = pct;
        else if (sliderKey === "sys2B") this.sys2.channelB = pct;

        const fill = ch.querySelector(".channel-fill");
        if (fill) fill.style.height = `${pct}%`;
        ch.setAttribute("title", `${sliderKey}: ${pct}%`);
      };

      ch.addEventListener("click", (e) => {
        soundFx.playPinClick(600);
        updateSlider(e.clientY);
      });

      ch.addEventListener("mousedown", (e) => {
        soundFx.playPinClick(600);
        const onMouseMove = (moveEvent) => updateSlider(moveEvent.clientY);
        const onMouseUp = () => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });
    });
  }

  _startLiveAnimations() {
    // 1. Renderizador da Matriz de Pontos LED (Canvas)
    const canvas = this.element.querySelector("#dotMatrixCanvas");
    const ctx = canvas?.getContext("2d");

    let tick = 0;
    const animate = () => {
      tick++;

      // Atualiza animação da Matriz de Pontos
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cols = 72;
        const rows = 7;
        const dotSize = 2;
        const gapX = 8;
        const gapY = 4;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = c * gapX + 4;
            const y = r * gapY + 3;

            // Padrão de onda senoidal militar animada
            const wave = Math.sin((c * 0.15) + (tick * 0.05)) * 2.5 + 3.5;
            const dist = Math.abs(r - wave);
            const isLit = dist < 1.2 || (c % 8 === 0 && r % 2 === 0);

            if (isLit) {
              ctx.fillStyle = dist < 0.6 ? "#ff8c33" : "#994006";
              ctx.fillRect(x, y, dotSize, dotSize);
            } else {
              ctx.fillStyle = "rgba(255, 106, 0, 0.05)";
              ctx.fillRect(x, y, 1.5, 1.5);
            }
          }
        }
      }

      // Atualiza levemente as barras da forma de onda a cada 4 frames
      if (tick % 4 === 0) {
        const waveBars = this.element.querySelectorAll(".wave-candlestick");
        waveBars.forEach((bar, idx) => {
          const delta = (Math.sin((idx * 0.4) + (tick * 0.08)) * 8) + (Math.random() * 4 - 2);
          const baseH = this.waveformHeights[idx] || 25;
          const currentH = Math.clamp(Math.round(baseH + delta), 8, 56);
          bar.style.setProperty("--stem-h", `${currentH}px`);
        });
      }

      this._animFrameId = requestAnimationFrame(animate);
    };

    if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
    this._animFrameId = requestAnimationFrame(animate);
  }

  _onClose(options) {
    if (this._animFrameId) {
      cancelAnimationFrame(this._animFrameId);
      this._animFrameId = null;
    }
    super._onClose?.(options);
  }

  // --- Ações Interativas ---

  static #onToggleRelay(event, target) {
    const relay = target.dataset.relay;
    if (!relay || this.relays[relay] === undefined) return;

    this.relays[relay] = !this.relays[relay];
    soundFx.playRelayClick(this.relays[relay]);

    // Comutação coordenada dos barramentos
    if (relay === "mainOpen") {
      this.relays.mainClose = false;
    } else if (relay === "mainClose") {
      this.relays.mainOpen = false;
    }

    this.render(false);
  }

  static #onTogglePin(event, target) {
    const pin = target.dataset.pin;
    if (!pin) return;

    const current = this.pinStates.get(pin) ?? false;
    const newState = !current;
    this.pinStates.set(pin, newState);

    const val = parseInt(pin.replace(/^[a-z]+-/, "")) || 50;
    soundFx.playPinClick(300 + (val * 8));

    this.render(false);
  }

  static #onToggleSound(event, target) {
    const enabled = soundFx.toggleMute();
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.info(`Áudio Tático: ${enabled ? "ATIVADO" : "MUTADO"}`);
    }
    this.render(false);
  }

  static #onResetCircuit(event, target) {
    soundFx.playRelayClick(false);
    this._initPinStates();
    this.relays = {
      asd: false,
      pod: true,
      ptu: true,
      web: false,
      doi: false,
      openTop: false,
      mainOpen: true,
      mainClose: false,
      auto: false,
      botAsd: false,
      botPod: true,
      botWeb: false,
      botDoi: false
    };
    this.render(false);
  }

  static #onToggleDrone(event, target) {
    soundFx.playTargetLock();
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.warn("DRONE // VANT: Sinal de telemetria sincronizado com a oficina.");
    }
  }
}

/**
 * NavegacaoHudApp — Console de Navegação Marciana [火星 NAVIGATION]
 * Reconstrução em 5 etapas da cartografia topográfica e telemetria de superfície.
 */
export class NavegacaoHudApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "nav-hud-app",
    classes: ["nav-hud-window"],
    position: {
      width: 1280,
      height: 800
    },
    window: {
      title: "NAVEGAÇÃO MARCIANA // [火星 NAVIGATION]",
      icon: "fa-solid fa-compass",
      resizable: true
    },
    actions: {
      openWorkshop: NavegacaoHudApp.#onOpenWorkshop,
      menuAction: NavegacaoHudApp.#onMenuAction,
      clickWaypoint: NavegacaoHudApp.#onClickWaypoint,
      pingWaveform: NavegacaoHudApp.#onPingWaveform,
      closeNavWindow: NavegacaoHudApp.#onCloseNavWindow
    }
  };

  static PARTS = {
    main: {
      template: "modules/teste-hud/templates/navigation.hbs"
    }
  };

  constructor(options = {}) {
    super(options);

    this.distanceKm = 54.3;
    this.activeMenu = "nav";
    this._waveformInterval = null;

    // 42 barras senoidais com dois picos principais fiéis ao Crop 1
    this.waveformHeights = [
      4, 6, 8, 12, 16, 20, 24, 22, 18, 14,
      10, 15, 22, 26, 28, 25, 20, 16, 12, 9,
      7, 10, 14, 19, 23, 27, 24, 18, 13, 10,
      8, 12, 17, 21, 23, 19, 15, 11, 8, 6, 5, 4
    ];
  }

  async _prepareContext(options) {
    const waveformBars = this.waveformHeights.map((h, i) => {
      const isPeak = h >= 22;
      return {
        height: h,
        glow: isPeak ? "6px" : "2px"
      };
    });

    const gridLinesX = [];
    for (let x = 25; x < 600; x += 25) gridLinesX.push(x);

    const gridLinesY = [];
    for (let y = 25; y < 600; y += 25) gridLinesY.push(y);

    return {
      distanceKm: this.distanceKm.toFixed(1),
      waveformBars,
      gridLinesX,
      gridLinesY,
      activeMenu: this.activeMenu
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._startWaveformAnimation();
  }

  _startWaveformAnimation() {
    if (this._waveformInterval) clearInterval(this._waveformInterval);

    this._waveformInterval = setInterval(() => {
      if (!this.element) return;
      const bars = this.element.querySelectorAll(".nav-wave-col");
      if (!bars || bars.length === 0) return;

      bars.forEach((bar, idx) => {
        const baseH = this.waveformHeights[idx] || 12;
        const delta = (Math.random() - 0.48) * 5;
        const newH = Math.max(3, Math.min(28, baseH + delta));
        bar.style.setProperty("--h", `${newH.toFixed(1)}px`);
      });
    }, 180);
  }

  async close(options) {
    if (this._waveformInterval) {
      clearInterval(this._waveformInterval);
      this._waveformInterval = null;
    }
    return super.close(options);
  }

  static #onCloseNavWindow(event, target) {
    soundFx.playRelayClick(false);
    this.close();
  }

  static #onOpenWorkshop(event, target) {
    soundFx.playTargetLock();
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.info("ROVER // LINK: Sincronizando com a OFICINA TÁTICA [МАСТЕРСКАЯ]...");
    }
    openOficinaHud();
  }

  static #onMenuAction(event, target) {
    soundFx.playRelayClick(true);
    const menuType = target.dataset.menu;
    if (menuType === "system") {
      openOficinaHud();
      return;
    }

    if (this.element) {
      const allBtns = this.element.querySelectorAll(".nav-menu-btn");
      allBtns.forEach(b => b.classList.remove("is-active"));
      target.classList.add("is-active");
    }

    if (typeof ui !== "undefined" && ui.notifications) {
      const names = {
        comms: "COMUNICAÇÕES MARCIANAS: Canal aberto com orbitador.",
        rover: "STATUS DO VEÍCULO: Propulsão nominal, esteiras 100%.",
        nav: "CARTOGRAFIA: Trajetória para WORKSHOP calculada (54.3 KM)."
      };
      if (names[menuType]) ui.notifications.info(names[menuType]);
    }
  }

  static #onClickWaypoint(event, target) {
    soundFx.playRadarPing();
    const wp = target.dataset.wp;
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.warn(`SENSOR // WAYPOINT: Sinal captado no ponto [${wp}]. Distância confirmada.`);
    }
  }

  static #onPingWaveform(event, target) {
    soundFx.playTelemetryBeep(true);
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.info("ESPECTRO DE RÁDIO: Varredura de sinal executada.");
    }
  }
}

/**
 * DnaHudApp — Console de Análise Genômica e DNA [DNA ANALYSIS]
 * Simulação 3D procedural da dupla-hélice em Canvas com feixe laser de varredura ativa.
 */
export class DnaHudApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dna-hud-app",
    classes: ["dna-hud-window"],
    position: {
      width: 1280,
      height: 720
    },
    window: {
      title: "ANÁLISE DE DNA // GENÔMICA TÁTICA [DNA ANALYSIS]",
      icon: "fa-solid fa-dna",
      resizable: true
    },
    actions: {
      closeDnaWindow: DnaHudApp.#onCloseDnaWindow,
      clickBadge: DnaHudApp.#onClickBadge,
      clickReticle: DnaHudApp.#onClickReticle
    }
  };

  static PARTS = {
    main: {
      template: "modules/teste-hud/templates/dna.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this._animId = null;
    this.rotSpeed = 0.012;
    this.angle = 0;
    this.laserPhase = 0;
    this.baseTiltX = -0.05;
    this.baseTiltY = 0.02;
    this.tiltX = 0;
    this.tiltY = 0;
    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.sparks = [];
  }

  async _prepareContext(options) {
    return {};
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._initDnaCanvas();
  }

  _initDnaCanvas() {
    if (!this.element) return;
    const canvas = this.element.querySelector("#dna-helix-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resizeCanvas());
      ro.observe(canvas);
    }

    // 140 nós 3D do plexo molecular de fundo
    const meshNodes = [];
    for (let i = 0; i < 140; i++) {
      meshNodes.push({
        x: (Math.random() - 0.5) * 940,
        y: (Math.random() - 0.5) * 360,
        z: (Math.random() - 0.5) * 200,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.2,
        vz: (Math.random() - 0.5) * 0.25
      });
    }

    // Interatividade com o mouse para inclinação 3D sutil (holográfica)
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      this.targetTiltY = mx * 0.12;
      this.targetTiltX = -my * 0.10;
    };
    const onMouseLeave = () => {
      this.targetTiltX = 0;
      this.targetTiltY = 0;
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const onClick = (e) => {
      soundFx.playCodonBeep(Math.floor(Math.random() * 8));
      this.rotSpeed = this.rotSpeed === 0.012 ? 0.026 : (this.rotSpeed === 0.026 ? 0.004 : 0.012);
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      for (let k = 0; k < 24; k++) {
        this.sparks.push({
          x: clickX + (Math.random() - 0.5) * 14,
          y: clickY + (Math.random() - 0.5) * 14,
          vx: (Math.random() - 0.5) * 3.8,
          vy: (Math.random() - 0.5) * 3.8 - 1.2,
          life: 1.0,
          color: Math.random() > 0.35 ? "#ffffff" : "#ffd15c"
        });
      }
    };
    canvas.addEventListener("click", onClick);

    let lastTime = performance.now();

    const renderFrame = (now) => {
      if (!this.element || !canvas.isConnected) {
        if (ro) ro.disconnect();
        return;
      }
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Suavização da inclinação 3D
      this.tiltX += (this.targetTiltX - this.tiltX) * 0.08;
      this.tiltY += (this.targetTiltY - this.tiltY) * 0.08;
      this.angle += this.rotSpeed;
      this.laserPhase += 0.018; // Varredura contínua cinematográfica

      const currentTiltX = this.baseTiltX + this.tiltX;
      const currentTiltY = this.baseTiltY + this.tiltY;
      const cosTx = Math.cos(currentTiltX);
      const sinTx = Math.sin(currentTiltX);
      const cosTy = Math.cos(currentTiltY);
      const sinTy = Math.sin(currentTiltY);

      const centerY = height * 0.52;
      const R = Math.min(94, height * 0.25);
      const startX = width * 0.045;
      const endHelixX = width * 0.82;
      const loopWidth = (endHelixX - startX) / 4.0; // Exatamente 4 loops como na referência
      const tailEndX = width * 0.95;

      const project = (x, y, z) => {
        const rx = x - width * 0.5;
        const ry = y - centerY;
        const rz = z;

        const x1 = rx * cosTy + rz * sinTy;
        const z1 = -rx * sinTy + rz * cosTy;
        const y2 = ry * cosTx - z1 * sinTx;
        const z2 = ry * sinTx + z1 * cosTx;

        const scale = 1.0 + z2 * 0.0008;
        return {
          px: width * 0.5 + x1 + z2 * 0.035,
          py: centerY + y2,
          scale,
          z: z2
        };
      };

      // 1. Grade técnica de fundo (background dot grid)
      ctx.fillStyle = "rgba(63, 244, 213, 0.12)";
      for (let gx = 20; gx < width; gx += 40) {
        for (let gy = 20; gy < height; gy += 40) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Plexo Molecular 3D (Constelação com Wireframe)
      for (let i = 0; i < meshNodes.length; i++) {
        const n = meshNodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
        if (n.x < -width * 0.5 || n.x > width * 0.5) n.vx *= -1;
        if (n.y < -height * 0.45 || n.y > height * 0.45) n.vy *= -1;
        if (n.z < -100 || n.z > 100) n.vz *= -1;
      }

      const projMesh = meshNodes.map(n => project(width * 0.5 + n.x, centerY + n.y, n.z));

      ctx.lineWidth = 0.5;
      for (let i = 0; i < projMesh.length; i++) {
        const p1 = projMesh[i];
        ctx.fillStyle = "rgba(63, 244, 213, 0.35)";
        ctx.beginPath();
        ctx.arc(p1.px, p1.py, 1.0 * p1.scale, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < projMesh.length; j++) {
          const p2 = projMesh[j];
          const distSq = (p1.px - p2.px) ** 2 + (p1.py - p2.py) ** 2;
          if (distSq < 4225) { // dist < 65px
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / 65) * 0.22 * p1.scale;
            ctx.strokeStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // 3. Scanner Dourado Ativo: Varredura horizontal contínua de ponta a ponta
      const laserX = startX + (0.5 + 0.5 * Math.sin(this.laserPhase)) * (endHelixX - startX);

      const renderables = [];

      // 4. Filamento de Contorno da Hélice (Backbone Curving Filaments)
      const numBbSamples = 120;
      const s1Pts = [];
      const s2Pts = [];
      for (let s = 0; s < numBbSamples; s++) {
        const t = s / (numBbSamples - 1);
        const x = startX + t * (endHelixX - startX);
        const theta = ((x - startX) / loopWidth) * Math.PI + this.angle;
        const y1 = centerY + R * Math.sin(theta);
        const z1 = R * Math.cos(theta);
        const y2 = centerY - R * Math.sin(theta);
        const z2 = -R * Math.cos(theta);

        s1Pts.push(project(x, y1, z1));
        s2Pts.push(project(x, y2, z2));
      }

      for (let s = 0; s < numBbSamples - 1; s++) {
        const p1a = s1Pts[s];
        const p1b = s1Pts[s + 1];
        const avgZ1 = (p1a.z + p1b.z) * 0.5;
        const d1 = Math.abs((p1a.px + p1b.px) * 0.5 - laserX);
        const h1 = d1 < 26;
        const int1 = h1 ? 1.0 - d1 / 26.0 : 0.0;
        renderables.push({
          type: "backbone_seg",
          p1: p1a,
          p2: p1b,
          z: avgZ1,
          isHit: h1,
          hitIntensity: int1
        });

        const p2a = s2Pts[s];
        const p2b = s2Pts[s + 1];
        const avgZ2 = (p2a.z + p2b.z) * 0.5;
        const d2 = Math.abs((p2a.px + p2b.px) * 0.5 - laserX);
        const h2 = d2 < 26;
        const int2 = h2 ? 1.0 - d2 / 26.0 : 0.0;
        renderables.push({
          type: "backbone_seg",
          p1: p2a,
          p2: p2b,
          z: avgZ2,
          isHit: h2,
          hitIntensity: int2
        });
      }

      // 5. Degraus de Pares de Base de Alta Densidade (64 degraus com micro-pérolas volumétricas)
      const numRungs = 64;
      for (let i = 0; i < numRungs; i++) {
        const t = i / (numRungs - 1);
        const x = startX + t * (endHelixX - startX);
        const theta = ((x - startX) / loopWidth) * Math.PI + this.angle;
        const sinTh = Math.sin(theta);
        const cosTh = Math.cos(theta);
        const absSin = Math.abs(sinTh);

        const y1_3d = centerY + R * sinTh;
        const z1_3d = R * cosTh;
        const y2_3d = centerY - R * sinTh;
        const z2_3d = -R * cosTh;

        const p1 = project(x, y1_3d, z1_3d);
        const p2 = project(x, y2_3d, z2_3d);

        const distLaser = Math.abs((p1.px + p2.px) * 0.5 - laserX);
        const isHit = distLaser < 28;
        const hitIntensity = isHit ? 1.0 - distLaser / 28.0 : 0.0;

        // Linha de ligação do par de bases
        renderables.push({
          type: "rung_line",
          p1,
          p2,
          z: (p1.z + p2.z) * 0.5 - 5,
          isHit,
          hitIntensity
        });

        // Contas micro-pérolas ao longo do degrau (13 contas por coluna)
        const numBeads = 13;
        for (let b = 1; b < numBeads; b++) {
          const u = b / numBeads;
          const by_3d = y1_3d + (y2_3d - y1_3d) * u;
          const bz_3d = z1_3d + (z2_3d - z1_3d) * u;
          const bp = project(x, by_3d, bz_3d);

          const bDist = Math.abs(bp.px - laserX);
          const bHit = bDist < 26;
          const bInt = bHit ? 1.0 - bDist / 26.0 : 0.0;

          renderables.push({
            type: "rung_bead",
            p: bp,
            z: bp.z,
            scale: bp.scale,
            isHit: bHit,
            hitIntensity: bInt
          });
        }

        // Nós principais e Coroa de Anéis Vesiculares (Donuts com miolo)
        // Ambas as cristas (superior e inferior) recebem anéis quando absSin > 0.52
        const isCrest = absSin > 0.52;
        const peakFrac = isCrest ? (absSin - 0.52) / 0.48 : 0.0;

        const s1Dist = Math.abs(p1.px - laserX);
        const s1Hit = s1Dist < 26;
        const s1Int = s1Hit ? 1.0 - s1Dist / 26.0 : 0.0;

        renderables.push({
          type: "strand_node",
          p: p1,
          z: p1.z,
          scale: p1.scale,
          isRing: isCrest,
          peakFrac,
          strand: 1,
          theta,
          isHit: s1Hit,
          hitIntensity: s1Int
        });

        const s2Dist = Math.abs(p2.px - laserX);
        const s2Hit = s2Dist < 26;
        const s2Int = s2Hit ? 1.0 - s2Dist / 26.0 : 0.0;

        renderables.push({
          type: "strand_node",
          p: p2,
          z: p2.z,
          scale: p2.scale,
          isRing: isCrest,
          peakFrac,
          strand: 2,
          theta: theta + Math.PI,
          isHit: s2Hit,
          hitIntensity: s2Int
        });

        // Anel satélite companheiro nas cristas de pico
        if (peakFrac > 0.82 && i % 2 === 0) {
          const offY1 = (p1.py < centerY ? -9 : 9) * p1.scale;
          const satP1 = { px: p1.px + (i % 4 - 2) * 3, py: p1.py + offY1, scale: p1.scale, z: p1.z + 10 };
          renderables.push({
            type: "satellite_ring",
            p: satP1,
            z: satP1.z,
            scale: satP1.scale,
            isHit: s1Hit
          });
        }

        // Constrição nodal nos pontos de cruzamento (absSin < 0.22)
        if (absSin < 0.22) {
          const crossP = project(x, centerY, 0);
          renderables.push({
            type: "twist_node",
            p: crossP,
            z: crossP.z,
            scale: crossP.scale,
            isHit
          });
        }

        // Faíscas dinâmicas ao atingir o feixe laser
        if ((s1Hit || s2Hit) && Math.random() < 0.35) {
          const hitNode = s1Hit ? p1 : p2;
          this.sparks.push({
            x: hitNode.px + (Math.random() - 0.5) * 8,
            y: hitNode.py + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 2.5,
            vy: (Math.random() - 0.5) * 2.8 - 1.2,
            life: 1.0,
            color: Math.random() > 0.35 ? "#ffffff" : "#ffd15c"
          });
        }
      }

      // 6. Extremidade Final do DNA: Cauda Fractal com Ramificações Orgânicas
      // Branch 1: Filamento Principal Superior
      const b1Pts = [];
      for (let step = 0; step < 26; step++) {
        const frac = step / 25.0;
        const bx = endHelixX + frac * 105;
        const by = centerY - 28 * Math.sin(frac * Math.PI * 0.5) + Math.pow(frac, 1.5) * 8;
        const bz = 15 * Math.cos(frac * Math.PI + this.angle);
        b1Pts.push(project(bx, by, bz));
      }
      for (let step = 0; step < b1Pts.length - 1; step++) {
        const p1 = b1Pts[step];
        const p2 = b1Pts[step + 1];
        renderables.push({
          type: "tail_filament",
          p1,
          p2,
          z: (p1.z + p2.z) * 0.5,
          width: Math.max(0.8, 2.0 * (1 - step / 28.0))
        });
        renderables.push({
          type: "tail_bead",
          p: p1,
          z: p1.z,
          scale: p1.scale,
          radius: Math.max(0.8, (2.4 - step * 0.08))
        });
      }

      // Branch 2: Sub-ramificação Superior
      const b2Pts = [];
      for (let step = 0; step < 16; step++) {
        const frac = step / 15.0;
        const bx = endHelixX + 35 + frac * 68;
        const by = centerY - 20 - frac * 26;
        const bz = 18 - frac * 15;
        b2Pts.push(project(bx, by, bz));
      }
      for (let step = 0; step < b2Pts.length - 1; step++) {
        const p1 = b2Pts[step];
        const p2 = b2Pts[step + 1];
        renderables.push({
          type: "tail_filament",
          p1,
          p2,
          z: (p1.z + p2.z) * 0.5,
          width: 1.2
        });
        renderables.push({
          type: "tail_bead",
          p: p1,
          z: p1.z,
          scale: p1.scale,
          radius: Math.max(0.7, 1.8 - step * 0.08)
        });
      }

      // Branch 3: Filamento Inferior Suave
      const b3Pts = [];
      for (let step = 0; step < 20; step++) {
        const frac = step / 19.0;
        const bx = endHelixX + frac * 85;
        const by = centerY + 24 * Math.sin(frac * Math.PI * 0.5) - Math.pow(frac, 1.5) * 6;
        const bz = -15 * Math.cos(frac * Math.PI + this.angle);
        b3Pts.push(project(bx, by, bz));
      }
      for (let step = 0; step < b3Pts.length - 1; step++) {
        const p1 = b3Pts[step];
        const p2 = b3Pts[step + 1];
        renderables.push({
          type: "tail_filament",
          p1,
          p2,
          z: (p1.z + p2.z) * 0.5,
          width: Math.max(0.8, 1.8 * (1 - step / 22.0))
        });
        renderables.push({
          type: "tail_bead",
          p: p1,
          z: p1.z,
          scale: p1.scale,
          radius: Math.max(0.8, 2.0 - step * 0.08)
        });
      }

      // 7. Z-Buffer: Ordenação de Profundidade
      renderables.sort((a, b) => a.z - b.z);

      // 8. Desenho dos Elementos em Profundidade
      for (const item of renderables) {
        const normZ = Math.max(0.0, Math.min(1.0, (item.z + R) / (2.0 * R)));

        if (item.type === "backbone_seg") {
          ctx.beginPath();
          ctx.moveTo(item.p1.px, item.p1.py);
          ctx.lineTo(item.p2.px, item.p2.py);
          if (item.isHit) {
            ctx.strokeStyle = `rgba(255, 235, 170, ${(0.55 + item.hitIntensity * 0.45).toFixed(2)})`;
            ctx.lineWidth = normZ > 0.5 ? 2.2 : 1.4;
            ctx.shadowColor = "#ffd15c";
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            if (normZ > 0.5) {
              ctx.strokeStyle = `rgba(63, 244, 213, ${(0.35 + normZ * 0.45).toFixed(2)})`;
              ctx.lineWidth = 1.8;
            } else {
              ctx.strokeStyle = `rgba(20, 115, 120, ${(0.15 + normZ * 0.25).toFixed(2)})`;
              ctx.lineWidth = 1.0;
            }
            ctx.stroke();
          }

        } else if (item.type === "rung_line") {
          ctx.beginPath();
          ctx.moveTo(item.p1.px, item.p1.py);
          ctx.lineTo(item.p2.px, item.p2.py);
          if (item.isHit) {
            ctx.strokeStyle = `rgba(255, 230, 160, ${(0.45 + item.hitIntensity * 0.55).toFixed(2)})`;
            ctx.lineWidth = 1.4;
            ctx.shadowColor = "#ffd15c";
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            ctx.strokeStyle = "rgba(63, 244, 213, 0.22)";
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }

        } else if (item.type === "rung_bead") {
          const r = (1.1 + normZ * 1.5) * item.scale;
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, r, 0, Math.PI * 2);

          if (item.isHit) {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#ffd15c";
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            if (normZ > 0.45) {
              const alpha = 0.55 + normZ * 0.45;
              ctx.fillStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
              ctx.fill();
            } else {
              const alpha = 0.2 + normZ * 0.35;
              ctx.fillStyle = `rgba(16, 110, 115, ${alpha.toFixed(3)})`;
              ctx.fill();
            }
          }

        } else if (item.type === "tail_filament") {
          ctx.beginPath();
          ctx.moveTo(item.p1.px, item.p1.py);
          ctx.lineTo(item.p2.px, item.p2.py);
          ctx.strokeStyle = "rgba(63, 244, 213, 0.75)";
          ctx.lineWidth = item.width;
          ctx.stroke();

        } else if (item.type === "tail_bead") {
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, item.radius * item.scale, 0, Math.PI * 2);
          ctx.fillStyle = normZ > 0.4 ? "rgba(190, 255, 248, 0.95)" : "rgba(63, 244, 213, 0.85)";
          ctx.fill();

        } else if (item.type === "satellite_ring") {
          const satR = 3.5 * item.scale;
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, satR, 0, Math.PI * 2);
          ctx.strokeStyle = item.isHit ? "#ffd15c" : "rgba(63, 244, 213, 0.85)";
          ctx.lineWidth = 1.6;
          ctx.stroke();

        } else if (item.type === "twist_node") {
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, 4.5 * item.scale, 0, Math.PI * 2);
          ctx.strokeStyle = item.isHit ? "#ffffff" : "rgba(190, 255, 248, 0.9)";
          ctx.lineWidth = 1.6;
          ctx.stroke();

        } else if (item.type === "strand_node") {
          if (item.isRing && normZ > 0.2) {
            // Anel Vesicular Vazado Brilhante (Vesícula / Donut com miolo)
            const ringR = (5.0 + (item.peakFrac || 0.5) * 3.5) * item.scale;
            const strokeW = 2.4;

            ctx.beginPath();
            ctx.arc(item.p.px, item.p.py, ringR, 0, Math.PI * 2);

            if (item.isHit) {
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = strokeW;
              ctx.shadowColor = "#ffd15c";
              ctx.shadowBlur = 14;
              ctx.stroke();
              ctx.shadowBlur = 0;

              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(item.p.px, item.p.py, 1.8 * item.scale, 0, Math.PI * 2);
              ctx.fill();
            } else {
              const alpha = 0.70 + normZ * 0.30;
              ctx.strokeStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
              ctx.lineWidth = strokeW;

              if (normZ > 0.4) {
                ctx.shadowColor = "rgba(63, 244, 213, 0.75)";
                ctx.shadowBlur = 8 * normZ;
              }
              ctx.stroke();
              ctx.shadowBlur = 0;

              // Anel concêntrico interno fino
              ctx.beginPath();
              ctx.arc(item.p.px, item.p.py, ringR * 0.45, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(200, 255, 245, ${(0.4 + normZ * 0.4).toFixed(3)})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();

              // Miolo central reflexivo
              ctx.beginPath();
              ctx.arc(item.p.px, item.p.py, 1.4 * item.scale, 0, Math.PI * 2);
              ctx.fillStyle = normZ > 0.5 ? "#ffffff" : "rgba(63, 244, 213, 0.75)";
              ctx.fill();
            }
          } else {
            // Conta sólida intermediária / nó
            const dotR = (1.6 + normZ * 2.0) * item.scale;
            ctx.beginPath();
            ctx.arc(item.p.px, item.p.py, dotR, 0, Math.PI * 2);

            if (item.isHit) {
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "#ffd15c";
              ctx.shadowBlur = 10;
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              if (normZ > 0.45) {
                const alpha = 0.5 + normZ * 0.5;
                ctx.fillStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
              } else {
                const alpha = 0.2 + normZ * 0.35;
                ctx.fillStyle = `rgba(16, 110, 115, ${alpha.toFixed(3)})`;
              }
              ctx.fill();
            }
          }
        }
      }

      // 9. Faíscas Quânticas de Excitação (Sparks)
      for (let s = this.sparks.length - 1; s >= 0; s--) {
        const sp = this.sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.032;
        if (sp.life <= 0) {
          this.sparks.splice(s, 1);
          continue;
        }

        ctx.fillStyle = sp.color === "#ffffff" ? `rgba(255, 255, 255, ${sp.life})` : `rgba(255, 209, 92, ${sp.life})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.3 * sp.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // 10. Feixe Laser Dourado de Varredura Ativa (Active Golden Scanner Beam)
      const laserTop = height * 0.18;
      const laserBottom = height * 0.88;

      // Brilho difuso âmbar externo
      ctx.strokeStyle = "rgba(255, 190, 60, 0.18)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(laserX, laserTop);
      ctx.lineTo(laserX, laserBottom);
      ctx.stroke();

      // Feixe gradiente dourado
      const laserGrad = ctx.createLinearGradient(0, laserTop, 0, laserBottom);
      laserGrad.addColorStop(0, "rgba(255, 209, 92, 0)");
      laserGrad.addColorStop(0.15, "rgba(255, 209, 92, 0.75)");
      laserGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
      laserGrad.addColorStop(0.85, "rgba(255, 209, 92, 0.75)");
      laserGrad.addColorStop(1, "rgba(255, 209, 92, 0)");

      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 2.4;
      ctx.shadowColor = "#ffd15c";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(laserX, laserTop);
      ctx.lineTo(laserX, laserBottom);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Núcleo branco puro de alta precisão
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(laserX, laserTop + 10);
      ctx.lineTo(laserX, laserBottom - 10);
      ctx.stroke();

      // Travas horizontais de cabeçalho e base
      ctx.strokeStyle = "#ffd15c";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(laserX - 6, laserTop);
      ctx.lineTo(laserX + 6, laserTop);
      ctx.moveTo(laserX - 6, laserBottom);
      ctx.lineTo(laserX + 6, laserBottom);
      ctx.stroke();

      this._animId = requestAnimationFrame(renderFrame);
    };

    this._animId = requestAnimationFrame(renderFrame);
  }

  async close(options) {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    return super.close(options);
  }

  static #onCloseDnaWindow(event, target) {
    soundFx.playRelayClick(false);
    this.close();
  }

  static #onClickBadge(event, target) {
    soundFx.playGeneLock();
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.info("GENÔMICA // AMOSTRA X-71: Sequência cromossômica bloqueada para síntese.");
    }
  }

  static #onClickReticle(event, target) {
    soundFx.playDnaScanHum();
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.warn("GIMBAL // FOCO MOLECULAR: Resolução ajustada para escala de 0.1 nanômetros.");
    }
  }
}

/**
 * ReactorHudApp — Console de Núcleo do Reator // Fusão Quântica [REACTOR CORE // ANALYSING DATA]
 * Simulação 3D procedural do reator cilíndrico explodido em Canvas 2D com plasma e telemetria militar.
 */
export class ReactorHudApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "reactor-hud-app",
    classes: ["reactor-hud-window"],
    position: {
      width: 1280,
      height: 720
    },
    window: {
      title: "NÚCLEO DO REATOR // FUSÃO QUÂNTICA [REACTOR CORE // ANALYSING DATA]",
      icon: "fa-solid fa-atom",
      resizable: true
    },
    actions: {
      closeReactorWindow: ReactorHudApp.#onCloseReactorWindow,
      clickReticle: ReactorHudApp.#onClickReticle,
      clickAtom: ReactorHudApp.#onClickAtom
    }
  };

  static PARTS = {
    main: {
      template: "modules/teste-hud/templates/reactor.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this._animId = null;
    this._atomAnimId = null;
    this._waveformInterval = null;
    this._tempInterval = null;
    this.rotSpeed = 0.008;
    this.angle = 0;
    this.corePulsePhase = 0;
    this.tiltX = 0;
    this.tiltY = 0;
    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.sparks = [];
    this.coreTemp = 83.29;
    this.atomAngle = 0;

    // Partículas de fluxo contínuo ao longo do eixo do reator
    this.fluxParticles = [];
    for (let i = 0; i < 45; i++) {
      this.fluxParticles.push({
        z: -290 + Math.random() * 600,
        r: Math.random() * 20,
        theta: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 2.2,
        color: Math.random() > 0.4 ? "#3ff4d5" : "#ffd15c"
      });
    }

    // Nuvem volumétrica de 350 micro-partículas quânticas (poeira estelar holográfica)
    this.dustParticles = [];
    for (let i = 0; i < 350; i++) {
      this.dustParticles.push({
        z: -300 + Math.random() * 630,
        r: Math.random() * 165,
        theta: Math.random() * Math.PI * 2,
        vtheta: (Math.random() - 0.5) * 0.006,
        vz: (Math.random() - 0.5) * 0.35,
        color: Math.random() > 0.45 ? "rgba(63, 244, 213, 0.75)" : (Math.random() > 0.4 ? "rgba(255, 190, 50, 0.75)" : "rgba(255, 255, 255, 0.9)"),
        size: 0.6 + Math.random() * 1.0
      });
    }
  }

  async _prepareContext(options) {
    return {};
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._initReactorCanvas();
    this._initAtomCanvas();
    this._initWaveform();
    soundFx.playReactorHum();
  }

  _initReactorCanvas() {
    if (!this.element) return;
    const canvas = this.element.querySelector("#reactor-3d-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resizeCanvas();

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => resizeCanvas());
      ro.observe(canvas);
    }

    // Interatividade com o mouse para inclinação 3D
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      this.targetTiltY = mx * 0.18;
      this.targetTiltX = -my * 0.14;
    };
    const onMouseLeave = () => {
      this.targetTiltX = 0;
      this.targetTiltY = 0;
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // Clique no reator: pulso eletromagnético, faíscas e som
    const onClick = (e) => {
      soundFx.playPlasmaPulse();
      soundFx.playRadiationTick();
      this.rotSpeed = 0.024;
      setTimeout(() => { this.rotSpeed = 0.008; }, 600);

      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (let k = 0; k < 35; k++) {
        this.sparks.push({
          x: clickX + (Math.random() - 0.5) * 16,
          y: clickY + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 5.0,
          vy: (Math.random() - 0.5) * 5.0 - 1.5,
          life: 1.0,
          color: Math.random() > 0.45 ? "#ffffff" : (Math.random() > 0.5 ? "#ffd15c" : "#3ff4d5")
        });
      }
    };
    canvas.addEventListener("click", onClick);

    // Matriz de Rotação 3D Calibrada (eixo inclinado a ~-24.4°, anéis a ~65.6°, aspecto 0.292)
    const R0 = [
      [0.3736,  0.3181,  0.8713],
      [0.1474,  0.9071, -0.3943],
      [-0.9158,  0.2757,  0.2920]
    ];

    let lastTime = performance.now();

    const renderFrame = (now) => {
      if (!this.element || !canvas.isConnected) {
        if (ro) ro.disconnect();
        return;
      }
      const dt = Math.min(50, now - lastTime);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Suavização da inclinação
      this.tiltX += (this.targetTiltX - this.tiltX) * 0.08;
      this.tiltY += (this.targetTiltY - this.tiltY) * 0.08;
      this.angle += this.rotSpeed;
      this.corePulsePhase += 0.035;

      const cosA = Math.cos(this.angle);
      const sinA = Math.sin(this.angle);

      // Centro do Reator no Canvas
      const CX = width * 0.46;
      const CY = height * 0.51;

      // Função de Projeção 3D
      const project = (lx, ly, lz) => {
        // 1. Rotação em torno do eixo do reator (local Z)
        const rx = lx * cosA - ly * sinA;
        const ry = lx * sinA + ly * cosA;
        const rz = lz;

        // 2. Projeção pela matriz orientada
        const px_raw = R0[0][0] * rx + R0[0][1] * ry + R0[0][2] * rz;
        const py_raw = R0[1][0] * rx + R0[1][1] * ry + R0[1][2] * rz;
        const pz_raw = R0[2][0] * rx + R0[2][1] * ry + R0[2][2] * rz;

        // 3. Inclinação interativa do mouse
        const px_tilt = px_raw + this.tiltY * 90;
        const py_tilt = py_raw - this.tiltX * 70;

        // 4. Perspectiva sutil
        const scale = 1.0 + pz_raw * 0.0006;
        return {
          px: CX + px_tilt * scale,
          py: CY + py_tilt * scale,
          scale,
          z: pz_raw
        };
      };

      // 1. Grade Técnica de Fundo
      ctx.fillStyle = "rgba(63, 244, 213, 0.08)";
      for (let gx = 30; gx < width; gx += 40) {
        for (let gy = 30; gy < height; gy += 40) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const renderables = [];

      // Auxiliares de Geometria 3D de Alta Fidelidade
      const addRing = (radius, zPos, numPts, colorFn, lineWidth = 1, isLine = true, dash = null) => {
        const pts = [];
        for (let i = 0; i < numPts; i++) {
          const th = (i / numPts) * Math.PI * 2;
          const p = project(radius * Math.cos(th), radius * Math.sin(th), zPos);
          pts.push({ ...p, th });
        }
        for (let i = 0; i < numPts; i++) {
          if (dash && (i % (dash[0] + dash[1]) >= dash[0])) continue;
          const p1 = pts[i];
          const p2 = pts[(i + 1) % numPts];
          const avgZ = (p1.z + p2.z) * 0.5;
          const col = typeof colorFn === "function" ? colorFn(p1.th, avgZ) : colorFn;
          if (isLine) {
            renderables.push({
              type: "line",
              p1,
              p2,
              color: col,
              width: lineWidth,
              z: avgZ
            });
          } else {
            renderables.push({
              type: "dot",
              p: p1,
              r: lineWidth * p1.scale,
              color: col,
              z: p1.z
            });
          }
        }
      };

      const addDotRing = (radius, zPos, numPts, colorFn, dotRadius = 1.0) => {
        for (let i = 0; i < numPts; i++) {
          const th = (i / numPts) * Math.PI * 2;
          const p = project(radius * Math.cos(th), radius * Math.sin(th), zPos);
          const col = typeof colorFn === "function" ? colorFn(th, p.z) : colorFn;
          renderables.push({
            type: "dot",
            p,
            r: dotRadius * p.scale,
            color: col,
            z: p.z
          });
        }
      };

      const addSpokes = (rInner, rOuter, zPos, numSpokes, colorFn, lineWidth = 1) => {
        for (let i = 0; i < numSpokes; i++) {
          const th = (i / numSpokes) * Math.PI * 2;
          const p1 = project(rInner * Math.cos(th), rInner * Math.sin(th), zPos);
          const p2 = project(rOuter * Math.cos(th), rOuter * Math.sin(th), zPos);
          const avgZ = (p1.z + p2.z) * 0.5;
          const col = typeof colorFn === "function" ? colorFn(th, avgZ) : colorFn;
          renderables.push({
            type: "line",
            p1,
            p2,
            color: col,
            width: lineWidth,
            z: avgZ
          });
        }
      };

      const addArc = (radius, zPos, thStart, thEnd, numSteps, colorFn, lineWidth = 1) => {
        const pts = [];
        for (let step = 0; step < numSteps; step++) {
          const th = thStart + (step / (numSteps - 1)) * (thEnd - thStart);
          const p = project(radius * Math.cos(th), radius * Math.sin(th), zPos);
          pts.push({ ...p, th });
        }
        for (let step = 0; step < numSteps - 1; step++) {
          const p1 = pts[step];
          const p2 = pts[step + 1];
          const avgZ = (p1.z + p2.z) * 0.5;
          const col = typeof colorFn === "function" ? colorFn(p1.th, avgZ) : colorFn;
          renderables.push({
            type: "line",
            p1,
            p2,
            color: col,
            width: lineWidth,
            z: avgZ
          });
        }
      };

      // Paleta Cromática Holográfica
      const C_CYAN_HI = "rgba(190, 255, 248, 0.95)";
      const C_CYAN_BR = "rgba(63, 244, 213, 0.85)";
      const C_CYAN_MD = "rgba(35, 175, 160, 0.65)";
      const C_CYAN_DK = "rgba(20, 100, 105, 0.45)";
      const C_GOLD_HI = "rgba(255, 238, 175, 0.95)";
      const C_GOLD_BR = "rgba(255, 190, 50, 0.85)";
      const C_GOLD_MD = "rgba(255, 145, 30, 0.70)";
      const C_WHITE   = "rgba(255, 255, 255, 0.95)";

      // --- RETÍCULO HUD CIRCULAR DE FUNDO (Centralizado no cubo do Estator em z: +175) ---
      const hubP = project(0, 0, 175);
      const reticleCx = hubP.px;
      const reticleCy = hubP.py;
      const rMain = 205;

      for (let deg = 0; deg < 360; deg += 2) {
        const rad = (deg * Math.PI) / 180;
        const cosD = Math.cos(rad);
        const sinD = Math.sin(rad);
        const tickLen = deg % 10 === 0 ? 9 : (deg % 5 === 0 ? 5 : 3);
        const col = deg % 10 === 0 ? "rgba(63, 244, 213, 0.45)" : "rgba(35, 120, 125, 0.22)";
        const x1 = reticleCx + rMain * cosD;
        const y1 = reticleCy + rMain * sinD;
        const x2 = reticleCx + (rMain - tickLen) * cosD;
        const y2 = reticleCy + (rMain - tickLen) * sinD;
        renderables.push({ type: "line", p1: { px: x1, py: y1 }, p2: { px: x2, py: y2 }, color: col, width: 1, z: -350 });
      }

      for (let deg = 0; deg < 360; deg += 4) {
        const rad = (deg * Math.PI) / 180;
        const x = reticleCx + 222 * Math.cos(rad);
        const y = reticleCy + 222 * Math.sin(rad);
        renderables.push({ type: "dot", p: { px: x, py: y }, r: 0.8, color: "rgba(63, 244, 213, 0.3)", z: -350 });
      }

      for (const deg of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const rad = (deg * Math.PI) / 180;
        const cosD = Math.cos(rad);
        const sinD = Math.sin(rad);
        const x1 = reticleCx + (rMain + 5) * cosD;
        const y1 = reticleCy + (rMain + 5) * sinD;
        const x2 = reticleCx + (rMain + 28) * cosD;
        const y2 = reticleCy + (rMain + 28) * sinD;
        renderables.push({ type: "line", p1: { px: x1, py: y1 }, p2: { px: x2, py: y2 }, color: "rgba(63, 244, 213, 0.4)", width: 1.2, z: -350 });
      }

      for (const [bx, by, fx, fy] of [
        [reticleCx - 170, reticleCy - 170, 1, 1],
        [reticleCx + 170, reticleCy - 170, -1, 1],
        [reticleCx - 170, reticleCy + 170, 1, -1],
        [reticleCx + 170, reticleCy + 170, -1, -1]
      ]) {
        renderables.push({ type: "line", p1: { px: bx, py: by }, p2: { px: bx + 18 * fx, py: by }, color: "rgba(63, 244, 213, 0.35)", width: 1.2, z: -350 });
        renderables.push({ type: "line", p1: { px: bx, py: by }, p2: { px: bx, py: by + 18 * fy }, color: "rgba(63, 244, 213, 0.35)", width: 1.2, z: -350 });
      }

      for (const [mx, my] of [[reticleCx - 130, reticleCy - 140], [reticleCx + 100, reticleCy - 140]]) {
        for (let gx = 0; gx < 4; gx++) {
          for (let gy = 0; gy < 3; gy++) {
            renderables.push({ type: "dot", p: { px: mx + gx * 8, py: my + gy * 7 }, r: 0.9, color: "rgba(63, 244, 213, 0.35)", z: -350 });
          }
        }
      }

      // --- ESTÁGIO 1: BOCAL INJETOR FRONTAL & ESTATOR DE COBRE (z: -300 a -250) ---
      addRing(28, -300, 48, C_CYAN_BR, 2);
      addRing(14, -300, 32, C_CYAN_MD, 1);
      addDotRing(22, -300, 8, C_WHITE, 1.4);

      // 24 Barras Longitudinais de Enrolamento de Cobre
      for (let i = 0; i < 24; i++) {
        const th = (i / 24) * Math.PI * 2;
        const cosT = Math.cos(th);
        const sinT = Math.sin(th);
        const p1 = project(24 * cosT, 24 * sinT, -300);
        const p2 = project(24 * cosT, 24 * sinT, -255);
        renderables.push({ type: "line", p1, p2, color: C_GOLD_MD, width: 1.2, z: (p1.z + p2.z) * 0.5 });
      }

      // 12 Anéis Concêntricos de Bobinamento
      for (let z_coil = -300; z_coil <= -254; z_coil += 4) {
        addRing(24.2, z_coil, 36, C_GOLD_BR, 1);
        if (z_coil % 8 === 0) {
          addDotRing(24.5, z_coil, 12, C_GOLD_HI, 1.1);
        }
      }

      // Flange Intermediária com Dentes de Engrenagem (z: -275)
      addRing(36, -275, 48, C_CYAN_BR, 1.5);
      addSpokes(26, 36, -275, 16, C_CYAN_MD, 1.2);

      // Presilhas C-Brackets Flutuantes
      for (let arcIdx = 0; arcIdx < 4; arcIdx++) {
        const thS = arcIdx * (Math.PI * 0.5) + 0.15;
        addArc(42, -280, thS, thS + 0.42, 8, C_GOLD_BR, 2);
        const pDot = project(42 * Math.cos(thS), 42 * Math.sin(thS), -280);
        renderables.push({ type: "dot", p: pDot, r: 1.5 * pDot.scale, color: C_WHITE, z: pDot.z });
      }

      // Flange Traseira Perfurada (z: -250)
      addRing(48, -250, 48, C_CYAN_BR, 1.5);
      addRing(30, -250, 36, C_CYAN_DK, 1);
      addDotRing(39, -250, 14, C_CYAN_HI, 1.5);

      // --- ESTÁGIO 2: ANEL ESTATOR 1 COM DENTES DE INDEXAÇÃO (z: -225) ---
      addRing(42, -225, 48, C_CYAN_MD, 1);
      addRing(56, -225, 60, C_CYAN_BR, 1.2);
      addRing(68, -225, 64, C_CYAN_BR, 1.5);
      for (let i = 0; i < 32; i++) {
        const th = (i / 32) * Math.PI * 2;
        const rTop = i % 2 === 0 ? 68 : 62;
        const p1 = project(56 * Math.cos(th), 56 * Math.sin(th), -225);
        const p2 = project(rTop * Math.cos(th), rTop * Math.sin(th), -225);
        renderables.push({ type: "line", p1, p2, color: C_CYAN_BR, width: 1.2, z: (p1.z + p2.z) * 0.5 });
      }
      addDotRing(62, -225, 48, C_CYAN_HI, 1.1);
      addArc(76, -225, 0.2, 0.7, 10, C_CYAN_BR, 2);
      addArc(76, -225, Math.PI + 0.2, Math.PI + 0.7, 10, C_CYAN_BR, 2);

      // --- ESTÁGIO 3: GRANDE DISCO DE COMPRESSÃO FRONTAL & LEQUE DE AGULHAS (z: -160) ---
      addRing(38, -160, 48, C_CYAN_DK, 1);
      addRing(50, -160, 48, C_CYAN_MD, 1);
      addDotRing(44, -160, 24, C_GOLD_BR, 1.2);
      addSpokes(50, 82, -160, 56, C_CYAN_DK, 0.8);

      addRing(82, -160, 72, C_CYAN_BR, 1.5);
      addDotRing(88, -160, 64, C_CYAN_HI, 1.2);
      addRing(94, -160, 80, C_CYAN_BR, 1.8);
      addSpokes(94, 100, -160, 56, C_CYAN_MD, 1.2);

      // Leque de Agulhas Radiais (Quadrante Inferior Direito)
      for (let i = 0; i < 22; i++) {
        const frac = i / 21.0;
        const th = 0.04 * Math.PI + frac * (0.42 * Math.PI);
        const rLen = 106 + 28 * Math.sin(frac * Math.PI);
        const p1 = project(94 * Math.cos(th), 94 * Math.sin(th), -160);
        const p2 = project(rLen * Math.cos(th), rLen * Math.sin(th), -160);
        renderables.push({ type: "line", p1, p2, color: C_CYAN_HI, width: 1.2, z: (p1.z + p2.z) * 0.5 });
        renderables.push({ type: "dot", p: p2, r: 1.5 * p2.scale, color: C_WHITE, z: p2.z });
      }

      addArc(110, -160, 0.8 * Math.PI, 1.3 * Math.PI, 16, C_CYAN_BR, 2);
      addArc(116, -160, 0.85 * Math.PI, 1.25 * Math.PI, 14, C_GOLD_BR, 1.5);

      // --- ESTÁGIO 4: FLANGE DE TRANSIÇÃO & TIRANTES DE CONEXÃO (z: -85) ---
      addRing(56, -85, 54, C_GOLD_MD, 1.5);
      addRing(72, -85, 64, C_CYAN_BR, 1.5);
      addDotRing(64, -85, 8, C_WHITE, 2.0);

      // 8 Tirantes Longitudinais conectando ao Estágio 5
      for (let i = 0; i < 8; i++) {
        const th = (i / 8) * Math.PI * 2;
        const cosT = Math.cos(th);
        const sinT = Math.sin(th);
        const p1 = project(64 * cosT, 64 * sinT, -85);
        const p2 = project(52 * cosT, 52 * sinT, -45);
        renderables.push({ type: "line", p1, p2, color: C_CYAN_HI, width: 1.8, z: (p1.z + p2.z) * 0.5 });
      }

      // --- ESTÁGIO 5: CÂMARA TOKAMAK DE CONFINAMENTO & NÚCLEO DE PLASMA (z: -45 a +45) ---
      // Eixo Guia de Onda Central
      for (const rSh of [5, 10]) {
        for (let i = 0; i < 12; i++) {
          const th = (i / 12) * Math.PI * 2;
          const p1 = project(rSh * Math.cos(th), rSh * Math.sin(th), -45);
          const p2 = project(rSh * Math.cos(th), rSh * Math.sin(th), 45);
          renderables.push({ type: "line", p1, p2, color: C_CYAN_HI, width: 1.2, z: (p1.z + p2.z) * 0.5 });
        }
      }

      // 32 Nervuras Longitudinais de Cobre da Câmara Tokamak
      for (let i = 0; i < 32; i++) {
        const th = (i / 32) * Math.PI * 2;
        const cosT = Math.cos(th);
        const sinT = Math.sin(th);
        const ptsRib = [];
        for (let step = 0; step < 12; step++) {
          const frac = step / 11.0;
          const zR = -45 + frac * 90;
          const rR = 52 + 6 * Math.sin(frac * Math.PI);
          ptsRib.push(project(rR * cosT, rR * sinT, zR));
        }
        for (let step = 0; step < 11; step++) {
          const p1 = ptsRib[step];
          const p2 = ptsRib[step + 1];
          renderables.push({ type: "line", p1, p2, color: C_GOLD_MD, width: 1.2, z: (p1.z + p2.z) * 0.5 });
        }
      }

      // 7 Anéis Equatoriais de Bobinamento
      for (const zEq of [-40, -26, -13, 0, 13, 26, 40]) {
        const rEq = 52 + 6 * Math.cos((zEq / 45.0) * (Math.PI * 0.5));
        addRing(rEq, zEq, 48, C_GOLD_BR, 1.2);
        addDotRing(rEq, zEq, 24, C_GOLD_HI, 1.1);
      }

      // Tubos de Resfriamento em S no Topo e Base com Terminais
      for (const [sign, angBase] of [[1, 0.6 * Math.PI], [-1, 1.6 * Math.PI]]) {
        const ptsS = [];
        for (let step = 0; step < 24; step++) {
          const t = step / 23.0;
          const rPipe = 52 + t * 32;
          const angPipe = angBase + sign * 0.28 * Math.sin(t * Math.PI * 2);
          const zPipe = 14 * Math.cos(t * Math.PI);
          ptsS.push(project(rPipe * Math.cos(angPipe), rPipe * Math.sin(angPipe), zPipe));
        }
        for (let step = 0; step < 23; step++) {
          const p1 = ptsS[step];
          const p2 = ptsS[step + 1];
          renderables.push({ type: "line", p1, p2, color: C_GOLD_HI, width: 2.2, z: (p1.z + p2.z) * 0.5 });
        }
        const pEnd = ptsS[ptsS.length - 1];
        renderables.push({ type: "dot", p: pEnd, r: 3.5 * pEnd.scale, color: C_GOLD_BR, z: pEnd.z });
      }

      // Vórtice de Plasma Incandescente Turbulento
      const pulseScale = 1.0 + 0.08 * Math.sin(this.corePulsePhase);
      for (let i = 0; i < 90; i++) {
        const rCore = (3 + (i % 30)) * pulseScale;
        const thC = (i * 0.35) + this.angle * 2.5;
        const zC = Math.sin(i * 0.5 + this.corePulsePhase) * 22;
        const pC = project(rCore * Math.cos(thC), rCore * Math.sin(thC), zC);
        const col = i % 3 === 0 ? C_WHITE : (i % 2 === 0 ? C_GOLD_HI : C_CYAN_BR);
        renderables.push({ type: "dot", p: pC, r: (1.2 + (i % 3) * 0.6) * pC.scale, color: col, z: pC.z });
      }

      // --- ESTÁGIO 6: ESCUDO DE BLINDAGEM SECUNDÁRIO (z: +65) ---
      addRing(52, 65, 48, C_CYAN_MD, 1);
      addRing(76, 65, 64, C_CYAN_BR, 1.5);
      addSpokes(52, 76, 65, 24, C_CYAN_DK, 1.2);
      addDotRing(64, 65, 24, C_CYAN_HI, 1.2);
      for (const lugAng of [0, 0.5 * Math.PI, Math.PI, 1.5 * Math.PI]) {
        const p1 = project(76 * Math.cos(lugAng), 76 * Math.sin(lugAng), 65);
        const p2 = project(86 * Math.cos(lugAng), 86 * Math.sin(lugAng), 65);
        renderables.push({ type: "line", p1, p2, color: C_CYAN_HI, width: 2.5, z: (p1.z + p2.z) * 0.5 });
      }

      // --- ESTÁGIO 7: OS ANÉIS GÊMEOS DE BISEL CIANO COM ESPESSURA VOLUMÉTRICA (z: +102 & +128) ---
      for (const zRing of [102, 128]) {
        addRing(90, zRing, 80, C_CYAN_BR, 2.6);
        addRing(85, zRing, 72, C_CYAN_HI, 1.5);
        addRing(76, zRing, 64, C_CYAN_BR, 2.0);
        addRing(80, zRing, 64, C_CYAN_MD, 1.0);
        addSpokes(90, 95, zRing, 60, C_CYAN_MD, 1.2);

        // Nervuras do Bore Interno
        for (let i = 0; i < 16; i++) {
          const thB = (i / 16) * Math.PI * 2;
          const p1 = project(76 * Math.cos(thB), 76 * Math.sin(thB), zRing);
          const p2 = project(76 * Math.cos(thB), 76 * Math.sin(thB), zRing + 14);
          renderables.push({ type: "line", p1, p2, color: C_CYAN_DK, width: 1.0, z: (p1.z + p2.z) * 0.5 });
        }
        addRing(90, zRing + 14, 80, C_CYAN_DK, 1.5);

        // Realce Especular Superior e Inferior
        addArc(90, zRing, 0.4 * Math.PI, 0.8 * Math.PI, 20, C_WHITE, 2.8);
        addArc(90, zRing, 1.4 * Math.PI, 1.8 * Math.PI, 20, C_WHITE, 2.8);
      }

      // Trilha Planetária Âmbar entre os Anéis
      addRing(84, 115, 60, C_GOLD_MD, 1.2);
      addDotRing(84, 115, 36, C_GOLD_HI, 1.4);
      for (const clampAng of [0.25 * Math.PI, 0.75 * Math.PI, 1.25 * Math.PI, 1.75 * Math.PI]) {
        const p1 = project(98 * Math.cos(clampAng), 98 * Math.sin(clampAng), 98);
        const p2 = project(98 * Math.cos(clampAng), 98 * Math.sin(clampAng), 136);
        renderables.push({ type: "line", p1, p2, color: C_GOLD_BR, width: 2.5, z: (p1.z + p2.z) * 0.5 });
      }

      // --- ESTÁGIO 8: GRANDE ESTATOR ACELERADOR PRINCIPAL / DISCO GIGANTE (z: +175) ---
      addRing(44, 175, 48, C_CYAN_MD, 1);
      addRing(58, 175, 54, C_CYAN_BR, 1.5);
      addRing(74, 175, 64, C_CYAN_BR, 1.5);

      // 8 Grandes Recortes em Setor com Bordas Reforçadas
      for (let sec = 0; sec < 8; sec++) {
        const thS1 = (sec / 8) * Math.PI * 2 + 0.08;
        const thS2 = ((sec + 1) / 8) * Math.PI * 2 - 0.08;
        const p1 = project(74 * Math.cos(thS1), 74 * Math.sin(thS1), 175);
        const p2 = project(134 * Math.cos(thS1), 134 * Math.sin(thS1), 175);
        renderables.push({ type: "line", p1, p2, color: C_CYAN_BR, width: 2.0, z: (p1.z + p2.z) * 0.5 });
        addArc(74, 175, thS1, thS2, 8, C_CYAN_MD, 1.2);
        addArc(134, 175, thS1, thS2, 12, C_CYAN_MD, 1.2);
      }

      addDotRing(96, 175, 64, C_CYAN_HI, 1.2);
      addDotRing(116, 175, 72, C_CYAN_DK, 1.0);

      // Pente de 72 Dentes de Engrenagem
      addRing(134, 175, 96, C_CYAN_BR, 1.8);
      addRing(146, 175, 96, C_CYAN_BR, 2.2);
      addSpokes(134, 146, 175, 72, C_CYAN_HI, 1.2);
      addSpokes(146, 152, 175, 72, C_CYAN_MD, 1.0);
      addRing(152, 175, 96, C_CYAN_DK, 1.0);

      // Sapatas de Freio / Escudos Magnéticos em Arco Flutuantes
      for (const [sStart, sEnd] of [
        [0.12 * Math.PI, 0.48 * Math.PI],
        [0.78 * Math.PI, 1.18 * Math.PI],
        [1.42 * Math.PI, 1.82 * Math.PI]
      ]) {
        addArc(164, 175, sStart, sEnd, 20, C_CYAN_BR, 2.8);
        addArc(169, 175, sStart, sEnd, 20, C_CYAN_MD, 1.5);
        for (let stp = 0; stp < 5; stp++) {
          const thP = sStart + (stp / 4.0) * (sEnd - sStart);
          const p1 = project(164 * Math.cos(thP), 164 * Math.sin(thP), 175);
          const p2 = project(169 * Math.cos(thP), 169 * Math.sin(thP), 175);
          renderables.push({ type: "line", p1, p2, color: C_CYAN_HI, width: 1.8, z: (p1.z + p2.z) * 0.5 });
          renderables.push({ type: "dot", p: p2, r: 1.8 * p2.scale, color: C_GOLD_BR, z: p2.z });
        }
      }

      // --- ESTÁGIO 8B: ESTATOR PERFURADO INTERMEDIÁRIO (z: +210) ---
      addRing(62, 210, 54, C_CYAN_BR, 1.5);
      addRing(42, 210, 42, C_CYAN_DK, 1.0);
      addDotRing(52, 210, 18, C_CYAN_HI, 1.5);

      // --- ESTÁGIO 9: SOLENOIDE TRASEIRO DE COBRE (z: +230 a +265) ---
      for (let i = 0; i < 24; i++) {
        const th = (i / 24) * Math.PI * 2;
        const p1 = project(36 * Math.cos(th), 36 * Math.sin(th), 230);
        const p2 = project(36 * Math.cos(th), 36 * Math.sin(th), 265);
        renderables.push({ type: "line", p1, p2, color: C_GOLD_MD, width: 1.2, z: (p1.z + p2.z) * 0.5 });
      }

      for (let zSol = 230; zSol <= 266; zSol += 5) {
        addRing(36.2, zSol, 42, C_GOLD_BR, 1.2);
        if (zSol % 10 === 0) {
          addDotRing(36.5, zSol, 16, C_GOLD_HI, 1.2);
        }
      }

      // Presilhas Flutuantes
      for (let arcIdx = 0; arcIdx < 3; arcIdx++) {
        const thS = arcIdx * (Math.PI * 0.66) + 0.2;
        addArc(44, 248, thS, thS + 0.45, 10, C_GOLD_HI, 2.2);
      }

      // --- ESTÁGIO 10A: ROTOR IMPULSOR DA TURBINA TRASEIRA (z: +280) ---
      addRing(28, 280, 36, C_GOLD_MD, 1.5);
      addRing(54, 280, 54, C_CYAN_BR, 1.5);
      for (let v = 0; v < 20; v++) {
        const thBase = (v / 20) * Math.PI * 2;
        const ptsV = [];
        for (let step = 0; step < 6; step++) {
          const frac = step / 5.0;
          const rV = 28 + frac * 26;
          const thV = thBase + frac * 0.35;
          ptsV.push(project(rV * Math.cos(thV), rV * Math.sin(thV), 280));
        }
        for (let step = 0; step < 5; step++) {
          const p1 = ptsV[step];
          const p2 = ptsV[step + 1];
          renderables.push({ type: "line", p1, p2, color: C_GOLD_HI, width: 1.4, z: (p1.z + p2.z) * 0.5 });
        }
      }

      // --- ESTÁGIO 10B: BOCAL CÔNICO DE EXAUSTÃO (z: +295 a +320) ---
      for (let step = 0; step < 5; step++) {
        const frac = step / 4.0;
        const zCone = 295 + frac * 25;
        const rCone = 34 - frac * 12;
        addRing(rCone, zCone, 36, C_CYAN_MD, 1.2);
      }
      addRing(22, 320, 32, C_CYAN_BR, 2.4);

      // --- LINHAS DE FLUXO MAGNÉTICO (Dashed Flux Lines) ---
      for (let fluxI = 0; fluxI < 8; fluxI++) {
        const thF = (fluxI / 8) * Math.PI * 2;
        const ptsFlux = [];
        for (let step = 0; step < 28; step++) {
          const frac = step / 27.0;
          const zF = -290 + frac * 600;
          const rF = 75 + 48 * Math.sin(frac * Math.PI);
          ptsFlux.push(project(rF * Math.cos(thF), rF * Math.sin(thF), zF));
        }
        for (let step = 0; step < 27; step += 2) {
          const p1 = ptsFlux[step];
          const p2 = ptsFlux[step + 1];
          renderables.push({ type: "line", p1, p2, color: C_CYAN_DK, width: 1.0, z: (p1.z + p2.z) * 0.5 });
        }
      }

      // --- NUVEM VOLUMÉTRICA DE 350 MICRO-PARTÍCULAS HOLOGRÁFICAS ---
      for (const dp of this.dustParticles) {
        dp.theta += dp.vtheta;
        dp.z += dp.vz;
        if (dp.z > 330) dp.z = -310;
        if (dp.z < -310) dp.z = 330;
        const p = project(dp.r * Math.cos(dp.theta), dp.r * Math.sin(dp.theta), dp.z);
        if (p.px > 10 && p.px < width - 10 && p.py > 10 && p.py < height - 10) {
          renderables.push({
            type: "dot",
            p,
            r: dp.size * p.scale,
            color: dp.color,
            z: p.z
          });
        }
      }

      // --- PARTÍCULAS DE FLUXO AO LONGO DO EIXO ---
      for (const fp of this.fluxParticles) {
        fp.z += fp.speed;
        if (fp.z > 325) fp.z = -290;
        fp.theta += 0.02;
        const p = project(fp.r * Math.cos(fp.theta), fp.r * Math.sin(fp.theta), fp.z);
        renderables.push({
          type: "dot",
          p,
          r: 1.5 * p.scale,
          color: fp.color,
          z: p.z
        });
      }

      // Ordenação de Profundidade (Z-Buffer: menor Z = trás, maior Z = frente)
      renderables.sort((a, b) => a.z - b.z);

      // Renderização com Efeitos de Brilho
      for (const item of renderables) {
        if (item.type === "line") {
          ctx.beginPath();
          ctx.moveTo(item.p1.px, item.p1.py);
          ctx.lineTo(item.p2.px, item.p2.py);
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.width;
          ctx.stroke();
        } else if (item.type === "dot") {
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, item.r, 0, Math.PI * 2);
          ctx.fillStyle = item.color;
          ctx.fill();
        }
      }

      // Faíscas Quânticas de Descarga (Sparks)
      for (let s = this.sparks.length - 1; s >= 0; s--) {
        const sp = this.sparks[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.035;
        if (sp.life <= 0) {
          this.sparks.splice(s, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.4 * sp.life, 0, Math.PI * 2);
        ctx.fillStyle = sp.color === "#ffffff" ? `rgba(255, 255, 255, ${sp.life})` : `rgba(255, 209, 92, ${sp.life})`;
        ctx.fill();
      }

      this._animId = requestAnimationFrame(renderFrame);
    };

    this._animId = requestAnimationFrame(renderFrame);
  }

  _initAtomCanvas() {
    if (!this.element) return;
    const canvas = this.element.querySelector("#reactor-atom-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const nodes = [
      { x: -35, y: 25, z: 0 },
      { x: -15, y: 5, z: 12 },
      { x: 5, y: -10, z: -10 },
      { x: 18, y: -28, z: 15 },
      { x: 40, y: -45, z: -8 },
      { x: 55, y: -40, z: 10 }
    ];

    const renderAtom = () => {
      if (!this.element || !canvas.isConnected) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      this.atomAngle += 0.015;
      const cosA = Math.cos(this.atomAngle);
      const sinA = Math.sin(this.atomAngle);

      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.5;

      // Anel orbital de fundo
      ctx.beginPath();
      ctx.arc(cx + 10, cy + 5, 28, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(63, 244, 213, 0.25)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const proj = nodes.map(n => {
        const x1 = n.x * cosA - n.z * sinA;
        const z1 = n.x * sinA + n.z * cosA;
        return { px: cx + x1, py: cy + n.y, z: z1 };
      });

      // Ligações
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(63, 244, 213, 0.65)";
      for (let i = 0; i < proj.length - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(proj[i].px, proj[i].py);
        ctx.lineTo(proj[i + 1].px, proj[i + 1].py);
        ctx.stroke();
      }

      // Átomos
      proj.sort((a, b) => a.z - b.z);
      for (const p of proj) {
        ctx.beginPath();
        ctx.arc(p.px, p.py, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(12, 50, 60, 0.9)";
        ctx.strokeStyle = "rgba(63, 244, 213, 0.95)";
        ctx.lineWidth = 1.2;
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(p.px, p.py, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }

      this._atomAnimId = requestAnimationFrame(renderAtom);
    };

    this._atomAnimId = requestAnimationFrame(renderAtom);
  }

  _initWaveform() {
    if (!this.element) return;
    const waveWrap = this.element.querySelector("#reactor-wave-col-bars");
    if (!waveWrap) return;

    waveWrap.innerHTML = "";
    const numBars = 45;
    for (let i = 0; i < numBars; i++) {
      const bar = document.createElement("span");
      bar.className = "wave-bar";
      bar.style.setProperty("--h", `${Math.floor(3 + Math.random() * 8)}px`);
      waveWrap.appendChild(bar);
    }

    if (this._waveformInterval) clearInterval(this._waveformInterval);
    this._waveformInterval = setInterval(() => {
      if (!this.element) return;
      const bars = this.element.querySelectorAll(".wave-col-bars .wave-bar");
      if (!bars || bars.length === 0) return;
      bars.forEach(b => {
        const h = Math.floor(2 + Math.random() * 12);
        b.style.setProperty("--h", `${h}px`);
      });
    }, 120);

    // Micro-variação realista da temperatura do núcleo
    if (this._tempInterval) clearInterval(this._tempInterval);
    this._tempInterval = setInterval(() => {
      if (!this.element) return;
      const tempElem = this.element.querySelector("#reactor-core-temp-val");
      if (tempElem) {
        const delta = (Math.random() - 0.48) * 0.04;
        this.coreTemp = Math.max(82.80, Math.min(84.10, this.coreTemp + delta));
        tempElem.textContent = `${this.coreTemp.toFixed(2)}°`;
      }
    }, 1800);
  }

  async close(options) {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._atomAnimId) {
      cancelAnimationFrame(this._atomAnimId);
      this._atomAnimId = null;
    }
    if (this._waveformInterval) {
      clearInterval(this._waveformInterval);
      this._waveformInterval = null;
    }
    if (this._tempInterval) {
      clearInterval(this._tempInterval);
      this._tempInterval = null;
    }
    return super.close(options);
  }

  static #onCloseReactorWindow(event, target) {
    soundFx.playRelayClick(false);
    this.close();
  }

  static #onClickReticle(event, target) {
    soundFx.playTargetLock();
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.info("SISTEMA DE CALIBRAÇÃO // RETÍCULO: Alinhamento óptico do núcleo ajustado.");
    }
  }

  static #onClickAtom(event, target) {
    soundFx.playAtomSpin();
    if (typeof ui !== "undefined" && ui.notifications) {
      ui.notifications.warn("ANÁLISE MOLECULAR // ATOM_VIEW: Estrutura reticular do combustível escaneada.");
    }
  }
}


/**
 * DataTopologyApp — Console de Topologia de Dados & Rede 3D [DATA TOPOLOGY // ALLUVIAL FLOW]
 * Projeção 3D procedural de reticulados poliedrais, vórtice toroidal e grafo alluvial em Canvas 2D.
 */
export class DataTopologyApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "data-topology-hud-app",
    classes: ["data-topology-hud-window"],
    position: {
      width: 1280,
      height: 720
    },
    window: {
      title: "TOPOLOGIA DE DADOS & REDE 3D [DATA TOPOLOGY // ALLUVIAL FLOW]",
      icon: "fa-solid fa-network-wired",
      resizable: true
    },
    actions: {
      closeTopologyWindow: DataTopologyApp.#onCloseTopologyWindow
    }
  };

  static PARTS = {
    main: {
      template: "modules/teste-hud/templates/data-topology.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this._animId = null;
    this._ledInterval = null;
    this._dotInterval = null;
    this.time = 0;

    // Estado da Coluna 1: Poliedro 3D
    this.polyNodes = [];
    for (let i = 0; i < 32; i++) {
      const th = (i / 32) * Math.PI * 2;
      const ph = ((i % 5) - 2) * 0.5;
      const r = 26 + ((i * 13) % 20);
      this.polyNodes.push({
        baseX: r * Math.cos(ph) * Math.cos(th),
        baseY: r * Math.cos(ph) * Math.sin(th),
        baseZ: r * Math.sin(ph),
        phase: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 1.5
      });
    }

    // Poeira cósmica 3D da Coluna 1
    this.dust1 = [];
    for (let i = 0; i < 35; i++) {
      this.dust1.push({
        x: (Math.random() - 0.5) * 110,
        y: (Math.random() - 0.5) * 110,
        z: (Math.random() - 0.5) * 110,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        vz: (Math.random() - 0.5) * 0.3,
        size: 0.8 + Math.random() * 1.2
      });
    }

    // Estado da Coluna 2: Torus Paramétrico 3D (128 vértices)
    this.torusPoints = [];
    const R_major = 38, r_minor = 14;
    for (let u_i = 0; u_i < 16; u_i++) {
      const u = u_i * (Math.PI * 2 / 16);
      for (let v_i = 0; v_i < 8; v_i++) {
        const v = v_i * (Math.PI * 2 / 8);
        this.torusPoints.push({
          x: (R_major + r_minor * Math.cos(v)) * Math.cos(u),
          y: (R_major + r_minor * Math.cos(v)) * Math.sin(u),
          z: r_minor * Math.sin(v),
          u_i, v_i
        });
      }
    }

    // Estado da Coluna 3: Esfera Geodésica 3D (24 vértices)
    this.sphereNodes = [];
    for (let i = 0; i < 24; i++) {
      const u = (i / 24) * Math.PI * 2;
      const v = ((i % 6) - 2.5) * 0.5;
      const r = 28;
      this.sphereNodes.push({
        baseX: r * Math.cos(v) * Math.cos(u),
        baseY: r * Math.cos(v) * Math.sin(u),
        baseZ: r * Math.sin(v)
      });
    }

    // Estado do Grafo Alluvial (24 splines trançadas com 42 pacotes de fótons)
    this.alluvialPackets = [];
    for (let i = 0; i < 42; i++) {
      this.alluvialPackets.push({
        splineIndex: i % 24,
        t: Math.random(),
        speed: 0.004 + Math.random() * 0.008,
        size: 1.5 + Math.random() * 1.5,
        color: Math.random() > 0.3 ? "#3ff4d5" : "#ffd15c"
      });
    }
  }

  async _prepareContext(options) {
    return {};
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._initCanvases();
    this._initDotMatrices();
    this._initLedMatrix();
  }

  _initCanvases() {
    if (!this.element) return;
    const c1 = this.element.querySelector("#topology-canvas-1");
    const c2 = this.element.querySelector("#topology-canvas-2");
    const c3 = this.element.querySelector("#topology-canvas-3");
    const cAlluvial = this.element.querySelector("#alluvial-stream-canvas");

    const w1 = this.element.querySelector("#topology-wave-canvas-1");
    const w2 = this.element.querySelector("#topology-wave-canvas-2");
    const w3 = this.element.querySelector("#topology-wave-canvas-3");
    const ws1 = this.element.querySelector("#topology-wave-canvas-sub-1");
    const ws2 = this.element.querySelector("#topology-wave-canvas-sub-2");
    const ws3 = this.element.querySelector("#topology-wave-canvas-sub-3");

    const checkCanvas = (c) => {
      if (!c) return null;
      const rect = c.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (c.width !== targetW || c.height !== targetH) {
        c.width = targetW;
        c.height = targetH;
      }
      const ctx = c.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, width: rect.width, height: rect.height };
    };

    const renderLoop = () => {
      this.time += 0.016;
      const t = this.time;

      // 1. CANVAS 1: POLIEDRO IRREGULAR 3D
      const c1Data = checkCanvas(c1);
      if (c1Data) {
        const { ctx: ctx1, width: w1, height: h1 } = c1Data;
        ctx1.clearRect(0, 0, w1, h1);
        const cx = w1 / 2;
        const cy = h1 / 2;

        const rotX = t * 0.45;
        const rotY = t * 0.65;

        const project3D = (x, y, z) => {
          const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
          const z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
          const y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
          const z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
          const scale = 140 / (160 + z2);
          return { px: cx + x1 * scale, py: cy + y2 * scale, pz: z2 };
        };

        // Poeira cósmica 3D
        for (const p of this.dust1) {
          p.x += p.vx; p.y += p.vy; p.z += p.vz;
          if (p.x > 55) p.x = -55; if (p.x < -55) p.x = 55;
          if (p.y > 55) p.y = -55; if (p.y < -55) p.y = 55;
          if (p.z > 55) p.z = -55; if (p.z < -55) p.z = 55;
          const pt = project3D(p.x, p.y, p.z);
          ctx1.fillStyle = "rgba(63, 244, 213, 0.4)";
          ctx1.beginPath();
          ctx1.arc(pt.px, pt.py, p.size, 0, Math.PI * 2);
          ctx1.fill();
        }

        // Vértices do Poliedro
        const projectedNodes = this.polyNodes.map(node => {
          const pulse = 1 + 0.08 * Math.sin(t * node.speed + node.phase);
          return project3D(node.baseX * pulse, node.baseY * pulse, node.baseZ * pulse);
        });

        // Arestas
        ctx1.lineWidth = 1;
        for (let i = 0; i < projectedNodes.length; i++) {
          for (let j = i + 1; j < projectedNodes.length; j++) {
            const p1 = projectedNodes[i];
            const p2 = projectedNodes[j];
            const dist = Math.hypot(p1.px - p2.px, p1.py - p2.py);
            if (dist < 34) {
              const alpha = Math.max(0.1, 1 - dist / 34) * 0.65;
              ctx1.strokeStyle = `rgba(63, 244, 213, ${alpha})`;
              ctx1.beginPath();
              ctx1.moveTo(p1.px, p1.py);
              ctx1.lineTo(p2.px, p2.py);
              ctx1.stroke();
            }
          }
        }

        // Nós
        for (const p of projectedNodes) {
          ctx1.fillStyle = "#3ff4d5";
          ctx1.shadowColor = "#3ff4d5";
          ctx1.shadowBlur = 5;
          ctx1.beginPath();
          ctx1.arc(p.px, p.py, 1.8, 0, Math.PI * 2);
          ctx1.fill();
        }
        ctx1.shadowBlur = 0;
      }

      // 2. CANVAS 2: TORUS PARAMÉTRICO 3D (ANEL INCLINADO)
      const c2Data = checkCanvas(c2);
      if (c2Data) {
        const { ctx: ctx2, width: w2, height: h2 } = c2Data;
        ctx2.clearRect(0, 0, w2, h2);
        const cx = w2 / 2;
        const cy = h2 / 2;

        const R = 38, r = 14;
        const rotTilt = 0.65; // ~37 graus de inclinação
        const rotSpin = t * 0.5; // rotação contínua
        const torusGrid = [];
        for (let u = 0; u < 16; u++) {
          const uAng = (u / 16) * Math.PI * 2 + rotSpin;
          const ring = [];
          for (let v = 0; v < 8; v++) {
            const vAng = (v / 8) * Math.PI * 2;
            const x0 = (R + r * Math.cos(vAng)) * Math.cos(uAng);
            const y0 = (R + r * Math.cos(vAng)) * Math.sin(uAng);
            const z0 = r * Math.sin(vAng);
            const y1 = y0 * Math.cos(rotTilt) - z0 * Math.sin(rotTilt);
            const z1 = y0 * Math.sin(rotTilt) + z0 * Math.cos(rotTilt);
            const scale = 140 / (150 + z1);
            ring.push({ px: cx + x0 * scale, py: cy + y1 * scale });
          }
          torusGrid.push(ring);
        }

        // Meridianos
        ctx2.strokeStyle = "rgba(63, 244, 213, 0.45)";
        ctx2.lineWidth = 1;
        for (let u = 0; u < 16; u++) {
          ctx2.beginPath();
          for (let v = 0; v < 8; v++) {
            if (v === 0) ctx2.moveTo(torusGrid[u][v].px, torusGrid[u][v].py);
            else ctx2.lineTo(torusGrid[u][v].px, torusGrid[u][v].py);
          }
          ctx2.closePath();
          ctx2.stroke();
        }

        // Paralelos
        ctx2.strokeStyle = "rgba(255, 209, 92, 0.3)";
        for (let v = 0; v < 8; v++) {
          ctx2.beginPath();
          for (let u = 0; u < 16; u++) {
            if (u === 0) ctx2.moveTo(torusGrid[u][v].px, torusGrid[u][v].py);
            else ctx2.lineTo(torusGrid[u][v].px, torusGrid[u][v].py);
          }
          ctx2.closePath();
          ctx2.stroke();
        }

        // Vértices brilhantes alternados
        for (let u = 0; u < 16; u++) {
          for (let v = 0; v < 8; v++) {
            ctx2.fillStyle = (u + v) % 2 === 0 ? "#3ff4d5" : "#ffd15c";
            ctx2.beginPath();
            ctx2.arc(torusGrid[u][v].px, torusGrid[u][v].py, 1.2, 0, Math.PI * 2);
            ctx2.fill();
          }
        }
      }

      // 3. CANVAS 3: ESFERA GEODÉSICA & RADAR COMPASS
      const c3Data = checkCanvas(c3);
      if (c3Data) {
        const { ctx: ctx3, width: w3, height: h3 } = c3Data;
        ctx3.clearRect(0, 0, w3, h3);
        const cx = w3 / 2;
        const cy = h3 / 2;

        // Retículos e elipses
        ctx3.strokeStyle = "rgba(13, 70, 87, 0.6)";
        ctx3.lineWidth = 1;
        for (const rad of [20, 32, 44]) {
          ctx3.beginPath();
          ctx3.ellipse(cx, cy, rad, rad * 0.72, 0, 0, Math.PI * 2);
          ctx3.stroke();
        }

        // Círculo dourado de órbita
        ctx3.strokeStyle = "#ffd15c";
        ctx3.lineWidth = 1.2;
        ctx3.beginPath();
        ctx3.arc(cx, cy, 45, 0, Math.PI * 2);
        ctx3.stroke();

        // Crosshair
        ctx3.strokeStyle = "rgba(63, 244, 213, 0.5)";
        ctx3.beginPath();
        ctx3.moveTo(cx - 48, cy); ctx3.lineTo(cx + 48, cy);
        ctx3.moveTo(cx, cy - 48); ctx3.lineTo(cx + 48, cy);
        ctx3.stroke();

        // Esfera Geodésica 3D
        const rotY = t * 0.8, rotX = 0.4;
        const sNodes = this.sphereNodes.map(n => {
          const x1 = n.baseX * Math.cos(rotY) + n.baseZ * Math.sin(rotY);
          const z1 = -n.baseX * Math.sin(rotY) + n.baseZ * Math.cos(rotY);
          const y2 = n.baseY * Math.cos(rotX) - z1 * Math.sin(rotX);
          const z2 = n.baseY * Math.sin(rotX) + z1 * Math.cos(rotX);
          const scale = 140 / (150 + z2);
          return { px: cx + x1 * scale, py: cy + y2 * scale };
        });

        ctx3.strokeStyle = "rgba(63, 244, 213, 0.4)";
        for (let i = 0; i < sNodes.length; i++) {
          for (let j = i + 1; j < sNodes.length; j++) {
            const dist = Math.hypot(sNodes[i].px - sNodes[j].px, sNodes[i].py - sNodes[j].py);
            if (dist < 20) {
              ctx3.beginPath();
              ctx3.moveTo(sNodes[i].px, sNodes[i].py);
              ctx3.lineTo(sNodes[j].px, sNodes[j].py);
              ctx3.stroke();
            }
          }
        }
        for (const n of sNodes) {
          ctx3.fillStyle = "#3ff4d5";
          ctx3.beginPath();
          ctx3.arc(n.px, n.py, 1.4, 0, Math.PI * 2);
          ctx3.fill();
        }

        // Feixe laser de varredura vertical
        const scanY = cy + Math.sin(t * 2.5) * 36;
        ctx3.strokeStyle = "rgba(63, 244, 213, 0.9)";
        ctx3.shadowColor = "#3ff4d5";
        ctx3.shadowBlur = 6;
        ctx3.beginPath();
        ctx3.moveTo(cx - 38, scanY);
        ctx3.lineTo(cx + 38, scanY);
        ctx3.stroke();
        ctx3.shadowBlur = 0;
      }

      // 4. CANVAS ALLUVIAL: FLUXOS BEZIER TRANÇADOS
      const cAData = checkCanvas(cAlluvial);
      if (cAData) {
        const { ctx: ctxA, width: w, height: h } = cAData;
        ctxA.clearRect(0, 0, w, h);
        const numNodes = 16, startY = 6, stepY = (h - 12) / (numNodes - 1);
        const connections = [
          [0, 4], [0, 9], [1, 2], [1, 7], [2, 0], [2, 11], [3, 8], [3, 14],
          [4, 1], [4, 5], [5, 12], [6, 3], [6, 10], [7, 6], [7, 15],
          [8, 2], [9, 8], [10, 13], [11, 4], [12, 11], [13, 7], [14, 1],
          [15, 9], [15, 14]
        ];

        ctxA.lineWidth = 1.2;
        for (let c_i = 0; c_i < connections.length; c_i++) {
          const [src, dst] = connections[c_i];
          const y0 = startY + src * stepY;
          const y1 = startY + dst * stepY;
          const cx1 = w * 0.35;
          const cx2 = w * 0.65;
          const alpha = 0.2 + (Math.sin(t * 1.8 + c_i) * 0.1);
          ctxA.strokeStyle = c_i % 3 === 0
            ? `rgba(255, 209, 92, ${alpha * 1.2})`
            : `rgba(63, 244, 213, ${alpha})`;
          ctxA.beginPath();
          ctxA.moveTo(0, y0);
          ctxA.bezierCurveTo(cx1, y0, cx2, y1, w, y1);
          ctxA.stroke();
        }

        // Pacotes de fótons
        for (const pkt of this.alluvialPackets) {
          pkt.t += pkt.speed;
          if (pkt.t > 1) pkt.t = 0;
          const [src, dst] = connections[pkt.splineIndex];
          const y0 = startY + src * stepY;
          const y1 = startY + dst * stepY;
          const cx1 = w * 0.35;
          const cx2 = w * 0.65;
          const u = 1 - pkt.t;
          const px = 3 * u * u * pkt.t * cx1 + 3 * u * pkt.t * pkt.t * cx2 + pkt.t * pkt.t * pkt.t * w;
          const py = u * u * u * y0 + 3 * u * u * pkt.t * y0 + 3 * u * pkt.t * pkt.t * y1 + pkt.t * pkt.t * pkt.t * y1;
          ctxA.fillStyle = pkt.color;
          ctxA.beginPath();
          ctxA.arc(px, py, pkt.size, 0, Math.PI * 2);
          ctxA.fill();
        }
      }

      // 5. WAVEFORMS
      [w1, w2, w3].forEach((wc, idx) => {
        const wData = checkCanvas(wc);
        if (!wData) return;
        const { ctx: wctx, width: ww, height: wh } = wData;
        wctx.clearRect(0, 0, ww, wh);
        wctx.strokeStyle = "#3ff4d5";
        wctx.lineWidth = 1;
        wctx.beginPath();
        for (let x = 0; x < ww; x++) {
          const freq = 0.15 + idx * 0.05;
          const y = (wh / 2) + Math.sin(x * freq + t * 4) * 6 + ((x % 11 === 0) ? (Math.sin(t * 8) * 4) : 0);
          if (x === 0) wctx.moveTo(x, y);
          else wctx.lineTo(x, y);
        }
        wctx.stroke();
      });

      [ws1, ws2, ws3].forEach((wsc, idx) => {
        const wsData = checkCanvas(wsc);
        if (!wsData) return;
        const { ctx: wsctx, width: wsw, height: wsh } = wsData;
        wsctx.clearRect(0, 0, wsw, wsh);
        wsctx.strokeStyle = "#1b8ba5";
        wsctx.lineWidth = 1;
        wsctx.beginPath();
        for (let x = 0; x < wsw; x++) {
          const y = (wsh / 2) + Math.sin(x * 0.3 + t * 5 + idx) * 4;
          if (x === 0) wsctx.moveTo(x, y);
          else wsctx.lineTo(x, y);
        }
        wsctx.stroke();
      });

      this._animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  }

  _initDotMatrices() {
    if (!this.element) return;
    const dotContainers = [
      this.element.querySelector("#dot-matrix-1"),
      this.element.querySelector("#dot-matrix-2"),
      this.element.querySelector("#dot-matrix-3")
    ].filter(Boolean);

    const allDots = [];
    dotContainers.forEach(container => {
      container.innerHTML = "";
      const colDots = [];
      for (let i = 0; i < 32; i++) {
        const dot = document.createElement("div");
        dot.className = "led-dot" + (Math.random() > 0.4 ? " active" : "");
        container.appendChild(dot);
        colDots.push(dot);
      }
      allDots.push(colDots);
    });

    this._dotInterval = setInterval(() => {
      allDots.forEach((colDots, cIdx) => {
        colDots.forEach((dot, dIdx) => {
          const active = Math.sin(this.time * 4 + cIdx * 1.5 + dIdx * 0.3) > 0.15;
          dot.classList.toggle("active", active);
        });
      });
    }, 140);
  }

  _initLedMatrix() {
    if (!this.element) return;
    const container = this.element.querySelector("#amber-led-matrix");
    if (!container) return;

    container.innerHTML = "";
    const totalPixels = 56;
    const pixels = [];
    for (let i = 0; i < totalPixels; i++) {
      const p = document.createElement("div");
      p.className = "amber-pixel";
      container.appendChild(p);
      pixels.push(p);
    }

    this._ledInterval = setInterval(() => {
      pixels.forEach((p, idx) => {
        p.classList.toggle("active", (Math.sin(this.time * 3 + idx * 0.4) > 0.15));
      });
    }, 120);
  }

  async close(options) {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._ledInterval) {
      clearInterval(this._ledInterval);
      this._ledInterval = null;
    }
    if (this._dotInterval) {
      clearInterval(this._dotInterval);
      this._dotInterval = null;
    }
    return super.close(options);
  }

  static #onCloseTopologyWindow(event, target) {
    this.close();
  }
}

/**
 * ColliderHudApp — Console de Colisor Quântico & Íris Holográfica [QUANTUM COLLIDER // PARTICLE APERTURE]
 * Acelerador de partículas central, lâminas de íris mecânico, feixes relativísticos e monitor térmico.
 */
export class ColliderHudApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "collider-hud-app",
    classes: ["collider-hud-window"],
    position: {
      width: 1280,
      height: 720
    },
    window: {
      title: "COLISOR QUÂNTICO // ÍRIS HOLOGRÁFICA [QUANTUM COLLIDER // PARTICLE APERTURE]",
      icon: "fa-solid fa-atom",
      resizable: true
    },
    actions: {
      closeColliderWindow: ColliderHudApp.#onCloseColliderWindow,
      clickDataBlock: ColliderHudApp.#onClickDataBlock
    }
  };

  static PARTS = {
    main: {
      template: "modules/teste-hud/templates/collider.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this._animId = null;
    this._polyAnimId = null;
    this._spectrumAnimId = null;
    this._tempInterval = null;
    this._vaInterval = null;
    this.time = 0;
    this.coreTemp = 89.02;

    // 180 partículas orbitais relativísticas
    this.particles = [];
    const tracks = [48, 84, 120, 156, 192];
    const colors = ["#3ff4d5", "#3ff4d5", "#ffd15c", "#00ff88", "#ffffff", "#ff4d6d"];
    for (let i = 0; i < 180; i++) {
      const track = tracks[i % tracks.length];
      this.particles.push({
        track,
        r: track + (Math.random() - 0.5) * 8,
        angle: Math.random() * Math.PI * 2,
        speed: (0.008 + Math.random() * 0.02) * (i % 2 === 0 ? 1 : -0.85),
        color: colors[i % colors.length],
        size: 1.0 + Math.random() * 1.8,
        trail: []
      });
    }

    // Centelhas / Fagulhas de colisão
    this.sparks = [];

    // Vértices do Mini Poliedro 3D
    this.miniPolyNodes = [];
    for (let i = 0; i < 12; i++) {
      const th = i * (Math.PI * 2 / 12);
      const r = 16 + (i % 2 === 0 ? 5 : -4);
      this.miniPolyNodes.push({ x: r * Math.cos(th), y: r * Math.sin(th) * 0.8, z: (i % 3 - 1) * 8 });
    }
  }

  async _prepareContext(options) {
    return {};
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._initColliderCanvas();
    this._initMiniPolyCanvas();
    this._initHistogramCanvas();
    this._initVisualAnalysisEqualizer();

    // Oscilação suave da temperatura do núcleo
    const tempDisplay = this.element.querySelector("#collider-temp-val");
    this._tempInterval = setInterval(() => {
      if (tempDisplay) {
        const delta = (Math.random() - 0.49) * 0.05;
        this.coreTemp = Math.max(88.90, Math.min(89.15, this.coreTemp + delta));
        tempDisplay.textContent = `${this.coreTemp.toFixed(2)}°`;
      }
    }, 1400);
  }

  _initColliderCanvas() {
    if (!this.element) return;
    const canvas = this.element.querySelector("#collider-iris-canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderCollider = () => {
      this.time += 0.016;
      const t = this.time;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        this._animId = requestAnimationFrame(renderCollider);
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cx = rect.width / 2;
      const cy = rect.height / 2;

      ctx.clearRect(0, 0, rect.width, rect.height);

      // 1. Círculos concêntricos de telemetria
      const radii = [48, 84, 120, 156, 192];
      for (const r of radii) {
        ctx.strokeStyle = "rgba(13, 74, 92, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. Marcas de Grau no Anel de Precisão Vernier (r = 120)
      for (let deg = 0; deg < 360; deg += 5) {
        const rad = (deg * Math.PI / 180) + t * 0.05;
        const isMajor = deg % 30 === 0;
        const isMid = deg % 15 === 0;
        const r1 = isMajor ? 114 : (isMid ? 116 : 118);
        const r2 = 122;
        ctx.strokeStyle = isMajor ? "#ffd15c" : (isMid ? "#3ff4d5" : "rgba(255, 77, 109, 0.5)");
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + r1 * Math.cos(rad), cy + r1 * Math.sin(rad));
        ctx.lineTo(cx + r2 * Math.cos(rad), cy + r2 * Math.sin(rad));
        ctx.stroke();
      }

      // 3. Arcos tracejados no Anel Médio (r = 84)
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#3ff4d5";
      ctx.beginPath();
      ctx.arc(cx, cy, 84, -t * 0.3, -t * 0.3 + 1.4);
      ctx.stroke();

      ctx.strokeStyle = "#ffd15c";
      ctx.beginPath();
      ctx.arc(cx, cy, 84, -t * 0.3 + 2.2, -t * 0.3 + 3.4);
      ctx.stroke();

      ctx.strokeStyle = "#00ffcc";
      ctx.beginPath();
      ctx.arc(cx, cy, 84, -t * 0.3 + 4.2, -t * 0.3 + 5.0);
      ctx.stroke();

      // 4. Envelope harmônico ondulante exterior (r = 192)
      ctx.strokeStyle = "rgba(63, 244, 213, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2; a += 0.02) {
        const rWave = 192 + 14 * Math.sin(8 * a + t * 2);
        const x = cx + rWave * Math.cos(a);
        const y = cy + rWave * Math.sin(a);
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // 5. 16 Lâminas de Íris Mecânica Curvadas
      ctx.strokeStyle = "rgba(63, 244, 213, 0.85)";
      ctx.lineWidth = 1.3;
      const rotIris = t * 0.08;
      for (let i = 0; i < 16; i++) {
        const a = i * (Math.PI * 2 / 16) + rotIris;
        const x1 = cx + 22 * Math.cos(a);
        const y1 = cy + 22 * Math.sin(a);
        const x2 = cx + 78 * Math.cos(a + 0.48);
        const y2 = cy + 78 * Math.sin(a + 0.48);
        const cpx = cx + 55 * Math.cos(a + 0.22);
        const cpy = cy + 55 * Math.sin(a + 0.22);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        ctx.stroke();
      }

      // 6. 8 Braços Injetores Radiais e Núcleo de Plasma
      for (let i = 0; i < 8; i++) {
        const a = i * (Math.PI * 2 / 8) - t * 0.12;
        ctx.strokeStyle = "rgba(255, 209, 92, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 12 * Math.cos(a), cy + 12 * Math.sin(a));
        ctx.lineTo(cx + 42 * Math.cos(a), cy + 42 * Math.sin(a));
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx + 42 * Math.cos(a), cy + 42 * Math.sin(a), 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Núcleo de Fusão Central de Plasma
      const corePulse = 20 + Math.sin(t * 3.5) * 3;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, corePulse);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, "#3ff4d5");
      grad.addColorStop(0.7, "rgba(4, 42, 53, 0.8)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, corePulse, 0, Math.PI * 2);
      ctx.fill();

      // 7. Partículas Relativísticas com Rastros
      for (const p of this.particles) {
        p.angle += p.speed;
        const px = cx + p.r * Math.cos(p.angle);
        const py = cy + p.r * Math.sin(p.angle);

        p.trail.push({ x: px, y: py });
        if (p.trail.length > 5) p.trail.shift();

        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.6;
        for (let tr = 0; tr < p.trail.length - 1; tr++) {
          ctx.beginPath();
          ctx.moveTo(p.trail[tr].x, p.trail[tr].y);
          ctx.lineTo(p.trail[tr + 1].x, p.trail[tr + 1].y);
          ctx.stroke();
        }

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Rajadas Radiais de Fótons em 16 Pontos
      for (let b = 0; b < 16; b++) {
        const bAng = b * (Math.PI * 2 / 16) + 0.1;
        for (let k = 0; k < 4; k++) {
          const bDist = 160 + k * 8;
          ctx.fillStyle = `rgba(255, 209, 92, ${0.8 - k * 0.18})`;
          ctx.beginPath();
          ctx.arc(cx + bDist * Math.cos(bAng), cy + bDist * Math.sin(bAng), 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 9. Centelhas de Colisão
      if (Math.random() < 0.06) {
        const sparkAngle = Math.random() * Math.PI * 2;
        const sparkR = radii[Math.floor(Math.random() * radii.length)];
        const sx = cx + sparkR * Math.cos(sparkAngle);
        const sy = cy + sparkR * Math.sin(sparkAngle);
        for (let k = 0; k < 6; k++) {
          this.sparks.push({
            x: sx, y: sy,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 1.0,
            color: Math.random() > 0.5 ? "#ffffff" : "#ffd15c"
          });
        }
      }

      for (let s_i = this.sparks.length - 1; s_i >= 0; s_i--) {
        const sp = this.sparks[s_i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 0.04;
        if (sp.life <= 0) {
          this.sparks.splice(s_i, 1);
          continue;
        }
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.life * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 10. Callouts Holográficos
      ctx.lineWidth = 1;
      const drawCallout = (targetX, targetY, elbowX, elbowY, boxX, boxY, tag, label) => {
        ctx.strokeStyle = "#3ff4d5";
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(boxX, boxY);
        ctx.stroke();
        const boxW = 100, boxH = 14;
        ctx.fillStyle = "#3ff4d5";
        ctx.fillRect(boxX, boxY - boxH / 2, boxW, boxH);
        ctx.fillStyle = "#02060b";
        ctx.font = "bold 8px monospace";
        ctx.fillText(`${tag}  ${label}`, boxX + 4, boxY + 3);
      };

      drawCallout(cx + 120, cy - 80, cx + 190, cy - 110, cx + 240, cy - 110, "PRAVO", "POINT_DATA_NODE");
      drawCallout(cx + 145, cy - 35, cx + 205, cy - 65, cx + 240, cy - 65, "PRAVO", "POINT_DATA_NODE");
      drawCallout(cx + 140, cy + 20, cx + 205, cy - 20, cx + 240, cy - 20, "PRAVO", "POINT_DATA_NODE");

      // Retículo Laranja Direito (3 o'clock)
      ctx.strokeStyle = "#ff9f1c"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx + 140, cy + 20, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 132, cy + 20); ctx.lineTo(cx + 148, cy + 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 140, cy + 12); ctx.lineTo(cx + 140, cy + 28); ctx.stroke();

      const drawLeftCallout = (targetX, targetY, elbowX, elbowY, boxX, boxY, tag, label) => {
        ctx.strokeStyle = "#3ff4d5";
        ctx.beginPath();
        ctx.moveTo(targetX, targetY);
        ctx.lineTo(elbowX, elbowY);
        ctx.lineTo(boxX, boxY);
        ctx.stroke();
        const boxW = 100, boxH = 14;
        ctx.fillStyle = "#3ff4d5";
        ctx.fillRect(boxX - boxW, boxY - boxH / 2, boxW, boxH);
        ctx.fillStyle = "#02060b";
        ctx.font = "bold 8px monospace";
        ctx.fillText(`${tag}  ${label}`, boxX - boxW + 4, boxY + 3);
      };
      drawLeftCallout(cx - 130, cy + 20, cx - 180, cy + 20, cx - 220, cy + 20, "BRAVO", "POINT_DATA_NODE");
      drawLeftCallout(cx - 145, cy + 55, cx - 180, cy + 55, cx - 220, cy + 55, "BRAVO", "POINT_DATA_NODE");

      // Retículo Laranja Inferior (6 o'clock)
      ctx.strokeStyle = "#ff9f1c"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx + 15, cy + 168, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 7, cy + 168); ctx.lineTo(cx + 23, cy + 168); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 15, cy + 160); ctx.lineTo(cx + 15, cy + 176); ctx.stroke();

      this._animId = requestAnimationFrame(renderCollider);
    };

    renderCollider();
  }

  _initHistogramCanvas() {
    if (!this.element) return;
    const canvas = this.element.querySelector("#collider-histogram-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderHistogram = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        this._spectrumAnimId = requestAnimationFrame(renderHistogram);
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, rect.width, rect.height);
      const numCols = 12;
      const colW = (rect.width - 20) / numCols;
      const baseH = [12, 16, 14, 20, 26, 18, 14, 22, 24, 16, 14, 10];
      const pts = [];

      for (let i = 0; i < numCols; i++) {
        const x = 8 + i * colW;
        const bgH = rect.height - 6;
        // Fundo coral escuro
        ctx.fillStyle = "rgba(56, 28, 28, 0.7)";
        ctx.fillRect(x + 2, 3, colW - 4, bgH);

        // Barra ciano animada
        const dynH = baseH[i] + Math.sin(this.time * 3 + i * 0.7) * 4;
        const barH = Math.max(4, Math.min(rect.height - 6, dynH));
        const barY = rect.height - 3 - barH;
        ctx.fillStyle = "rgba(63, 244, 213, 0.65)";
        ctx.fillRect(x + 2, barY, colW - 4, barH);

        pts.push({ x: x + colW / 2, y: barY });
      }

      // Linha conectando os topos
      ctx.strokeStyle = "#3ff4d5"; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
        else ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Pontos brancos nos topos
      for (const pt of pts) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      this._spectrumAnimId = requestAnimationFrame(renderHistogram);
    };
    renderHistogram();
  }

  _initMiniPolyCanvas() {
    if (!this.element) return;
    const canvas = this.element.querySelector("#mini-poly-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderMiniPoly = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        this._polyAnimId = requestAnimationFrame(renderMiniPoly);
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, rect.width, rect.height);
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rot = this.time * 0.8;

      const proj = this.miniPolyNodes.map(n => ({
        x: cx + (n.x * Math.cos(rot) - n.z * Math.sin(rot)),
        y: cy + n.y
      }));

      ctx.strokeStyle = "#3ff4d5";
      ctx.lineWidth = 1;
      for (let i = 0; i < proj.length; i++) {
        const next = (i + 1) % proj.length;
        ctx.beginPath();
        ctx.moveTo(proj[i].x, proj[i].y);
        ctx.lineTo(proj[next].x, proj[next].y);
        ctx.stroke();

        const cross = (i + 4) % proj.length;
        ctx.strokeStyle = "rgba(13, 74, 92, 0.5)";
        ctx.beginPath();
        ctx.moveTo(proj[i].x, proj[i].y);
        ctx.lineTo(proj[cross].x, proj[cross].y);
        ctx.stroke();
        ctx.strokeStyle = "#3ff4d5";
      }

      this._polyAnimId = requestAnimationFrame(renderMiniPoly);
    };
    renderMiniPoly();
  }

  _initVisualAnalysisEqualizer() {
    if (!this.element) return;
    const container = this.element.querySelector("#va-equalizer");
    if (!container) return;
    container.innerHTML = "";
    const bars = [];
    for (let i = 0; i < 16; i++) {
      const bar = document.createElement("div");
      bar.className = "va-bar";
      bar.style.height = "50%";
      container.appendChild(bar);
      bars.push(bar);
    }
    this._vaInterval = setInterval(() => {
      bars.forEach((b, idx) => {
        const pct = 20 + Math.abs(Math.sin(this.time * 4 + idx * 0.6)) * 75;
        b.style.height = `${pct}%`;
      });
    }, 80);
  }

  async close(options) {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._polyAnimId) {
      cancelAnimationFrame(this._polyAnimId);
      this._polyAnimId = null;
    }
    if (this._spectrumAnimId) {
      cancelAnimationFrame(this._spectrumAnimId);
      this._spectrumAnimId = null;
    }
    if (this._tempInterval) {
      clearInterval(this._tempInterval);
      this._tempInterval = null;
    }
    if (this._vaInterval) {
      clearInterval(this._vaInterval);
      this._vaInterval = null;
    }
    return super.close(options);
  }

  static #onCloseColliderWindow(event, target) {
    this.close();
  }

  static #onClickDataBlock(event, target) {
    target.classList.toggle("active");
  }
}

/**
 * MarsSatviewApp — Console de Reconhecimento Orbital Marciano [MARS.SATVIEW.17-A]
 * Topografia de relevo sombreado de Valles Marineris, curvas de nível cyan, radar e vetor Daedalus.
 */
export class MarsSatviewApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mars-satview-hud-app",
    classes: ["mars-satview-hud-window"],
    position: {
      width: 1280,
      height: 720
    },
    window: {
      title: "CONTROLE DE MISSÃO ORBITAL // RECONHECIMENTO MARCIANO [MARS.SATVIEW.17-A]",
      icon: "fa-solid fa-satellite",
      resizable: true
    },
    actions: {
      closeMarsSatviewWindow: MarsSatviewApp.#onCloseMarsSatviewWindow
    }
  };

  static PARTS = {
    main: {
      template: "modules/teste-hud/templates/mars-satview.hbs"
    }
  };

  constructor(options = {}) {
    super(options);
    this._animId = null;
    this._distInterval = null;
    this.time = 0;
    this.baseDist = 75.3;

    // Coordenadas normalizadas dos waypoints sincronizadas com os cartões
    this.baseCamp = { pxPct: 0.455, pyPct: 0.46 };
    this.daedalus = { pxPct: 0.535, pyPct: 0.63 };

    // Pulsos de range vector
    this.vectorPulses = [0.15, 0.45, 0.75];
  }

  async _prepareContext(options) {
    return {};
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this._initMapCanvas();

    // Flutuação micro-telemétrica da distância
    const distEl = this.element.querySelector("#mars-distance-digits");
    this._distInterval = setInterval(() => {
      if (distEl) {
        const drift = (Math.random() - 0.48) * 0.04;
        const current = (this.baseDist + drift).toFixed(1);
        distEl.textContent = current;
      }
    }, 1200);
  }

  _initMapCanvas() {
    if (!this.element) return;
    const canvas = this.element.querySelector("#mars-satview-map-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderMap = () => {
      this.time += 0.016;
      const t = this.time;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        this._animId = requestAnimationFrame(renderMap);
        return;
      }
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(rect.width * dpr);
      const targetH = Math.round(rect.height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Grid de Coordenadas Táticas Dotted
      ctx.strokeStyle = "rgba(6, 40, 52, 0.6)";
      ctx.lineWidth = 1;
      for (let x = 20; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 20; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Marcadores Crosshair '+' nos nós da grade
      ctx.strokeStyle = "rgba(63, 244, 213, 0.4)";
      for (let x = 70; x < w - 40; x += 100) {
        for (let y = 60; y < h - 40; y += 80) {
          ctx.beginPath();
          ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y);
          ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3);
          ctx.stroke();
        }
      }

      // 2. Curvas de Nível Topográficas Neon Cyan (Melas Chasma Rim & Cliff Walls)
      ctx.strokeStyle = "#3ff4d5";
      ctx.lineWidth = 2.2;
      ctx.shadowColor = "rgba(63, 244, 213, 0.85)";
      ctx.shadowBlur = 8;

      // Borda Norte (WEST -> Base Camp)
      ctx.beginPath();
      const northRim = [
        [0.08, 0.42], [0.15, 0.41], [0.22, 0.43], [0.30, 0.44], [0.38, 0.46],
        [0.44, 0.42], [0.49, 0.40], [0.53, 0.44], [0.55, 0.50], [0.57, 0.53]
      ];
      for (let i = 0; i < northRim.length; i++) {
        const px = w * northRim[i][0], py = h * northRim[i][1];
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Loop Nordeste (Melas Chasma montanha & NORTH promontory)
      ctx.beginPath();
      const neLoop = [
        [0.57, 0.53], [0.60, 0.58], [0.65, 0.62], [0.70, 0.56], [0.73, 0.48],
        [0.78, 0.40], [0.82, 0.38], [0.85, 0.44], [0.89, 0.52], [0.93, 0.56],
        [0.96, 0.60], [0.98, 0.68]
      ];
      for (let i = 0; i < neLoop.length; i++) {
        const px = w * neLoop[i][0], py = h * neLoop[i][1];
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Borda Sul
      ctx.beginPath();
      const southRim = [
        [0.50, 0.65], [0.54, 0.72], [0.58, 0.75], [0.64, 0.78], [0.70, 0.85],
        [0.76, 0.90], [0.82, 0.95]
      ];
      for (let i = 0; i < southRim.length; i++) {
        const px = w * southRim[i][0], py = h * southRim[i][1];
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Curva secundária suave
      ctx.strokeStyle = "rgba(63, 244, 213, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < northRim.length; i++) {
        const px = w * northRim[i][0], py = h * northRim[i][1] - 8;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // 3. Vetor Tático Base Camp <-> Daedalus
      const bcX = w * this.baseCamp.pxPct;
      const bcY = h * this.baseCamp.pyPct;
      const ddX = w * this.daedalus.pxPct;
      const ddY = h * this.daedalus.pyPct;

      // Círculo Range Finder Âmbar
      const midX = (bcX + ddX) / 2;
      const midY = (bcY + ddY) / 2;
      const rangeR = Math.hypot(bcX - ddX, bcY - ddY) * 1.55;
      ctx.strokeStyle = "rgba(255, 159, 28, 0.85)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(midX, midY, rangeR, 0, Math.PI * 2);
      ctx.stroke();

      // Linha tracejada do vetor
      ctx.strokeStyle = "#ff9f1c";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(bcX, bcY);
      ctx.lineTo(ddX, ddY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pulsos de RF viajando pelo vetor
      for (let i = 0; i < this.vectorPulses.length; i++) {
        this.vectorPulses[i] += 0.008;
        if (this.vectorPulses[i] > 1) this.vectorPulses[i] = 0;
        const pT = this.vectorPulses[i];
        const pX = bcX + (ddX - bcX) * pT;
        const pY = bcY + (ddY - bcY) * pT;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ff9f1c";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(pX, pY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Retículo Base Camp (O)
      ctx.strokeStyle = "#ff9f1c";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bcX, bcY, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#ff9f1c";
      ctx.beginPath(); ctx.arc(bcX, bcY, 2.5, 0, Math.PI * 2); ctx.fill();

      // Retículo Daedalus (O)
      ctx.strokeStyle = "#ff9f1c";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(ddX, ddY, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "#ff9f1c";
      ctx.beginPath(); ctx.arc(ddX, ddY, 2.5, 0, Math.PI * 2); ctx.fill();

      // 4. Varredura de Radar Orbital
      const radarCx = w * 0.48;
      const radarCy = h * 0.45;
      const sweepR = 60 + (t * 35) % 200;
      ctx.strokeStyle = `rgba(63, 244, 213, ${Math.max(0, 0.5 - sweepR / 250)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(radarCx, radarCy, sweepR, Math.PI * 0.8, Math.PI * 2.1);
      ctx.stroke();

      // 5. Rótulos Geográficos
      ctx.fillStyle = "#3ff4d5";
      ctx.font = "bold 9px monospace";
      ctx.fillText("EAST O", w * 0.05, h * 0.42 - 10);
      ctx.fillText("WEST", w * 0.44, h * 0.22);
      ctx.fillText("O NORTH", w * 0.81, h * 0.30);

      ctx.fillStyle = "#ff9f1c";
      ctx.fillText("O SINAI DORSA", w * 0.30, h * 0.80);
      ctx.fillText("O MELAS CHASMA", w * 0.77, h * 0.81);
      ctx.font = "8px monospace";
      ctx.fillText("   15km", w * 0.77, h * 0.81 + 10);

      // Anéis de sondas orbitais
      ctx.strokeStyle = "rgba(63, 244, 213, 0.7)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(w * 0.52, h * 0.12, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w * 0.47, h * 0.20, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w * 0.37, h * 0.15, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w * 0.32, h * 0.36, 8, 0, Math.PI * 2); ctx.stroke();

      this._animId = requestAnimationFrame(renderMap);
    };

    renderMap();
  }

  async close(options) {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
    if (this._distInterval) {
      clearInterval(this._distInterval);
      this._distInterval = null;
    }
    return super.close(options);
  }

  static #onCloseMarsSatviewWindow(event, target) {
    this.close();
  }
}

// Instâncias singleton para controle
let oficinaAppInstance = null;
let navegacaoAppInstance = null;
let dnaAppInstance = null;
let reactorAppInstance = null;
let dataTopologyAppInstance = null;
let colliderAppInstance = null;
let marsSatviewAppInstance = null;

// ==================== GETTERS & CONTROLLERS ====================

// 1. Oficina Tática
export function getOficinaHudApp() {
  if (!oficinaAppInstance) oficinaAppInstance = new TesteHudApp();
  return oficinaAppInstance;
}
export function openOficinaHud() { return getOficinaHudApp().render(true); }
export function closeOficinaHud() { return oficinaAppInstance?.close(); }
export function toggleOficinaHud() {
  const app = getOficinaHudApp();
  return app.rendered ? app.close() : app.render(true);
}

// 2. Navegação Marciana v1
export function getNavegacaoHudApp() {
  if (!navegacaoAppInstance) navegacaoAppInstance = new NavegacaoHudApp();
  return navegacaoAppInstance;
}
export function openNavegacaoHud() { return getNavegacaoHudApp().render(true); }
export function closeNavegacaoHud() { return navegacaoAppInstance?.close(); }
export function toggleNavegacaoHud() {
  const app = getNavegacaoHudApp();
  return app.rendered ? app.close() : app.render(true);
}

// 3. Análise Genômica DNA
export function getDnaHudApp() {
  if (!dnaAppInstance) dnaAppInstance = new DnaHudApp();
  return dnaAppInstance;
}
export function openDnaHud() { return getDnaHudApp().render(true); }
export function closeDnaHud() { return dnaAppInstance?.close(); }
export function toggleDnaHud() {
  const app = getDnaHudApp();
  return app.rendered ? app.close() : app.render(true);
}

// 4. Núcleo do Reator
export function getReactorHudApp() {
  if (!reactorAppInstance) reactorAppInstance = new ReactorHudApp();
  return reactorAppInstance;
}
export function openReactorHud() { return getReactorHudApp().render(true); }
export function closeReactorHud() { return reactorAppInstance?.close(); }
export function toggleReactorHud() {
  const app = getReactorHudApp();
  return app.rendered ? app.close() : app.render(true);
}

// 5. Topologia de Dados 3D & Alluvial Flow
export function getDataTopologyHudApp() {
  if (!dataTopologyAppInstance) dataTopologyAppInstance = new DataTopologyApp();
  return dataTopologyAppInstance;
}
export function openDataTopologyHud() { return getDataTopologyHudApp().render(true); }
export function closeDataTopologyHud() { return dataTopologyAppInstance?.close(); }
export function toggleDataTopologyHud() {
  const app = getDataTopologyHudApp();
  return app.rendered ? app.close() : app.render(true);
}
export const openDataTopology = openDataTopologyHud;
export const closeDataTopology = closeDataTopologyHud;
export const toggleDataTopology = toggleDataTopologyHud;
export const getDataTopology = getDataTopologyHudApp;

// 6. Colisor Quântico & Íris Holográfico
export function getColliderHudApp() {
  if (!colliderAppInstance) colliderAppInstance = new ColliderHudApp();
  return colliderAppInstance;
}
export function openColliderHud() { return getColliderHudApp().render(true); }
export function closeColliderHud() { return colliderAppInstance?.close(); }
export function toggleColliderHud() {
  const app = getColliderHudApp();
  return app.rendered ? app.close() : app.render(true);
}
export const openCollider = openColliderHud;
export const closeCollider = closeColliderHud;
export const toggleCollider = toggleColliderHud;
export const getCollider = getColliderHudApp;

// 7. Reconhecimento Orbital Marciano MARS.SATVIEW.17-A
export function getMarsSatviewHudApp() {
  if (!marsSatviewAppInstance) marsSatviewAppInstance = new MarsSatviewApp();
  return marsSatviewAppInstance;
}
export function openMarsSatviewHud() { return getMarsSatviewHudApp().render(true); }
export function closeMarsSatviewHud() { return marsSatviewAppInstance?.close(); }
export function toggleMarsSatviewHud() {
  const app = getMarsSatviewHudApp();
  return app.rendered ? app.close() : app.render(true);
}
export const openMarsSatview = openMarsSatviewHud;
export const closeMarsSatview = closeMarsSatviewHud;
export const toggleMarsSatview = toggleMarsSatviewHud;
export const getMarsSatview = getMarsSatviewHudApp;

// Aliases retrocompatíveis
export const getHudApp = getReactorHudApp;
export const openHud = openReactorHud;
export const closeHud = closeReactorHud;
export const toggleHud = toggleReactorHud;

// Inicialização de Hooks no Foundry VTT
Hooks.once("init", () => {
  console.log("Teste-Hud | Inicializando Heptalogia Tática: 7 Consoles Militares v1.5.0...");

  game.modules.get("teste-hud").api = {
    // Atalhos Padrão
    open: openReactorHud,
    close: closeReactorHud,
    toggle: toggleReactorHud,
    getApp: getReactorHudApp,

    // Tela 1: Oficina Tática [МАСТЕРСКАЯ]
    openOficina: openOficinaHud,
    closeOficina: closeOficinaHud,
    toggleOficina: toggleOficinaHud,
    getOficina: getOficinaHudApp,

    // Tela 2: Navegação Marciana v1 [火星 NAVIGATION]
    openNavegacao: openNavegacaoHud,
    closeNavegacao: closeNavegacaoHud,
    toggleNavegacao: toggleNavegacaoHud,
    getNavegacao: getNavegacaoHudApp,

    // Tela 3: Análise Genômica & DNA [DNA ANALYSIS]
    openDna: openDnaHud,
    closeDna: closeDnaHud,
    toggleDna: toggleDnaHud,
    getDna: getDnaHudApp,

    // Tela 4: Núcleo do Reator // Fusão Quântica [REACTOR CORE]
    openReactor: openReactorHud,
    closeReactor: closeReactorHud,
    toggleReactor: toggleReactorHud,
    getReactor: getReactorHudApp,
    openCore: openReactorHud,
    closeCore: closeReactorHud,
    toggleCore: toggleReactorHud,

    // Tela 5: Topologia de Dados & Grafo Alluvial [DATA TOPOLOGY]
    openDataTopology: openDataTopologyHud,
    closeDataTopology: closeDataTopologyHud,
    toggleDataTopology: toggleDataTopologyHud,
    getDataTopology: getDataTopologyHudApp,
    openTopology: openDataTopologyHud,

    // Tela 6: Colisor Quântico & Íris Holográfico [COLLIDER HUD]
    openCollider: openColliderHud,
    closeCollider: closeColliderHud,
    toggleCollider: toggleColliderHud,
    getCollider: getColliderHudApp,

    // Tela 7: Reconhecimento Orbital Marciano [MARS.SATVIEW.17-A]
    openMarsSatview: openMarsSatviewHud,
    closeMarsSatview: closeMarsSatviewHud,
    toggleMarsSatview: toggleMarsSatviewHud,
    getMarsSatview: getMarsSatviewHudApp,
    openSatview: openMarsSatviewHud,

    // Motor de Áudio Procedural
    sound: soundFx
  };
});
