const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * TesteHudApp — Console da Oficina Tática (Workshop Module HUD)
 * Reconstrução em alta fidelidade da interface militar sci-fi para Foundry VTT v13.
 */
export class TesteHudApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "teste-hud-app",
    classes: ["teste-hud-window"],
    position: {
      width: 1440,
      height: 860
    },
    window: {
      title: "OFICINA TÁTICA // MÓDULO DE VERIFICAÇÃO DE SISTEMA [МАСТЕРСКАЯ]",
      icon: "fa-solid fa-microchip",
      resizable: true
    },
    actions: {
      toggleRelay: TesteHudApp.#onToggleRelay,
      togglePin: TesteHudApp.#onTogglePin
    }
  };

  static PARTS = {
    main: {
      template: "modules/teste-hud/templates/hud.hbs"
    }
  };

  constructor(options = {}) {
    super(options);

    // Estado interno reativo dos relés e circuitos
    this.relays = {
      asd: false,
      pod: true,       // Ativo por padrão como na imagem
      ptu: true,       // Semi-automático
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

    // Estado dos sliders manuais SYS-01 e SYS-02
    this.sys1 = { channelA: 65, channelB: 45 };
    this.sys2 = { channelA: 55, channelB: 70 };

    // Estado dos LEDs dos 36 pinouts
    this.pinStates = new Map();
    this._initPinStates();

    // Estado dos 15 dials
    this.activeDialId = "dial-3";
  }

  _initPinStates() {
    // Configura os 36 pinouts com LEDs acesos padrão conforme referência visual
    const defaultActivePins = new Set([
      "lt-90", "lt-80", "lt-70", "lt-60", "lt-50", "lt-40", "lt-30", "lt-20", "lt-10",
      "lb-90", "lb-80", "lb-70", "lb-60", "lb-50", "lb-40", "lb-30", "lb-20", "lb-10",
      "rt-10", "rt-20", "rt-30", "rt-40", "rt-50", "rt-60", "rt-70", "rt-80", "rt-90",
      "rb-10", "rb-20", "rb-30", "rb-40", "rb-50", "rb-60", "rb-70", "rb-80", "rb-90"
    ]);

    for (const pin of defaultActivePins) {
      this.pinStates.set(pin, true);
    }
  }

  async _prepareContext(options) {
    // 1. Gera os 15 mostradores circulares (3x5)
    const dialCodes = [
      { id: "dial-1",  code: "5691712", val: "58.55", angle: 45 },
      { id: "dial-2",  code: "3465255", val: "63.44", angle: 120 },
      { id: "dial-3",  code: "5594529", val: "82.63", angle: 210, isActive: true },
      { id: "dial-4",  code: "3712665", val: "41.12", angle: 300 },
      { id: "dial-5",  code: "2459872", val: "77.01", angle: 90 },

      { id: "dial-6",  code: "5278482", val: "14.22", angle: 15 },
      { id: "dial-7",  code: "3515518", val: "29.50", angle: 160 },
      { id: "dial-8",  code: "4598721", val: "93.18", angle: 275 },
      { id: "dial-9",  code: "6234190", val: "68.40", angle: 35 },
      { id: "dial-10", code: "7124312", val: "55.33", angle: 180 },

      { id: "dial-11", code: "8411295", val: "34.19", angle: 60 },
      { id: "dial-12", code: "9104041", val: "72.84", angle: 220 },
      { id: "dial-13", code: "1258410", val: "88.10", angle: 315 },
      { id: "dial-14", code: "4713912", val: "61.22", angle: 105 },
      { id: "dial-15", code: "8394014", val: "49.05", angle: 195 }
    ];

    // 2. Barras da Forma de Onda (Waveform Candlesticks)
    const waveformBars = [];
    const heights = [
      18, 26, 32, 22, 14, 28, 42, 54, 38, 29,
      46, 58, 62, 48, 35, 24, 39, 52, 41, 28,
      19, 31, 44, 36, 25, 17, 33, 49, 37, 21
    ];

    for (let i = 0; i < heights.length; i++) {
      waveformBars.push({
        height: heights[i],
        peak: heights[i] + 4
      });
    }

    // 3. Pinouts (2 matrizes de 18 pinos)
    const pinValues = [90, 80, 70, 60, 50, 40, 30, 20, 10];
    const pinoutsLeftTop = pinValues.map(v => ({
      id: `lt-${v}`,
      val: v,
      isActive: this.pinStates.get(`lt-${v}`) ?? true
    }));

    const pinoutsLeftBottom = pinValues.map(v => ({
      id: `lb-${v}`,
      val: v,
      isActive: this.pinStates.get(`lb-${v}`) ?? true
    }));

    const pinValuesRight = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const pinoutsRightTop = pinValuesRight.map(v => ({
      id: `rt-${v}`,
      val: v,
      isActive: this.pinStates.get(`rt-${v}`) ?? true
    }));

    const pinoutsRightBottom = pinValuesRight.map(v => ({
      id: `rb-${v}`,
      val: v,
      isActive: this.pinStates.get(`rb-${v}`) ?? true
    }));

    // 4. Retículos de Mira (8 retículos)
    const reticles = [
      { id: "r1", coordA: "1112", coordB: "53" },
      { id: "r2", coordA: "0001", coordB: "27" },
      { id: "r3", coordA: "1113", coordB: "27" },
      { id: "r4", coordA: "0002", coordB: "87" },
      { id: "r5", coordA: "1114", coordB: "64" },
      { id: "r6", coordA: "0003", coordB: "01" },
      { id: "r7", coordA: "1115", coordB: "50" },
      { id: "r8", coordA: "0004", coordB: "99" }
    ];

    return {
      dials: dialCodes,
      waveformBars,
      relays: this.relays,
      sys1: this.sys1,
      sys2: this.sys2,
      pinoutsLeftTop,
      pinoutsLeftBottom,
      pinoutsRightTop,
      pinoutsRightBottom,
      reticles
    };
  }

  _onRender(context, options) {
    super._onRender?.(context, options);

    // Adiciona interatividade aos Dials Circulares
    const dialElements = this.element.querySelectorAll(".tactical-dial-node");
    dialElements.forEach(el => {
      el.addEventListener("click", () => {
        dialElements.forEach(d => d.classList.remove("is-active"));
        el.classList.add("is-active");

        const needle = el.querySelector(".dial-core-dot");
        if (needle) {
          const newAngle = Math.floor(Math.random() * 360);
          needle.style.transform = `rotate(${newAngle}deg) translate(0, -9px)`;
        }

        const id = el.getAttribute("data-dial-id");
        this.activeDialId = id;
      });
    });

    // Adiciona interatividade aos Retículos
    const reticleNodes = this.element.querySelectorAll(".reticle-unit-node");
    reticleNodes.forEach(rn => {
      rn.addEventListener("click", () => {
        rn.classList.add("is-locked");
        setTimeout(() => rn.classList.remove("is-locked"), 500);

        const id = rn.getAttribute("data-reticle-id");
        ui.notifications?.info(`Mira Tática ${id.toUpperCase()}: Alvo sincronizado.`);
      });
    });
  }

  // Ações de Comutação dos Relés
  static #onToggleRelay(event, target) {
    const relay = target.dataset.relay;
    if (!relay || this.relays[relay] === undefined) return;

    this.relays[relay] = !this.relays[relay];
    this.render(false);
  }

  // Ações de Comutação dos LEDs dos Pinouts
  static #onTogglePin(event, target) {
    const pin = target.dataset.pin;
    if (!pin) return;

    const current = this.pinStates.get(pin) ?? false;
    this.pinStates.set(pin, !current);
    this.render(false);
  }
}

// Instância única para reuso
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

// Inicialização no Foundry VTT
Hooks.once("init", () => {
  console.log("Teste-Hud | Inicializando Console Tático da Oficina...");

  game.modules.get("teste-hud").api = {
    open: openHud,
    close: closeHud,
    toggle: toggleHud,
    getApp: getHudApp
  };
});

// Adiciona botão na barra de ferramentas de Token
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
