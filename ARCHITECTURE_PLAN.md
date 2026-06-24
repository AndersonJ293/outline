# CortaCAD — Análise de arquitetura e plano de evolução

> Documento de handoff para o agente que executará o trabalho.
> Data: 2026-06-23 · Branch: `main` · Versão do app: `0.1.0`
>
> **Veredito geral:** o stack está correto. **Não migrar** de framework. O trabalho
> é (1) corrigir a *estratégia* de render 2D e (2) mover a fronteira de geometria
> para o Rust, tornando o 3D reativo ao 2D (paradigma paramétrico estilo Fusion).
>
> **Status 2026-06-23:** Fases 0, 1, 1b, 2, 3a, 3b, 3c, 4 implementadas (branch
> `feat/parametric-rebuild`). Render sob demanda, rebuild paramétrico no Rust,
> canvas em duas camadas, viewport unificado 2D+3D, sketch como wireframe 3D,
> planos de sketch arbitrários (XY/XZ/YZ + face selection), ferramentas 3D
> (seleção, mover, extrusão normal/fin, sidebar por modo).
> Próximas expansões opcionais: Fase 3d (edição paramétrica visual: arrastar
> face → atualizar sketch, cotas/constraints), novos `Operation.type`
> (revolve, pocket, sweep).

---

## 0. Contexto do projeto

CortaCAD (`productName: "Outline"`) é um CAD desktop para corte (CNC/laser/cortador
de massa — "cookie cutter"). Monorepo pnpm.

### Stack atual (e por que está correto)

| Camada | Escolha | Veredito |
|---|---|---|
| Shell desktop | **Tauri 2** | Correto. Binário pequeno, Rust nativo embaixo — habilita o kernel de geometria em Rust, que é a parte difícil de um CAD. |
| UI | **React 18 + TypeScript + Vite** | Padrão, sólido. Sem motivo para trocar. |
| Estado | **Zustand 5** | Ideal — leve, sem boilerplate. |
| 3D | **Three.js 0.170** | Escolha madura e óbvia. |
| 2D sketch | **Canvas 2D context** (`ctx.beginPath/lineTo/stroke`) | Funciona; o teto está na *estratégia de uso*, não na API (ver §1). |
| Core | **crates Rust** (`outline-core`, `geometry`, `export`) | Direção certa, mas **subutilizado** (~850 LOC, só `serde`). |

Tamanho: ~7.600 LOC de frontend, ~850 LOC de Rust.

### Layout relevante do repositório

```
apps/desktop/
  src/
    components/
      Canvas2D.tsx            (622 LOC) — host do canvas 2D, eventos de mouse
      Viewport3D.tsx          (194 LOC) — cena Three.js, renderiza currentMesh
    features/sketch/
      useSketchRenderer.ts    — LOOP de render (rAF) — ALVO Fase 0
      renderSketch.ts         — orquestra o desenho de um frame
      renderEntities.ts       — desenha entidades/handles — ALVO Fase 0
      chains.ts               (325 LOC) — detecção de contornos fechados (grafo)
      hitTest.ts, entityDrag.ts, tools/* — interação, lógica geométrica em TS
    app/
      useCutterActions.ts     — fluxo "gerar cutter" (2D→3D atual) — ALVO Fase 1
    stores/                   — Zustand slices (project, ui, history)
    commands.ts               — bridge invoke() → comandos Tauri
    types.ts                  — DTOs (espelho do Rust)
  src-tauri/src/
    lib.rs                    — comandos Tauri (#[tauri::command])
    commands.rs
crates/
  geometry/src/
    entities.rs               — Point, Entity, is_closed, bounding_box
    offset.rs                 — polygon_signed_area, compute_offset
    mesh.rs                   — generate_wall_mesh, build_wall_mesh
  outline-core/, export/
```

---

## 1. Análise — Teto de performance do render 2D

### Diagnóstico (com evidências)

O render roda num **loop `requestAnimationFrame` incondicional** em
`apps/desktop/src/features/sketch/useSketchRenderer.ts:92-124`:

```ts
const loop = () => {
  renderSketch({ /* ...todo o estado... */ });
  animId = requestAnimationFrame(loop);   // repinta SEMPRE, ~60fps
};
loop();
```

