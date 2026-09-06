# Teste-Hud

Módulo limpo para prototipar e testar interfaces e HUDs no Foundry VTT v13 sem precisar mexer no projeto principal.

## Estrutura da Pasta

```
teste-hud/
├── module.json         # Manifesto v13
├── package-zip.ps1     # Script para gerar o .zip de instalação
├── scripts/
│   └── main.js         # Aplicação ApplicationV2, hooks e API pública
├── styles/
│   └── hud.css         # CSS da sua interface/HUD
└── templates/
    └── hud.hbs         # Template Handlebars da interface
```

## Como Usar no Foundry

1. **Ativar o Módulo:** Ative o módulo `Teste-Hud` no seu mundo do Foundry VTT.
2. **Abrir a Interface:**
   - Clique no ícone de frasco (`fa-flask`) nas ferramentas de **Token** da barra de controle esquerda.
   - Ou execute no console (F12) / Macro:
     ```javascript
     game.modules.get("teste-hud").api.toggle();
     ```
3. **Testar Modificações:**
   - Altere `templates/hud.hbs` com o HTML desejado.
   - Altere `styles/hud.css` com as cores, posições e visual.
   - Recarregue o Foundry (`F5`) para ver o resultado.
