# Spec — Imagem de Referência no Sketch

## Objetivo

Permitir importar imagens (PNG/JPG) como referência visual no plano 2D, posicionar, escalar (inclusive por referência de linha), espelhar e desenhar por cima.

## Fluxo principal

1. Usuário clica em **"Importar Imagem"** na toolbar.
2. Diálogo Tauri nativo abre para selecionar PNG/JPG.
3. Imagem aparece centralizada no viewport 2D com tamanho inicial de 100 mm (mantendo proporção).
4. Imagem é renderizada com ~40% de opacidade, atrás das entidades do sketch.
5. Usuário pode:
   - **Mover** a imagem arrastando
   - **Redimensionar** arrastando alças de canto com popup de dimensões
   - **Escalar por referência** traçando uma linha e definindo o tamanho real
   - **Espelhar** horizontal/vertical (visual, não destrutivo)
   - **Travar proporção** ao redimensionar
   - **Ajustar opacidade** no painel de propriedades

## Caso de uso: cortador de estrela

1. Abro foto de uma estrela (1200x800px, sem escala).
2. Imagem aparece centralizada com `100 x 66.7 mm` (proporção mantida).
3. Arrasto para posicionar no centro do viewport.
4. Puxo alça de canto — aparece popup:
   - `Largura: 100 mm` | `Altura: 66.7 mm`
   - 🔒 proporção travada (padrão)
   - `↔ Espelhar X` | `↕ Espelhar Y`
5. Clico em **"Escala por referência"** no painel.
6. Desenho uma linha sobre o braço da estrela.
7. Popup: `Linha: 3.2 mm`. Digito `20 mm`, confirmo (Enter).
8. Imagem escala proporcionalmente: braço vira 20 mm, resto acompanha.
9. Agora desenho a polyline por cima com precisão real.

## Requisitos funcionais

- [ ] RF1: Importar PNG/JPG via diálogo Tauri nativo
- [ ] RF2: Imagem aparece no centro do viewport 2D
- [ ] RF3: Tamanho inicial de 100 mm na maior dimensão, mantendo proporção
- [ ] RF4: Renderizar com opacidade configurável (padrão 40%)
- [ ] RF5: Imagem fica atrás das entidades do sketch (depth sorting)
- [ ] RF6: Selecionar imagem clicando nela (mesmo mecanismo de seleção de entidades)
- [ ] RF7: Arrastar imagem para mover
- [ ] RF8: Alças de canto para redimensionar
- [ ] RF9: Popup de redimensionamento (igual confirmação do retângulo):
  - Inputs de largura e altura em mm
  - 🔒 Travar proporção (toggle)
  - ↕ Espelhar vertical
  - ↔ Espelhar horizontal
  - Enter confirma, Escape cancela
- [ ] RF10: Ferramenta "Escala por referência":
  - Desenhar linha sobre a imagem
  - Popup mostra o comprimento atual em mm
  - Input para digitar o comprimento real desejado
  - Enter confirma, imagem escala proporcionalmente
  - Escape/desfazer remove a linha de referência
- [ ] RF11: Espelhar é visual (multiplica scaleX por -1), não destrutivo
- [ ] RF12: Painel lateral mostra propriedades da imagem selecionada:
  - Largura / Altura (editável)
  - Opacidade (slider 10-100%)
  - Botões de espelhar
  - Botão "Escala por referência"
  - Botão "Remover imagem"

## Fora de escopo

- Múltiplas imagens (futuro)
- Rotação de imagem
- Recorte/crop de imagem
- SVG
- Ajuste de brilho/contraste

## Critério de sucesso

1. Importar imagem → aparece na tela com opacidade.
2. Arrastar para mover.
3. Redimensionar por alças com proporção travada/destravada.
4. Escala por referência: traçar linha, definir tamanho real, imagem escala corretamente.
5. Espelhar X e Y funcionam.
6. Salvar e abrir projeto preserva a imagem e suas propriedades.
7. Painel de propriedades exibe e permite editar.
8. `pnpm build` e `cargo test` passam.
