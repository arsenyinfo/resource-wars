
import { z } from 'zod';

// Enums for building and unit types
export const buildingTypeSchema = z.enum(['SAWMILL', 'QUARRY', 'FARM', 'BARRACKS', 'WALLS', 'MARKET']);
export const unitTypeSchema = z.enum(['WARRIOR', 'ARCHER', 'SCOUT']);

// Player schema
export const playerSchema = z.object({
  id: z.number(),
  userId: z.string(),
  wood: z.number().int().nonnegative(),
  stone: z.number().int().nonnegative(),
  food: z.number().int().nonnegative(),
  gold: z.number().int().nonnegative(),
  created_at: z.coerce.date()
});

export type Player = z.infer<typeof playerSchema>;

// Building schema
export const buildingSchema = z.object({
  id: z.number(),
  playerId: z.number(),
  type: buildingTypeSchema,
  level: z.number().int().positive(),
  created_at: z.coerce.date()
});

export type Building = z.infer<typeof buildingSchema>;

// Unit schema
export const unitSchema = z.object({
  id: z.number(),
  playerId: z.number(),
  type: unitTypeSchema,
  quantity: z.number().int().nonnegative(),
  created_at: z.coerce.date()
});

export type Unit = z.infer<typeof unitSchema>;

// Input schemas for creating players
export const initializePlayerInputSchema = z.object({
  userId: z.string().min(1)
});

export type InitializePlayerInput = z.infer<typeof initializePlayerInputSchema>;

// Input schemas for player queries
export const getPlayerStateInputSchema = z.object({
  playerId: z.number()
});

export type GetPlayerStateInput = z.infer<typeof getPlayerStateInputSchema>;

// Input schemas for building actions
export const buildBuildingInputSchema = z.object({
  playerId: z.number(),
  type: buildingTypeSchema
});

export type BuildBuildingInput = z.infer<typeof buildBuildingInputSchema>;

export const upgradeBuildingInputSchema = z.object({
  playerId: z.number(),
  buildingId: z.number()
});

export type UpgradeBuildingInput = z.infer<typeof upgradeBuildingInputSchema>;

// Input schemas for unit actions
export const trainUnitsInputSchema = z.object({
  playerId: z.number(),
  type: unitTypeSchema,
  quantity: z.number().int().positive()
});

export type TrainUnitsInput = z.infer<typeof trainUnitsInputSchema>;

// Input schema for turn management
export const endTurnInputSchema = z.object({
  playerId: z.number()
});

export type EndTurnInput = z.infer<typeof endTurnInputSchema>;

// Combined player state response schema
export const playerStateSchema = z.object({
  player: playerSchema,
  buildings: z.array(buildingSchema),
  units: z.array(unitSchema)
});

export type PlayerState = z.infer<typeof playerStateSchema>;
