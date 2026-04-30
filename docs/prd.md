PRD — CortaCad
1. Visão do produto

O CortaCad é um aplicativo desktop para criação de cortadores de biscoito, moldes, carimbos e peças simples para impressão 3D a partir de imagens, esboços 2D e operações de extrusão.

O usuário poderá inserir uma imagem de referência em um plano, desenhar contornos usando ferramentas familiares de CAD, gerar paredes/offsets, extrudar perfis e linhas com altura/espessura configuráveis e exportar o resultado em formatos como STL e 3MF.

No futuro, o produto terá integração com IA para gerar automaticamente esboços, contornos e peças a partir de imagens ou comandos em texto.

2. Objetivo principal

Permitir que um usuário crie cortadores de biscoito de forma rápida, visual e controlada, sem depender de ferramentas CAD completas como Fusion 360, FreeCAD ou Blender.

O foco é:

criação 2D precisa;
referência por imagem;
geração simples de geometria 3D;
exportação confiável para impressão 3D;
fluxo parecido com Fusion, porém muito mais direto.
3. Público-alvo

Usuários principais:

makers que imprimem cortadores em 3D;
confeiteiros que querem criar moldes personalizados;
pessoas que vendem cortadores personalizados;
usuários que acham Fusion/FreeCAD complexos demais para peças simples;
você, o macaco engenheiro tentando fazer cortador sem brigar com Wine.

Usuários futuros:

pequenos negócios de personalizados;
designers de produtos simples;
pessoas sem conhecimento técnico usando IA para gerar moldes.
4. Escopo do produto
Dentro do escopo

O app deve permitir:

criar projetos com múltiplas peças;
criar múltiplos cortadores no mesmo projeto;
inserir imagens de referência;
escolher plano de trabalho: XY, XZ ou YZ;
criar esboços 2D;
usar ferramentas de desenho: linha, polyline, spline, círculo, retângulo, quadrado;
mover, rotacionar, escalar e espelhar entidades;
criar offsets de contornos;
selecionar perfis fechados;
extrudar perfis preenchidos;
extrudar linhas como paredes;
configurar altura, espessura, direção e tipo de extrusão;
visualizar em 2D e 3D;
exportar STL;
futuramente exportar 3MF;
salvar e abrir projetos.
Fora do escopo inicial

Não tentar fazer no MVP:

modelagem CAD genérica;
boolean 3D avançado;
assembly complexo;
simulação;
constraints paramétricas completas;
timeline estilo Fusion no início;
suporte completo a STEP;
colaboração cloud;
renderização realista;
CAM/CNC.

Isso tudo é pantanozinho. Entrou, o jacaré come.

5. Conceito de uso

O fluxo ideal do usuário:

Criar projeto.
Criar uma peça/cortador.
Escolher plano de trabalho.
Inserir imagem de referência.
Ajustar escala da imagem.
Criar esboço por cima da imagem.
Usar linhas/splines/círculos/retângulos para contornar.
Fechar perfis ou usar linhas abertas.
Aplicar offset/espessura.
Extrudar:
perfil fechado como sólido;
linha/contorno como parede;
offset como cortador.
Visualizar em 3D.
Exportar STL/3MF.
Mandar pro slicer.
6. Funcionalidades principais
6.1 Projetos

O projeto deve conter:

nome;
unidade padrão, inicialmente mm;
lista de peças;
imagens importadas;
esboços;
operações 3D;
configurações de exportação.

Exemplo mental da estrutura:

Project
 ├── Piece: "Cortador Estrela"
 │    ├── Sketch: "Contorno externo"
 │    ├── ImageReference: "estrela.png"
 │    ├── Extrusion: "Parede principal"
 │    └── ExportSettings
 ├── Piece: "Cortador Coração"
 │    └── ...
6.2 Múltiplas peças no mesmo projeto

O usuário deve conseguir ter vários cortadores em um único projeto.

Cada peça deve poder ser:

ocultada;
bloqueada;
renomeada;
movida no espaço;
exportada individualmente;
exportada junto com outras peças.

Isso é importante para montar kits, tipo vários cortadores de uma mesma coleção.

6.3 Planos de trabalho

O usuário deve poder escolher:

plano XY;
plano XZ;
plano YZ.

No MVP, pode começar só com XY.
Depois adiciona os outros.

Para cortador de biscoito, 90% do uso vai ser XY com extrusão no Z. Então não precisa virar astronauta no começo.

6.4 Inserção de imagem

