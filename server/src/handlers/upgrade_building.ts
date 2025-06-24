
import { db } from '../db';
import { playersTable, buildingsTable } from '../db/schema';
import { type UpgradeBuildingInput, type Building } from '../schema';
import { eq, and } from 'drizzle-orm';

// Resource costs for building upgrades (base cost per building type)
const UPGRADE_COSTS = {
  SAWMILL: { wood: 50, stone: 30, food: 0, gold: 20 },
  QUARRY: { wood: 40, stone: 60, food: 0, gold: 25 },
  FARM: { wood: 30, stone: 20, food: 40, gold: 15 },
  BARRACKS: { wood: 60, stone: 40, food: 30, gold: 50 },
  WALLS: { wood: 80, stone: 100, food: 0, gold: 40 },
  MARKET: { wood: 40, stone: 30, food: 20, gold: 60 }
};

// Calculate upgrade cost based on building type and current level
function calculateUpgradeCost(buildingType: keyof typeof UPGRADE_COSTS, currentLevel: number) {
  const baseCost = UPGRADE_COSTS[buildingType];
  const multiplier = Math.ceil(currentLevel * 1.5);
  
  return {
    wood: baseCost.wood * multiplier,
    stone: baseCost.stone * multiplier,
    food: baseCost.food * multiplier,
    gold: baseCost.gold * multiplier
  };
}

export async function upgradeBuilding(input: UpgradeBuildingInput): Promise<Building> {
  try {
    // First verify the player exists
    const players = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, input.playerId))
      .execute();

    if (players.length === 0) {
      throw new Error('Player not found');
    }

    const player = players[0];

    // Get building and verify it exists and belongs to the player
    const buildings = await db.select()
      .from(buildingsTable)
      .where(
        and(
          eq(buildingsTable.id, input.buildingId),
          eq(buildingsTable.playerId, input.playerId)
        )
      )
      .execute();

    if (buildings.length === 0) {
      throw new Error('Building not found or does not belong to player');
    }

    const building = buildings[0];

    // Calculate upgrade cost
    const upgradeCost = calculateUpgradeCost(building.type, building.level);

    // Check if player has sufficient resources
    if (player.wood < upgradeCost.wood ||
        player.stone < upgradeCost.stone ||
        player.food < upgradeCost.food ||
        player.gold < upgradeCost.gold) {
      throw new Error('Insufficient resources for upgrade');
    }

    // Deduct resources from player
    await db.update(playersTable)
      .set({
        wood: player.wood - upgradeCost.wood,
        stone: player.stone - upgradeCost.stone,
        food: player.food - upgradeCost.food,
        gold: player.gold - upgradeCost.gold
      })
      .where(eq(playersTable.id, input.playerId))
      .execute();

    // Upgrade building level
    const upgradedBuildings = await db.update(buildingsTable)
      .set({
        level: building.level + 1
      })
      .where(eq(buildingsTable.id, input.buildingId))
      .returning()
      .execute();

    return upgradedBuildings[0];
  } catch (error) {
    console.error('Building upgrade failed:', error);
    throw error;
  }
}
