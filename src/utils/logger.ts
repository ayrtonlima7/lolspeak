import fs from "node:fs";
import path from "node:path";

const LOGS_DIR = path.resolve("logs");
const LOG_FILE = path.join(LOGS_DIR, "jarbas.log");

// Garante que a pasta logs/ exista
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m",
};

function timestamp(): string {
  return new Date().toLocaleTimeString("pt-BR");
}

function writeToFile(message: string, gameTime?: string): void {
  const gt = gameTime ? ` [${gameTime}]` : "";
  const line = `[${timestamp()}]${gt} ${message}\n`;
  fs.appendFileSync(LOG_FILE, line, "utf-8");
}

export const logger = {
  info(message: string): void {
    console.log(`${colors.cyan}[${timestamp()}] ℹ ${message}${colors.reset}`);
  },

  warn(message: string): void {
    console.log(`${colors.yellow}[${timestamp()}] ⚠ ${message}${colors.reset}`);
  },

  error(message: string): void {
    console.log(`${colors.red}[${timestamp()}] ✖ ${message}${colors.reset}`);
  },

  insight(message: string, gameTime?: string): void {
    const gt = gameTime ? ` [${gameTime}]` : "";
    console.log(
      `\n${colors.magenta}[${timestamp()}]${gt} 🧠 JARBAS: ${message}${colors.reset}\n`
    );
    writeToFile(`[INSIGHT] ${message}`, gameTime);
  },

  debug(message: string): void {
    console.log(`${colors.gray}[${timestamp()}] 🔍 ${message}${colors.reset}`);
  },

  event(message: string): void {
    console.log(`${colors.green}[${timestamp()}] ⚡ ${message}${colors.reset}`);
  },
};

