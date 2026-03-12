import type { DetectedChange, GameSnapshot, Item, PlayerSnapshot } from "../models/types.js";
import type { GameStateManager } from "../state/gameState.js";

/** Preço mínimo para considerar um item como significativo */
const SIGNIFICANT_ITEM_MIN_PRICE = 800;

/** Itens que devem ser ignorados (wards, consumíveis baratos, etc.) */
const IGNORED_ITEM_IDS = new Set([3340, 3364, 2055, 2031, 2003]);

/** Diferença mínima de ouro para considerar como spike */
const GOLD_SPIKE_THRESHOLD = 500;

/** Eventos relevantes para monitorar */
const RELEVANT_EVENTS = new Set([
  "ChampionKill",
  "FirstBlood",
  "DragonKill",
  "BaronKill",
  "HeraldKill",
  "TurretKilled",
  "InhibKilled",
  "Multikill",
]);

/**
 * Detecta mudanças significativas entre o snapshot anterior e o atual.
 */
export function detectChanges(stateManager: GameStateManager): DetectedChange[] {
  const { currentSnapshot, previousSnapshot } = stateManager;
  if (!currentSnapshot) return [];

  const changes: DetectedChange[] = [];

  // 1. Novos eventos relevantes
  detectNewEvents(currentSnapshot, stateManager, changes);

  // Se não há snapshot anterior, não há como comparar o resto
  if (!previousSnapshot) return changes;

  // 2. Novos itens épicos em qualquer jogador
  detectEpicItems(currentSnapshot, previousSnapshot, changes);

  // 3. Mudança no estado de morte de qualquer campeão
  detectDeathChanges(currentSnapshot, previousSnapshot, changes);

  // 4. Mudanças de score do jogador ativo
  detectScoreChanges(currentSnapshot, previousSnapshot, changes);

  // 5. Level up do jogador ativo
  detectLevelUp(currentSnapshot, previousSnapshot, changes);

  // 6. Gold spike do jogador ativo
  detectGoldSpike(currentSnapshot, previousSnapshot, stateManager, changes);

  return changes;
}

function detectNewEvents(
  current: GameSnapshot,
  stateManager: GameStateManager,
  changes: DetectedChange[]
): void {
  const newEvents = current.events.filter(
    (e) => e.EventID > stateManager.lastProcessedEventId && RELEVANT_EVENTS.has(e.EventName)
  );

  for (const event of newEvents) {
    let description = "";

    switch (event.EventName) {
      case "ChampionKill":
        description = `${event.KillerName} abateu ${event.VictimName}`;
        if (event.Assisters && event.Assisters.length > 0) {
          description += ` (assistência: ${event.Assisters.join(", ")})`;
        }
        break;
      case "FirstBlood":
        description = `First Blood! ${event.Recipient} fez o primeiro abate`;
        break;
      case "DragonKill":
        description = `Dragão ${event.DragonType} abatido por ${event.KillerName}${event.Stolen === "True" ? " (ROUBADO!)" : ""}`;
        break;
      case "BaronKill":
        description = `Barão Nashor abatido por ${event.KillerName}${event.Stolen === "True" ? " (ROUBADO!)" : ""}`;
        break;
      case "HeraldKill":
        description = `Arauto do Vale abatido por ${event.KillerName}`;
        break;
      case "TurretKilled":
        description = `Torre destruída: ${event.TurretKilled} por ${event.KillerName}`;
        break;
      case "InhibKilled":
        description = `Inibidor destruído: ${event.InhibKilled}`;
        break;
      case "Multikill":
        description = `Multikill (${event.KillStreak}x) por ${event.KillerName}!`;
        break;
      default:
        description = event.EventName;
    }

    changes.push({
      type: "NEW_EVENT",
      description,
      details: { event },
    });
  }

  // Atualiza o último evento processado
  if (current.events.length > 0) {
    stateManager.lastProcessedEventId = current.events[current.events.length - 1].EventID;
  }
}

function detectEpicItems(
  current: GameSnapshot,
  previous: GameSnapshot,
  changes: DetectedChange[]
): void {
  const allCurrentPlayers = [...current.allies, ...current.enemies];
  const allPreviousPlayers = [...previous.allies, ...previous.enemies];

  for (const currentPlayer of allCurrentPlayers) {
    const prevPlayer = allPreviousPlayers.find((p) => p.riotId === currentPlayer.riotId);
    if (!prevPlayer) continue;

    const newItems = findNewEpicItems(prevPlayer.items, currentPlayer.items);
    for (const item of newItems) {
      changes.push({
        type: "EPIC_ITEM",
        description: `${currentPlayer.championName} (${currentPlayer.team}) comprou ${item.displayName} (${item.price}g)`,
        details: { player: currentPlayer.championName, item },
      });
    }
  }
}

