import type {
  AllGameData,
  ActivePlayerSnapshot,
  PlayerSnapshot,
  GameSnapshot,
  Player,
  Team,
} from "../models/types.js";
import { logger } from "../utils/logger.js";

export class GameStateManager {
  public previousSnapshot: GameSnapshot | null = null;
  public currentSnapshot: GameSnapshot | null = null;

  /** Snapshots acumulados a cada 5 minutos de jogo para análise de tendência */
  public periodicSnapshots: GameSnapshot[] = [];

  /** Último gameTime em que a análise periódica (5 min) foi executada */
  public lastPeriodicAnalysisGameTime: number = 0;

  /** Último EventID processado para não reprocessar eventos antigos */
  public lastProcessedEventId: number = -1;

  /** Ouro anterior do jogador ativo - para detectar spikes */
  public previousGold: number = 0;

  /**
   * Atualiza o estado com novos dados da API.
   * Retorna o snapshot criado.
   */
  update(data: AllGameData): GameSnapshot {
    this.previousSnapshot = this.currentSnapshot;

    const myRiotId = data.activePlayer.riotId;
    const myPlayer = data.allPlayers.find((p) => p.riotId === myRiotId);

    if (!myPlayer) {
      logger.warn("Não foi possível encontrar o jogador ativo na lista de players.");
    }

    const myTeam: Team = myPlayer?.team ?? "ORDER";
    const hasMana = data.activePlayer.championStats.resourceType === "MANA";

    const activePlayerSnapshot: ActivePlayerSnapshot = {
      championName: myPlayer?.championName ?? "Desconhecido",
      team: myTeam,
      position: myPlayer?.position ?? "NONE",
      level: data.activePlayer.level,
      currentGold: data.activePlayer.currentGold,
      currentHealth: data.activePlayer.championStats.currentHealth,
      maxHealth: data.activePlayer.championStats.maxHealth,
      hasMana,
      currentMana: hasMana ? data.activePlayer.championStats.resourceValue : 0,
      maxMana: hasMana ? data.activePlayer.championStats.resourceMax : 0,
      fullRunes: data.activePlayer.fullRunes,
      championStats: data.activePlayer.championStats,
    };

    const allies: PlayerSnapshot[] = [];
    const enemies: PlayerSnapshot[] = [];

    for (const player of data.allPlayers) {
      const ps = this.toPlayerSnapshot(player);
      if (player.team === myTeam) {
        allies.push(ps);
      } else {
        enemies.push(ps);
      }
    }

    const events = data.events.Events;
    const lastEventId = events.length > 0 ? events[events.length - 1].EventID : -1;

    const snapshot: GameSnapshot = {
      gameTime: data.gameData.gameTime,
      activePlayer: activePlayerSnapshot,
      allies,
      enemies,
      events,
      lastEventId,
      timestamp: Date.now(),
    };

    this.currentSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Verifica se é hora de fazer análise periódica (a cada 5 min de gameTime).
   */
  isPeriodicAnalysisDue(): boolean {
    if (!this.currentSnapshot) return false;
    const gameTime = this.currentSnapshot.gameTime;
    const nextDueTime = this.lastPeriodicAnalysisGameTime + 300; // 300s = 5 min
    return gameTime >= nextDueTime;
  }

  /**
   * Registra que a análise periódica foi feita.
   */
  markPeriodicAnalysisDone(): void {
    if (!this.currentSnapshot) return;
    const gameTime = this.currentSnapshot.gameTime;
    // Arredonda para o múltiplo de 300 mais próximo abaixo
    this.lastPeriodicAnalysisGameTime = Math.floor(gameTime / 300) * 300;
    this.periodicSnapshots.push({ ...this.currentSnapshot });
    logger.info(
      `📸 Snapshot periódico salvo (${this.periodicSnapshots.length} total) | gameTime: ${this.formatGameTime(gameTime)}`
    );
  }

  /**
   * Formata gameTime (segundos) para mm:ss
   */
  formatGameTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }

  private toPlayerSnapshot(player: Player): PlayerSnapshot {
    return {
      championName: player.championName,
      riotId: player.riotId,
      team: player.team,
      position: player.position,
      level: player.level,
      isDead: player.isDead,
      items: [...player.items],
      scores: { ...player.scores },
      runes: player.runes,
      summonerSpells: player.summonerSpells,
    };
  }
}

