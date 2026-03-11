import "dotenv/config";
import { GameMonitor } from "./monitor/gameMonitor.js";
import { logger } from "./utils/logger.js";

// Validar variáveis de ambiente
if (!process.env.GOOGLE_API_KEY) {
  logger.error("GOOGLE_API_KEY não configurada! Crie um arquivo .env com a chave.");
  logger.info("Exemplo: GOOGLE_API_KEY=sua_chave_aqui");
  process.exit(1);
}

// Inicializar monitor
const monitor = new GameMonitor();

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Recebido SIGINT, encerrando...");
  monitor.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("Recebido SIGTERM, encerrando...");
  monitor.stop();
  process.exit(0);
});

// ASCII art banner
console.log(`
     ╦╔═╗╦═╗╔╗ ╔═╗╔═╗
     ║╠═╣╠╦╝╠╩╗╠═╣╚═╗
    ╚╝╩ ╩╩╚═╚═╝╩ ╩╚═╝
  Assistente Tático para LoL
  ─────────────────────────
`);

// Iniciar
monitor.start();

