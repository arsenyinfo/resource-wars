
import { db } from '../db';
import { playersTable, buildingsTable } from '../db/schema';
import { type EndTurnInput, type Player } from '../schema';
import { eq } from 'drizzle-orm';

export async function endTurn(input: EndTurnInput): Promise<Player> {
  try {
    // Fetch player's current state
    const players = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, input.playerId))
      .execute();

    if (players.length === 0) {
      throw new Error(`Player with id ${input.playerId} not found`);
    }

    const player = players[0];

    // Fetch player's buildings
    const buildings = await db.select()
      .from(buildingsTable)
      .where(eq(buildingsTable.playerId, input.playerId))
      .execute();

    // Calculate resource production based on building types and levels
    let woodProduction = 0;
    let stoneProduction = 0;
    let foodProduction = 0;
    let goldProduction = 0;

    for (const building of buildings) {
      switch (building.type) {
        case 'SAWMILL':
          woodProduction += building.level * 10;
          break;
        case 'QUARRY':
          stoneProduction += building.level * 8;
          break;
        case 'FARM':
          foodProduction += building.level * 12;
          break;
        case 'MARKET':
          goldProduction += building.level * 5;
          break;
        // BARRACKS and WALLS don't produce resources
      }
    }

    // Update player's resource counts
    const updatedPlayers = await db.update(playersTable)
      .set({
        wood: player.wood + woodProduction,
        stone: player.stone + stoneProduction,
        food: player.food + foodProduction,
        gold: player.gold + goldProduction
      })
      .where(eq(playersTable.id, input.playerId))
      .returning()
      .execute();

    return updatedPlayers[0];
  } catch (error) {
    console.error('End turn failed:', error);
    throw error;
  }
}