Não há checagem de "algo mudou?". O canvas inteiro é repintado 60×/s **mesmo com
o app ocioso** (sem mouse, sem edição). Três gargalos, em ordem de gravidade:

1. **`computeChains(project)` roda a cada frame** — o pior.
   `renderEntities.ts:12` (dentro de `drawClosedChainFills`) chama
   `computeChains(project)` toda repintura. `chains.ts` tem 325 LOC de cálculo
   topológico de grafo (quais entidades compartilham endpoints → contorno fechado).
   Isso é recomputado 60×/s e jogado fora. Com dezenas de entidades já queima CPU
   com o app parado.

2. **Zero culling de viewport.** `renderEntities.ts:45` itera
   `project.sketch.entities` inteiro e desenha tudo, inclusive o que está fora da
   tela. Custo proporcional ao total de entidades, não ao visível.

3. **Camada única.** Entidades, fills, handles, cursor, snap e preview de drag são
   repintados juntos no mesmo canvas. Mexer o mouse repinta o desenho inteiro só
   para atualizar a posição do cursor.

### Conclusão

O Canvas 2D **não** é o problema; a estratégia de uso é. **Não migrar para WebGL
agora** — corrigir os itens abaixo provavelmente reduz o uso de CPU em ordem de
grandeza e torna a migração desnecessária por muito tempo. Decisão por medição,
não por antecipação.

---

## 2. Análise — Fronteira TS/Rust e paradigma 2D→3D (estilo Fusion)

### Estado atual: imperativo e desacoplado (não paramétrico)

Fluxo do 2D→3D hoje (`apps/desktop/src/app/useCutterActions.ts:52-93`):

1. Usuário seleciona **1** entidade e clica "gerar cutter".
2. Monta uma `Operation` ad-hoc e chama `commands.generateWallMesh(profile, operation)`.
3. Rust (`crates/geometry/src/mesh.rs::generate_wall_mesh`) faz offset + extrusão de
   parede e devolve **um** mesh.
4. `setCurrentMesh(result.mesh)` guarda **um único** mesh no store.

Sintomas (= a queixa "2D e 3D são separados"):

- **Não é reativo.** Editar o sketch depois não afeta o 3D; é preciso reselecionar e
  re-gerar manualmente. O 3D é um *snapshot*, não um resultado vivo do 2D.
- **Um corpo só.** `currentMesh: Mesh | null` (`types.ts:64`, `stores/types.ts:58`) é
  singular, substituído por inteiro.
- **Uma operação só.** `Operation.type` é `string`, mas o único tipo implementado é
  `"cookie_cutter_wall"`. Sem extrude genérico, revolve, etc.

### O osso paramétrico já existe no modelo

`apps/desktop/src/types.ts:3-62`:

```ts
interface Project {
  sketch: Sketch;
  operations: Operation[];     // ← já é uma LISTA
}
interface Operation {
  source_entity_id: string;    // ← já referencia o sketch por id
  ...
}
```

É exatamente o esqueleto de uma timeline do Fusion: lista de features apontando para
a geometria de origem por id. O conceito está modelado; só não é *executado* como DAG
paramétrico. Hoje `operations` nem é percorrido na geração.

### A fronteira de geometria está rachada (dívida que fica cara)

| Em Rust (`crates/geometry`) | Em TS (`features/sketch`) |
|---|---|
| offset (`offset.rs`) | detecção de contorno fechado (`chains.ts`, `closedProfileEntity`) |
| extrusão de parede (`mesh.rs`) | amostragem de spline (`samplingSteps`) |
| área com sinal | hitTest, drag, snap |

Perigo concreto: "o que é um perfil fechado e como vira polígono" é decidido **em TS**,
mas o **Rust precisa exatamente dessa mesma resposta** para gerar mesh. Ao adicionar
revolve/sweep/booleanas/kerf, essa lógica será reimplementada nos dois lados e
divergirá. Decidir a fronteira **agora**, antes de espalhar mais geometria pelo TS.

### Decisão estratégica

> **Rust é dono do documento paramétrico + kernel de geometria + rebuild.
> TS é dono apenas de interação e render.**

Inverter o fluxo:

