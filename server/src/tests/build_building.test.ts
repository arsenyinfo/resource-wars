
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable, buildingsTable } from '../db/schema';
import { type BuildBuildingInput } from '../schema';
import { buildBuilding } from '../handlers/build_building';
import { eq } from 'drizzle-orm';

describe('buildBuilding', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const createTestPlayer = async (resources = { wood: 200, stone: 150, food: 100, gold: 100 }) => {
    const result = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        ...resources
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should build a sawmill successfully', async () => {
    const player = await createTestPlayer();
    
    const input: BuildBuildingInput = {
      playerId: player.id,
      type: 'SAWMILL'
    };

    const result = await buildBuilding(input);

    expect(result.playerId).toBe(player.id);
    expect(result.type).toBe('SAWMILL');
    expect(result.level).toBe(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should deduct correct resources from player', async () => {
    const player = await createTestPlayer({ wood: 100, stone: 50, food: 50, gold: 50 });
    
    const input: BuildBuildingInput = {
      playerId: player.id,
      type: 'SAWMILL' // Costs 50 wood, 25 stone
    };

    await buildBuilding(input);

    const updatedPlayers = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, player.id))
      .execute();

    const updatedPlayer = updatedPlayers[0];
    expect(updatedPlayer.wood).toBe(50); // 100 - 50
    expect(updatedPlayer.stone).toBe(25); // 50 - 25
    expect(updatedPlayer.food).toBe(50); // unchanged
    expect(updatedPlayer.gold).toBe(50); // unchanged
  });

  it('should save building to database', async () => {
    const player = await createTestPlayer();
    
    const input: BuildBuildingInput = {
      playerId: player.id,
      type: 'QUARRY'
    };

    const result = await buildBuilding(input);

    const buildings = await db.select()
      .from(buildingsTable)
      .where(eq(buildingsTable.id, result.id))
      .execute();

    expect(buildings).toHaveLength(1);
    expect(buildings[0].playerId).toBe(player.id);
    expect(buildings[0].type).toBe('QUARRY');
    expect(buildings[0].level).toBe(1);
  });

  it('should handle different building types correctly', async () => {
    const player = await createTestPlayer();
    
    const input: BuildBuildingInput = {
      playerId: player.id,
      type: 'MARKET' // Costs 80 wood, 40 stone, 50 gold
    };

    const result = await buildBuilding(input);

    expect(result.type).toBe('MARKET');

    const updatedPlayers = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, player.id))
      .execute();

    const updatedPlayer = updatedPlayers[0];
    expect(updatedPlayer.wood).toBe(120); // 200 - 80
    expect(updatedPlayer.stone).toBe(110); // 150 - 40
    expect(updatedPlayer.gold).toBe(50); // 100 - 50
  });

  it('should throw error for insufficient resources', async () => {
    const player = await createTestPlayer({ wood: 10, stone: 5, food: 0, gold: 0 });
    
    const input: BuildBuildingInput = {
      playerId: player.id,
      type: 'SAWMILL' // Costs 50 wood, 25 stone
    };

    expect(buildBuilding(input)).rejects.toThrow(/insufficient resources/i);
  });

  it('should throw error for non-existent player', async () => {
    const input: BuildBuildingInput = {
      playerId: 999,
      type: 'SAWMILL'
    };

    expect(buildBuilding(input)).rejects.toThrow(/player not found/i);
  });

  it('should handle building with gold cost correctly', async () => {
    const player = await createTestPlayer({ wood: 150, stone: 100, food: 50, gold: 30 });
    
    const input: BuildBuildingInput = {
      playerId: player.id,
      type: 'BARRACKS' // Costs 100 wood, 50 stone, 25 gold
    };

    const result = await buildBuilding(input);

    expect(result.type).toBe('BARRACKS');

    const updatedPlayers = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, player.id))
      .execute();

    const updatedPlayer = updatedPlayers[0];
    expect(updatedPlayer.wood).toBe(50); // 150 - 100
    expect(updatedPlayer.stone).toBe(50); // 100 - 50
    expect(updatedPlayer.gold).toBe(5); // 30 - 25
  });
});
