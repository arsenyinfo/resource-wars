
import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums for building and unit types
export const buildingTypeEnum = pgEnum('building_type', ['SAWMILL', 'QUARRY', 'FARM', 'BARRACKS', 'WALLS', 'MARKET']);
export const unitTypeEnum = pgEnum('unit_type', ['WARRIOR', 'ARCHER', 'SCOUT']);

// Players table
export const playersTable = pgTable('players', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  wood: integer('wood').notNull().default(0),
  stone: integer('stone').notNull().default(0),
  food: integer('food').notNull().default(0),
  gold: integer('gold').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Buildings table
export const buildingsTable = pgTable('buildings', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => playersTable.id, { onDelete: 'cascade' }),
  type: buildingTypeEnum('type').notNull(),
  level: integer('level').notNull().default(1),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Units table
export const unitsTable = pgTable('units', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => playersTable.id, { onDelete: 'cascade' }),
  type: unitTypeEnum('type').notNull(),
  quantity: integer('quantity').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const playersRelations = relations(playersTable, ({ many }) => ({
  buildings: many(buildingsTable),
  units: many(unitsTable),
}));

export const buildingsRelations = relations(buildingsTable, ({ one }) => ({
  player: one(playersTable, {
    fields: [buildingsTable.playerId],
    references: [playersTable.id],
  }),
}));

export const unitsRelations = relations(unitsTable, ({ one }) => ({
  player: one(playersTable, {
    fields: [unitsTable.playerId],
    references: [playersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Player = typeof playersTable.$inferSelect;
export type NewPlayer = typeof playersTable.$inferInsert;
export type Building = typeof buildingsTable.$inferSelect;
export type NewBuilding = typeof buildingsTable.$inferInsert;
export type Unit = typeof unitsTable.$inferSelect;
export type NewUnit = typeof unitsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  players: playersTable, 
  buildings: buildingsTable, 
  units: unitsTable 
};