- **Hoje:** TS escolhe 1 perfil, calcula contorno em TS, manda 1 operação, recebe 1 mesh.
- **Alvo:** TS manda o **documento inteiro** (`sketch + operations`) ao Rust. Rust
  resolve o DAG (dependências por `source_entity_id`), amostra splines, detecta perfis
  fechados, executa as features e devolve **todos os corpos**. TS só renderiza o retorno.

Isso resolve as três coisas de uma vez: torna o 2D→3D **reativo**, centraliza a
geometria **numa linguagem só**, e estabelece a base de timeline paramétrica.

---

## 3. Plano de execução (em ordem)

Regra que guia tudo: **não migrar framework**; corrigir estratégia de render e mover a
fronteira de geometria para o Rust.

### Fase 0 — Render sob demanda + memoizar chains  *(análise §1, itens 1-2)*

**Objetivo:** eliminar a repintura ociosa e o recálculo de `computeChains` por frame.

- Trocar o `requestAnimationFrame` perpétuo de `useSketchRenderer.ts` por repintura
  com **dirty-flag**: só repinta quando `project / viewport / seleção / cursor / drag`
  mudam. (Atenção: muitos inputs são `MutableRefObject` atualizados fora do ciclo do
  React — definir explicitamente o gatilho de "ficou sujo", ex.: um `requestRender()`
  chamado pelos handlers de mouse/tools, ou um número de versão no store.)
- **Memoizar `computeChains`**: recalcular só quando `sketch.entities` mudar, não por
  frame. Tirar do caminho quente em `renderEntities.ts:12`.

**Por que primeiro:** isolado (toca essencialmente `useSketchRenderer` /
`renderEntities`), risco baixo, ganho imediato de CPU. Resolve "ventoinha ligada à toa".

**Critério de pronto:** com o app aberto e ocioso, uso de CPU do processo cai a ~0;
nenhuma chamada a `computeChains` em estado ocioso (verificar com profiler ou um
contador temporário); interações (desenhar, arrastar, pan/zoom, snap) continuam fluidas.

**Esforço:** baixo · **Risco:** baixo.

### Fase 1 — Rebuild reativo no Rust: `rebuild(document) → bodies[]`  *(análise §2)*

**Objetivo:** 3D vivo a partir do 2D; geometria centralizada no Rust.

Passos:

1. **Novo comando Tauri `rebuild_document`** em `src-tauri/src/lib.rs` (espelhar DTO em
   `commands.rs`): recebe o documento (`sketch + operations`) serializado e devolve uma
   lista de corpos `{ operationId, mesh }` (+ erros por operação, sem abortar o resto).
2. **Engine de rebuild no Rust** (provavelmente em `outline-core`): resolve o DAG por
   `source_entity_id`, amostra splines, detecta perfis fechados (mover essa lógica de
   `chains.ts` para Rust — ver Fase 1b), executa cada operação, devolve os corpos.
3. **Store**: trocar `currentMesh: Mesh | null` por uma coleção indexada por operação,
   ex.: `bodies: Record<operationId, Mesh>`. Ajustar `Viewport3D.tsx` para renderizar
   N corpos (hoje só lê `currentMesh`). Ajustar `uiSlice`/`historySlice`/`projectSlice`
   que hoje resetam `currentMesh`.
4. **Reatividade**: editar o sketch dispara (debounced) o `rebuild_document` e atualiza
   os corpos. Substitui o "gerar cutter" manual de `useCutterActions.ts`.

**Fase 1b — mover a fronteira de geometria para Rust:** migrar detecção de contorno
fechado (`chains.ts` / `closedProfileEntity`) e amostragem de spline (`samplingSteps`)
para o Rust, para que o engine de rebuild seja a única fonte de verdade geométrica.
O TS pode manter uma cópia leve só para *render/hit-test* se necessário, mas a verdade
para gerar mesh vem do Rust.

**Por que depois da Fase 0:** com o loop de render já limpo, os corpos passam a
atualizar reativamente sem lutar contra repintura 60×/s.

**⚠️ Aprovar o contrato antes de codar:** definir e validar com o dono do projeto a
assinatura de `rebuild_document`, o formato do documento e o shape de `bodies` no store
**antes** de mexer no modelo de dados.

