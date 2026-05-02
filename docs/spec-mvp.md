# Spec MVP - CortaCAD

## 1. Objetivo

Construir um MVP desktop que prove o fluxo principal do CortaCAD:

1. criar um projeto local;
2. desenhar um contorno 2D simples;
3. transformar esse contorno em uma parede com altura e espessura;
4. visualizar o resultado em 3D;
5. exportar um STL valido para abrir em um slicer.

O MVP nao tenta ser um CAD completo. Ele deve validar o valor central do produto: criar cortadores simples para impressao 3D com menos atrito que Fusion, FreeCAD ou Blender.

## 2. Stack Recomendada

### 2.1 Aplicacao desktop

- Tauri
- React
- TypeScript
- Vite

Motivo: o produto e desktop-first, precisa lidar bem com arquivos locais e deve ter uma UI rica com toolbar, paineis, inspetor, viewport e dialogs. React acelera a interface; Tauri mantem o app leve e permite backend nativo em Rust.

### 2.2 Core

- Rust
- crates internas separadas por responsabilidade

Estrutura sugerida:

```txt
apps/desktop
  src/
  src-tauri/

crates/core
  project model
  command model
  validation

crates/geometry
  sketch entities
  profile detection
  offset
  extrusion mesh generation

crates/export
  STL export
```

### 2.3 Renderizacao

MVP:

- 2D sketch: Canvas no frontend
- 3D preview: Three.js
- geometria/exportacao: Rust

Nao usar `wgpu + egui/eframe` no MVP. Essa stack pode ser boa no futuro, mas aumenta o custo inicial de UI e infraestrutura antes de validar o produto.

## 3. Escopo do MVP

### 3.1 Dentro do MVP

- criar novo projeto;
- salvar projeto em JSON;
- abrir projeto salvo;
- uma peca por projeto;
- plano XY;
- unidades em mm;
- viewport 2D com pan e zoom;
- grid visual;
- snap simples no grid;
- ferramenta polyline;
- ferramenta retangulo;
- apagar entidade selecionada;
- undo/redo basico;
- detectar contorno fechado simples;
- gerar parede a partir de contorno fechado;
- configurar altura da parede;
- configurar espessura da parede;
- preview 3D simples;
- exportar STL;
- mostrar erro quando nao houver contorno fechado valido.

### 3.2 Fora do MVP

- multiplas pecas;
- multiplos planos;
- importacao de imagem;
- spline/bezier;
- arco;
- trim;
- fillet/chamfer;
- constraints parametricas;
- timeline estilo Fusion;
- boolean 3D;
- 3MF;
- DXF;
- IA;
- login/cloud;
- colaboracao;
- renderizacao realista.

## 4. Fluxo Principal

1. Usuario abre o app.
2. Usuario cria um projeto novo.
3. App mostra viewport 2D no plano XY.
4. Usuario desenha um contorno com polyline ou retangulo.
5. Usuario fecha o contorno.
6. Usuario clica em "Gerar cortador".
7. App mostra painel com:
   - altura;
   - espessura;
   - lado do offset: centro, interno ou externo.
8. Usuario confirma.
9. App gera malha 3D.
10. Usuario alterna para preview 3D.
11. Usuario exporta STL.
12. STL abre corretamente em OrcaSlicer, Cura ou PrusaSlicer.

## 5. UI do MVP

### 5.1 Layout

```txt
┌──────────────────────────────────────────────┐
│ Top bar: Novo | Abrir | Salvar | Exportar STL │
├───────────────┬──────────────────────┬───────┤
│ Toolbar       │ Viewport 2D/3D        │ Painel│
│ Select        │                      │ Props │
│ Polyline      │                      │       │
│ Retangulo     │                      │       │
│ Gerar cortador│                      │       │
└───────────────┴──────────────────────┴───────┘
```

### 5.2 Modos

- Sketch: desenhar e editar 2D.
- Preview: visualizar malha 3D.
- Export: validar e exportar STL.

No MVP, esses modos podem ser abas ou botoes segmentados. Nao precisa timeline.

### 5.3 Propriedades

Quando uma entidade estiver selecionada:

- tipo;
- pontos;
- comprimento aproximado;
- botao apagar.

Quando houver cortador gerado:

- altura;
- espessura;
- contagem de vertices;
- contagem de faces;
- status de validade.

## 6. Modelo de Dados

Formato inicial em JSON:

```json
{
  "version": 1,
  "units": "mm",
  "projectName": "Meu cortador",
  "sketch": {
    "plane": "XY",
    "entities": []
  },
  "operations": [],
  "meshes": []
}
```

Entidades iniciais:

```json
{
  "id": "entity_1",
  "type": "polyline",
  "points": [
    { "x": 0, "y": 0 },
    { "x": 40, "y": 0 },
    { "x": 40, "y": 40 },
    { "x": 0, "y": 40 }
  ],
  "closed": true
}
```

Operacao inicial:

```json
{
  "id": "op_1",
  "type": "cookie_cutter_wall",
  "sourceEntityId": "entity_1",
  "heightMm": 15,
  "wallThicknessMm": 1.2,
  "offsetSide": "center"
}
```

## 7. Contratos Frontend/Core

O frontend nao deve implementar geometria pesada. Ele pode renderizar e coletar input, mas as operacoes que definem resultado imprimivel devem passar pelo Rust core.

### 7.1 Comandos minimos

