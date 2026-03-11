import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GameData, Insight } from "../types/game.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export class InsightEngine {
    private model: ChatGoogleGenerativeAI;
    private spokenHistory: string[] = [];
    private checkpoints: GameData[] = [];

    constructor(apiKey: string) {
        this.model = new ChatGoogleGenerativeAI({
            apiKey: apiKey,
            model: "gemini-2.5-flash",
            temperature: 0.5,
        });
    }

    async generateInsights(history: GameData[]): Promise<Insight[]> {
        if (history.length === 0) return [];

        const currentSnapshot = history[history.length - 1];
        const currentTimeMinutes = Math.floor(currentSnapshot.gameData.gameTime / 60);

        // Manage Checkpoints: Every 5 minutes of game time
        if (currentTimeMinutes > 0 && currentTimeMinutes % 5 === 0) {
            const alreadyHasCheckpoint = this.checkpoints.some(c => Math.floor(c.gameData.gameTime / 60) === currentTimeMinutes);
            if (!alreadyHasCheckpoint) {
                this.checkpoints.push(currentSnapshot);
                console.log(`[Jarvis]: Checkpoint de 5 minutos salvo (Minuto ${currentTimeMinutes}).`);
            }
        }

        const activePlayer = currentSnapshot.allPlayers.find(p =>
            p.riotId === currentSnapshot.activePlayer.riotId ||
            p.summonerName === currentSnapshot.activePlayer.summonerName
        );

        if (!activePlayer) return [];

        const enemyOpponent = currentSnapshot.allPlayers.find(p => p.team !== activePlayer.team && p.position === activePlayer.position);

        // Find the last checkpoint for comparison
        const lastCheckpoint = [...this.checkpoints]
            .filter(c => Math.floor(c.gameData.gameTime / 60) < currentTimeMinutes)
            .pop();

        let comparisonData = "";
        if (lastCheckpoint) {
            const oldActive = lastCheckpoint.allPlayers.find(p => p.riotId === activePlayer.riotId || p.summonerName === activePlayer.summonerName);
            const oldEnemy = lastCheckpoint.allPlayers.find(p => p.team !== activePlayer.team && p.position === (activePlayer.position || oldActive?.position));

            if (oldActive) {
                const goldDiff = currentSnapshot.activePlayer.currentGold - lastCheckpoint.activePlayer.currentGold;
                const csDiff = activePlayer.scores.creepScore - oldActive.scores.creepScore;
                const levelDiff = activePlayer.level - oldActive.level;

                comparisonData = `
                COMPARATIVO COM O CHECKPOINT ANTERIOR (Minuto ${Math.floor(lastCheckpoint.gameData.gameTime / 60)}):
                - Evolução Gold: ${goldDiff >= 0 ? "+" : ""}${goldDiff}
                - Evolução Farm: ${csDiff >= 0 ? "+" : ""}${csDiff} CS
                - Evolução Level: ${levelDiff >= 0 ? "+" : ""}${levelDiff}
                - Inimigo Direto (${enemyOpponent?.championName || "Desconhecido"}): Level ${enemyOpponent?.level || "?"} (era ${oldEnemy?.level || "?"}), Itens Atuais: ${enemyOpponent?.items.map(i => i.displayName).join(", ") || "Nenhum"}
                `;
            }
        }

        const systemPrompt = `
            VOCÊ É O JARVIS CORE: ESTRATEGISTA-CHEFE PARA JOGADORES DE LEAGUE OF LEGENDS.
            Sua missão é analisar o estado da partida e fornecer insights táticos curtos e agressivos.

            FOCO PRINCIPAL:
            - Comportamento do ActivePlayer perante as situações adversárias.
            - Como lidar com o oponente de rota e ameaças do time inimigo.
            - Insights baseados em evolução de Gold, Farm, Level e Itemização.

            REFERÊNCIA DE FORMATO (Exemplos):
            - "01:00 = 'A partida começou... win rate de [enemy] contra você é 54%, cuidado level 3.'"
            - "05:00 CHECKPOINT = 'Você está com 230 gold, compre [item] para counterar [enemy].'"
            - "10:00 CHECKPOINT = '[enemy] fechou power spike, jogue recuado e peça ajuda.'"

            REGRAS DE RESPOSTA:
            - Seja "curto e grosso". Máximo 50 palavras por insight.
            - Seja EXTREMAMENTE PRECISO com itens. Fale APENAS do que está no JSON fornecido. Nunca assuma que o jogador tem um item (como Fulgor/Sheen) se ele não estiver explicitamente na lista 'meusItens' ou 'inimigoItens'.
            - Priorize orientações de COMPORTAMENTO (ex: jogue agressivo, recuado, congele a rota, foque objetivo).
            - Se for um minuto de CHECKPOINT (múltiplo de 5), inicie com "[Tempo] CHECKPOINT =".
            - Se for um minuto normal, inicie com "[Tempo] =".
            - Se nada relevante mudou, diga "SILENCE".
            - Idioma: Português do Brasil.


            Seu histórico de falas recentes: [${this.spokenHistory.slice(-3).join(" | ")}]
        `;

        const currentDataSummary = {
            minuto: currentTimeMinutes,
            meuChampion: activePlayer.championName,
            meuGold: currentSnapshot.activePlayer.currentGold,
            meuLevel: activePlayer.level,
            meuFarm: activePlayer.scores.creepScore,
            meusItens: activePlayer.items.map(i => i.displayName),
            inimigoChampion: enemyOpponent?.championName,
            inimigoLevel: enemyOpponent?.level,
            inimigoFarm: enemyOpponent?.scores.creepScore,
            inimigoItens: enemyOpponent?.items.map(i => i.displayName),
            vivosTime: currentSnapshot.allPlayers.filter(p => p.team === activePlayer.team && !p.isDead).length,
            vivosInimigo: currentSnapshot.allPlayers.filter(p => p.team !== activePlayer.team && !p.isDead).length
        };

        try {
            const response = await this.model.invoke([
                new SystemMessage(systemPrompt),
                new HumanMessage(`
                    DADOS ATUAIS (MINUTO ${currentTimeMinutes}):
                    ${JSON.stringify(currentDataSummary, null, 2)}
                    
                    ${comparisonData}
                    
                    Analise a situação e me dê o insight de comportamento focado no oponente.
                `)
            ]);

            const content = (response.content as string).trim();
            
            if (content.toUpperCase().includes("SILENCE") || content.length < 5) return [];
            if (this.spokenHistory.includes(content)) return [];

            this.spokenHistory.push(content);
            return [{ id: Date.now().toString(), text: content, priority: 1, category: "MATCHUP" }];
        } catch (error) {
            console.error("Erro na API do Gemini:", error);
            return [];
        }
    }

    public reset(): void {
        this.spokenHistory = [];
        this.checkpoints = [];
        console.log("[Jarvis]: Memória da partida resetada.");
    }
}
