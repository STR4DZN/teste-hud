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

      // 5. Degraus de Pares de Base Espaçados e Nítidos (38 degraus, ~9.5 por volta)
      const numRungs = 38;
      for (let i = 0; i < numRungs; i++) {
        const t = i / (numRungs - 1);
        const x = startX + t * (endHelixX - startX);
        const theta = ((x - startX) / loopWidth) * Math.PI + this.angle;

        const y1_3d = centerY + R * Math.sin(theta);
        const z1_3d = R * Math.cos(theta);
        const y2_3d = centerY - R * Math.sin(theta);
        const z2_3d = -R * Math.cos(theta);

        const p1 = project(x, y1_3d, z1_3d);
        const p2 = project(x, y2_3d, z2_3d);

        const distLaser = Math.abs((p1.px + p2.px) * 0.5 - laserX);
        const isHit = distLaser < 26;
        const hitIntensity = isHit ? 1.0 - distLaser / 26.0 : 0.0;

        // Linha de ligação do par de bases
        renderables.push({
          type: "rung_line",
          p1,
          p2,
          z: 0,
          isHit,
          hitIntensity
        });

        // Contas ao longo do degrau
        const rungLen = Math.hypot(p2.px - p1.px, p2.py - p1.py);
        const numBeads = Math.max(4, Math.min(10, Math.floor(rungLen / 15.0) * 2));
        for (let b = 1; b < numBeads; b++) {
          const u = b / numBeads;
          const by_3d = y1_3d + (y2_3d - y1_3d) * u;
          const bz_3d = z1_3d + (z2_3d - z1_3d) * u;
          const bp = project(x, by_3d, bz_3d);

          const bDist = Math.abs(bp.px - laserX);
          const bHit = bDist < 24;
          const bInt = bHit ? 1.0 - bDist / 24.0 : 0.0;

          renderables.push({
            type: "rung_bead",
            p: bp,
            z: bp.z,
            scale: bp.scale,
            isHit: bHit,
            hitIntensity: bInt
          });
        }

        // Nós principais da fita (strand nodes)
        const crest1 = Math.abs(Math.sin(theta));
        const isRing1 = (crest1 > 0.35) && (p1.z > 5);
        const s1Dist = Math.abs(p1.px - laserX);
        const s1Hit = s1Dist < 26;
        const s1Int = s1Hit ? 1.0 - s1Dist / 26.0 : 0.0;

        renderables.push({
          type: "strand_node",
          p: p1,
          z: p1.z,
          scale: p1.scale,
          isRing: isRing1,
          strand: 1,
          theta,
          isHit: s1Hit,
          hitIntensity: s1Int
        });

        const crest2 = Math.abs(Math.sin(theta + Math.PI));
        const isRing2 = (crest2 > 0.35) && (p2.z > 5);
        const s2Dist = Math.abs(p2.px - laserX);
        const s2Hit = s2Dist < 26;
        const s2Int = s2Hit ? 1.0 - s2Dist / 26.0 : 0.0;

        renderables.push({
          type: "strand_node",
          p: p2,
          z: p2.z,
          scale: p2.scale,
          isRing: isRing2,
          strand: 2,
          theta: theta + Math.PI,
          isHit: s2Hit,
          hitIntensity: s2Int
        });

        // Faíscas dinâmicas ao atingir o feixe laser
        if ((s1Hit || s2Hit) && Math.random() < 0.28) {
          const hitNode = s1Hit ? p1 : p2;
          this.sparks.push({
            x: hitNode.px + (Math.random() - 0.5) * 6,
            y: hitNode.py + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 2.2,
            vy: (Math.random() - 0.5) * 2.5 - 1.2,
            life: 1.0,
            color: Math.random() > 0.35 ? "#ffffff" : "#ffd15c"
          });
        }
      }

      // 6. Ramificações em tridente na cauda à direita
      const tailOffsets = [
        { dy: -18, dtheta: -0.25 },
        { dy: 0, dtheta: 0 },
        { dy: 18, dtheta: 0.25 }
      ];
      for (const tDef of tailOffsets) {
        for (let step = 1; step <= 7; step++) {
          const fx = endHelixX + step * 14;
          const fy = centerY + tDef.dy * (step * 0.48);
          const fz = Math.sin(this.angle + tDef.dtheta) * 15;
          const fp = project(fx, fy, fz);
          renderables.push({
            type: "tail_bead",
            p: fp,
            z: fp.z,
            scale: fp.scale,
            isHit: false,
            hitIntensity: 0.0
          });
        }
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

        } else if (item.type === "tail_bead") {
          ctx.beginPath();
          ctx.arc(item.p.px, item.p.py, 1.8 * item.scale, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(63, 244, 213, 0.85)";
          ctx.fill();

        } else if (item.type === "strand_node") {
          if (item.isRing && normZ > 0.2) {
            // Grande anel vazado brilhante (Vesícula / Donut)
            const ringR = (5.0 + normZ * 3.2) * item.scale;
            const strokeW = normZ < 0.65 ? 2.0 : 2.8;

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
              const alpha = 0.65 + normZ * 0.35;
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
                ctx.arc(item.p.px, item.p.py, ringR * 0.45, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(200, 255, 245, ${(0.4 + normZ * 0.4).toFixed(3)})`;
                ctx.lineWidth = 0.8;
                ctx.stroke();
              }

              // Anel satélite companheiro
              const crestFactor = Math.abs(Math.sin(item.theta));
              if (crestFactor > 0.65 && normZ > 0.45) {
                const satR = 3.2 * item.scale;
                const offsetY = (item.p.py < centerY ? -7.5 : 7.5) * item.scale;
                const offsetX = (item.strand === 1 ? 4.5 : -4.5) * item.scale;
                ctx.beginPath();
                ctx.arc(item.p.px + offsetX, item.p.py + offsetY, satR, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(63, 244, 213, ${alpha.toFixed(3)})`;
                ctx.lineWidth = 1.8;
                ctx.stroke();
              }
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
    for (let i = 0; i < 40; i++) {
      this.fluxParticles.push({
        z: -270 + Math.random() * 580,
        r: Math.random() * 18,
        theta: Math.random() * Math.PI * 2,
        speed: 1.2 + Math.random() * 2.2,
        color: Math.random() > 0.4 ? "#3ff4d5" : "#ffd15c"
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

      // Auxiliares de Geometria 3D
      const addRing = (radius, zPos, numPts, colorFn, lineWidth = 1, isLine = true) => {
        const pts = [];
        for (let i = 0; i < numPts; i++) {
          const th = (i / numPts) * Math.PI * 2;
          const p = project(radius * Math.cos(th), radius * Math.sin(th), zPos);
          pts.push({ ...p, th });
        }
        for (let i = 0; i < numPts; i++) {
          const p1 = pts[i];
          const p2 = pts[(i + 1) % numPts];
          const avgZ = (p1.z + p2.z) * 0.5;
          const col = colorFn(p1.th, avgZ);
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

      const addSpokes = (rInner, rOuter, zPos, numSpokes, colorFn, lineWidth = 1) => {
        for (let i = 0; i < numSpokes; i++) {
          const th = (i / numSpokes) * Math.PI * 2;
          const p1 = project(rInner * Math.cos(th), rInner * Math.sin(th), zPos);
          const p2 = project(rOuter * Math.cos(th), rOuter * Math.sin(th), zPos);
          const avgZ = (p1.z + p2.z) * 0.5;
          renderables.push({
            type: "line",
            p1,
            p2,
            color: colorFn(th, avgZ),
            width: lineWidth,
            z: avgZ
          });
        }
      };

      // --- Estágio 1: Bocal Injetor Frontal (z: -270 a -230) ---
      for (let z = -270; z <= -230; z += 9) {
        const rad = 18 + (z - (-270)) * 0.15;
        addRing(rad, z, 32, (th, z_d) => `rgba(255, 170, 50, ${(0.45 + 0.45 * Math.max(0, Math.min(1, (z_d + 80) / 160.0))).toFixed(2)})`, 1);
      }
      addRing(28, -270, 24, () => "rgba(63, 244, 213, 0.75)", 1.2);
      addSpokes(14, 28, -270, 8, () => "rgba(255, 200, 80, 0.8)", 1);

      // --- Estágio 2: Anel Estator 1 com Dentes Radiais (z: -215) ---
      addRing(48, -215, 48, () => "rgba(63, 244, 213, 0.75)", 1);
      addRing(58, -215, 60, () => "rgba(63, 244, 213, 0.9)", 1.2, false);
      addSpokes(48, 62, -215, 24, () => "rgba(63, 244, 213, 0.6)", 1);

      // --- Estágio 3: Grande Disco de Compressão 1 (z: -140) ---
      addRing(72, -140, 64, () => "rgba(63, 244, 213, 0.65)", 1);
      addRing(86, -140, 72, () => "rgba(63, 244, 213, 0.85)", 1.5, false);
      addSpokes(70, 88, -140, 36, () => "rgba(20, 140, 150, 0.45)", 1);
      for (let i = 0; i < 12; i++) {
        const th = (i / 12) * Math.PI * 2;
        const p = project(96 * Math.cos(th), 96 * Math.sin(th), -140);
        renderables.push({ type: "dot", p, r: 2.0, color: "rgba(63, 244, 213, 0.75)", z: p.z });
      }

      // --- Estágio 4: Flange & Anel de Transição Segmentado (z: -65) ---
      addRing(52, -65, 48, () => "rgba(255, 175, 55, 0.75)", 1);
      addRing(66, -65, 54, () => "rgba(63, 244, 213, 0.8)", 1.2, false);
      addSpokes(52, 66, -65, 18, () => "rgba(255, 190, 70, 0.7)", 1);

      // --- Estágio 5: CORAÇÃO DE PLASMA INCANDESCENTE (z: 0) ---
      const R_core = 42 + 2.0 * Math.sin(this.corePulsePhase);
      const numCageRings = 14;
      for (let c = 0; c < numCageRings; c++) {
        const lat = -Math.PI * 0.42 + (c / (numCageRings - 1)) * Math.PI * 0.84;
        const r_lat = R_core * Math.cos(lat);
        const z_lat = R_core * Math.sin(lat);
        addRing(r_lat, z_lat, 36, (th, z_d) => {
          const normZ = Math.max(0, Math.min(1, (z_d + 60) / 120.0));
          return `rgba(255, ${150 + Math.floor(90 * Math.sin(th * 3 + this.corePulsePhase))}, 30, ${(0.6 + 0.4 * normZ).toFixed(2)})`;
        }, 1.5);
      }

      // Nervuras de confinamento magnético meridianas
      for (let m = 0; m < 8; m++) {
        const th_m = (m / 8) * Math.PI;
        const pts_m = [];
        for (let step = 0; step < 32; step++) {
          const phi = (step / 31) * Math.PI * 2;
          const lx = R_core * Math.cos(phi) * Math.cos(th_m);
          const ly = R_core * Math.cos(phi) * Math.sin(th_m);
          const lz = R_core * Math.sin(phi);
          pts_m.push(project(lx, ly, lz));
        }
        for (let step = 0; step < 31; step++) {
          const p1 = pts_m[step];
          const p2 = pts_m[step + 1];
          const avgZ = (p1.z + p2.z) * 0.5;
          const normZ = Math.max(0, Math.min(1, (avgZ + 50) / 100.0));
          renderables.push({
            type: "line",
            p1,
            p2,
            color: `rgba(255, 195, 60, ${(0.55 + 0.45 * normZ).toFixed(2)})`,
            width: 1.4,
            z: avgZ
          });
        }
      }

      // --- Estágio 6: Anel de Transição & Blindagem Secundária (z: +65) ---
      addRing(56, 65, 48, () => "rgba(63, 244, 213, 0.65)", 1);
      addRing(70, 65, 54, () => "rgba(63, 244, 213, 0.85)", 1.5, false);
      addSpokes(56, 70, 65, 18, () => "rgba(20, 140, 150, 0.5)", 1);

      // --- Estágio 7: OS ANÉIS GÊMEOS DE BISEL CIANO (z: +105 & +125) ---
      for (const z_r of [105, 125]) {
        addRing(88, z_r, 72, () => "rgba(63, 244, 213, 0.95)", 2.4);
        addRing(76, z_r, 64, () => "rgba(63, 244, 213, 0.8)", 1.4);
        addSpokes(76, 88, z_r, 32, () => "rgba(63, 244, 213, 0.65)", 1);
        addRing(82, z_r, 48, () => "rgba(200, 255, 245, 0.9)", 1.4, false);
      }

      // --- Estágio 8: GRANDE ESTATOR ACELERADOR PRINCIPAL (z: +180) ---
      addRing(95, 180, 80, () => "rgba(63, 244, 213, 0.7)", 1);
      addRing(128, 180, 96, () => "rgba(63, 244, 213, 0.9)", 2.0);
      addRing(142, 180, 96, () => "rgba(63, 244, 213, 0.85)", 1.4, false);
      addSpokes(95, 142, 180, 48, () => "rgba(63, 244, 213, 0.55)", 1);

      // Escudos em arco flutuantes
      for (let arcIdx = 0; arcIdx < 4; arcIdx++) {
        const thStart = (arcIdx / 4) * Math.PI * 2 + 0.2;
        const thEnd = thStart + 0.9;
        const arcPts = [];
        for (let step = 0; step < 16; step++) {
          const thA = thStart + (step / 15) * (thEnd - thStart);
          arcPts.push(project(160 * Math.cos(thA), 160 * Math.sin(thA), 180));
        }
        for (let step = 0; step < 15; step++) {
          const p1 = arcPts[step];
          const p2 = arcPts[step + 1];
          const avgZ = (p1.z + p2.z) * 0.5;
          renderables.push({
            type: "line",
            p1,
            p2,
            color: "rgba(63, 244, 213, 0.8)",
            width: 2.4,
            z: avgZ
          });
        }
      }

      // --- Estágio 9: Rotor de Turbina / Palhetas Radiais (z: +230) ---
      addRing(62, 230, 54, () => "rgba(255, 180, 60, 0.8)", 1.2);
      addRing(78, 230, 64, () => "rgba(63, 244, 213, 0.75)", 1);
      addSpokes(32, 76, 230, 42, () => "rgba(255, 195, 75, 0.7)", 1.2);

      // --- Estágio 10: Tubo de Escape & Bobinas Terminais (z: +265 a +310) ---
      for (let z_ex = 265; z_ex <= 310; z_ex += 9) {
        const rad_ex = 42 - (z_ex - 265) * 0.22;
        addRing(rad_ex, z_ex, 32, () => "rgba(255, 175, 55, 0.75)", 1.4);
      }
      addRing(30, 310, 24, () => "rgba(63, 244, 213, 0.9)", 1.8);

      // --- Grandes Retículos HUD Circulares (Centralizados no Estator em z: +180) ---
      addRing(205, 180, 120, () => "rgba(63, 244, 213, 0.3)", 1);
      addRing(220, 180, 120, () => "rgba(63, 244, 213, 0.2)", 1);
      for (let i = 0; i < 36; i++) {
        const th = (i / 36) * Math.PI * 2;
        const isMajor = (i % 9 === 0);
        const r1 = 205;
        const r2 = isMajor ? 225 : 213;
        const p1 = project(r1 * Math.cos(th), r1 * Math.sin(th), 180);
        const p2 = project(r2 * Math.cos(th), r2 * Math.sin(th), 180);
        renderables.push({
          type: "line",
          p1,
          p2,
          color: isMajor ? "rgba(63, 244, 213, 0.7)" : "rgba(63, 244, 213, 0.35)",
          width: isMajor ? 1.6 : 1,
          z: (p1.z + p2.z) * 0.5
        });
      }

      // --- Partículas de Fluxo ao Longo do Eixo ---
      for (const fp of this.fluxParticles) {
        fp.z += fp.speed;
        if (fp.z > 315) fp.z = -270;
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

// Instâncias singleton para controle
let oficinaAppInstance = null;
let navegacaoAppInstance = null;
let dnaAppInstance = null;
let reactorAppInstance = null;

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

export function getReactorHudApp() {
  if (!reactorAppInstance) {
    reactorAppInstance = new ReactorHudApp();
  }
  return reactorAppInstance;
}

export function openReactorHud() {
  return getReactorHudApp().render(true);
}

export function closeReactorHud() {
  return reactorAppInstance?.close();
}

export function toggleReactorHud() {
  const app = getReactorHudApp();
  if (app.rendered) return app.close();
  return app.render(true);
}

// Aliases retrocompatíveis para chamadas anteriores
export const getHudApp = getReactorHudApp;
export const openHud = openReactorHud;
export const closeHud = closeReactorHud;
export const toggleHud = toggleReactorHud;

// Inicialização de Hooks no Foundry VTT
Hooks.once("init", () => {
  console.log("Teste-Hud | Inicializando Tetralogia Tática: Oficina, Navegação, DNA & Núcleo do Reator v1.4.0...");

  game.modules.get("teste-hud").api = {
    // Atalhos Padrão (Abre o HUD mais recente ou configurado)
    open: openReactorHud,
    close: closeReactorHud,
    toggle: toggleReactorHud,
    getApp: getReactorHudApp,

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

    // Tela 4: Núcleo do Reator // Fusão Quântica [REACTOR CORE]
    openReactor: openReactorHud,
    closeReactor: closeReactorHud,
    toggleReactor: toggleReactorHud,
    getReactor: getReactorHudApp,
    openCore: openReactorHud,
    closeCore: closeReactorHud,
    toggleCore: toggleReactorHud,

    // Motor de Áudio Procedural
    sound: soundFx
  };
});