O app deve permitir inserir uma imagem no plano de trabalho.

Formatos iniciais:

PNG;
JPG;
SVG futuramente.

Operações sobre imagem:

mover;
escalar;
rotacionar;
ajustar opacidade;
bloquear/desbloquear;
enviar para trás;
definir escala real usando uma medida conhecida.

Exemplo:

O usuário importa uma imagem de estrela, define que a largura dela é 80 mm, desenha por cima e gera o cortador.

6.5 Sketch / esboço

O sketch é o coração do app.

Ferramentas iniciais:

selecionar;
linha;
polyline;
retângulo;
quadrado;
círculo;
arco, fase posterior;
spline/bezier;
mover;
rotacionar;
escalar;
espelhar;
offset;
trim, fase posterior;
fillet/chamfer 2D, fase posterior.

O sketch deve ter:

grid;
snap no grid;
snap em pontos finais;
snap em centro;
snap em interseção, fase posterior;
zoom/pan;
seleção múltipla;
undo/redo.
6.6 Perfis

O sistema deve detectar perfis fechados a partir do sketch.

Exemplos:

um círculo é um perfil fechado;
um retângulo é um perfil fechado;
um contorno feito de várias linhas conectadas é um perfil fechado;
uma spline fechada é um perfil fechado.

O usuário deve conseguir clicar em uma área preenchida e selecionar o perfil, parecido com o Fusion.

Isso é uma das partes mais importantes e também uma das mais chatinhas tecnicamente.

6.7 Extrusão

Tipos de extrusão:

Extrusão de perfil fechado

Seleciona um perfil preenchido e extruda como sólido.

Configurações:

altura;
direção;
operação:
novo corpo;
adicionar;
cortar, futuro;
taper angle, futuro.
Extrusão de linha/contorno

Seleciona linha, spline ou contorno aberto/fechado e extruda como parede.

Configurações:

altura;
espessura da parede;
lado:
centro;
para dentro;
para fora;
tipo:
parede simples;
cortador com borda;
marcador/embosser.

Esse é o diferencial para cortadores. No Fusion você precisa fazer umas mandingas; aqui deve ser nativo.

6.8 Presets de cortador

O app deve ter presets prontos:

Cortador simples
parede vertical;
altura configurável;
espessura configurável.

Exemplo:

Altura: 15 mm
Espessura: 1.2 mm
Cortador com borda de reforço
parede principal;
base mais larga;
borda superior fina.

Exemplo:

Altura total: 15 mm
Parede: 1.2 mm
Base: 3 mm
Altura da base: 2 mm
Marcador / emboss

Para criar peças que marcam massa, pasta americana ou biscuit.

relevo baixo;
base plana;
linhas elevadas.
6.9 Visualização 3D

A visualização 3D deve permitir:

orbitar;
pan;
zoom;
alternar vista:
top;
front;
right;
isométrica;
mostrar grade;
mostrar eixos;
alternar wireframe/sólido;
selecionar corpo.

No MVP, visualização simples basta. O foco é exportar STL válido.

6.10 Exportação

Formatos:

MVP
STL.
Depois
3MF;
SVG 2D;
DXF, talvez;
projeto interno .cforge ou .cookiecad.

Configurações de exportação:

exportar peça atual;
exportar todas as peças;
unidades em mm;
qualidade da malha;
resolução de curvas;
aplicar escala.

Validação antes de exportar:

malha fechada;
sem buracos;
sem faces invertidas;
espessura mínima;
altura válida;
contornos problemáticos.
7. Requisitos não funcionais
7.1 Plataforma

Inicialmente:

Linux.

Depois:

Windows;
talvez macOS.

Como você usa Linux, começa nele sem dó.

7.2 Tecnologia sugerida
Core
Rust
UI desktop

Opção mais pragmática:

Tauri + frontend web

ou:

egui/eframe

Minha recomendação real:

Para ir rápido e fazer UI complexa parecida com Fusion:

Tauri + React/Svelte + Rust core

Motivo: fazer painéis, toolbar, inspector, timeline, árvore de projeto e modal em egui pode virar sofrimento. Com web UI você monta interface mais rápido.

Para motor de geometria/exportação:

Rust core separado

Arquitetura:

UI: Tauri + React/Svelte
Core: Rust
Geometry: Rust crates + código próprio
Export: Rust
AI: serviço/plugin futuro
Render 2D

Canvas/WebGL no frontend, ou render próprio com wgpu.

Mais rápido:

