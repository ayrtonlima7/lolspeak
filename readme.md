# 🧠 Jarbas — Assistente Tático para League of Legends

Jarbas é um assistente tático avançado (Jarvis) para League of Legends, projetado para fornecer insights estratégicos em tempo real e dialogar estratégias com o jogador durante a partida.

## 📋 Visão Geral

O sistema monitora a **API Live Client Data** do League of Legends a cada **5 segundos**, capturando o estado completo da partida. Quando detecta **mudanças significativas**, consulta a IA (Google Gemini) para gerar insights táticos contextuais, que são exibidos no terminal e **falados em voz alta** usando o sintetizador de voz nativo do Windows.

## 🛠️ Tecnologias Utilizadas

- **Node.js & TypeScript** — Core do sistema
- **LangChain & Google Gemini 2.5 Flash** — IA para análise de contexto estratégico
- **Axios** — Integração com a API local do LoL Client (`https://127.0.0.1:2999`)
- **PowerShell (System.Speech)** — Motor de sintetização de voz nativo do Windows

## 🎯 Dados Monitorados

### Active Player
| Propriedade | Descrição |
|---|---|
| `championStats` | Status do campeão: `currentHealth`, `maxHealth`, `resourceType`, `resourceValue`, `resourceMax` (mana condicional — só se `resourceType === "MANA"`) |
| `currentGold` | Quantidade de ouro atual do campeão |
| `fullRunes` | Runas selecionadas pelo campeão |
| `riotId` | Identificador do jogador (usado para cruzar com `allPlayers`) |

### All Players
| Propriedade | Descrição |
|---|---|
| `championName` | Nome do campeão de cada jogador |
| `isDead` | Se o campeão está vivo ou morto |
| `items` | Itens do inventário (`price`, `displayName`) — indica força do campeão |
| `level` | Nível atual do campeão |
| `position` | Posição na partida: `TOP`, `JUNGLE`, `MIDDLE`, `BOTTOM`, `UTILITY` |
| `runes` | Runas do jogador |
| `scores` | KDA (`kills`, `deaths`, `assists`), `creepScore`, `wardScore` |
| `team` | Time: `ORDER` (azul) ou `CHAOS` (vermelho) |

### Events
Eventos importantes: `ChampionKill`, `FirstBlood`, `DragonKill`, `BaronKill`, `HeraldKill`, `TurretKilled`, `InhibKilled`, `Multikill`.

### Game Data
| Propriedade | Descrição |
|---|---|
| `gameTime` | Tempo de jogo em segundos |
| `gameMode` | Modo de jogo |

## ⚙️ Fluxo de Funcionamento

