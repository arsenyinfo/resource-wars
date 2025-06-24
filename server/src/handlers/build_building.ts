
import { db } from '../db';
import { playersTable, buildingsTable } from '../db/schema';
import { type BuildBuildingInput, type Building } from '../schema';
import { eq } from 'drizzle-orm';

// Building cost configuration
const BUILDING_COSTS = {
  SAWMILL: { wood: 50, stone: 25, food: 0, gold: 0 },
  QUARRY: { wood: 75, stone: 30, food: 0, gold: 0 },
  FARM: { wood: 40, stone: 20, food: 0, gold: 10 },
  BARRACKS: { wood: 100, stone: 50, food: 0, gold: 25 },
  WALLS: { wood: 150, stone: 100, food: 0, gold: 0 },
  MARKET: { wood: 80, stone: 40, food: 0, gold: 50 }
};

export const buildBuilding = async (input: BuildBuildingInput): Promise<Building> => {
  try {
    // Get player's current resources
    const players = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, input.playerId))
      .execute();

    if (players.length === 0) {
      throw new Error('Player not found');
    }

    const player = players[0];
    const cost = BUILDING_COSTS[input.type];

    // Check if player has sufficient resources
    if (player.wood < cost.wood || 
        player.stone < cost.stone || 
        player.food < cost.food || 
        player.gold < cost.gold) {
      throw new Error('Insufficient resources');
    }

    // Deduct resources from player
    await db.update(playersTable)
      .set({
        wood: player.wood - cost.wood,
        stone: player.stone - cost.stone,
        food: player.food - cost.food,
        gold: player.gold - cost.gold
      })
      .where(eq(playersTable.id, input.playerId))
      .execute();

    // Create new building
    const result = await db.insert(buildingsTable)
      .values({
        playerId: input.playerId,
        type: input.type,
        level: 1
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Build building failed:', error);
    throw error;
  }
};
