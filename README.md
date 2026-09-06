# Teste-Hud // Tetralogia Tática para Foundry VTT v13

Módulo de alta fidelidade visual e imersão militar contendo 4 consoles de bordo totalmente funcionais e complementares:

1. **Oficina Tática [МАСТЕРСКАЯ]:** Console de bancada e manutenção com matriz de 15 dials de telemetria, circuito de relés interativos, analisador de espectro de áudio e 8 retículos giroscópicos.
2. **Navegação Marciana [火星 NAVIGATION]:** Central cartográfica e topográfica em octógono com 14 curvas de nível em relevo, radar polar, rastreamento de vetor do Rover em direção ao alvo `WORKSHOP` (54.3 KM), matriz de diagnóstico, sistema de coordenadas e radar tático secundário.
3. **Análise Genômica e DNA [DNA ANALYSIS]:** Laboratório de biotecnologia com dupla-hélice 3D procedural, 38 degraus de pares de base nitrogenadas, esqueleto contínuo de fitas, anéis de crista vazados, feixe laser dourado com varredura contínua e faíscas quânticas ao contato.
4. **Núcleo do Reator // Fusão Quântica [REACTOR CORE // ANALYSING DATA]:** Console de contenção de plasma e aceleração quântica com simulação 3D explodida do reator cilíndrico (10 estágios completos: bocal injetor com bobinas de cobre, anel estator dentado, discos de compressão, flange segmentada, coração de plasma incandescente com filamentos de fogo e partículas móveis, anéis gêmeos de bisel ciano, estator acelerador com escudos orbitais em arco, rotor de turbina radial e tubo de escape), retículo gimbal HUD em 3D, visualizador molecular 3D `ATOM_VIEW`, monitor de temperatura digital `83.29°`, matriz de radiação e espectro de áudio.

---

## Como Abrir no Foundry VTT (Macros de Script)

Crie uma **Macro de Script** no Foundry VTT para o console desejado:

### 1. Abrir Núcleo do Reator // Fusão Quântica
```javascript
game.modules.get("teste-hud").api.openReactor();
```
*(Ou use `game.modules.get("teste-hud").api.toggleReactor();` ou `api.openCore();`)*

### 2. Abrir Análise Genômica & DNA
```javascript
game.modules.get("teste-hud").api.openDna();
```
*(Ou use `game.modules.get("teste-hud").api.toggleDna();`)*

### 3. Abrir Navegação Marciana
```javascript
game.modules.get("teste-hud").api.openNavegacao();
```
*(Ou use `game.modules.get("teste-hud").api.toggleNavegacao();`)*

### 4. Abrir Oficina Tática
```javascript
game.modules.get("teste-hud").api.openOficina();
```
*(Ou use `game.modules.get("teste-hud").api.toggleOficina();`)*

---

## Estrutura de Arquivos

```
teste-hud/
├── module.json            # Manifesto v13 (v1.4.0)
├── package-zip.ps1        # Script para gerar os pacotes .zip
├── scripts/
│   ├── main.js            # Aplicações ApplicationV2 (Oficina, Navegação, DNA, Reator)
│   └── sound-fx.js        # Sintetizador procedural de áudio Web Audio API
├── styles/
│   ├── hud.css            # Estilos da Oficina Tática
│   ├── navigation.css     # Estilos da Navegação Marciana
│   ├── dna.css            # Estilos da Análise de DNA
│   └── reactor.css        # Estilos do Núcleo do Reator
└── templates/
    ├── hud.hbs            # Template da Oficina Tática
    ├── navigation.hbs     # Template da Navegação Marciana
    ├── dna.hbs            # Template da Análise de DNA
    └── reactor.hbs        # Template do Núcleo do Reator
```
