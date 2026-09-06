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

    // 60 nós 3D do plexo molecular de fundo
    const meshNodes = [];
    for (let i = 0; i < 60; i++) {
      meshNodes.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 350,
        z: (Math.random() - 0.5) * 400,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.25,
        vz: (Math.random() - 0.5) * 0.35
      });
    }

    // Interatividade com o mouse para inclinação 3D sutil (holográfica)
    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width - 0.5;
      const my = (e.clientY - rect.top) / rect.height - 0.5;
      this.targetTiltY = mx * 0.22;
      this.targetTiltX = -my * 0.18;
    };
    const onMouseLeave = () => {
      this.targetTiltX = 0;
      this.targetTiltY = 0;
    };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    const onClick = () => {
      soundFx.playCodonBeep(Math.floor(Math.random() * 8));
      this.rotSpeed = this.rotSpeed === 0.012 ? 0.028 : (this.rotSpeed === 0.028 ? 0.005 : 0.012);
      const laserPx = (0.5 + 0.36 * Math.sin(this.laserPhase)) * width;
      for (let k = 0; k < 20; k++) {
        this.sparks.push({
          x: laserPx + (Math.random() - 0.5) * 16,
          y: height * 0.5 + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4 - 1.5,
          life: 1.0,
          color: Math.random() > 0.4 ? "#ffffff" : "#ffd15c"
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
      this.laserPhase += 0.014;

      const cosTx = Math.cos(this.tiltX);
      const sinTx = Math.sin(this.tiltX);
      const cosTy = Math.cos(this.tiltY);
      const sinTy = Math.sin(this.tiltY);

      const fov = 450;
      const project = (x, y, z) => {
        const x1 = x * cosTy + z * sinTy;
        const z1 = -x * sinTy + z * cosTy;
        const y2 = y * cosTx - z1 * sinTx;
        const z2 = y * sinTx + z1 * cosTx;
        const scale = fov / (fov + z2 + 300);
        return {
          px: width * 0.5 + x1 * scale,
          py: height * 0.5 + y2 * scale,
          scale,
          z: z2
        };
      };

      // 1. PLEXO MOLECULAR 3D DE FUNDO (Constelação com Micro-Triângulos)
      for (let i = 0; i < meshNodes.length; i++) {
        const n = meshNodes[i];
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
        if (n.x < -400 || n.x > 400) n.vx *= -1;
        if (n.y < -170 || n.y > 170) n.vy *= -1;
        if (n.z < -200 || n.z > 200) n.vz *= -1;
      }

      const projMesh = meshNodes.map(n => project(n.x, n.y, n.z));

      ctx.lineWidth = 0.5;
      for (let i = 0; i < projMesh.length; i++) {
        const p1 = projMesh[i];
        if (p1.z < -280) continue;

        ctx.fillStyle = "rgba(63, 244, 213, 0.4)";
        ctx.beginPath();
        ctx.arc(p1.px, p1.py, 1.2 * p1.scale, 0, Math.PI * 2);
        ctx.fill();

        for (let j = i + 1; j < projMesh.length; j++) {
          const p2 = projMesh[j];
          const distSq = (p1.px - p2.px) ** 2 + (p1.py - p2.py) ** 2;
          if (distSq < 6400) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / 80) * 0.14 * Math.min(1, p1.scale);
            ctx.strokeStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(p1.px, p1.py);
            ctx.lineTo(p2.px, p2.py);
            ctx.stroke();

            for (let k = j + 1; k < Math.min(projMesh.length, j + 3); k++) {
              const p3 = projMesh[k];
              const d31 = (p1.px - p3.px) ** 2 + (p1.py - p3.py) ** 2;
              const d32 = (p2.px - p3.px) ** 2 + (p2.py - p3.py) ** 2;
              if (d31 < 4900 && d32 < 4900) {
                ctx.fillStyle = "rgba(63, 244, 213, 0.02)";
                ctx.beginPath();
                ctx.moveTo(p1.px, p1.py);
                ctx.lineTo(p2.px, p2.py);
                ctx.lineTo(p3.px, p3.py);
                ctx.closePath();
                ctx.fill();
              }
            }
          }
        }
      }

      // 2. CÁLCULO E GEOMETRIA DA DUPLA-HÉLICE 3D
      const numBases = 110;
      const usableW = width * 0.88;
      const startX = -usableW * 0.5;
      const baseRadius = Math.min(84, height * 0.28);
      const cycles = 3.6;
      const laserPx = width * (0.5 + 0.36 * Math.sin(this.laserPhase));

      const renderables = [];

      for (let i = 0; i < numBases; i++) {
        const t = i / (numBases - 1);
        const lx = startX + t * usableW;

        // Desbobinamento e dispersão no terço direito (t > 0.72)
        const uncoil = t > 0.72 ? (t - 0.72) / 0.28 : 0;
        const radius = baseRadius * (1.0 + uncoil * 1.5);
        const theta = t * Math.PI * 2 * cycles * (1.0 - uncoil * 0.45) + this.angle;

        const ly1 = Math.sin(theta) * radius + (uncoil > 0 ? (Math.random() - 0.5) * 4 * uncoil : 0);
        const lz1 = Math.cos(theta) * radius;

        const ly2 = Math.sin(theta + Math.PI) * radius + (uncoil > 0 ? (Math.random() - 0.5) * 4 * uncoil : 0);
        const lz2 = Math.cos(theta + Math.PI) * radius;

        const p1 = project(lx, ly1, lz1);
        const p2 = project(lx, ly2, lz2);

        const isLaserHit = Math.abs(p1.px - laserPx) < 22 || Math.abs(p2.px - laserPx) < 22;

        // 2.1 Degrau de Pares de Bases (Ladder de Micro-Beads)
        if (uncoil < 0.65) {
          const beadsCount = 6;
          const rungBeads = [];
          for (let b = 0; b <= beadsCount; b++) {
            const bt = b / beadsCount;
            const bx = p1.px + (p2.px - p1.px) * bt;
            const by = p1.py + (p2.py - p1.py) * bt;
            const bz = p1.z + (p2.z - p1.z) * bt;
            const bScale = p1.scale + (p2.scale - p1.scale) * bt;
            const isBeadLaser = Math.abs(bx - laserPx) < 20;
            rungBeads.push({ x: bx, y: by, z: bz, scale: bScale, isHit: isBeadLaser });
          }

          renderables.push({
            type: "rung",
            z: (p1.z + p2.z) * 0.5,
            p1,
            p2,
            beads: rungBeads,
            uncoil,
            isHit: isLaserHit
          });
        } else {
          renderables.push({
            type: "tail_filament",
            z: p1.z,
            x: p1.px,
            y: p1.py + (uncoil * 28),
            scale: p1.scale,
            isHit: isLaserHit
          });
          renderables.push({
            type: "tail_filament",
            z: p2.z,
            x: p2.px,
            y: p2.py - (uncoil * 28),
            scale: p2.scale,
            isHit: isLaserHit
          });
        }

        // 2.2 Nós das Fitas: Anéis Vazados e Micro-contas
        const isMajorNode = i % 3 === 0;

        renderables.push({
          type: "backbone_node",
          isMajor: isMajorNode,
          strand: 1,
          x: p1.px,
          y: p1.py,
          z: p1.z,
          scale: p1.scale,
          isHit: Math.abs(p1.px - laserPx) < 22
        });

        renderables.push({
          type: "backbone_node",
          isMajor: isMajorNode,
          strand: 2,
          x: p2.px,
          y: p2.py,
          z: p2.z,
          scale: p2.scale,
          isHit: Math.abs(p2.px - laserPx) < 22
        });

        if (isLaserHit && Math.random() < 0.25) {
          this.sparks.push({
            x: p1.px + (Math.random() - 0.5) * 8,
            y: p1.py + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 2.2,
            vy: (Math.random() - 0.5) * 2.5 - 1.2,
            life: 1.0,
            color: Math.random() > 0.3 ? "#ffffff" : "#ffd15c"
          });
        }
      }

      // 3. ORDENAÇÃO DE PROFUNDIDADE (Z-Buffer)
      renderables.sort((a, b) => a.z - b.z);

      // 4. DESENHO DOS ELEMENTOS DA DUPLA-HÉLICE
      for (const item of renderables) {
        if (item.type === "rung") {
          const alphaBase = (0.12 + 0.3 * Math.min(1, Math.max(0, (item.z + 120) / 240))) * (1 - item.uncoil * 0.8);
          ctx.strokeStyle = item.isHit ? "rgba(255, 209, 92, 0.45)" : `rgba(63, 244, 213, ${alphaBase.toFixed(3)})`;
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(item.p1.px, item.p1.py);
          ctx.lineTo(item.p2.px, item.p2.py);
          ctx.stroke();

          for (const b of item.beads) {
            const beadRadius = (b.isHit ? 1.8 : 1.3) * b.scale;
            ctx.beginPath();
            ctx.arc(b.x, b.y, beadRadius, 0, Math.PI * 2);
            if (b.isHit) {
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "#ffd15c";
              ctx.shadowBlur = 8;
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              const bAlpha = 0.25 + 0.6 * Math.min(1, Math.max(0, (b.z + 120) / 240));
              ctx.fillStyle = `rgba(63, 244, 213, ${bAlpha.toFixed(3)})`;
              ctx.fill();
            }
          }

        } else if (item.type === "backbone_node") {
          const depthNorm = Math.min(1, Math.max(0, (item.z + 120) / 240));

          if (item.isMajor) {
            // ANEL VAZADO GLOWING (Vesícula/Donut)
            const ringRadius = (3.2 + depthNorm * 4.2) * item.scale;
            ctx.beginPath();
            ctx.arc(item.x, item.y, ringRadius, 0, Math.PI * 2);

            if (item.isHit) {
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2.0;
              ctx.shadowColor = "#ffd15c";
              ctx.shadowBlur = 14;
              ctx.stroke();
              ctx.shadowBlur = 0;

              ctx.fillStyle = "#ffffff";
              ctx.beginPath();
              ctx.arc(item.x, item.y, 1.8 * item.scale, 0, Math.PI * 2);
              ctx.fill();
            } else {
              const strokeAlpha = 0.35 + depthNorm * 0.6;
              ctx.strokeStyle = `rgba(63, 244, 213, ${strokeAlpha.toFixed(3)})`;
              ctx.lineWidth = 1.4 * item.scale;

              if (depthNorm > 0.5) {
                ctx.shadowColor = "rgba(63, 244, 213, 0.75)";
                ctx.shadowBlur = 7 * depthNorm;
              }
              ctx.stroke();
              ctx.shadowBlur = 0;

              ctx.fillStyle = `rgba(63, 244, 213, ${(0.05 + depthNorm * 0.15).toFixed(3)})`;
              ctx.fill();

              if (depthNorm > 0.4) {
                ctx.beginPath();
                ctx.arc(item.x, item.y, ringRadius * 0.45, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(200, 255, 245, ${(0.3 + depthNorm * 0.4).toFixed(3)})`;
                ctx.lineWidth = 0.7;
                ctx.stroke();
              }
            }
          } else {
            const dotRadius = (1.2 + depthNorm * 1.6) * item.scale;
            ctx.beginPath();
            ctx.arc(item.x, item.y, dotRadius, 0, Math.PI * 2);
            if (item.isHit) {
              ctx.fillStyle = "#ffffff";
              ctx.shadowColor = "#ffd15c";
              ctx.shadowBlur = 9;
              ctx.fill();
              ctx.shadowBlur = 0;
            } else {
              const dotAlpha = 0.2 + depthNorm * 0.65;
              ctx.fillStyle = `rgba(63, 244, 213, ${dotAlpha.toFixed(3)})`;
              ctx.fill();
            }
          }

        } else if (item.type === "tail_filament") {
          ctx.beginPath();
          ctx.arc(item.x, item.y, 1.4 * item.scale, 0, Math.PI * 2);
          ctx.fillStyle = item.isHit ? "#ffffff" : "rgba(63, 244, 213, 0.55)";
          ctx.fill();
        }
      }

      // 5. ATUALIZAÇÃO E DESENHO DE FAÍSCAS (EXCITATION SPARKS)
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
        ctx.arc(sp.x, sp.y, 1.2 * sp.life, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. FEIXE LASER DE VARREDURA DOURADO (GOLD SCANNING LASER)
      const laserTop = height * 0.12;
      const laserBottom = height * 0.88;

      ctx.strokeStyle = "rgba(255, 209, 92, 0.14)";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(laserPx, laserTop);
      ctx.lineTo(laserPx, laserBottom);
      ctx.stroke();

      const laserGrad = ctx.createLinearGradient(0, laserTop, 0, laserBottom);
      laserGrad.addColorStop(0, "rgba(255, 209, 92, 0)");
      laserGrad.addColorStop(0.2, "rgba(255, 209, 92, 0.7)");
      laserGrad.addColorStop(0.5, "rgba(255, 255, 255, 1.0)");
      laserGrad.addColorStop(0.8, "rgba(255, 209, 92, 0.7)");
      laserGrad.addColorStop(1, "rgba(255, 209, 92, 0)");

      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 2.0;
      ctx.shadowColor = "#ffd15c";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(laserPx, laserTop);
      ctx.lineTo(laserPx, laserBottom);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Travas do laser
      ctx.strokeStyle = "#ffd15c";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(laserPx - 7, laserTop);
      ctx.lineTo(laserPx + 7, laserTop);
      ctx.moveTo(laserPx - 7, laserBottom);
      ctx.lineTo(laserPx + 7, laserBottom);
      ctx.stroke();

      // Retículo central
      const midY = height * 0.5;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(laserPx, midY, 3.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(laserPx, midY, 1.2, 0, Math.PI * 2);
      ctx.fill();

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
  console.log("Teste-Hud | Inicializando Trilogia Tática: Oficina, Navegação & Análise de DNA v1.3.1...");

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