SVG/Canvas no frontend

Mais poderoso:

wgpu

Eu começaria com Canvas/SVG para o sketch e migraria se doer.

Render 3D

Possibilidades:

Three.js no frontend;
Bevy/wgpu em Rust;
custom wgpu.

Para MVP, eu usaria:

Three.js no frontend + Rust gerando malha

É rápido e suficiente.

7.3 Persistência

Formato de projeto em JSON no começo:

{
  "version": 1,
  "units": "mm",
  "pieces": [],
  "images": [],
  "sketches": [],
  "operations": []
}

Depois pode evoluir para pacote zip:

project.cforge
 ├── project.json
 ├── images/
 └── exports/
7.4 Performance

O app deve suportar confortavelmente:

imagens de referência médias;
10 a 50 peças por projeto;
sketches com centenas ou poucos milhares de entidades;
geração de STL em segundos.

Não precisa otimizar para NASA no MVP.

8. Fases do projeto
Fase 0 — Pesquisa e protótipo técnico

Objetivo: provar que dá para desenhar um contorno 2D, transformar em parede e exportar STL.

Entregáveis
app mínimo abrindo janela;
viewport 2D com pan/zoom;
desenho de polyline;
fechamento de contorno;
offset simples;
extrusão simples;
export STL.
Ferramentas mínimas
linha/polyline;
grid;
export.
Critério de sucesso

Você consegue desenhar um retângulo/coração tosco, gerar parede com altura e espessura, exportar STL e abrir no slicer.

Risco principal

Offset 2D e triangulação.

Fase 1 — Editor 2D básico

Objetivo: criar uma experiência usável para desenhar esboços.

Funcionalidades
criar projeto;
criar peça;
viewport 2D;
pan/zoom;
grid;
snap no grid;
selecionar entidade;
desenhar linha;
desenhar polyline;
desenhar retângulo;
desenhar círculo;
mover entidade;
apagar entidade;
undo/redo;
salvar/abrir projeto.
Fora dessa fase
extrusão avançada;
spline perfeita;
IA;
múltiplos planos.
Critério de sucesso

Você consegue desenhar manualmente um cortador simples com precisão aceitável.

Fase 2 — Imagem de referência

Objetivo: permitir criar cortadores a partir de imagens.

Funcionalidades
importar PNG/JPG;
posicionar imagem no plano;
mover;
rotacionar;
escalar;
ajustar opacidade;
bloquear imagem;
definir escala real da imagem;
desenhar por cima da imagem.
Critério de sucesso

Você importa uma imagem de estrela/coração/personagem simples e consegue criar um esboço por cima.

Fase 3 — Perfis e offset

Objetivo: transformar sketch em regiões utilizáveis para extrusão.

Funcionalidades
detectar contornos fechados;
destacar perfil ao passar o mouse;
selecionar perfil;
validar perfil aberto;
validar auto-interseção;
criar offset interno/externo;
definir espessura de parede;
preview de offset.
Critério de sucesso

Você consegue selecionar uma área fechada, aplicar offset e visualizar uma parede pronta para extrusão.

Risco

Essa é uma das fases mais importantes. Aqui o bicho pega, mas é o coração do produto.

Fase 4 — Extrusão e geração 3D

Objetivo: gerar corpos 3D a partir de perfis e linhas.

Funcionalidades
extrusão de perfil fechado;
extrusão de linha como parede;
altura configurável;
espessura configurável;
direção da extrusão;
preview 3D;
corpo separado por operação;
ocultar/mostrar corpo;
deletar operação.
Operações iniciais
New Body;
Join simples, futuro;
Cut, futuro.
Critério de sucesso

Você cria um cortador real com parede, altura e espessura, visualiza em 3D e prepara para exportação.

Fase 5 — Export STL

Objetivo: permitir uso real com impressora 3D.

Funcionalidades
exportar STL;
escolher peça atual ou todas;
qualidade da curva;
validar malha;
mostrar alerta de problemas;
abrir pasta de exportação.
Critério de sucesso

O STL abre corretamente no OrcaSlicer/Cura/PrusaSlicer e é imprimível.

Fase 6 — UX estilo Fusion, mas simplificada

Objetivo: melhorar fluxo e familiaridade.

Funcionalidades
barra superior com modos:
Sketch;
Solid;
Export;
browser lateral com peças, sketches e corpos;
inspector lateral com propriedades;
toolbar contextual;
atalhos de teclado;
gizmos básicos;
seleção por caixa;
menus de contexto;
painel de operação de extrusão parecido com Fusion;
histórico simples de operações.
Critério de sucesso

