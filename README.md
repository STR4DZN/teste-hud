# Teste-Hud // Tetralogia Tática para Foundry VTT v13

Módulo de alta fidelidade visual e imersão militar contendo 4 consoles de bordo totalmente funcionais e complementares:

1. **Oficina Tática [МАСТЕРСКАЯ]:** Console de bancada e manutenção com matriz de 15 dials de telemetria, circuito de relés interativos, analisador de espectro de áudio e 8 retículos giroscópicos.
2. **Navegação Marciana [火星 NAVIGATION]:** Central cartográfica e topográfica em octógono com 14 curvas de nível em relevo, radar polar, rastreamento de vetor do Rover em direção ao alvo `WORKSHOP` (54.3 KM), matriz de diagnóstico, sistema de coordenadas e radar tático secundário.
3. **Análise Genômica e DNA [DNA ANALYSIS] (v1.4.2 - Hiper-Detalhado):** Laboratório de biotecnologia com dupla-hélice 3D procedural de ultra-densidade:
   - **64 Degraus de Pares de Bases Frisados:** Cada degrau renderizado como coluna vertical de 13 micro-pérolas luminosas com gradiente ciano-turquesa profundo.
   - **Coroas de Anéis Vesiculares (Donuts) Completas:** Anéis vesiculares concêntricos com miolo espesso, reflexo perolado e satélites orbitantes renderizados simultaneamente em ambas as cristas superior e inferior da hélice.
   - **Nós de Constrição e Torção:** Micro-pérolas nos eixos nodais centrais simulando compressão molecular real.
   - **Cauda Fractal Ramificada Orgânica:** Extremidade direita desfazendo-se organicamente em 3 filamentos ramificados com pérolas decrescentes (eliminando o padrão artificial anterior).
   - **Plexo Molecular Expansivo:** Rede molecular de fundo com 140 nós 3D, conexões intermoleculares de 65px e facetas triangulares translúcidas.
   - **Scanner Laser Dourado Contínuo:** Varredura laser com excitação luminescente em branco/dourado incandescente e emissão de faíscas dinâmicas.
4. **Núcleo do Reator // Fusão Quântica [REACTOR CORE // ANALYSING DATA] (v1.4.1 - Hiper-Detalhado):** Console de contenção de plasma e aceleração quântica com simulação 3D volumétrica explodida de altíssima densidade no HTML5 Canvas:
   - **10 Estágios Mecânicos Ricos:** Bocal injetor frontal com enrolamentos longitudinais de cobre e presilhas C-brackets, estator dentado de indexação, disco de compressão frontal com matriz de agulhas e raios, flange com tirantes de ligação, câmara Tokamak com 32 nervuras longitudinais, 7 anéis equatoriais, tubos de resfriamento em S com terminais e vórtice incandescente de plasma, anéis gêmeos chanfrados com profundidade volumétrica e bore interno, volante acelerador gigante com recortes em setor, pente de 72 dentes de engrenagem e sapatas de freio em arco, estator perfurado intermediário, solenoide traseiro de cobre, rotor impulsor com palhetas curvas e bocal cônico de exaustão com spray de plasma.
   - **Retículo HUD Circular Gigante ao Fundo:** Bússola técnica de 360° com graduações de 2 em 2 graus, miras em cruz radiais, suportes de canto e matrizes de pontos técnicos.
   - **Nuvem Volumétrica de 350 Micro-Partículas:** Poeira quântica holográfica e linhas de fluxo magnético contínuas.
   - **Visualizador Molecular 3D `ATOM_VIEW`:** Modelo atômico orbital contínuo.
   - **Monitor Digital de Temperatura e Radiação:** Painel térmico com flutuações e matriz de verificação de radiação.

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
├── module.json            # Manifesto v13 (v1.4.2)
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
