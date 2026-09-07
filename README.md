# Teste-Hud // Heptalogia Tática para Foundry VTT v13

Módulo de altíssima fidelidade visual, imersão militar e ficção científica avançada, contendo 7 consoles operacionais e cenográficos totalmente independentes para Foundry VTT v13 (construídos sobre `ApplicationV2` e renderização procedural Canvas 2D a 60 FPS):

---

## Os 7 Consoles Táticos

### 1. Oficina Tática [МАСТЕРСКАЯ]
- **Bancada de Verificação e Manutenção:** Matriz de 15 dials circulares de telemetria rotativa.
- **Painel de Controle de Relés:** Comutadores interativos com feedback de áudio procedural analógico.
- **Forma de Onda de Áudio & Pinouts:** 36 pinos de estado lógico e analisador de espectro militar.
- **8 Retículos Giroscópicos:** Miras com arcos graduados e leituras angulares independentes.

### 2. Navegação Marciana [火星 NAVIGATION]
- **Central Cartográfica Octogonal:** 14 curvas de nível em relevo topográfico com altitude dinâmica.
- **Vetor de Deslocamento do Rover:** Trajetória em tempo real em direção ao alvo `WORKSHOP` (54.3 KM).
- **Radar Polar & Diagnóstico:** Análise de terreno, bússola de azimute e sistema de coordenadas planetárias.

### 3. Análise Genômica e DNA [DNA ANALYSIS]
- **Dupla-Hélice 3D de Ultra-Densidade:** 64 degraus frisados compostos por micro-pérolas moleculares.
- **Coroas de Anéis Vesiculares:** Anéis concêntricos nas cristas superior e inferior da hélice.
- **Cauda Fractal Ramificada:** Desdobramento orgânico com nós de constrição molecular real.
- **Plexo Molecular Tridimensional:** 140 nós 3D interligados por facetas translúcidas.
- **Scanner Laser Dourado Contínuo:** Excitação luminescente com emissão de faíscas dinâmicas.

### 4. Núcleo do Reator // Fusão Quântica [REACTOR CORE]
- **Simulação Volumétrica Explodida 3D:** 10 estágios mecânicos com enrolamentos de cobre e bocal injetor.
- **Câmara Tokamak:** 32 nervuras longitudinais, 7 anéis equatoriais e vórtice de plasma incandescente.
- **Retículo HUD 360° Circular:** Bússola técnica de fundo com graduações milimétricas.
- **Nuvem de 350 Micro-Partículas:** Poeira quântica holográfica e analisador molecular `ATOM_VIEW`.

### 5. Topologia 3D de Dados & Grafo Alluvial [DATA TOPOLOGY] *(Novo na v1.5.0)*
- **3 Visualizadores Holográficos Centrais:**
  - **Coluna 1 (Poliedro Irregular 3D):** Rede de 28 nós tridimensionais interconectados por arestas dinâmicas de distância variável, pulso orgânico e poeira espacial.
  - **Coluna 2 (Torus Paramétrico):** Vórtice toroidal de 64 pontos com rotação biaxial e filamentos de entrelaçamento dourado e ciano.
  - **Coluna 3 (Esfera Geodésica & Radar):** Globo de coordenadas latitude/longitude com retículo concêntrico e feixe de varredura laser vertical.
- **Grafo Alluvial / Sankey de Conexões Relacionais:**
  - 16 nós de origem à esquerda e 16 nós de destino à direita interligados por 24 splines cúbicas de Bezier trançadas.
  - Mais de 40 pacotes de fótons luminosos que viajam continuamente pelas curvas a 60 FPS.
- **Telemetria de Alta Densidade:** Matriz de dados tabulares `DATA_CHARTS`, barra de LEDs âmbar `10_2414 23.2` e 4 barras de progresso segmentadas horizontais.

### 6. Colisor Quântico // Íris Holográfica [COLLIDER HUD] *(Novo na v1.5.0)*
- **Acelerador Central de Partículas & Íris Mecânica:**
  - Núcleo de fusão com plasma pulsante e 16 lâminas de íris em rotação mecânica lenta.
  - 4 anéis concêntricos de telemetria com marcas de precisão angular e vernier militar.
  - Envelope harmônico ondulante em flor (curva flutuante sinusoidal).
  - Mais de 180 partículas relativísticas em órbita com caudas de luminosidade e colisões estocásticas energéticas.
  - Linhas de chamada holográficas com pílulas de dados `PRAVO` e `BRAVO [POINT_DATA_NODE]` e retículos de anomalia laranja `(O)`.
- **Monitor Térmico Digital CORE TEMP 89.02°:**
  - Display térmico digital de alta voltagem com oscilação orgânica.
  - Espectro equalizador de barras verticais e analisador óptico `// VISUAL ANALYSIS`.
