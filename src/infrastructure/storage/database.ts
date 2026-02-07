import Dexie, { type Table } from 'dexie';
import type { MemberRecord } from '../../domain/entities/member.js';
import type { GearTypeRecord } from '../../domain/entities/gear-type.js';
import type { GearItemRecord } from '../../domain/entities/gear-item.js';
import type { CheckoutRecord } from '../../domain/entities/checkout.js';

/**
 * Domain event record for audit trail.
 */
export interface DomainEventRecord {
  id: string;
  type: string;
  aggregateId: string;
  occurredAt: string;
  payload: string; // JSON
  synced: boolean;
}

/**
 * Sync metadata record.
 */
export interface SyncMetaRecord {
  key: string;
  value: string; // JSON
}

/**
 * Gear Room database using Dexie (IndexedDB wrapper).
 * Provides local-first storage with optional sync capabilities.
 */
export class GearRoomDatabase extends Dexie {
  members!: Table<MemberRecord>;
  gearTypes!: Table<GearTypeRecord>;
  gearItems!: Table<GearItemRecord>;
  checkouts!: Table<CheckoutRecord>;
  domainEvents!: Table<DomainEventRecord>;
  syncMeta!: Table<SyncMetaRecord>;

  constructor() {
    super('gearroom');

    this.version(1).stores({
      // Member table - indexed by id, collegeId (unique), email
      members: 'id, collegeId, email, membershipStatus',

      // GearType table - indexed by id, category, name (for search)
      gearTypes: 'id, category, name',

      // GearItem table - indexed by id, code (unique), gearTypeId, status
      gearItems: 'id, code, gearTypeId, status',

      // Checkout table - indexed by id, memberId, status, createdAt
      checkouts: 'id, memberId, status, createdAt',

      // Domain events for audit trail
      domainEvents: 'id, type, aggregateId, occurredAt, synced',

      // Sync metadata
      syncMeta: 'key'
    });
  }
}

// Singleton database instance
let db: GearRoomDatabase | null = null;

/**
 * Get the database instance. Creates it if it doesn't exist.
 */
export function getDatabase(): GearRoomDatabase {
  if (!db) {
    db = new GearRoomDatabase();
  }
  return db;
}

/**
 * Reset the database (for testing).
 */
export async function resetDatabase(): Promise<void> {
  if (db) {
    await db.delete();
    db = null;
  }
}
