# Teste-Hud // Trilogia Tática para Foundry VTT v13

Módulo de alta fidelidade visual e imersão militar contendo 3 consoles de bordo totalmente funcionais e complementares:

1. **Oficina Tática [МАСТЕРСКАЯ]:** Console de bancada e manutenção com matriz de 15 dials de telemetria, circuito de relés interativos, analisador de espectro de áudio e 8 retículos giroscópicos.
2. **Navegação Marciana [火星 NAVIGATION]:** Central cartográfica e topográfica em octógono com 14 curvas de nível em relevo, radar polar, rastreamento de vetor do Rover em direção ao alvo `WORKSHOP` (54.3 KM), matriz de diagnóstico, sistema de coordenadas e radar tático secundário.
3. **Análise Genômica e DNA [DNA ANALYSIS]:** Laboratório de biotecnologia militar com simulação 3D procedural da dupla-hélice em Canvas a 60 FPS com anéis vazados (vesículas/donuts), degraus em colunas de micro-beads, cauda com desbobinamento molecular, feixe laser dourado de varredura com emissão de faíscas quânticas, malha neural 3D em wireframe, matrizes de códons e contagem celular de alta densidade.

---

## Como Abrir no Foundry VTT (Macros de Script)

Crie uma **Macro de Script** no Foundry VTT para o console desejado:

### 1. Abrir Análise Genômica & DNA
```javascript
game.modules.get("teste-hud").api.openDna();
```
*(Ou use `game.modules.get("teste-hud").api.toggleDna();`)*

### 2. Abrir Navegação Marciana
```javascript
game.modules.get("teste-hud").api.openNavegacao();
```
*(Ou use `game.modules.get("teste-hud").api.toggleNavegacao();`)*

### 3. Abrir Oficina Tática
```javascript
game.modules.get("teste-hud").api.openOficina();
```
*(Ou use `game.modules.get("teste-hud").api.toggleOficina();`)*

---

## Estrutura de Arquivos

```
teste-hud/
├── module.json            # Manifesto v13 (v1.3.1)
├── package-zip.ps1        # Script para gerar os pacotes .zip
├── scripts/
│   ├── main.js            # Aplicações ApplicationV2 (Oficina, Navegação, DNA)
│   └── sound-fx.js        # Sintetizador procedural de áudio Web Audio API
├── styles/
│   ├── hud.css            # Estilos da Oficina Tática
│   ├── navigation.css     # Estilos da Navegação Marciana
│   └── dna.css            # Estilos da Análise de DNA
└── templates/
    ├── hud.hbs            # Template da Oficina Tática
    ├── navigation.hbs     # Template da Navegação Marciana
    └── dna.hbs            # Template da Análise de DNA
```
