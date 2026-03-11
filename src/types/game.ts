export interface Item {
    itemID: number;
    displayName: string;
    price: number;
    slot: number;
    count: number;
}

export interface Player {
    championName: string;
    isDead: boolean;
    items: Item[];
    level: number;
    position: string;
    team: "ORDER" | "CHAOS";
    summonerName: string;
    riotId: string;
    scores: {
        kills: number;
        deaths: number;
        assists: number;
        creepScore: number;
    };
}

export interface GameData {
    activePlayer: {
        championStats: any;
        currentGold: number;
        level: number;
        summonerName: string;
        riotId: string;
    };
    allPlayers: Player[];
    gameData: {
        gameTime: number;
    };
    events: {
        Events: any[];
    };
}

export interface Insight {
    id: string;
    text: string;
    priority: number; // 1 (high) to 3 (low)
    category: "ITEM" | "POWER_SPIKE" | "MATCHUP" | "GOLD";
}
