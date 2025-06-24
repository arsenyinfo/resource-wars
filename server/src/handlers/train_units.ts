
import { db } from '../db';
import { playersTable, buildingsTable, unitsTable } from '../db/schema';
import { type TrainUnitsInput, type Unit } from '../schema';
import { eq, and } from 'drizzle-orm';

// Unit costs configuration
const UNIT_COSTS = {
  WARRIOR: { food: 15, gold: 10, wood: 0, stone: 0 },
  ARCHER: { food: 20, gold: 15, wood: 5, stone: 0 },
  SCOUT: { food: 10, gold: 5, wood: 0, stone: 0 }
};

export async function trainUnits(input: TrainUnitsInput): Promise<Unit> {
  try {
    // 1. Get player's current resources first to verify player exists
    const players = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, input.playerId))
      .execute();

    if (players.length === 0) {
      throw new Error('Player not found');
    }

    const player = players[0];

    // 2. Verify player has a BARRACKS building
    const barracks = await db.select()
      .from(buildingsTable)
      .where(
        and(
          eq(buildingsTable.playerId, input.playerId),
          eq(buildingsTable.type, 'BARRACKS')
        )
      )
      .execute();

    if (barracks.length === 0) {
      throw new Error('Player must have a BARRACKS building to train units');
    }

    // 3. Calculate total cost and check if player has sufficient resources
    const unitCost = UNIT_COSTS[input.type];
    const totalCost = {
      food: unitCost.food * input.quantity,
      gold: unitCost.gold * input.quantity,
      wood: unitCost.wood * input.quantity,
      stone: unitCost.stone * input.quantity
    };

    if (player.food < totalCost.food ||
        player.gold < totalCost.gold ||
        player.wood < totalCost.wood ||
        player.stone < totalCost.stone) {
      throw new Error('Insufficient resources to train units');
    }

    // 4. Deduct resources from player's account
    await db.update(playersTable)
      .set({
        food: player.food - totalCost.food,
        gold: player.gold - totalCost.gold,
        wood: player.wood - totalCost.wood,
        stone: player.stone - totalCost.stone
      })
      .where(eq(playersTable.id, input.playerId))
      .execute();

    // 5. Check if unit record already exists for this player and type
    const existingUnits = await db.select()
      .from(unitsTable)
      .where(
        and(
          eq(unitsTable.playerId, input.playerId),
          eq(unitsTable.type, input.type)
        )
      )
      .execute();

    let unitRecord: Unit;

    if (existingUnits.length > 0) {
      // Update existing unit quantity
      const updatedUnits = await db.update(unitsTable)
        .set({
          quantity: existingUnits[0].quantity + input.quantity
        })
        .where(eq(unitsTable.id, existingUnits[0].id))
        .returning()
        .execute();

      unitRecord = updatedUnits[0];
    } else {
      // Create new unit record
      const newUnits = await db.insert(unitsTable)
        .values({
          playerId: input.playerId,
          type: input.type,
          quantity: input.quantity
        })
        .returning()
        .execute();

      unitRecord = newUnits[0];
    }

    return unitRecord;
  } catch (error) {
    console.error('Unit training failed:', error);
    throw error;
  }
}
