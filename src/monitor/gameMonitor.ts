import { fetchAllGameData } from "../api/client.js";
import { GameStateManager } from "../state/gameState.js";
import { detectChanges } from "./changeDetector.js";
import { getReactiveInsight, getPeriodicInsight } from "../ai/geminiService.js";
import { speak } from "../speech/speaker.js";
import { logger } from "../utils/logger.js";

const POLL_INTERVAL_MS = 5000;
const STALENESS_THRESHOLD_S = 30;

export class GameMonitor {
  private stateManager: GameStateManager;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isProcessing: boolean = false;
  private isRunning: boolean = false;

  constructor() {
    this.stateManager = new GameStateManager();
  }

  /**
   * Inicia o monitoramento da partida.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info("🚀 Jarbas iniciado! Monitorando partida...");
    this.schedulePoll();
  }

  /**
   * Para o monitoramento.
   */
  stop(): void {
    this.isRunning = false;
    this.clearPoll();
    logger.info("🛑 Jarbas encerrado.");
  }

  private schedulePoll(): void {
    this.clearPoll();
    if (!this.isRunning) return;

    this.pollTimer = setInterval(async () => {
      await this.tick();
    }, POLL_INTERVAL_MS);
  }

  private clearPoll(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Ciclo principal: fetch → update → detect → (insight + speak) → resume.
   */
  private async tick(): Promise<void> {
    // Evita chamadas concorrentes
    if (this.isProcessing) return;

    try {
      // 1. Buscar dados da API
      const data = await fetchAllGameData();
      if (!data) return; // Jogo não está rodando

      // 2. Atualizar estado
      const snapshot = this.stateManager.update(data);
      const gameTime = this.stateManager.formatGameTime(snapshot.gameTime);

      // 3. Detectar mudanças significativas
      const changes = detectChanges(this.stateManager);

      // 4. Verificar se análise periódica é necessária
      const periodicDue = this.stateManager.isPeriodicAnalysisDue();

      // Se não houve mudanças e não precisa de análise periódica, segue
      if (changes.length === 0 && !periodicDue) return;

      // ========= PAUSAR POLLING =========
      this.isProcessing = true;
      this.clearPoll();

      if (changes.length > 0) {
        logger.event(
          `[${gameTime}] ${changes.length} mudança(s) detectada(s): ${changes.map((c) => c.type).join(", ")}`
        );
      }

      // 5. Gerar insight reativo (se houver mudanças)
      if (changes.length > 0) {
        await this.processReactiveInsight(changes, snapshot);
      }

      // 6. Gerar insight periódico (se necessário)
      if (periodicDue) {
        this.stateManager.markPeriodicAnalysisDone();
        await this.processPeriodicInsight();
      }
    } catch (error) {
      logger.error(`Erro no ciclo principal: ${error}`);
    } finally {
      // ========= RETOMAR POLLING =========
      this.isProcessing = false;
      if (this.isRunning) {
        this.schedulePoll();
      }
    }
  }

  /**
   * Processa um insight reativo: chama Gemini, verifica staleness, loga e fala.
   */
  private async processReactiveInsight(
    changes: Parameters<typeof getReactiveInsight>[0],
    snapshot: Parameters<typeof getReactiveInsight>[1]
  ): Promise<void> {
    const insightTime = snapshot.gameTime;

    logger.info("🤖 Gerando insight reativo...");
    const insight = await getReactiveInsight(changes, snapshot);

    if (!insight) {
      logger.warn("Insight vazio recebido da IA.");
      return;
    }

    // Verificar se o insight ficou obsoleto
    if (await this.isStale(insightTime)) {
      logger.warn("⏭️ Insight descartado por estar desatualizado.");
      return;
    }

    logger.insight(insight, this.stateManager.formatGameTime(insightTime));
    await speak(insight);
  }

  /**
   * Processa um insight periódico (análise de tendência).
   */
  private async processPeriodicInsight(): Promise<void> {
    const snapshots = this.stateManager.periodicSnapshots;
    if (snapshots.length === 0) return;

    const insightTime = snapshots[snapshots.length - 1].gameTime;

    logger.info("📊 Gerando análise periódica...");
    const insight = await getPeriodicInsight(snapshots);

    if (!insight) {
      logger.warn("Insight periódico vazio recebido da IA.");
      return;
    }

    // Verificar staleness
    if (await this.isStale(insightTime)) {
      logger.warn("⏭️ Análise periódica descartada por estar desatualizada.");
      return;
    }

    logger.insight(`[ANÁLISE PERIÓDICA] ${insight}`, this.stateManager.formatGameTime(insightTime));
    await speak(insight);
  }

  /**
   * Verifica se um insight ficou obsoleto comparando com o gameTime atual.
   */
  private async isStale(insightGameTime: number): Promise<boolean> {
    try {
      const freshData = await fetchAllGameData();
      if (!freshData) return false;

      const currentGameTime = freshData.gameData.gameTime;
      return currentGameTime - insightGameTime > STALENESS_THRESHOLD_S;
    } catch {
      return false;
    }
  }
}

