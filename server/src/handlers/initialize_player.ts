
import { db } from '../db';
import { playersTable, buildingsTable } from '../db/schema';
import { type InitializePlayerInput, type Player } from '../schema';

export async function initializePlayer(input: InitializePlayerInput): Promise<Player> {
  try {
    // Create player with starting resources
    const playerResult = await db.insert(playersTable)
      .values({
        userId: input.userId,
        wood: 100,
        stone: 50,
        food: 75,
        gold: 25
      })
      .returning()
      .execute();

    const player = playerResult[0];

    // Create starting buildings
    await db.insert(buildingsTable)
      .values([
        {
          playerId: player.id,
          type: 'SAWMILL',
          level: 1
        },
        {
          playerId: player.id,
          type: 'QUARRY',
          level: 1
        },
        {
          playerId: player.id,
          type: 'FARM',
          level: 1
        }
      ])
      .execute();

    return player;
  } catch (error) {
    console.error('Player initialization failed:', error);
    throw error;
  }
}