function findNewEpicItems(previousItems: Item[], currentItems: Item[]): Item[] {
  const prevItemIds = new Set(previousItems.map((i) => i.itemID));
  return currentItems.filter(
    (item) =>
      !prevItemIds.has(item.itemID) &&
      !IGNORED_ITEM_IDS.has(item.itemID) &&
      item.price >= SIGNIFICANT_ITEM_MIN_PRICE
  );
}

function detectDeathChanges(
  current: GameSnapshot,
  previous: GameSnapshot,
  changes: DetectedChange[]
): void {
  const allCurrentPlayers = [...current.allies, ...current.enemies];
  const allPreviousPlayers = [...previous.allies, ...previous.enemies];

  for (const currentPlayer of allCurrentPlayers) {
    const prevPlayer = allPreviousPlayers.find((p) => p.riotId === currentPlayer.riotId);
    if (!prevPlayer) continue;

    if (currentPlayer.isDead && !prevPlayer.isDead) {
      const respawn = Math.ceil(currentPlayer.respawnTimer);
      changes.push({
        type: "DEATH_CHANGE",
        description: `${currentPlayer.championName} (${currentPlayer.team}) morreu (respawn em ${respawn}s)`,
        details: { player: currentPlayer.championName, team: currentPlayer.team, respawnTimer: respawn },
      });
    }
  }
}

function detectScoreChanges(
  current: GameSnapshot,
  previous: GameSnapshot,
  changes: DetectedChange[]
): void {
  const myChampion = current.activePlayer.championName;
  const currentMe = findPlayerByChampion(current, myChampion);
  const prevMe = findPlayerByChampion(previous, myChampion);

  if (!currentMe || !prevMe) return;

  const killDiff = currentMe.scores.kills - prevMe.scores.kills;
  const deathDiff = currentMe.scores.deaths - prevMe.scores.deaths;
  const assistDiff = currentMe.scores.assists - prevMe.scores.assists;

  if (killDiff > 0 || deathDiff > 0 || assistDiff > 0) {
    changes.push({
      type: "SCORE_CHANGE",
      description: `Seu KDA atualizado: ${currentMe.scores.kills}/${currentMe.scores.deaths}/${currentMe.scores.assists} (${killDiff > 0 ? `+${killDiff} kill` : ""}${deathDiff > 0 ? ` +${deathDiff} death` : ""}${assistDiff > 0 ? ` +${assistDiff} assist` : ""})`,
      details: {
        kills: currentMe.scores.kills,
        deaths: currentMe.scores.deaths,
        assists: currentMe.scores.assists,
        cs: currentMe.scores.creepScore,
      },
    });
  }
}

function detectLevelUp(
  current: GameSnapshot,
  previous: GameSnapshot,
  changes: DetectedChange[]
): void {
  if (current.activePlayer.level > previous.activePlayer.level) {
    changes.push({
      type: "LEVEL_UP",
      description: `Você subiu para o nível ${current.activePlayer.level}`,
      details: { level: current.activePlayer.level },
    });
  }
}

function detectGoldSpike(
  current: GameSnapshot,
  previous: GameSnapshot,
  stateManager: GameStateManager,
  changes: DetectedChange[]
): void {
  const goldDiff = current.activePlayer.currentGold - previous.activePlayer.currentGold;

  if (Math.abs(goldDiff) >= GOLD_SPIKE_THRESHOLD) {
    changes.push({
      type: "GOLD_SPIKE",
      description: `Variação significativa de ouro: ${goldDiff > 0 ? "+" : ""}${Math.floor(goldDiff)}g (atual: ${Math.floor(current.activePlayer.currentGold)}g)`,
      details: { gold: current.activePlayer.currentGold, diff: goldDiff },
    });
  }
}

function findPlayerByChampion(
  snapshot: GameSnapshot,
  championName: string
): PlayerSnapshot | undefined {
  return (
    snapshot.allies.find((p) => p.championName === championName) ??
    snapshot.enemies.find((p) => p.championName === championName)
  );
}