```
┌─────────────────────────────────────────────────┐
│              CICLO PRINCIPAL (5s)                │
├─────────────────────────────────────────────────┤
│                                                 │
│  1. GET /allgamedata                            │
│  2. Atualizar estado (snapshot)                 │
│  3. Detectar mudanças significativas            │
│  4. Verificar análise periódica (5 min)         │
│                                                 │
│  Se houve mudança:                              │
│    ├── PAUSAR polling                           │
│    ├── Chamar Gemini (insight reativo)          │
│    ├── Verificar staleness (>30s = descartado)  │
│    ├── Logar insight                            │
│    ├── Falar insight (TTS)                      │
│    └── RETOMAR polling                          │
│                                                 │
│  Se análise periódica devida (5 min):           │
│    ├── Salvar snapshot no array periódico       │
│    ├── Chamar Gemini (análise de tendência)     │
│    ├── Logar e falar insight                    │
│    └── RETOMAR polling                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Mudanças Significativas Detectadas

- **Novos eventos** — Abates, dragões, barões, torres, multikills, first blood
- **Itens significativos** — Compra de itens com preço ≥ 800g por qualquer jogador
- **Mortes** — Quando qualquer campeão morre (inclui tempo de respawn)
- **Score** — Mudanças no KDA do jogador ativo
- **Level up** — Subida de nível do jogador ativo
- **Gold spike** — Variação de ≥ 500g no ouro do jogador ativo

### Análise Periódica (5 min)

A cada 5 minutos de `gameTime`, o sistema salva um snapshot completo em um array duradouro e gera uma análise de tendência. Isso permite acompanhar a evolução da partida e saber se o jogador está com vantagem ou desvantagem.

### Controle de Sobreposição e Staleness

- Os insights **não se sobrepõem** — o polling é pausado durante o processamento da IA e TTS
- Se um insight demorar para ser gerado e o `gameTime` avançar mais de **30 segundos**, ele é **descartado** para evitar informações desatualizadas

### Regras da IA (System Prompt)

- **Sugestões, não comandos** — Jarbas apresenta possibilidades e opções ao invés de dar ordens diretas
- **Sem leash** — No patch atual (2025+), junglers não precisam de leash. Jarbas nunca sugere pedir leash
- **Fog of War** — Jarbas não assume que um jungler inimigo está atrasado só por aparecer com nível baixo no início; pode estar simplesmente fora de visão
- **Timers de objetivos** — Void Grubs/Dragão: 5:00 | Arauto: 14:00 | Barão: 20:00. Jarbas nunca menciona um objetivo antes do spawn
- **Respawn Timer** — Quando um campeão está morto, Jarbas considera o `respawnTimer` para saber se dá tempo de agir antes do campeão voltar (< 10s = prestes a renascer)
- **Sem repetição** — Jarbas evita repetir o mesmo conselho consecutivamente

## 📁 Estrutura do Projeto

```
lolspeak/
├── .env                        # Variáveis de ambiente (GOOGLE_API_KEY)
├── .env.example                # Template das variáveis
├── package.json
├── tsconfig.json
├── logs/                       # Logs e relatórios (gerados em runtime)
│   ├── jarbas.log              # Log dos insights
│   └── *.md                    # Relatórios de análise pós-partida
├── endpoints/                  # JSONs de exemplo dos endpoints da API
│   ├── all-game-data.json
│   ├── event-data.json
│   ├── game-stats.json
│   ├── player-list.json
│   ├── player-data.json
│   ├── active-player-abilities.json
│   ├── active-player-name.json
│   └── active-player-runes.json
└── src/
    ├── index.ts                # Entry point
    ├── api/
    │   └── client.ts           # Axios client para a API do LoL
    ├── ai/
    │   ├── geminiService.ts    # Integração LangChain + Gemini
    │   └── prompts.ts          # System prompt e templates de prompt
    ├── models/
    │   └── types.ts            # Interfaces TypeScript
    ├── monitor/
    │   ├── gameMonitor.ts      # Loop de monitoramento principal
    │   └── changeDetector.ts   # Lógica de detecção de mudanças
    ├── speech/
    │   └── speaker.ts          # TTS via PowerShell (System.Speech)
    ├── state/
    │   └── gameState.ts        # Gerenciamento de estado da partida
    └── utils/
        └── logger.ts           # Utilitário de logging
```

## 🚀 Como Usar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave da API do Google Gemini:

```
GOOGLE_API_KEY=sua_chave_aqui
```

### 3. Executar em modo de desenvolvimento

```bash
npm run dev
```

### 4. Build e execução

```bash
npm run build
npm start
```

### 5. Iniciar uma partida no League of Legends

O Jarbas irá detectar automaticamente quando uma partida estiver ativa e começará a monitorar.

## 📝 Observações

- A API Live Client Data do LoL só está disponível quando uma partida está em andamento
- O certificado SSL da API é auto-assinado — o Axios está configurado para aceitar (`rejectUnauthorized: false`)
- O TTS utiliza `System.Speech` do Windows — funciona apenas em Windows
- Os insights são gerados em **português brasileiro**
- O log dos insights é salvo em `logs/jarbas.log`
- Relatórios de análise pós-partida ficam em `logs/`
