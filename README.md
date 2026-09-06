# Teste-Hud // Consoles Táticos & Navegação Marciana

Módulo tático e de alta fidelidade visual para Foundry VTT v13, contendo dois consoles militares retrofuturistas complementares:

1. **Oficina Tática [МАСТЕРСКАЯ]:** Console de bancada e manutenção com matriz de 15 dials de telemetria, circuito de relés interativos, analisador de espectro de áudio e 8 retículos giroscópicos.
2. **Navegação Marciana [火星 NAVIGATION]:** Central cartográfica e topográfica em octógono com 14 curvas de nível em relevo, radar polar, rastreamento de vetor do Rover em direção ao alvo `WORKSHOP` (54.3 KM), matriz de diagnóstico, sistema de coordenadas e radar tático secundário.

---

## Como Abrir no Foundry VTT

Abra o console do navegador (`F12`) ou crie uma **Macro de Script**:

### 1. Abrir a Navegação Marciana
```javascript
game.modules.get("teste-hud").api.openNavegacao();
```
*(Ou use `game.modules.get("teste-hud").api.toggleNavegacao();`)*

### 2. Abrir a Oficina Tática
```javascript
game.modules.get("teste-hud").api.openOficina();
```
*(Ou use `game.modules.get("teste-hud").api.toggleOficina();`)*

> **Integração Cruzada:** No Console de Navegação, clicar no alvo **`WORKSHOP`** ou no botão **`SISTEMA`** do menu abre diretamente o Console da Oficina!

---

## Estrutura de Arquivos

```
teste-hud/
├── module.json            # Manifesto v13 (v1.2.0)
├── package-zip.ps1        # Script para gerar os pacotes .zip
├── scripts/
│   ├── main.js            # Aplicações ApplicationV2 e API pública
│   └── sound-fx.js        # Sintetizador procedural de áudio Web Audio API
├── styles/
│   ├── hud.css            # Estilos da Oficina Tática
│   └── navigation.css     # Estilos da Navegação Marciana
└── templates/
    ├── hud.hbs            # Template da Oficina Tática
    └── navigation.hbs     # Template da Navegação Marciana
```
