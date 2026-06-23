# Prompt para o agente executor

> Copie o bloco abaixo e troque **`<FASE>`** pela fase que quer executar
> (ex.: `Fase 0`, `Fase 1`, `Fase 1b`, `Fase 2`).

---

```
Você vai trabalhar no projeto CortaCAD (Tauri 2 + React/TS + Three.js + crates Rust).

Sua tarefa: executar a **<FASE>** descrita em `ARCHITECTURE_PLAN.md` (na raiz do projeto).

Antes de codar:
1. Leia `ARCHITECTURE_PLAN.md` por completo — ele tem o contexto, o diagnóstico e o plano em fases.
2. Localize a seção da **<FASE>** em §3 e leia o objetivo, os passos e o critério de pronto.
3. Valide as referências `arquivo:linha` citadas para a fase — o código pode ter mudado;
   confirme no código real antes de editar.
4. Releia §4 "O que NÃO fazer" e respeite os limites ali (não migrar framework, não tocar
   no modelo de dados sem contrato aprovado, etc.).

Regras de trabalho:
- Escopo: faça SOMENTE a <FASE> pedida. Não adiante trabalho de outras fases.
- Se a fase exigir aprovação de contrato (ex.: Fase 1), PARE e me apresente o desenho
  (assinatura de comando, formato de dados, shape do store) para aprovação ANTES de
  implementar — não assuma e siga.
- Siga o estilo do código existente (nomes, idioma dos comentários, convenções).
- Não faça commit nem push a menos que eu peça.
- Mantenha as mudanças pequenas e revisáveis.

Ao terminar:
- Rode o que existir de verificação (`pnpm quality`, `pnpm --filter @outline/desktop test`,
  `cargo test` nos crates afetados) e relate os resultados de forma fiel — se algo falhar,
  diga, com a saída.
- Cheque cada item do "Critério de pronto" da fase e relate o status de cada um.
- Resuma o que mudou (arquivos + por quê) e aponte o que ficou para a próxima fase.

Se algo no plano estiver desatualizado ou em conflito com o código atual, NÃO improvise:
descreva a divergência e me pergunte antes de seguir.
```

---

## Notas de uso

- **Fase 0** (render sob demanda) é a partida recomendada — isolada e de baixo risco.
- **Fase 1 / 1b** exigem **aprovação de contrato** antes de implementar; o prompt já
  instrui o agente a parar e pedir aprovação.
- **Fase 2** só deve ser iniciada após a Fase 1 estar pronta.
- Para rodar fases em sequência, execute uma, revise o resultado, e só então dispare a
  próxima trocando o `<FASE>`.
