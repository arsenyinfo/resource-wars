
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable, buildingsTable, unitsTable } from '../db/schema';
import { type GetPlayerStateInput } from '../schema';
import { getPlayerState } from '../handlers/get_player_state';

describe('getPlayerState', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get player state with empty buildings and units', async () => {
    // Create test player
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
    const input: GetPlayerStateInput = { playerId: player.id };

    const result = await getPlayerState(input);

    // Verify player data
    expect(result.player.id).toEqual(player.id);
    expect(result.player.userId).toEqual('test-user-1');
    expect(result.player.wood).toEqual(100);
    expect(result.player.stone).toEqual(50);
    expect(result.player.food).toEqual(75);
    expect(result.player.gold).toEqual(25);
    expect(result.player.created_at).toBeInstanceOf(Date);

    // Verify empty collections
    expect(result.buildings).toHaveLength(0);
    expect(result.units).toHaveLength(0);
  });

  it('should get player state with buildings and units', async () => {
    // Create test player
    const playerResult = await db.insert(playersTable)
      .values({
        userId: 'test-user-2',
        wood: 200,
        stone: 150,
        food: 100,
        gold: 50
      })
      .returning()
      .execute();

    const player = playerResult[0];

    // Create test buildings
    await db.insert(buildingsTable)
      .values([
        {
          playerId: player.id,
          type: 'SAWMILL',
          level: 2
        },
        {
          playerId: player.id,
          type: 'QUARRY',
          level: 1
        }
      ])
      .execute();

    // Create test units
    await db.insert(unitsTable)
      .values([
        {
          playerId: player.id,
          type: 'WARRIOR',
          quantity: 10
        },
        {
          playerId: player.id,
          type: 'ARCHER',
          quantity: 5
        }
      ])
      .execute();

    const input: GetPlayerStateInput = { playerId: player.id };
    const result = await getPlayerState(input);

    // Verify player data
    expect(result.player.id).toEqual(player.id);
    expect(result.player.userId).toEqual('test-user-2');
    expect(result.player.wood).toEqual(200);
    expect(result.player.stone).toEqual(150);
    expect(result.player.food).toEqual(100);
    expect(result.player.gold).toEqual(50);

    // Verify buildings
    expect(result.buildings).toHaveLength(2);
    const sawmill = result.buildings.find(b => b.type === 'SAWMILL');
    const quarry = result.buildings.find(b => b.type === 'QUARRY');
    
    expect(sawmill).toBeDefined();
    expect(sawmill!.level).toEqual(2);
    expect(sawmill!.playerId).toEqual(player.id);
    expect(sawmill!.created_at).toBeInstanceOf(Date);

    expect(quarry).toBeDefined();
    expect(quarry!.level).toEqual(1);
    expect(quarry!.playerId).toEqual(player.id);
    expect(quarry!.created_at).toBeInstanceOf(Date);

    // Verify units
    expect(result.units).toHaveLength(2);
    const warriors = result.units.find(u => u.type === 'WARRIOR');
    const archers = result.units.find(u => u.type === 'ARCHER');

    expect(warriors).toBeDefined();
    expect(warriors!.quantity).toEqual(10);
    expect(warriors!.playerId).toEqual(player.id);
    expect(warriors!.created_at).toBeInstanceOf(Date);

    expect(archers).toBeDefined();
    expect(archers!.quantity).toEqual(5);
    expect(archers!.playerId).toEqual(player.id);
    expect(archers!.created_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent player', async () => {
    const input: GetPlayerStateInput = { playerId: 999 };

    await expect(getPlayerState(input)).rejects.toThrow(/player with id 999 not found/i);
  });

  it('should only return data for specified player', async () => {
    // Create two test players
    const player1Result = await db.insert(playersTable)
      .values({
        userId: 'test-user-1',
        wood: 100,
        stone: 50,
        food: 75,
        gold: 25
      })
      .returning()
      .execute();

    const player2Result = await db.insert(playersTable)
      .values({
        userId: 'test-user-2',
        wood: 200,
        stone: 100,
        food: 150,
        gold: 75
      })
      .returning()
      .execute();

    const player1 = player1Result[0];
    const player2 = player2Result[0];

    // Create buildings for both players
    await db.insert(buildingsTable)
      .values([
        {
          playerId: player1.id,
          type: 'SAWMILL',
          level: 1
        },
        {
          playerId: player2.id,
          type: 'QUARRY',
          level: 2
        }
      ])
      .execute();

    // Create units for both players
    await db.insert(unitsTable)
      .values([
        {
          playerId: player1.id,
          type: 'WARRIOR',
          quantity: 5
        },
        {
          playerId: player2.id,
          type: 'ARCHER',
          quantity: 10
        }
      ])
      .execute();

    // Get state for player 1
    const input: GetPlayerStateInput = { playerId: player1.id };
    const result = await getPlayerState(input);

    // Verify only player 1's data is returned
    expect(result.player.id).toEqual(player1.id);
    expect(result.player.userId).toEqual('test-user-1');
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].type).toEqual('SAWMILL');
    expect(result.units).toHaveLength(1);
    expect(result.units[0].type).toEqual('WARRIOR');
    expect(result.units[0].quantity).toEqual(5);
  });
});