O app começa a parecer uma ferramenta de CAD real, não um protótipo de feira de ciências.

Fase 7 — Presets de cortador

Objetivo: transformar o app em produto especializado, não só editor genérico.

Presets
cortador simples;
cortador com base reforçada;
cortador com borda fina;
marcador/embosser;
cortador + marcador em duas peças;
suporte para múltiplas alturas.
Critério de sucesso

Usuário escolhe um contorno e aplica “Gerar cortador”, sem precisar montar tudo manualmente.

Esse é o momento em que o produto deixa de ser “mini Fusion” e vira ferramenta com valor próprio.

Fase 8 — Múltiplas peças e kits

Objetivo: permitir projetos maiores.

Funcionalidades
múltiplas peças no mesmo projeto;
duplicar peça;
alinhar peças;
distribuir peças;
exportar tudo junto;
exportar individual;
organizar por grupos;
gerar kit.
Critério de sucesso

Você consegue criar uma coleção com vários cortadores e exportar todos.

Fase 9 — Export 3MF e melhorias de malha

Objetivo: exportação mais moderna e robusta.

Funcionalidades
export 3MF;
metadados;
múltiplos corpos no mesmo arquivo;
cores/nomes de corpos, se aplicável;
reparo simples de malha;
detecção de non-manifold;
cálculo de volume;
estimativa de área/base.
Critério de sucesso

3MF abre corretamente em slicers modernos com múltiplas peças nomeadas.

Fase 10 — IA assistiva inicial

Objetivo: IA como copiloto, não como mágica total ainda.

Funcionalidades
chat lateral;
explicar ferramentas;
sugerir próximos passos;
detectar problemas no sketch;
recomendar espessura/altura;
gerar checklist antes de exportar;
responder “como faço um cortador com borda mais fina?”;
converter texto em operações simples.

Exemplo:

“Crie um cortador circular de 80 mm com parede de 1.2 mm e altura de 15 mm.”

Resultado:

cria círculo;
aplica parede;
extruda;
mostra preview.
Critério de sucesso

A IA ajuda sem destruir o projeto igual estagiário com permissão de produção.

Fase 11 — IA a partir de imagem

Objetivo: gerar esboços automaticamente a partir de imagem.

Funcionalidades
usuário importa imagem;
IA detecta contorno principal;
IA gera vetor/sketch editável;
usuário escolhe:
contorno externo;
detalhes internos;
simplificação;
suavização;
IA sugere tipo:
cortador;
marcador;
stencil;
molde.
Fluxo ideal
Importar imagem.
Clicar em “Gerar cortador”.
IA detecta contorno.
Usuário ajusta tolerância/suavização.
App gera sketch.
Usuário edita manualmente se quiser.
App extruda.
Critério de sucesso

Uma imagem simples vira um cortador editável em menos de 1 minuto.

Fase 12 — IA geradora de peças

Objetivo: usuário cria peças a partir de texto.

Exemplos:

“Crie um cortador de estrela com 80 mm de largura, 15 mm de altura e parede de 1.2 mm.”

“Crie um kit com coração, estrela e lua, todos com 70 mm.”

“Faça um marcador com o texto ‘Feliz Natal’ em relevo.”

A IA deve gerar:

sketch;
operações;
parâmetros;
preview;
explicação editável.
Critério de sucesso

Usuário leigo consegue criar um cortador sem saber desenhar.

9. Arquitetura sugerida
9.1 Módulos
app-shell
 ├── project-manager
 ├── sketch-engine
 ├── geometry-engine
 ├── mesh-engine
 ├── export-engine
 ├── renderer-2d
 ├── renderer-3d
 ├── ai-assistant
 └── plugin-system
9.2 Separação importante

Não mistura UI com geometria.

O core deve conseguir rodar sem interface:

Input: project.json
Output: mesh/stl/3mf

Isso vai ser muito útil para IA no futuro. A IA pode gerar comandos/JSON, o core valida e aplica.

9.3 Modelo de comandos

Tudo que altera o projeto deveria passar por comandos.

Exemplo:

{
  "type": "CreateCircle",
  "pieceId": "piece_1",
  "sketchId": "sketch_1",
  "center": [0, 0],
  "radius": 40
}

Extrusão:

{
  "type": "ExtrudeProfile",
  "profileId": "profile_1",
  "height": 15,
  "operation": "NewBody"
}

