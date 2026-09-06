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

// Instância singleton para controle
let hudAppInstance = null;

export function getHudApp() {
  if (!hudAppInstance) {
    hudAppInstance = new TesteHudApp();
  }
  return hudAppInstance;
}

export function openHud() {
  return getHudApp().render(true);
}

export function closeHud() {
  return hudAppInstance?.close();
}

export function toggleHud() {
  const app = getHudApp();
  if (app.rendered) {
    return app.close();
  }
  return app.render(true);
}

// Inicialização de Hooks no Foundry VTT
Hooks.once("init", () => {
  console.log("Teste-Hud | Inicializando Console da Oficina Tática [МАСТЕРСКАЯ] v1.1.0...");

  game.modules.get("teste-hud").api = {
    open: openHud,
    close: closeHud,
    toggle: toggleHud,
    getApp: getHudApp,
    sound: soundFx
  };
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tokenControls = controls.find(c => c.name === "token");
  if (!tokenControls) return;

  tokenControls.tools.push({
    name: "teste-hud",
    title: "Oficina Tática [HUD]",
    icon: "fa-solid fa-microchip",
    button: true,
    onClick: () => toggleHud()
  });
});
