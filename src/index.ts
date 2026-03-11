import "dotenv/config";
import { GameDataService } from "./services/gamedata.service.js";
import { InsightEngine } from "./services/insight.service.js";
import { SpeakerService } from "./services/speaker.service.js";
import { GameData } from "./types/game.js";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    console.log("LoLSpeak Jarvis is starting...");

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
        console.error("Please provide a valid GOOGLE_API_KEY in the .env file.");
        return;
    }

    const gameDataService = new GameDataService();
    const insightEngine = new InsightEngine(apiKey);
    const speakerService = new SpeakerService();

    const snapshotHistory: GameData[] = [];
    let isConnected = false;
    let lastProcessedMinute = -1;

    console.log("Jarvis: Aguardando conexão com o League of Legends...");

    while (true) {
        try {
            // Poll for game stats every 5 seconds (lighter endpoint)
            let stats = await gameDataService.getGameStats();
            
            if (!stats) {
                if (!isConnected) {
                    process.stdout.write(".");
                    await sleep(5000);
                    continue;
                } else {
                    console.log("\nConexão com o jogo perdida. Tentando reconectar...");
                    isConnected = false;
                    lastProcessedMinute = -1; // Reset last minute on disconnect
                    await sleep(5000);
                    continue;
                }
            }

            if (!isConnected) {
                console.log("\nConectado ao League of Legends!");
                isConnected = true;
                // Reset history for a new game
                snapshotHistory.length = 0;
                insightEngine.reset();
                lastProcessedMinute = -1;
            }

            // Trigger insight 15 seconds BEFORE the new minute mark to compensate for API delay
            const targetMinute = Math.floor((stats.gameTime + 15) / 60);

            if (targetMinute > lastProcessedMinute) {
                lastProcessedMinute = targetMinute;

                // For the minute insight, we fetch the full game data
                let data = await gameDataService.getLiveGameData();
                if (data) {
                    snapshotHistory.push(data);
                    console.log(`\n[${new Date().toLocaleTimeString()}] Snapshot #${snapshotHistory.length} capturado (Antecipação para Minuto ${targetMinute}). Analisando...`);

                    const insights = await insightEngine.generateInsights(snapshotHistory);

                    for (const insight of insights) {
                        console.log(`[Jarvis]: ${insight.text}`);
                        
                        const lines = insight.text.split(/[\r\n]+/).filter(l => l.trim().length > 0);
                        for (const line of lines) {
                            await speakerService.speak(line);
                        }
                    }
                }
            }

            // Always wait 5 seconds as requested for polling
            await sleep(5000);

        } catch (error) {
            console.error("\nErro no loop principal:", (error as any).message);
            await sleep(5000);
        }
    }
}

main().catch(console.error);
