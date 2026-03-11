import axios, { type AxiosInstance } from "axios";
import https from "node:https";
import type { AllGameData } from "../models/types.js";
import { logger } from "../utils/logger.js";

const LOL_BASE_URL = "https://127.0.0.1:2999/liveclientdata";

const client: AxiosInstance = axios.create({
  baseURL: LOL_BASE_URL,
  timeout: 3000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
});

export async function fetchAllGameData(): Promise<AllGameData | null> {
  try {
    const response = await client.get<AllGameData>("/allgamedata");
    return response.data;
  } catch {
    logger.warn("Não foi possível conectar à API do LoL. O jogo está aberto?");
    return null;
  }
}

