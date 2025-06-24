
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable, buildingsTable, unitsTable } from '../db/schema';
import { type TrainUnitsInput } from '../schema';
import { trainUnits } from '../handlers/train_units';
import { eq, and } from 'drizzle-orm';

describe('trainUnits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should train units successfully', async () => {
    // Create player with sufficient resources
    const players = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 100,
        stone: 100,
        food: 100,
        gold: 100
      })
      .returning()
      .execute();

    const player = players[0];

    // Create barracks building
    await db.insert(buildingsTable)
      .values({
        playerId: player.id,
        type: 'BARRACKS',
        level: 1
      })
      .execute();

    const input: TrainUnitsInput = {
      playerId: player.id,
      type: 'WARRIOR',
      quantity: 3
    };

    const result = await trainUnits(input);

    // Verify unit record
    expect(result.playerId).toEqual(player.id);
    expect(result.type).toEqual('WARRIOR');
    expect(result.quantity).toEqual(3);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify resources were deducted (3 warriors * 15 food + 10 gold each)
    const updatedPlayer = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, player.id))
      .execute();

    expect(updatedPlayer[0].food).toEqual(55); // 100 - 45
    expect(updatedPlayer[0].gold).toEqual(70); // 100 - 30
    expect(updatedPlayer[0].wood).toEqual(100); // No wood cost for warriors
    expect(updatedPlayer[0].stone).toEqual(100); // No stone cost for warriors
  });

  it('should update existing unit quantity', async () => {
    // Create player with sufficient resources
    const players = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 200,
        stone: 100,
        food: 200,
        gold: 200
      })
      .returning()
      .execute();

    const player = players[0];

    // Create barracks building
    await db.insert(buildingsTable)
      .values({
        playerId: player.id,
        type: 'BARRACKS',
        level: 1
      })
      .execute();

    // Create existing unit record
    await db.insert(unitsTable)
      .values({
        playerId: player.id,
        type: 'ARCHER',
        quantity: 2
      })
      .execute();

    const input: TrainUnitsInput = {
      playerId: player.id,
      type: 'ARCHER',
      quantity: 1
    };

    const result = await trainUnits(input);

    // Verify unit quantity was updated
    expect(result.quantity).toEqual(3); // 2 + 1

    // Verify only one unit record exists
    const allUnits = await db.select()
      .from(unitsTable)
      .where(
        and(
          eq(unitsTable.playerId, player.id),
          eq(unitsTable.type, 'ARCHER')
        )
      )
      .execute();

    expect(allUnits).toHaveLength(1);
    expect(allUnits[0].quantity).toEqual(3);
  });

  it('should handle different unit types with correct costs', async () => {
    // Create player with sufficient resources
    const players = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 100,
        stone: 100,
        food: 100,
        gold: 100
      })
      .returning()
      .execute();

    const player = players[0];

    // Create barracks building
    await db.insert(buildingsTable)
      .values({
        playerId: player.id,
        type: 'BARRACKS',
        level: 1
      })
      .execute();

    // Train SCOUT (10 food, 5 gold per unit)
    const scoutInput: TrainUnitsInput = {
      playerId: player.id,
      type: 'SCOUT',
      quantity: 2
    };

    await trainUnits(scoutInput);

    // Verify scout costs were deducted
    const updatedPlayer = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, player.id))
      .execute();

    expect(updatedPlayer[0].food).toEqual(80); // 100 - 20
    expect(updatedPlayer[0].gold).toEqual(90); // 100 - 10
    expect(updatedPlayer[0].wood).toEqual(100); // No wood cost for scouts
  });

  it('should throw error when player has no barracks', async () => {
    // Create player without barracks
    const players = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 100,
        stone: 100,
        food: 100,
        gold: 100
      })
      .returning()
      .execute();

    const player = players[0];

    const input: TrainUnitsInput = {
      playerId: player.id,
      type: 'WARRIOR',
      quantity: 1
    };

    await expect(trainUnits(input)).rejects.toThrow(/must have a BARRACKS building/i);
  });

  it('should throw error when player has insufficient resources', async () => {
    // Create player with insufficient resources
    const players = await db.insert(playersTable)
      .values({
        userId: 'test-user',
        wood: 0,
        stone: 0,
        food: 5, // Not enough for 1 warrior (needs 15)
        gold: 5  // Not enough for 1 warrior (needs 10)
      })
      .returning()
      .execute();

    const player = players[0];

    // Create barracks building
    await db.insert(buildingsTable)
      .values({
        playerId: player.id,
        type: 'BARRACKS',
        level: 1
      })
      .execute();

    const input: TrainUnitsInput = {
      playerId: player.id,
      type: 'WARRIOR',
      quantity: 1
    };

    await expect(trainUnits(input)).rejects.toThrow(/insufficient resources/i);
  });

  it('should throw error when player does not exist', async () => {
    const input: TrainUnitsInput = {
      playerId: 999, // Non-existent player
      type: 'WARRIOR',
      quantity: 1
    };

    await expect(trainUnits(input)).rejects.toThrow(/player not found/i);
  });
});