**Esforço:** médio-alto · **Risco:** médio (mexe no modelo e na fronteira TS↔Rust).

### Fase 2 — Expandir operações + culling/camadas  *(otimizações/extensões)*

Somente após o DAG funcionando:

- Novos tipos de `Operation` (extrude genérico, revolve, pocket…).
- Se a performance ainda pedir: **culling de viewport** em `renderEntities.ts` (pular
  entidades fora da tela via bounding box) e **canvas em duas camadas** (estática:
  entidades/fills, repintada só ao editar; overlay: cursor/snap/drag, repintada ao mover
  o mouse). Só aqui — se ainda faltar — avaliar WebGL/PixiJS, por medição.

**Por que por último:** são extensões sobre a base já reativa e limpa; antecipar é
otimização prematura.

**Esforço:** médio · **Risco:** baixo.

### Fase 3 — Viewport unificado 2D+3D *(paradigma Fusion)*

**Objetivo:** eliminar a alternância sketch/solid. O 2D e o 3D coexistem na mesma
viewport o tempo todo, como no Fusion 360 — a sketch é uma overlay sobre o plano de
trabalho dentro da cena 3D.

**Pré-requisito:** Fase 2 (canvas em camadas) concluída, porque a camada overlay do
sketch é a base técnica para sobrepor o 2D ao Three.js.

#### Fase 3a — Viewport unificado (infraestrutura)

> Arquivo-alvo: novo `components/UnifiedViewport.tsx` (~300 linhas). Remove
> `Canvas2D.tsx` e `Viewport3D.tsx`.

- Container único com `<canvas>` 2D transparente sobre `<canvas>` WebGL (Three.js).
- Ambos ocupam o mesmo `div`, mesma dimensão, empilhados via CSS (`position: absolute`).
- O canvas 2D (overlay) é transparente; o WebGL renderiza grid 3D, eixos, sólidos, e
  eventualmente wireframes do sketch em 3D.
- **Câmera sincronizada:** pan e zoom do 2D são derivados da câmera Three.js
  (projeção ortográfica do plano XY). `OrbitControls` comanda a câmera; o overlay
  2D recalcula `viewport` (offset + zoom) a cada frame a partir da matriz de projeção.
- Fim do `viewMode` sketch/solid. O estado `toolMode` + existência de sketch ativa
  determinam se o overlay 2D mostra ferramentas de desenho.
- `App.tsx` renderiza `UnifiedViewport` no lugar da troca condicional
  `{viewMode === "sketch" ? <Canvas2D /> : <Viewport3D />}`.

#### Fase 3b — Sketch como entidade 3D

> Arquivos: `useSketchRenderer.ts`, `renderEntities.ts`, novo hook `useSketchPlane.ts`.

- O sketch passa a ter um **plano de trabalho** (`workingPlane`: origem 3D + normal).
  Inicialmente sempre XY (`origin: [0,0,0], normal: [0,0,1]`).
- Entidades do sketch são renderizadas como **linhas 3D** na cena Three.js (visíveis
  mesmo quando a câmera está em órbita livre).
- O overlay 2D mostra ferramentas interativas (cursor, snap, preview de desenho,
  seleção, handles, grid de sketch) apenas quando a câmera está aproximadamente
  alinhada com o plano de trabalho.
- Quando o usuário clica fora do plano ou orbita muito longe, o overlay 2D esmaece
  e as entidades continuam visíveis como wireframes 3D.

#### Fase 3c — Planos de sketch arbitrários

> Arquivos: novo `WorkingPlane` no store, UI de seleção de plano.

- O usuário pode criar sketch em:
  - Plano XY / XZ / YZ (defaults)
  - Face de um sólido (seleciona triângulo → calcula plano)
  - Plano deslocado (offset a partir de face ou plano base)
- O `Project.sketch` ganha campo `workingPlane: { origin, normal }`.
- A câmera faz "look-at" automático ao entrar no sketch (alinha com a normal do
  plano, enquadra a bounding box das entidades).

#### Fase 3d — Edição paramétrica visual

> Expansão futura se necessário.

