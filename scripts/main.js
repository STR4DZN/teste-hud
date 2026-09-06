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

    // 65 nós 3D do plexo molecular de fundo
    const meshNodes = [];
    for (let i = 0; i < 65; i++) {
      meshNodes.push({
        x: (Math.random() - 0.5) * 850,
        y: (Math.random() - 0.5) * 320,
        z: (Math.random() - 0.5) * 180,
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
      this.targetTiltY = mx * 0.15;
      this.targetTiltX = -my * 0.12;
    };
    const onMouseLeave = () => {
      this.targetTiltX = 0;
      this.targetTiltY = 0;
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const onClick = () => {
      soundFx.playCodonBeep(Math.floor(Math.random() * 8));
      this.rotSpeed = this.rotSpeed === 0.012 ? 0.026 : (this.rotSpeed === 0.026 ? 0.004 : 0.012);
      const laserPx = width * 0.065;
      for (let k = 0; k < 22; k++) {
        this.sparks.push({
          x: laserPx + (Math.random() - 0.5) * 14,
          y: height * 0.52 + (Math.random() - 0.5) * 90,
          vx: (Math.random() - 0.5) * 3.5,
          vy: (Math.random() - 0.5) * 3.5 - 1.5,
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
      this.laserPhase += 0.025;

      const cosTx = Math.cos(this.tiltX);
      const sinTx = Math.sin(this.tiltX);
      const cosTy = Math.cos(this.tiltY);
      const sinTy = Math.sin(this.tiltY);

      const fov = 520;
      const project = (x, y, z) => {
        const rx = x - width * 0.5;
        const ry = y - height * 0.52;
        const rz = z;

        const x1 = rx * cosTy + rz * sinTy;
        const z1 = -rx * sinTy + rz * cosTy;
        const y2 = ry * cosTx - z1 * sinTx;
        const z2 = ry * sinTx + z1 * cosTx;
        const scale = fov / (fov + z2 + 300);
        return {
          px: width * 0.5 + x1 * scale,
          py: height * 0.52 + y2 * scale,
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

      const projMesh = meshNodes.map(n => project(width * 0.5 + n.x, height * 0.52 + n.y, n.z));

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
          if (distSq < 2700) { // dist < 52px
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / 52) * 0.16 * p1.scale;
            ctx.strokeStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();
          }
        }
      }

      // 3. Geometria da Dupla-Hélice Hiper-Fiel
      const centerY = height * 0.52;
      const R = Math.min(102, height * 0.26);
      const startX = width * 0.065;
      const endX = width * 0.94;
      const loopWidth = (endX - startX) / 4.55;
      const crossover1X = startX + loopWidth * 0.67;
      const laserX = width * (0.065 + 0.008 * Math.sin(this.laserPhase));

      const renderables = [];

      const numRungs = 84;
      for (let i = 0; i < numRungs; i++) {
        const t = i / (numRungs - 1);
        const x = startX + t * (endX - startX);
        const theta = ((x - crossover1X) / loopWidth) * Math.PI + this.angle;

        // Posições helicoidais das fitas
        const y1_3d = centerY + R * Math.sin(theta);
        const z1_3d = R * Math.cos(theta);

        const y2_3d = centerY - R * Math.sin(theta);
        const z2_3d = -R * Math.cos(theta);

        const isHit = Math.abs(x - laserX) < 16;

        // Coluna vertical de contas (rungs)
        const yMin = Math.min(y1_3d, y2_3d);
        const yMax = Math.max(y1_3d, y2_3d);
        const zMin = y1_3d < y2_3d ? z1_3d : z2_3d;
        const zMax = y1_3d < y2_3d ? z2_3d : z1_3d;

        const numBeads = Math.max(3, Math.floor(Math.abs(y2_3d - y1_3d) / 10.5));
        for (let b = 1; b < numBeads; b++) {
          const u = b / numBeads;
          const by_3d = yMin + (yMax - yMin) * u;
          const bz_3d = zMin + (zMax - zMin) * u;
          const bp = project(x, by_3d, bz_3d);

          renderables.push({
            type: "bead",
            x: bp.px,
            y: bp.py,
            z: bp.z,
            scale: bp.scale,
            isHit
          });
        }

        const p1 = project(x, y1_3d, z1_3d);
        const p2 = project(x, y2_3d, z2_3d);

        // Nós principais e anéis vazados nas cristas
        const crestFactor = Math.abs(Math.sin(theta));
        const isRing = (i % 2 === 0) && (crestFactor > 0.35);

        renderables.push({
          type: "strand_node",
          isRing,
          strand: 1,
          x: p1.px,
          y: p1.py,
          z: p1.z,
          scale: p1.scale,
          theta,
          origX: x,
          origY: y1_3d,
          isHit
        });

        renderables.push({
          type: "strand_node",
          isRing,
          strand: 2,
          x: p2.px,
          y: p2.py,
          z: p2.z,
          scale: p2.scale,
          theta: theta + Math.PI,
          origX: x,
          origY: y2_3d,
          isHit
        });

        // Faíscas dinâmicas ao atingir o laser
        if (isHit && Math.random() < 0.3) {
          this.sparks.push({
            x: p1.px + (Math.random() - 0.5) * 6,
            y: p1.py + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 2.2,
            vy: (Math.random() - 0.5) * 2.5 - 1.2,
            life: 1.0,
            color: Math.random() > 0.3 ? "#ffffff" : "#ffd15c"
          });
        }
      }

      // Ramificações em tridente na cauda à direita (x > 0.94)
      const tailX = endX;
      const tailOffsets = [
        { dy: -18, dtheta: -0.25 },
        { dy: 0, dtheta: 0 },
        { dy: 18, dtheta: 0.25 }
      ];
      for (const tDef of tailOffsets) {
        for (let step = 1; step <= 5; step++) {
          const fx = tailX + step * 9;
          const fy = centerY + tDef.dy * (step * 0.45);
          const fz = Math.sin(this.angle + tDef.dtheta) * 15;
          const fp = project(fx, fy, fz);
          renderables.push({
            type: "tail_bead",
            x: fp.px,
            y: fp.py,
            z: fp.z,
            scale: fp.scale,
            isHit: false
          });
        }
      }

      // 4. Z-Buffer: Ordenação de Profundidade
      renderables.sort((a, b) => a.z - b.z);

      // 5. Desenho dos Elementos em Profundidade
      for (const item of renderables) {
        const normZ = Math.max(0.0, Math.min(1.0, (item.z + 120) / 240.0));

        if (item.type === "bead") {
          const r = (1.5 + normZ * 1.4) * item.scale;
          ctx.beginPath();
          ctx.arc(item.x, item.y, r, 0, Math.PI * 2);

          if (item.isHit) {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#ffd15c";
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            if (normZ > 0.45) {
              const alpha = 0.65 + normZ * 0.35;
              ctx.fillStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
              ctx.shadowColor = "rgba(63, 244, 213, 0.6)";
              ctx.shadowBlur = 4 * normZ;
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              const alpha = 0.25 + normZ * 0.4;
              ctx.fillStyle = `rgba(20, 115, 120, ${alpha.toFixed(3)})`;
              ctx.fill();
            }
          }

        } else if (item.type === "tail_bead") {
          ctx.beginPath();
          ctx.arc(item.x, item.y, 2.0 * item.scale, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(63, 244, 213, 0.85)";
          ctx.fill();

        } else if (item.type === "strand_node") {
          if (item.isRing && normZ > 0.15) {
            // Grande anel vazado brilhante (Vesícula / Donut)
            const ringR = (5.2 + normZ * 3.4) * item.scale;
            const strokeW = normZ < 0.6 ? 2.0 : 2.8;

            ctx.beginPath();
            ctx.arc(item.x, item.y, ringR, 0, Math.PI * 2);

            if (item.isHit) {
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = strokeW;
              ctx.shadowColor = "#ffd15c";
              ctx.shadowBlur = 14;
              ctx.stroke();
              ctx.shadowBlur = 0;

              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(item.x, item.y, 1.6 * item.scale, 0, Math.PI * 2);
              ctx.fill();
            } else {
              const alpha = 0.6 + normZ * 0.4;
              ctx.strokeStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
              ctx.lineWidth = strokeW;

              if (normZ > 0.45) {
                ctx.shadowColor = "rgba(63, 244, 213, 0.75)";
                ctx.shadowBlur = 8 * normZ;
              }
              ctx.stroke();
              ctx.shadowBlur = 0;

              // Anel concêntrico interno fino
              if (normZ > 0.45) {
                ctx.beginPath();
                ctx.arc(item.x, item.y, ringR * 0.45, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(200, 255, 245, ${(0.4 + normZ * 0.4).toFixed(3)})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
              }

              // Anel satélite companheiro
              const crestFactor = Math.abs(Math.sin(item.theta));
              if (crestFactor > 0.65 && normZ > 0.45 && (Math.floor(item.origX) % 22 < 11)) {
                const satR = 3.2 * item.scale;
                const offsetY = (item.origY < centerY ? -6.5 : 6.5) * item.scale;
                const offsetX = (item.strand === 1 ? 4.5 : -4.5) * item.scale;
                ctx.beginPath();
                ctx.arc(item.x + offsetX, item.y + offsetY, satR, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
                ctx.lineWidth = 1.8;
                ctx.stroke();
              }
            }
          } else {
            // Conta sólida intermediária / nó de cruzamento
            const dotR = (1.8 + normZ * 1.6) * item.scale;
            ctx.beginPath();
            ctx.arc(item.x, item.y, dotR, 0, Math.PI * 2);

            if (item.isHit) {
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "#ffd15c";
              ctx.shadowBlur = 9;
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              const alpha = 0.4 + normZ * 0.55;
              ctx.fillStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
              ctx.fill();
            }
          }
        }
      }

      // 6. Faíscas Quânticas de Excitação (Sparks)
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

      // 7. Feixe Laser Dourado na Origem Esquerda (x ≈ laserX)
      const laserTop = height * 0.22;
      const laserBottom = height * 0.90;

      // Brilho difuso suave
      ctx.strokeStyle = "rgba(255, 209, 92, 0.16)";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(laserX, laserTop);
      ctx.lineTo(laserX, laserBottom);
      ctx.stroke();

      // Feixe gradiente central
      const laserGrad = ctx.createLinearGradient(0, laserTop, 0, laserBottom);
      laserGrad.addColorStop(0, "rgba(255, 209, 92, 0)");
      laserGrad.addColorStop(0.2, "rgba(255, 209, 92, 0.75)");
      laserGrad.addColorStop(0.5, "rgba(255, 255, 255, 1.0)");
      laserGrad.addColorStop(0.8, "rgba(255, 209, 92, 0.75)");
      laserGrad.addColorStop(1, "rgba(255, 209, 92, 0)");

      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = "#ffd15c";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(laserX, laserTop);
      ctx.lineTo(laserX, laserBottom);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Travas horizontais de cabeçalho e base
      ctx.strokeStyle = "#ffd15c";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(laserX - 5, laserTop);
      ctx.lineTo(laserX + 5, laserTop);
      ctx.moveTo(laserX - 5, laserBottom);
      ctx.lineTo(laserX + 5, laserBottom);
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

// Instâncias singleton para controle
let oficinaAppInstance = null;
let navegacaoAppInstance = null;
let dnaAppInstance = null;

export function getOficinaHudApp() {
  if (!oficinaAppInstance) {
    oficinaAppInstance = new TesteHudApp();
  }
  return oficinaAppInstance;
}

export function openOficinaHud() {
  return getOficinaHudApp().render(true);
}

export function closeOficinaHud() {
  return oficinaAppInstance?.close();
}

export function toggleOficinaHud() {
  const app = getOficinaHudApp();
  if (app.rendered) return app.close();
  return app.render(true);
}

export function getNavegacaoHudApp() {
  if (!navegacaoAppInstance) {
    navegacaoAppInstance = new NavegacaoHudApp();
  }
  return navegacaoAppInstance;
}

export function openNavegacaoHud() {
  return getNavegacaoHudApp().render(true);
}

export function closeNavegacaoHud() {
  return navegacaoAppInstance?.close();
}

export function toggleNavegacaoHud() {
  const app = getNavegacaoHudApp();
  if (app.rendered) return app.close();
  return app.render(true);
}

export function getDnaHudApp() {
  if (!dnaAppInstance) {
    dnaAppInstance = new DnaHudApp();
  }
  return dnaAppInstance;
}

export function openDnaHud() {
  return getDnaHudApp().render(true);
}

export function closeDnaHud() {
  return dnaAppInstance?.close();
}

export function toggleDnaHud() {
  const app = getDnaHudApp();
  if (app.rendered) return app.close();
  return app.render(true);
}

// Aliases retrocompatíveis para chamadas anteriores
export const getHudApp = getDnaHudApp;
export const openHud = openDnaHud;
export const closeHud = closeDnaHud;
export const toggleHud = toggleDnaHud;

// Inicialização de Hooks no Foundry VTT
Hooks.once("init", () => {
  console.log("Teste-Hud | Inicializando Trilogia Tática: Oficina, Navegação & Análise de DNA v1.3.2...");

  game.modules.get("teste-hud").api = {
    // Atalhos Padrão (Abre o HUD mais recente ou configurado)
    open: openDnaHud,
    close: closeDnaHud,
    toggle: toggleDnaHud,
    getApp: getDnaHudApp,

    // Tela 1: Oficina Tática [МАСТЕРСКАЯ]
    openOficina: openOficinaHud,
    closeOficina: closeOficinaHud,
    toggleOficina: toggleOficinaHud,
    getOficina: getOficinaHudApp,

    // Tela 2: Navegação Marciana [火星 NAVIGATION]
    openNavegacao: openNavegacaoHud,
    closeNavegacao: closeNavegacaoHud,
    toggleNavegacao: toggleNavegacaoHud,
    getNavegacao: getNavegacaoHudApp,

    // Tela 3: Análise Genômica & DNA [DNA ANALYSIS]
    openDna: openDnaHud,
    closeDna: closeDnaHud,
    toggleDna: toggleDnaHud,
    getDna: getDnaHudApp,

    // Motor de Áudio Procedural
    sound: soundFx
  };
});