- **Módulos de Controle e Interatividade:**
  - 12 botões interativos `DATA BLOCK` clicáveis com iluminação de status.
  - Mini poliedro 3D wireframe em rotação no canto inferior esquerdo.

### 7. Controle de Missão Orbital // Reconhecimento Marciano [MARS.SATVIEW.17-A] *(Novo na v1.5.0)*
- **Cartografia de Satélite em Relevo Sombreado:**
  - Mapa topográfico do cânion de *Melas Chasma* e planalto de *Sinai Dorsa* (Valles Marineris).
  - Curvas de nível topográficas em ciano neon com detalhe multi-frequência.
  - Varredura de radar orbital contínua com expansão de ondas em fósforo ciano.
- **Vetor Tático Base Camp <-> Daedalus:**
  - Retículos alvos interligados por vetor de alcance em laranja/âmbar com pulsos dinâmicos de rádio.
  - Círculo de alcance geodésico e cartões de telemetria individuais para cada base.
- **Display Proeminente de Distância:**
  - Cartão central em ciano com visor numérico grande `75.3 KM` e micro-deriva de telemetria.
- **Painéis Orbitais de Suporte:**
  - Tabela lateral com 21 sondas de superfície (`ENGAGED ONLINE`, `DELAYED NO STATUS`, `OFFLINE`).
  - Badges de recepção de sinal (`MAR.-EP`, `MAR.-WR`, `MAR.-UV`) e coordenadas equatoriais `WGS84`.

---

## Como Abrir no Foundry VTT (Macros de Script)

Crie uma **Macro de Script** no Foundry VTT para qualquer um dos 7 consoles:

### 1. Abrir Topologia de Dados 3D & Grafo Alluvial
```javascript
game.modules.get("teste-hud").api.openDataTopology();
// Ou use: api.toggleDataTopology(); ou api.openTopology();
```

### 2. Abrir Colisor Quântico & Íris Holográfica
```javascript
game.modules.get("teste-hud").api.openCollider();
// Ou use: api.toggleCollider();
```

### 3. Abrir Reconhecimento Orbital Marciano (MARS.SATVIEW.17-A)
```javascript
game.modules.get("teste-hud").api.openMarsSatview();
// Ou use: api.toggleMarsSatview(); ou api.openSatview();
```

### 4. Abrir Núcleo do Reator // Fusão Quântica
```javascript
game.modules.get("teste-hud").api.openReactor();
```

### 5. Abrir Análise Genômica & DNA
```javascript
game.modules.get("teste-hud").api.openDna();
```

### 6. Abrir Navegação Marciana v1
```javascript
game.modules.get("teste-hud").api.openNavegacao();
```

### 7. Abrir Oficina Tática
```javascript
game.modules.get("teste-hud").api.openOficina();
```

---

## Estrutura de Arquivos

```
teste-hud/
├── module.json                # Manifesto v13 (v1.5.0)
├── package-zip.ps1            # Script para gerar pacotes .zip de distribuição
├── scripts/
│   ├── main.js                # Classes ApplicationV2 dos 7 consoles e registro da API
│   └── sound-fx.js            # Sintetizador procedural de áudio Web Audio API
├── styles/
│   ├── hud.css                # Estilos da Oficina Tática
│   ├── navigation.css         # Estilos da Navegação Marciana v1
│   ├── dna.css                # Estilos da Análise de DNA
│   ├── reactor.css            # Estilos do Núcleo do Reator
│   ├── data-topology.css      # Estilos da Topologia 3D & Grafo Alluvial
│   ├── collider.css           # Estilos do Colisor Quântico & Íris
│   └── mars-satview.css       # Estilos do Reconhecimento Orbital Marciano
└── templates/
    ├── hud.hbs                # Template da Oficina Tática
    ├── navigation.hbs         # Template da Navegação Marciana v1
    ├── dna.hbs                # Template da Análise de DNA
    ├── reactor.hbs            # Template do Núcleo do Reator
    ├── data-topology.hbs      # Template da Topologia 3D & Alluvial
    ├── collider.hbs           # Template do Colisor Quântico
    └── mars-satview.hbs       # Template do Reconhecimento Orbital Marciano
```

---

## Compatibilidade

- **Foundry Virtual Tabletop:** v13 (mínimo `13.341`, verificado `13.351`).
- **Arquitetura:** `foundry.applications.api.ApplicationV2` + `HandlebarsApplicationMixin`.
- **Motor Gráfico:** HTML5 Canvas 2D Procedural de Alta Performance (60 FPS, sem bibliotecas externas pesadas).
- **Proporção:** 16:9 dinâmica e responsiva.
