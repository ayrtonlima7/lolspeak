# LoLSpeak - Jarvis for League of Legends (v2.5)

Este projeto é um assistente tático avançado (Jarvis) para League of Legends, projetado para fornecer insights estratégicos em tempo real com base nos dados capturados diretamente do cliente do jogo.

## 🚀 Funcionalidades Principais

- **Monitoramento em Tempo Real**: O sistema monitora a API do League of Legends (`Live Client Data`) a cada 5 segundos para detectar o estado da partida.
- **Análise Minuto a Minuto**: Sempre que um novo minuto se inicia, o Jarvis realiza uma análise profunda do estado atual do jogo.
- **Sistema de Checkpoints**: A cada 5 minutos (ex: 5:00, 10:00, 15:00), o Jarvis salva um "checkpoint" para comparar sua evolução de Gold, Farm (CS) e Nível em relação ao estado anterior.
- **Inteligência Artificial (Gemini 1.5/2.0+)**: Utiliza o motor do Google Gemini (via LangChain) para processar o histórico da partida e gerar orientações táticas agressivas e focadas no seu oponente direto de rota.
- **Matchup Direto**: Identifica automaticamente quem é seu adversário de rota comparando as posições (Top, Jungle, Mid, etc.) e analisa os itens e níveis dele para sugerir comportamentos (agressivo, recuado, congelar rota).
- **Feedback por Voz (TTS)**: Os insights são narrados automaticamente usando o sintetizador de voz do Windows, permitindo que você mantenha o foco total na tela.
- **Filtragem Inteligente**: O Jarvis utiliza uma regra de "SILENCE" para evitar falar obviedades ou repetir instruções se nada relevante mudou na partida.

## 🛠️ Tecnologias Utilizadas

- **Node.js & TypeScript**: Core do sistema.
- **LangChain & Google Gemini**: IA para análise de contexto estratégico.
- **Axios**: Integração com a API local do LoL Client.
- **PowerShell (System.Speech)**: Motor de sintetização de voz nativo do Windows.

## 📁 Estrutura do Projeto

- `src/index.ts`: Orquestrador principal que gerencia o loop de monitoramento e a conexão com o jogo.
- `src/services/insight.service.ts`: O "cérebro" do Jarvis. Processa dados brutos em insights estratégicos.
- `src/services/gamedata.service.ts`: Gerencia as chamadas à API do jogo (`https://127.0.0.1:2999`).
- `src/services/speaker.service.ts`: Gerencia a fila de fala e a integração com o PowerShell.
- `src/types/game.ts`: Definições de tipos para os dados do jogo e insights.

## ⚙️ Configuração e Requisitos

### Requisitos
1. **Windows OS**: Necessário para o sistema de voz via PowerShell.
2. **League of Legends**: O jogo deve estar em execução. A opção "Enable Live Client Data" deve estar ativa (padrão do jogo).

### Instalação
1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```
2. Crie um arquivo `.env` na raiz do projeto:
   ```env
   GOOGLE_API_KEY=sua_chave_gemini_aqui
   ```
3. Inicie o Jarvis:
   ```bash
   npm run dev
   ```

## 🧠 Como o Jarvis pensa
O Jarvis atua como um estrategista focado em:
1. **Poder Relativo**: "Você está 2 níveis acima do Mid inimigo, force uma luta agora."
2. **Itemização**: "Oponente fechou corta-cura, evite trocas longas."
3. **Evolução**: Compara sua performance atual com o checkpoint de 5 minutos atrás para validar se você está ganhando vantagem ou ficando para trás.
