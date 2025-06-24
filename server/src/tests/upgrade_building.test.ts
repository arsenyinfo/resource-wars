
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable, buildingsTable } from '../db/schema';
import { type UpgradeBuildingInput } from '../schema';
import { upgradeBuilding } from '../handlers/upgrade_building';
import { eq } from 'drizzle-orm';

describe('upgradeBuilding', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should upgrade a building successfully', async () => {
    // Create test player with sufficient resources
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 1000,
        stone: 1000,
        food: 1000,
        gold: 1000
      })
      .returning()
      .execute();
    const player = playerResult[0];

    // Create test building
    const buildingResult = await db.insert(buildingsTable)
      .values({
        playerId: player.id,
        type: 'SAWMILL',
        level: 1
      })
      .returning()
      .execute();
    const building = buildingResult[0];

    const input: UpgradeBuildingInput = {
      playerId: player.id,
      buildingId: building.id
    };

    const result = await upgradeBuilding(input);

    // Verify building was upgraded
    expect(result.id).toEqual(building.id);
    expect(result.playerId).toEqual(player.id);
    expect(result.type).toEqual('SAWMILL');
    expect(result.level).toEqual(2);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should deduct correct resources from player', async () => {
    // Create test player with sufficient resources
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 1000,
        stone: 1000,
        food: 1000,
        gold: 1000
      })
      .returning()
      .execute();
    const player = playerResult[0];

    // Create test building at level 2 to test cost scaling
    const buildingResult = await db.insert(buildingsTable)
      .values({
        playerId: player.id,
        type: 'QUARRY',
        level: 2
      })
      .returning()
      .execute();
    const building = buildingResult[0];

    const input: UpgradeBuildingInput = {
      playerId: player.id,
      buildingId: building.id
    };

    await upgradeBuilding(input);

    // Check player's resources were deducted
    // For QUARRY at level 2: base cost (40 wood, 60 stone, 0 food, 25 gold) * 3 (ceil(2 * 1.5))
    const updatedPlayer = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, player.id))
      .execute();

    expect(updatedPlayer[0].wood).toEqual(1000 - 120); // 40 * 3
    expect(updatedPlayer[0].stone).toEqual(1000 - 180); // 60 * 3
    expect(updatedPlayer[0].food).toEqual(1000 - 0); // 0 * 3
    expect(updatedPlayer[0].gold).toEqual(1000 - 75); // 25 * 3
  });

  it('should throw error when building does not exist', async () => {
    // Create test player
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 1000,
        stone: 1000,
        food: 1000,
        gold: 1000
      })
      .returning()
      .execute();
    const player = playerResult[0];

    const input: UpgradeBuildingInput = {
      playerId: player.id,
      buildingId: 999 // Non-existent building
    };

    await expect(upgradeBuilding(input)).rejects.toThrow(/building not found/i);
  });

  it('should throw error when building belongs to different player', async () => {
    // Create two test players
    const player1Result = await db.insert(playersTable)
      .values({
        userId: 'test-user-1',
        wood: 1000,
        stone: 1000,
        food: 1000,
        gold: 1000
      })
      .returning()
      .execute();
    const player1 = player1Result[0];

    const player2Result = await db.insert(playersTable)
      .values({
        userId: 'test-user-2',
        wood: 1000,
        stone: 1000,
        food: 1000,
        gold: 1000
      })
      .returning()
      .execute();
    const player2 = player2Result[0];

    // Create building for player1
    const buildingResult = await db.insert(buildingsTable)
      .values({
        playerId: player1.id,
        type: 'SAWMILL',
        level: 1
      })
      .returning()
      .execute();
    const building = buildingResult[0];

    // Try to upgrade with player2
    const input: UpgradeBuildingInput = {
      playerId: player2.id,
      buildingId: building.id
    };

    await expect(upgradeBuilding(input)).rejects.toThrow(/building not found/i);
  });

  it('should throw error when player has insufficient resources', async () => {
    // Create test player with insufficient resources
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 10, // Not enough for upgrade
        stone: 10,
        food: 10,
        gold: 10
      })
      .returning()
      .execute();
    const player = playerResult[0];

    // Create test building
    const buildingResult = await db.insert(buildingsTable)
      .values({
        playerId: player.id,
        type: 'SAWMILL',
        level: 1
      })
      .returning()
      .execute();
    const building = buildingResult[0];

    const input: UpgradeBuildingInput = {
      playerId: player.id,
      buildingId: building.id
    };

    await expect(upgradeBuilding(input)).rejects.toThrow(/insufficient resources/i);
  });

  it('should throw error when player does not exist', async () => {
    const input: UpgradeBuildingInput = {
      playerId: 999, // Non-existent player
      buildingId: 1 // This buildingId doesn't matter since player check comes first
    };

    await expect(upgradeBuilding(input)).rejects.toThrow(/player not found/i);
  });

  it('should handle different building types with correct costs', async () => {
    // Create test player with sufficient resources
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 1000,
        stone: 1000,
        food: 1000,
        gold: 1000
      })
      .returning()
      .execute();
    const player = playerResult[0];

    // Create BARRACKS building at level 1
    const buildingResult = await db.insert(buildingsTable)
      .values({
        playerId: player.id,
        type: 'BARRACKS',
        level: 1
      })
      .returning()
      .execute();
    const building = buildingResult[0];

    const input: UpgradeBuildingInput = {
      playerId: player.id,
      buildingId: building.id
    };

    await upgradeBuilding(input);

    // Check player's resources were deducted correctly
    // For BARRACKS at level 1: base cost (60 wood, 40 stone, 30 food, 50 gold) * 2 (ceil(1 * 1.5))
    const updatedPlayer = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, player.id))
      .execute();

    expect(updatedPlayer[0].wood).toEqual(1000 - 120); // 60 * 2
    expect(updatedPlayer[0].stone).toEqual(1000 - 80); // 40 * 2
    expect(updatedPlayer[0].food).toEqual(1000 - 60); // 30 * 2
    expect(updatedPlayer[0].gold).toEqual(1000 - 100); // 50 * 2
  });
});
