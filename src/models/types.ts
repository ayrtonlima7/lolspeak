// =============================================
// Tipos do League of Legends Live Client Data API
// =============================================

// --- Active Player ---

export interface Ability {
  abilityLevel?: number;
  displayName: string;
  id: string;
  rawDescription: string;
  rawDisplayName: string;
}

export interface Abilities {
  E: Ability;
  Passive: Ability;
  Q: Ability;
  R: Ability;
  W: Ability;
}

export interface ChampionStats {
  abilityHaste: number;
  abilityPower: number;
  armor: number;
  armorPenetrationFlat: number;
  armorPenetrationPercent: number;
  attackDamage: number;
  attackRange: number;
  attackSpeed: number;
  bonusArmorPenetrationPercent: number;
  bonusMagicPenetrationPercent: number;
  critChance: number;
  critDamage: number;
  currentHealth: number;
  healShieldPower: number;
  healthRegenRate: number;
  lifeSteal: number;
  magicLethality: number;
  magicPenetrationFlat: number;
  magicPenetrationPercent: number;
  magicResist: number;
  maxHealth: number;
  moveSpeed: number;
  omnivamp: number;
  physicalLethality: number;
  physicalVamp: number;
  resourceMax: number;
  resourceRegenRate: number;
  resourceType: string;
  resourceValue: number;
  spellVamp: number;
  tenacity: number;
}

export interface Rune {
  displayName: string;
  id: number;
  rawDescription: string;
  rawDisplayName: string;
}

export interface StatRune {
  id: number;
  rawDescription: string;
}

export interface FullRunes {
  generalRunes: Rune[];
  keystone: Rune;
  primaryRuneTree: Rune;
  secondaryRuneTree: Rune;
  statRunes: StatRune[];
}

export interface ActivePlayer {
  abilities: Abilities;
  championStats: ChampionStats;
  currentGold: number;
  fullRunes: FullRunes;
  level: number;
  riotId: string;
  riotIdGameName: string;
  riotIdTagLine: string;
  summonerName: string;
  teamRelativeColors: boolean;
}

// --- All Players ---

export interface Item {
  canUse: boolean;
  consumable: boolean;
  count: number;
  displayName: string;
  itemID: number;
  price: number;
  rawDescription: string;
  rawDisplayName: string;
  slot: number;
}

export interface PlayerRunes {
  keystone: Rune;
  primaryRuneTree: Rune;
  secondaryRuneTree: Rune;
}

export interface Scores {
  assists: number;
  creepScore: number;
  deaths: number;
  kills: number;
  wardScore: number;
}

export interface SummonerSpell {
  displayName: string;
  rawDescription: string;
  rawDisplayName: string;
}

export interface SummonerSpells {
  summonerSpellOne: SummonerSpell;
  summonerSpellTwo: SummonerSpell;
}

export type Team = "ORDER" | "CHAOS";
export type Position = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "NONE" | "";

export interface Player {
  championName: string;
  isBot: boolean;
  isDead: boolean;
  items: Item[];
  level: number;
  position: Position;
  rawChampionName: string;
  rawSkinName: string;
  respawnTimer: number;
  riotId: string;
  riotIdGameName: string;
  riotIdTagLine: string;
  runes: PlayerRunes;
  scores: Scores;
  skinID: number;
  skinName: string;
  summonerName: string;
  summonerSpells: SummonerSpells;
  team: Team;
}

// --- Events ---

export interface GameEvent {
  EventID: number;
  EventName: string;
  EventTime: number;
  // ChampionKill
  KillerName?: string;
  VictimName?: string;
  Assisters?: string[];
  // DragonKill
  DragonType?: string;
  Stolen?: string;
  // Multikill
  KillStreak?: number;
  // FirstBlood
  Recipient?: string;
  // TurretKill / InhibKill
  TurretKilled?: string;
  InhibKilled?: string;
}

export interface Events {
  Events: GameEvent[];
}

// --- Game Data ---

export interface GameData {
  gameMode: string;
  gameTime: number;
  mapName: string;
  mapNumber: number;
  mapTerrain: string;
}

// --- All Game Data (top-level response) ---

export interface AllGameData {
  activePlayer: ActivePlayer;
  allPlayers: Player[];
  events: Events;
  gameData: GameData;
}

// =============================================
// Tipos internos do Jarbas
// =============================================

export type ChangeType =
  | "NEW_EVENT"
  | "EPIC_ITEM"
  | "DEATH_CHANGE"
  | "SCORE_CHANGE"
  | "LEVEL_UP"
  | "GOLD_SPIKE";

export interface DetectedChange {
  type: ChangeType;
  description: string;
  details?: Record<string, unknown>;
}

export interface PlayerSnapshot {
  championName: string;
  riotId: string;
  team: Team;
  position: Position;
  level: number;
  isDead: boolean;
  items: Item[];
  scores: Scores;
  runes: PlayerRunes;
  summonerSpells: SummonerSpells;
}

export interface ActivePlayerSnapshot {
  championName: string;
  team: Team;
  position: Position;
  level: number;
  currentGold: number;
  currentHealth: number;
  maxHealth: number;
  hasMana: boolean;
  currentMana: number;
  maxMana: number;
  fullRunes: FullRunes;
  championStats: ChampionStats;
}

export interface GameSnapshot {
  gameTime: number;
  activePlayer: ActivePlayerSnapshot;
  allies: PlayerSnapshot[];
  enemies: PlayerSnapshot[];
  events: GameEvent[];
  lastEventId: number;
  timestamp: number;
}

