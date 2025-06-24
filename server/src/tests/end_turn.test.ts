
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable, buildingsTable } from '../db/schema';
import { type EndTurnInput } from '../schema';
import { endTurn } from '../handlers/end_turn';
import { eq } from 'drizzle-orm';

describe('endTurn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should process end turn for player with no buildings', async () => {
    // Create a test player
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user-1',
        wood: 100,
        stone: 50,
        food: 75,
        gold: 25
      })
      .returning()
      .execute();

    const player = playerResult[0];
    const input: EndTurnInput = { playerId: player.id };

    const result = await endTurn(input);

    // Resources should remain unchanged with no buildings
    expect(result.wood).toEqual(100);
    expect(result.stone).toEqual(50);
    expect(result.food).toEqual(75);
    expect(result.gold).toEqual(25);
    expect(result.id).toEqual(player.id);
  });

  it('should calculate resource production from buildings', async () => {
    // Create a test player
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user-2',
        wood: 0,
        stone: 0,
        food: 0,
        gold: 0
      })
      .returning()
      .execute();

    const player = playerResult[0];

    // Create buildings for the player
    await db.insert(buildingsTable)
      .values([
        { playerId: player.id, type: 'SAWMILL', level: 2 }, // 2 * 10 = 20 wood
        { playerId: player.id, type: 'QUARRY', level: 3 },  // 3 * 8 = 24 stone
        { playerId: player.id, type: 'FARM', level: 1 },    // 1 * 12 = 12 food
        { playerId: player.id, type: 'MARKET', level: 2 },  // 2 * 5 = 10 gold
        { playerId: player.id, type: 'BARRACKS', level: 1 } // No resource production
      ])
      .execute();

    const input: EndTurnInput = { playerId: player.id };

    const result = await endTurn(input);

    // Check resource production calculations
    expect(result.wood).toEqual(20);  // 2 * 10
    expect(result.stone).toEqual(24); // 3 * 8
    expect(result.food).toEqual(12);  // 1 * 12
    expect(result.gold).toEqual(10);  // 2 * 5
  });

  it('should add production to existing resources', async () => {
    // Create a test player with existing resources
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user-3',
        wood: 50,
        stone: 30,
        food: 40,
        gold: 15
      })
      .returning()
      .execute();

    const player = playerResult[0];

    // Create a sawmill that produces 10 wood
    await db.insert(buildingsTable)
      .values({ playerId: player.id, type: 'SAWMILL', level: 1 })
      .execute();

    const input: EndTurnInput = { playerId: player.id };

    const result = await endTurn(input);

    // Check that production is added to existing resources
    expect(result.wood).toEqual(60);  // 50 + 10
    expect(result.stone).toEqual(30); // unchanged
    expect(result.food).toEqual(40);  // unchanged
    expect(result.gold).toEqual(15);  // unchanged
  });

  it('should update player in database', async () => {
    // Create a test player
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user-4',
        wood: 0,
        stone: 0,
        food: 0,
        gold: 0
      })
      .returning()
      .execute();

    const player = playerResult[0];

    // Create a market that produces 5 gold
    await db.insert(buildingsTable)
      .values({ playerId: player.id, type: 'MARKET', level: 1 })
      .execute();

    const input: EndTurnInput = { playerId: player.id };

    await endTurn(input);

    // Verify the database was updated
    const updatedPlayers = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, player.id))
      .execute();

    expect(updatedPlayers).toHaveLength(1);
    expect(updatedPlayers[0].gold).toEqual(5);
  });

  it('should throw error for non-existent player', async () => {
    const input: EndTurnInput = { playerId: 999 };

    expect(endTurn(input)).rejects.toThrow(/Player with id 999 not found/i);
  });

  it('should handle multiple buildings of same type', async () => {
    // Create a test player
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user-5',
        wood: 0,
        stone: 0,
        food: 0,
        gold: 0
      })
      .returning()
      .execute();

    const player = playerResult[0];

    // Create multiple sawmills
    await db.insert(buildingsTable)
      .values([
        { playerId: player.id, type: 'SAWMILL', level: 1 }, // 10 wood
        { playerId: player.id, type: 'SAWMILL', level: 2 }, // 20 wood
        { playerId: player.id, type: 'SAWMILL', level: 1 }  // 10 wood
      ])
      .execute();

    const input: EndTurnInput = { playerId: player.id };

    const result = await endTurn(input);

    // Total wood production: 10 + 20 + 10 = 40
    expect(result.wood).toEqual(40);
    expect(result.stone).toEqual(0);
    expect(result.food).toEqual(0);
    expect(result.gold).toEqual(0);
  });
});
