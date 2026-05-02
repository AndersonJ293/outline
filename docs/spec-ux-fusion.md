# Spec — UX estilo Fusion (Fase 6 do PRD)

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ CortaCAD  [Arquivo ▼]                   [─] [□] [×]    │  <- Topbar (atual)
├──────────────────────────────────────────────────────────┤
│   [Sketch]    [Solid]    [Export]                       │  <- Abas de modo (nova)
├──────────┬───────────────────────────────┬──────────────┤
│          │                               │              │
│ Toolbar  │       Viewport                │  Painel      │
│ lateral  │       2D / 3D                 │  lateral     │
│          │                               │  (só aparece │
│ [➤] [✎]  │                               │  qnd algo    │
│ [▭] [IMG]│                               │  selecionado)│
│          │                               │              │
│ ───────  │                               │              │
│ [↩] [↪]  │                               │              │
├──────────┴───────────────────────────────┴──────────────┤
│ Status bar                                              │
└─────────────────────────────────────────────────────────┘
```

## O que muda

- Topbar existente permanece igual (CortaCAD, Arquivo, window controls)
- Abas de viewport internas ("2D Sketch" / "3D Preview") saem
- Nova barra de abas abaixo da topbar: **Sketch**, **Solid**, **Export**
- Cada aba define o conteudo do viewport e as ferramentas da toolbar lateral
- Painel lateral direito existe mas **só fica visivel quando algo está selecionado** (entidade, imagem, malha)

## Cada aba

### Sketch
- Viewport: Canvas 2D
- Toolbar: selecionar, polyline, retangulo, importar imagem
- Painel (qnd selecionado): propriedades da entidade/imagem, gerar cortador

### Solid
- Viewport: Three.js 3D
- Toolbar: (vazia por enquanto, futuros gizmos)
- Painel (qnd selecionado): info da malha, wireframe toggle, exportar STL

### Export
- Viewport: Three.js 3D (mesmo do Solid)
- Toolbar: (vazia)
- Painel: opcoes de exportacao, validacao, botao exportar

## Detalhes tecnicos

- `viewMode` atual (`"sketch" | "preview"`) vira `"sketch" | "solid" | "export"`
- Aba ativa destacada visualmente (underline ou fundo diferente)
- Transicao suave entre modos
- Painel lateral direito: `display: none` quando `selectedEntityIds.length === 0` e `currentMesh === null`

## Requisitos funcionais

- [ ] RF1: Topbar inalterada (CortaCAD, Arquivo, window controls)
- [ ] RF2: Abas Sketch / Solid / Export abaixo da topbar
- [ ] RF3: Aba Sketch mostra canvas 2D com ferramentas de desenho
- [ ] RF4: Aba Solid mostra preview 3D com controles de malha
- [ ] RF5: Aba Export mostra preview 3D com opcoes de STL
- [ ] RF6: Painel lateral direito invisivel quando nada selecionado
- [ ] RF7: Aba ativa visualmente destacada
- [ ] RF8: `Ctrl+1` = Sketch, `Ctrl+2` = Solid, `Ctrl+3` = Export

## Fora de escopo

- Customizacao de toolbar pelo usuario
- Abas de multiplos documentos
- Timeline
- Gizmos 3D

## Criterio de sucesso

1. Abas trocam o viewport e as ferramentas corretamente.
2. Painel lateral some quando nada selecionado, aparece quando seleciona algo.
3. Fluxo completo: Sketch (desenhar) → selecionar → Solid (gerar malha, ver 3D) → Export (exportar STL).
4. Design sobrio, sem emojis.