```ts
type CoreCommand =
  | { type: "validate_closed_profile"; entityId: string }
  | { type: "generate_wall_mesh"; entityId: string; heightMm: number; wallThicknessMm: number; offsetSide: "center" | "inside" | "outside" }
  | { type: "export_stl"; meshId: string; outputPath: string };
```

### 7.2 Respostas minimas

```ts
type CoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };
```

Erros devem ser exibiveis na UI sem stack trace.

## 8. Implementacao por Fases

### Fase 0 - Bootstrap

Entregaveis:

- monorepo criado;
- app Tauri abre janela;
- React renderiza layout base;
- Rust workspace com `core`, `geometry` e `export`;
- comando simples Tauri <-> Rust funcionando.

Checklist:

- `pnpm dev` abre app;
- comando ping retorna do Rust para o frontend;
- build Rust passa.

### Fase 1 - Sketch 2D ✅

Entregaveis:

- [x] viewport 2D com pan/zoom;
- [x] grid;
- [x] snap no grid;
- [x] polyline;
- [x] retangulo com preview e confirmacao;
- [x] selecao simples;
- [x] selecao por linha alem de ponto;
- [x] selecao retangular multipla com preview;
- [x] apagar entidade;
- [x] undo/redo basico.

Checklist:

- [x] desenhar retangulo fechado;
- [x] desenhar polyline fechada;
- [x] selecionar entidade clicando na linha;
- [x] arrastar area de selecao e selecionar multiplas entidades;
- [x] apagar entidade selecionada;
- [x] desfazer e refazer desenho.

### Fase 2 - Projeto Local ✅

Entregaveis:

- [x] novo projeto;
- [x] salvar JSON com dialogo Tauri;
- [x] abrir JSON com dialogo Tauri;
- [x] manter unidades em mm;
- [x] importar imagem de referencia PNG/JPG com dialogo Tauri;
- [x] mover imagem no viewport;
- [x] redimensionar por arraste de alça de canto;
- [x] espelhar horizontal/vertical;
- [x] escala por referencia (traçar linha + definir tamanho real);
- [x] opacidade configurável no painel.

Checklist:

- [x] criar projeto;
- [x] desenhar contorno;
- [x] salvar;
- [x] fechar app;
- [x] abrir app;
- [x] carregar projeto com contorno intacto.

### Fase 3 - Parede e Malha ✅

Entregaveis:

- [x] validar contorno fechado simples;
- [x] gerar offset 2D real (interno/externo/central);
- [x] gerar parede com altura e espessura seguindo o contorno;
- [x] criar malha triangular fechada (topo, fundo, paredes interna/externa).

Checklist:

- [x] retangulo 40 x 40 mm gera parede valida (16 vertices, 32 triangulos);
- [x] polyline fechada simples gera parede valida;
- [x] contorno aberto retorna erro claro;
- [x] altura e espessura alteram a malha corretamente;
- [x] offset centralizado gera paredes interna e externa;
- [x] offset interno gera parede dentro do contorno;
- [x] offset externo gera parede fora do contorno.

### Fase 4 - Preview 3D ✅

Entregaveis:

- [x] Three.js renderiza malha;
- [x] orbit/pan/zoom;
- [x] vista top/isometrica simples;
- [x] alternar wireframe/solid.

Checklist:

- [x] malha aparece sem ficar preta/branca em branco;
- [x] orbit funciona;
- [x] preview atualiza ao alterar altura/espessura.

### Fase 5 - Export STL ✅

Entregaveis:

- [x] exportar STL binario ou ASCII;
- [x] escolher caminho de saida com dialogo Tauri;
- [x] validar malha antes da exportacao;
- [x] mostrar erro quando nao houver malha valida.

Checklist:

- [ ] STL abre no OrcaSlicer, Cura ou PrusaSlicer;
- [ ] unidade interpretada como mm;
- [ ] malha nao tem buracos visiveis;
- [ ] arquivo exportado corresponde ao preview.

## 9. Riscos Tecnicos

### 9.1 Offset 2D

Maior risco do MVP. Comecar aceitando apenas contornos simples sem auto-intersecao. Nao tentar resolver todos os casos de CAD no inicio.

### 9.2 Perfil fechado

No MVP, aceitar fechamento explicito da polyline e retangulos nativos. Deteccao automatica de perfis compostos por varias entidades fica para depois.

### 9.3 Precisao numerica

Usar tolerancias documentadas. Evitar comparar floats com igualdade exata.

### 9.4 Exportacao STL

Validar orientacao de faces, normais e fechamento da malha antes de considerar a fase concluida.

## 10. Criterio de Pronto do MVP

O MVP esta pronto quando:

- o app roda no Linux;
- usuario consegue desenhar um contorno simples;
- usuario consegue gerar uma parede com altura e espessura;
- preview 3D mostra o cortador;
- export STL funciona;
- STL abre em slicer real;
- projeto pode ser salvo e aberto;
- erros comuns aparecem na UI de forma compreensivel.

## 11. Nao Negociaveis

- Geometria imprimivel fica no Rust, nao espalhada no React.
- O MVP deve priorizar o fluxo real de cortador, nao virar CAD generico.
- Cada fase precisa terminar com validacao manual clara.
- Nao adicionar IA antes do fluxo manual estar funcionando.
- Nao adicionar `wgpu + egui` antes de existir dor real de performance ou manutencao no viewport web.