Isso ajuda muito em:

undo/redo;
histórico;
IA;
testes automatizados;
salvar projeto;
replay de operações.
10. Modelo mental de dados
Entidades 2D
Line
Circle
Arc
Bezier
Polyline
Rectangle
ImageReference
Sketch
Sketch
 ├── plane
 ├── entities
 ├── constraints, futuro
 ├── dimensions, futuro
 └── profiles calculados
Operações 3D
ExtrudeProfile
ExtrudePathAsWall
Offset
Mirror
Combine, futuro
Cut, futuro
Corpo 3D
Body
 ├── mesh
 ├── sourceOperation
 ├── visible
 └── exportable
11. Diferenciais do produto

O app deve ser melhor que Fusion para esse nicho em alguns pontos:

11.1 Fluxo nativo para cortador

No Fusion, cortador é um uso improvisado.
No CortaCad, cortador é o fluxo principal.

11.2 Presets prontos

Usuário não precisa entender CAD para gerar:

parede;
base;
relevo;
marcador;
espessura ideal.
11.3 IA treinada no domínio

A IA não será só “um chat”. Ela deve entender:

o que é cortador;
espessura imprimível;
altura comum;
problemas de STL;
contorno aberto;
imagem ruim;
offset inviável;
detalhes finos demais.
11.4 Menos complexidade

Nada de 800 botões. Só o necessário para fazer peças imprimíveis.

12. Riscos técnicos
Alto risco
offset robusto de curvas;
detecção de perfis;
triangulação confiável;
export STL sem erros;
spline e curvas suaves;
seleção precisa no canvas;
UX de CAD.
Médio risco
manipulação de imagem;
múltiplas peças;
histórico de operações;
performance com sketches grandes;
3MF.
Baixo risco
salvar projeto;
importar imagem;
toolbar;
seleção básica;
export SVG;
presets simples.
13. Estratégia de implementação

Eu faria assim, sem tentar ser herói:

Primeiro protótipo

Foca em:

app desktop;
imagem de referência;
polyline;
offset;
extrusão de parede;
STL.

Nada de spline no primeiro mês. Spline é bonito, mas polyline já resolve muita coisa se tiver suavização depois.

Depois

Adiciona:

circle;
rectangle;
bezier;
mirror;
scale;
melhor seleção;
múltiplas peças.
Depois

IA.

A IA só entra quando o app já tiver comandos internos estáveis. Senão vira IA gerando bagunça em cima de bagunça.

14. Roadmap prático
Mês 1 — Protótipo bruto

Objetivo: provar que gera STL imprimível.

criar app;
canvas 2D;
desenhar polyline;
fechar contorno;
aplicar parede;
extrudar;
exportar STL;
abrir no slicer.

Resultado esperado: um cortador feio, mas real.

Mês 2 — Editor usável
imagem de referência;
linha;
retângulo;
círculo;
seleção;
mover;
escala;
undo/redo;
salvar projeto.

Resultado esperado: você consegue fazer cortadores simples sem Fusion.

Mês 3 — Cortador de verdade
offset melhor;
preset cortador simples;
preset borda reforçada;
preview 3D;
exportação mais confiável;
validação de contorno aberto.

Resultado esperado: app já útil para seu uso pessoal.

Mês 4 — UX tipo Fusion
sidebar de projeto;
toolbar;
inspector;
painel de extrusão;
múltiplas peças;
atalhos;
polimento.

Resultado esperado: começa a parecer produto.

Mês 5 — IA assistiva simples
chat lateral;
comandos por texto;
gerar formas simples;
explicar erros;
sugerir correções.

Resultado esperado: IA útil, sem prometer milagre.

Mês 6+ — IA por imagem
detecção de contorno;
vetorização;
geração de sketch;
suavização;
geração automática de cortador.

Resultado esperado: diferencial forte.

15. MVP recomendado

O MVP que eu miraria:

Nome

CortaCad MVP

Funcionalidades obrigatórias
criar projeto;
importar imagem;
desenhar polyline por cima;
fechar contorno;
offset de parede;
extrusão com altura;
export STL;
salvar projeto.
Funcionalidades boas, mas não obrigatórias
spline;
círculo;
retângulo;
múltiplas peças;
preview 3D bonito;
3MF;
IA.
Funcionalidades proibidas no MVP
constraints paramétricas completas;
boolean 3D complexo;
timeline perfeita;
STEP;
colaboração;
marketplace;
cloud.
