import type {
  MemberRepository,
  GearTypeRepository,
  GearItemRepository,
  CheckoutRepository
} from '../application/ports/repositories.js';
import type { IdGenerator, Clock, EventPublisher } from '../application/ports/services.js';
import { getDatabase, type GearRoomDatabase } from './storage/database.js';
import { DexieMemberRepository } from './repositories/dexie-member-repository.js';
import { DexieGearTypeRepository } from './repositories/dexie-gear-type-repository.js';
import { DexieGearItemRepository } from './repositories/dexie-gear-item-repository.js';
import { DexieCheckoutRepository } from './repositories/dexie-checkout-repository.js';
import { UuidGenerator } from './services/uuid-generator.js';
import { SystemClock } from './services/system-clock.js';
import { LocalEventPublisher } from './services/local-event-publisher.js';

/**
 * Application environment containing all dependencies.
 * This is the composition root where all implementations are wired together.
 */
export interface AppEnvironment {
  // Repositories
  memberRepo: MemberRepository;
  gearTypeRepo: GearTypeRepository;
  gearItemRepo: GearItemRepository;
  checkoutRepo: CheckoutRepository;

  // Services
  idGenerator: IdGenerator;
  clock: Clock;
  eventPublisher: EventPublisher;

  // Database (for direct access if needed)
  db: GearRoomDatabase;
}

let environment: AppEnvironment | null = null;

/**
 * Create the application environment.
 * Uses singleton pattern - call this once at app startup.
 */
export function createEnvironment(): AppEnvironment {
  if (environment) {
    return environment;
  }

  const db = getDatabase();

  environment = {
    // Repositories
    memberRepo: new DexieMemberRepository(db),
    gearTypeRepo: new DexieGearTypeRepository(db),
    gearItemRepo: new DexieGearItemRepository(db),
    checkoutRepo: new DexieCheckoutRepository(db),

    // Services
    idGenerator: new UuidGenerator(),
    clock: new SystemClock(),
    eventPublisher: new LocalEventPublisher(db),

    // Database
    db
  };

  return environment;
}

/**
 * Get the current environment.
 * Throws if createEnvironment() hasn't been called.
 */
export function getEnvironment(): AppEnvironment {
  if (!environment) {
    throw new Error('Environment not initialized. Call createEnvironment() first.');
  }
  return environment;
}

/**
 * Reset the environment (for testing).
 */
export function resetEnvironment(): void {
  environment = null;
}