- Arrastar entidade no sketch → o 3D atualiza em tempo real (já funciona via Fase 1).
- Arrastar face de sólido → o sketch de origem atualiza (bidirecional, complexo).
- Dimensionamento paramétrico (cotas visíveis, constraints).

**Por que depois da Fase 2:** a Fase 2 separa o canvas em camadas (estática +
overlay), que é exatamente a estrutura necessária pra sobrepor o 2D ao Three.js sem
refatorar tudo de novo.

**Esforço:** alto (Fase 3a-b) a muito alto (Fase 3c-d) · **Risco:** médio-alto
(mexe na estrutura de viewport e nos conceitos de sketch/plano).

**Critério de pronto Fase 3a:** sketch e sólido visíveis simultaneamente; pan/zoom
do mouse funciona em ambos; ferramentas de desenho 2D operam sobre o plano XY
corretamente; não existe mais botão sketch/solid.

---

### Fase 4 — Ferramentas no modo 3D (estilo Fusion)

**Objetivo:** no modo 3D, o usuário pode selecionar entidades do sketch renderizadas
como wireframes, movê-las, e extrudá-las (com ou sem parede fina) — sem sair do
modo 3D. O botão "Generate Cutter" deixa de existir; a extrusão vira uma ferramenta
do viewport, com sub-modo `normal` (perfis fechados) e `thin` (contorno, ex-parede
de cookie cutter). A sidebar passa a refletir o modo atual (3D ou sketch).

**Pré-requisito:** Fases 3a–3c concluídas (wireframes 3D + planos de trabalho).

#### 4.1 — Seleção e mover no 3D

- **Arquivo-alvo:** novo `features/viewport/useEntity3DSelect.ts` (~80 LOC).
- Raycast nos meshes do `sketchGroupRef` (wireframes amarelos).
- Hit 3D → mapear pra coordenadas 2D do `workingPlane` → identificar `entityId` e
  chamar `selectEntity(hitEntityId)`. Suporte a `shiftKey` pra multi-seleção.
- Drag: capturar delta no plano, mover `entity.points` e `entity.controlPoints`
  proporcionalmente. Reusar `translateEntityWhole` já existente.
- Toolmode novo: `"select3d"` (análogo ao `"select"` do sketch, mas pra 3D).

#### 4.2 — Ferramenta de extrusão (substitui "Generate Cutter")

- **Arquivo-alvo:** novo `features/viewport/useExtrudeTool.ts` (~120 LOC).
- `toolMode: "extrude"`, `extrudeMode: "normal" | "thin"` (estado local na tool).
- Click num wireframe de entidade:
  - `normal`: precisa de perfil fechado (`chain fechado` detectado pelo Rust ou
    pelo `chains.ts`). Extrusão sólida do perfil.
  - `thin`: qualquer contorno (aberto também). Extrusão com parede fina
    (cookie cutter — reusa `cookie_cutter_wall` que já existe no Rust).
- Cria `Operation` no projeto com `type: "extrude"` ou `"extrude_thin"` e
  `source_entity_id: entityId`. O `rebuild_document` existente (Fase 1) já
  recalcula — só precisa do novo `Operation.type` no Rust.
- Reativo: editar o sketch atualiza a extrusão automaticamente (já funciona
  via Fase 1 — `useRebuildEffect`).

#### 4.3 — Novos `Operation.type` no Rust

**Arquivo-alvo:** `crates/geometry/src/entities.rs` e `crates/outline-core/src/commands.rs`.

```rust
// entities.rs
pub enum OperationType {
    CookieCutterWall, // existente
    Extrude,          // novo — extrusão sólida de perfil fechado
    ExtrudeThin,      // novo — extrusão fina de qualquer contorno
}
```

```rust
// outline-core/commands.rs — resolve_operation()
match op.kind {
    OperationType::Extrude => generate_extrude_mesh(profile, height),
    OperationType::ExtrudeThin => generate_thin_wall_mesh(profile, height, thickness, offset_side),
    OperationType::CookieCutterWall => generate_wall_mesh(...),  // já existe
}
```

- `generate_extrude_mesh`: extrusão sólida simples (sem offset, sem parede oca).
- `generate_thin_wall_mesh`: idêntico ao `generate_wall_mesh` atual — pode ser
  alias, ou unificar os dois com um flag `hollow: bool`.
