
import { db } from '../db';
import { playersTable, buildingsTable, unitsTable } from '../db/schema';
import { type GetPlayerStateInput, type PlayerState } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPlayerState(input: GetPlayerStateInput): Promise<PlayerState> {
  try {
    // Get player data
    const players = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, input.playerId))
      .execute();

    if (players.length === 0) {
      throw new Error(`Player with id ${input.playerId} not found`);
    }

    const player = players[0];

    // Get player's buildings
    const buildings = await db.select()
      .from(buildingsTable)
      .where(eq(buildingsTable.playerId, input.playerId))
      .execute();

    // Get player's units
    const units = await db.select()
      .from(unitsTable)
      .where(eq(unitsTable.playerId, input.playerId))
      .execute();

    return {
      player,
      buildings,
      units
    };
  } catch (error) {
    console.error('Failed to get player state:', error);
    throw error;
  }
}
