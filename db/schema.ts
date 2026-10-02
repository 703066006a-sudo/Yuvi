import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const candleDays=sqliteTable('candle_days',{key:text('key').primaryKey(),payload:text('payload').notNull(),fetchedAt:integer('fetched_at').notNull()});
export const sessions=sqliteTable('replay_sessions',{key:text('key').primaryKey(),payload:text('payload').notNull(),updatedAt:integer('updated_at').notNull()});
export const exchangeConnections=sqliteTable('exchange_connections',{
  key:text('key').primaryKey(),
  encrypted:text('encrypted').notNull(),
  keyHint:text('key_hint').notNull(),
  label:text('label').notNull(),
  createdAt:integer('created_at').notNull(),
  updatedAt:integer('updated_at').notNull(),
});
