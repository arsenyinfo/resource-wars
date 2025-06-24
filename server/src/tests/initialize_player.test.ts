
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable, buildingsTable } from '../db/schema';
import { type InitializePlayerInput } from '../schema';
import { initializePlayer } from '../handlers/initialize_player';
import { eq } from 'drizzle-orm';

const testInput: InitializePlayerInput = {
  userId: 'test-user-123'
};

describe('initializePlayer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a player with starting resources', async () => {
    const result = await initializePlayer(testInput);

    expect(result.userId).toEqual('test-user-123');
    expect(result.wood).toEqual(100);
    expect(result.stone).toEqual(50);
    expect(result.food).toEqual(75);
    expect(result.gold).toEqual(25);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save player to database', async () => {
    const result = await initializePlayer(testInput);

    const players = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, result.id))
      .execute();

    expect(players).toHaveLength(1);
    expect(players[0].userId).toEqual('test-user-123');
    expect(players[0].wood).toEqual(100);
    expect(players[0].stone).toEqual(50);
    expect(players[0].food).toEqual(75);
    expect(players[0].gold).toEqual(25);
    expect(players[0].created_at).toBeInstanceOf(Date);
  });

  it('should create starting buildings', async () => {
    const result = await initializePlayer(testInput);

    const buildings = await db.select()
      .from(buildingsTable)
      .where(eq(buildingsTable.playerId, result.id))
      .execute();

    expect(buildings).toHaveLength(3);
    
    const buildingTypes = buildings.map(b => b.type).sort();
    expect(buildingTypes).toEqual(['FARM', 'QUARRY', 'SAWMILL']);
    
    buildings.forEach(building => {
      expect(building.playerId).toEqual(result.id);
      expect(building.level).toEqual(1);
      expect(building.created_at).toBeInstanceOf(Date);
    });
  });

  it('should reject duplicate userId', async () => {
    await initializePlayer(testInput);

    await expect(initializePlayer(testInput)).rejects.toThrow(/unique/i);
  });
});
