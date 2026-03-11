import fs from "fs/promises";
import path from "path";
import axios from "axios";
import https from "https";
import { GameData } from "../types/game.js";

export class GameDataService {
    private readonly endpointsDir = path.join(process.cwd(), "endpoints");
    private readonly baseUrl = "https://127.0.0.1:2999/liveclientdata/allgamedata";
    private readonly statsUrl = "https://127.0.0.1:2999/liveclientdata/gamestats";
    private readonly agent = new https.Agent({ rejectUnauthorized: false });

    async getLiveGameData(): Promise<GameData | null> {
        try {
            const response = await axios.get(this.baseUrl, { httpsAgent: this.agent, timeout: 2000 });
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async getGameStats(): Promise<{ gameTime: number } | null> {
        try {
            const response = await axios.get(this.statsUrl, { httpsAgent: this.agent, timeout: 2000 });
            return response.data;
        } catch (error) {
            return null;
        }
    }

    async getTestData(): Promise<GameData> {
        const filePath = path.join(this.endpointsDir, "all-game-data.json");
        const data = await fs.readFile(filePath, "utf-8");
        const cleanedData = data.replace(/\/\/.*/g, "");
        return JSON.parse(cleanedData);
    }
}
