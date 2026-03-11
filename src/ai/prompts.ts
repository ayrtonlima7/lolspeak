import type { DetectedChange, GameSnapshot } from "../models/types.js";

/**
 * System prompt do Jarbas — personalidade e instruções para o Gemini.
 * Separado em arquivo próprio para facilitar ajustes futuros.
 */
export const SYSTEM_PROMPT = `Você é o JARBAS, um assistente tático avançado para League of Legends.
Você é conciso, direto e estratégico — como um coach profissional.

REGRAS:
- Responda SEMPRE em português brasileiro.
- Seja breve: máximo 2-3 frases curtas e objetivas.
- Foque em ações práticas que o jogador pode tomar AGORA.
- Considere o contexto do jogo: tempo, itens, KDA, objetivos, composição de time.
- Use termos de LoL em português quando possível (abate, torre, dragão, barão, etc).
- NÃO use markdown, emojis, ou formatação especial — o texto será lido em voz alta.
- NÃO cumprimente o jogador ou faça introduções — vá direto ao ponto.
- Se houver perigo iminente, avise com urgência.
- Se houver oportunidade, sugira a ação.`;

/**
 * Monta o prompt para insights reativos (gatilho por mudança significativa).
 */
export function buildReactivePrompt(
  changes: DetectedChange[],
  snapshot: GameSnapshot
): string {
  const gameTime = formatGameTime(snapshot.gameTime);
  const healthPct = Math.round(
    (snapshot.activePlayer.currentHealth / snapshot.activePlayer.maxHealth) * 100
  );

  let manaPart = "";
  if (snapshot.activePlayer.hasMana) {
    const manaPct = Math.round(
      (snapshot.activePlayer.currentMana / snapshot.activePlayer.maxMana) * 100
    );
    manaPart = ` | Mana: ${manaPct}%`;
  }

  const myPlayer = snapshot.allies.find(
    (p) => p.championName === snapshot.activePlayer.championName
  );
  const myKDA = myPlayer
    ? `${myPlayer.scores.kills}/${myPlayer.scores.deaths}/${myPlayer.scores.assists}`
    : "N/A";
  const myCS = myPlayer?.scores.creepScore ?? 0;

  const allyTeamInfo = snapshot.allies
    .map((p) => `  ${p.championName} (${p.position}) Lv${p.level} ${p.isDead ? "MORTO" : "VIVO"} KDA:${p.scores.kills}/${p.scores.deaths}/${p.scores.assists}`)
    .join("\n");

  const enemyTeamInfo = snapshot.enemies
    .map((p) => `  ${p.championName} (${p.position}) Lv${p.level} ${p.isDead ? "MORTO" : "VIVO"} KDA:${p.scores.kills}/${p.scores.deaths}/${p.scores.assists} Itens:[${p.items.map((i) => i.displayName).join(", ")}]`)
    .join("\n");

  const changesText = changes
    .map((c) => `- [${c.type}] ${c.description}`)
    .join("\n");

  return `ESTADO ATUAL DO JOGO (${gameTime}):
Meu Campeão: ${snapshot.activePlayer.championName} | Posição: ${snapshot.activePlayer.position} | Time: ${snapshot.activePlayer.team === "ORDER" ? "Azul" : "Vermelho"}
Level: ${snapshot.activePlayer.level} | Gold: ${Math.floor(snapshot.activePlayer.currentGold)}g | HP: ${healthPct}%${manaPart}
KDA: ${myKDA} | CS: ${myCS}

MEU TIME (${snapshot.activePlayer.team}):
${allyTeamInfo}

TIME INIMIGO:
${enemyTeamInfo}

MUDANÇAS DETECTADAS:
${changesText}

Com base nas mudanças acima e no estado atual, forneça um insight tático curto e direto.`;
}

/**
 * Monta o prompt para análise periódica (a cada 5 minutos de jogo).
 */
export function buildPeriodicPrompt(snapshots: GameSnapshot[]): string {
  if (snapshots.length === 0) return "Sem dados para análise periódica.";

  const latest = snapshots[snapshots.length - 1];
  const gameTime = formatGameTime(latest.gameTime);

  const timeline = snapshots
    .map((s) => {
      const time = formatGameTime(s.gameTime);
      const myPlayer = s.allies.find(
        (p) => p.championName === s.activePlayer.championName
      );
      const kda = myPlayer
        ? `${myPlayer.scores.kills}/${myPlayer.scores.deaths}/${myPlayer.scores.assists}`
        : "N/A";
      const cs = myPlayer?.scores.creepScore ?? 0;

      const allyKills = s.allies.reduce((sum, p) => sum + p.scores.kills, 0);
      const enemyKills = s.enemies.reduce((sum, p) => sum + p.scores.kills, 0);

      return `[${time}] Level ${s.activePlayer.level} | KDA: ${kda} | CS: ${cs} | Gold: ${Math.floor(s.activePlayer.currentGold)}g | Placar: ${allyKills} x ${enemyKills}`;
    })
    .join("\n");

  const latestEnemies = latest.enemies
    .map((p) => `  ${p.championName} (${p.position}) Lv${p.level} KDA:${p.scores.kills}/${p.scores.deaths}/${p.scores.assists} Itens:[${p.items.map((i) => i.displayName).join(", ")}]`)
    .join("\n");

  return `ANÁLISE PERIÓDICA DO JOGO (${gameTime}):
Meu Campeão: ${latest.activePlayer.championName} | Posição: ${latest.activePlayer.position}

EVOLUÇÃO DA PARTIDA:
${timeline}

SITUAÇÃO INIMIGA ATUAL:
${latestEnemies}

Analise a evolução da partida. O jogador está indo bem ou mal? O que deve melhorar ou manter? Qual deve ser a prioridade agora? Responda de forma direta e breve.`;
}

function formatGameTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