- Adicionar testes em `crates/geometry/src/mesh.rs`.

#### 4.4 — Sidebar por modo

- **Estado atual:** `SketchToolbar` (col 1) sempre visível com tools de sketch.
- **Alvo:** alternar entre `SketchSidebar` e `ModelSidebar` baseado em
  `isSketching`.
- **SketchSidebar** (já existe, manter): Select, Polyline, Rectangle, Spline,
  Move, Mirror, Import Image, Snap, Undo/Redo.
- **ModelSidebar** (novo, `components/app/ModelToolbar.tsx`):
  - **Select** — `toolMode = "select3d"` (4.1)
  - **Extrude** — toggle entre `normal` e `thin` (4.2). Sub-modo via dois botões
    adjacentes ou dropdown.
  - **Generate Cutter** (botão antigo do InspectorPanel) — **removido**.
    Substituído pela ferramenta.
- InspectorPanel (`components/app/InspectorPanel.tsx`) deixa de mostrar
  `wallHeight` / `wallThickness` / `offsetSide` no topo — essas props migram pra
  `ModelSidebar` quando `toolMode === "extrude"` (são parâmetros da ferramenta,
  não estado global).

#### 4.5 — Limpeza do `viewMode` legado

- `viewMode: "sketch" | "solid" | "export"` no store ainda existe mas **não é
  mais usado** (Fase 3a removeu a troca de viewports). Remover do `uiSlice`,
  `types.ts` e `App.tsx`.
- `ModeTabs.tsx` removido (já estava em desuso desde Fase 3a).

#### Ordem sugerida

1. **4.3** — adicionar `Operation.type` no Rust + testes. Sem dependência visual,
   só contrato. Pequeno, valida o pipeline.
2. **4.4** — `ModelSidebar` com Select e Extrude. Sidebar reflete modo. Remove
   botão "Generate Cutter".
3. **4.1** — seleção/mover 3D via raycast.
4. **4.2** — completar extrusão (chamar Rust, criar Operation, ver mesh).
5. **4.5** — limpeza do `viewMode` legado.

**Esforço:** médio · **Risco:** médio (mexe em contrato Rust, ferramenta nova,
sidebar por modo).

**Critério de pronto:** no modo 3D, o usuário pode (1) clicar num wireframe
amarelo e selecioná-lo, (2) arrastar pra mover, (3) escolher extrude normal ou
thin, clicar no wireframe, ver o sólido aparecer, e editar o sketch pra ver
o sólido atualizar. Sidebar mostra tools de 3D quando não está em sketch, e
tools de sketch quando está. Botão "Generate Cutter" não existe mais.

---

## 4. O que NÃO fazer

- **Não** trocar React / Zustand / Vite / Tauri — custo puro, ganho zero.
- **Não** migrar para WebGL antes da Fase 0 (provavelmente desnecessário depois dela).
- **Não** adicionar tipos de operação antes do engine de rebuild existir (Fase 1).
- **Não** mexer no modelo de dados (`currentMesh` → `bodies`, comando `rebuild`) sem o
  contrato aprovado pelo dono do projeto.
- **Não** implementar Fase 3 antes da Fase 2 — o canvas em camadas é pré-requisito
  de infraestrutura para o viewport unificado.

---

## 5. Ordem recomendada de partida

1. **Fase 0** ✅ — ganho imediato, isolado, não compromete decisões futuras.
2. **Fase 1 + 1b** ✅ — rebuild paramétrico + geometria no Rust.
3. **Fase 2** ✅ — culling + canvas em camadas + extrair Canvas2D (pré-requisito pra Fase 3).
4. **Fase 3a** ✅ — viewport unificado (2D+3D mesma tela).
5. **Fase 3b** ✅ — sketch como wireframe 3D.
6. **Fase 3c** ✅ — planos de sketch arbitrários (XY/XZ/YZ + face selection).
7. **Fase 4** ✅ — ferramentas no modo 3D (seleção, mover, extrusão normal/fin, sidebar por modo).

> Observação para o agente executor: validar cada referência `arquivo:linha` deste
> documento antes de editar — o código pode ter mudado desde 2026-06-23.
