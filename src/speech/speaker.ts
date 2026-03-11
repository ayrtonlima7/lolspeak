import { execFile } from "node:child_process";
import { logger } from "../utils/logger.js";

/**
 * Fala o texto usando o sintetizador de voz nativo do Windows (System.Speech).
 * Retorna uma Promise que resolve quando a fala terminar.
 */
export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    // Sanitiza o texto para uso seguro no PowerShell
    const sanitized = text
      .replace(/'/g, "''")   // Escapa aspas simples
      .replace(/\r?\n/g, " ") // Remove quebras de linha
      .replace(/"/g, "'")     // Troca aspas duplas por simples
      .trim();

    if (!sanitized) {
      resolve();
      return;
    }

    const psCommand = `
      Add-Type -AssemblyName System.Speech;
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $synth.Rate = 2;
      $synth.Speak('${sanitized}');
      $synth.Dispose();
    `;

    logger.debug("Iniciando TTS...");

    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", psCommand],
      { timeout: 30000 },
      (error) => {
        if (error) {
          logger.error(`Erro no TTS: ${error.message}`);
        }
        resolve(); // Resolve mesmo com erro para não travar o fluxo
      }
    );
  });
}

