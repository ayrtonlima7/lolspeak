import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { DetectedChange, GameSnapshot } from "../models/types.js";
import { SYSTEM_PROMPT, buildReactivePrompt, buildPeriodicPrompt } from "./prompts.js";
import { logger } from "../utils/logger.js";

let model: ChatGoogleGenerativeAI | null = null;

function getModel(): ChatGoogleGenerativeAI {
  if (!model) {
    model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0.7,
      apiKey: process.env.GOOGLE_API_KEY,
    });
  }
  return model;
}

/**
 * Gera insight reativo com base em mudanças detectadas.
 */
export async function getReactiveInsight(
  changes: DetectedChange[],
  snapshot: GameSnapshot
): Promise<string> {
  try {
    const userPrompt = buildReactivePrompt(changes, snapshot);
    const llm = getModel();

    const response = await llm.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(userPrompt),
    ]);

    return typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  } catch (error) {
    logger.error(`Erro ao gerar insight reativo: ${error}`);
    return "";
  }
}

/**
 * Gera insight periódico (análise de tendência a cada 5 min).
 */
export async function getPeriodicInsight(
  snapshots: GameSnapshot[]
): Promise<string> {
  try {
    const userPrompt = buildPeriodicPrompt(snapshots);
    const llm = getModel();

    const response = await llm.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(userPrompt),
    ]);

    return typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  } catch (error) {
    logger.error(`Erro ao gerar insight periódico: ${error}`);
    return "";
  }
}

