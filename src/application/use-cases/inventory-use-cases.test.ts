import { describe, it, expect, beforeEach } from 'vitest';
import {
  createGearType,
  updateGearType,
  updateBulkQuantity,
  deleteGearType,
  addGearItem,
  updateGearItem,
  sendItemToMaintenance,
  returnItemFromMaintenance,
  retireItem,
  getGearTypeDetail,
  listGearTypesWithStatus
} from './inventory-use-cases.js';
import { GearCategory, GearCondition, GearStatus, TrackingMode } from '../../domain/types.js';
import { GearType } from '../../domain/entities/gear-type.js';
import { GearItem } from '../../domain/entities/gear-item.js';
import type { GearTypeRepository, GearItemRepository } from '../ports/repositories.js';
import type { GearTypeId, GearItemId } from '../../domain/value-objects/index.js';
import { gearTypeId, gearItemId } from '../../domain/value-objects/index.js';
import { unwrap } from '../result.js';

// ============================================================================
// In-memory test doubles
// ============================================================================

function createMockClock(date = new Date('2025-06-15T10:00:00Z')) {
  return {
    now: () => date,
    today: () => new Date(date.toISOString().slice(0, 10))
  };
}

let idCounter = 0;
function createMockIdGenerator() {
  return {
    generate: () => `test-id-${++idCounter}`
  };
}

class InMemoryGearTypeRepository implements GearTypeRepository {
  private store = new Map<string, GearType>();

  async findById(id: GearTypeId): Promise<GearType | null> {
    return this.store.get(id as string) ?? null;
  }
  async findByCategory(category: string): Promise<GearType[]> {
    return [...this.store.values()].filter((gt) => gt.category === category);
  }
  async search(searchTerm: string): Promise<GearType[]> {
    const term = searchTerm.toLowerCase();
    return [...this.store.values()].filter((gt) => gt.name.toLowerCase().includes(term));
  }
  async findAll(): Promise<GearType[]> {
    return [...this.store.values()];
  }
  async save(gearType: GearType): Promise<void> {
    this.store.set(gearType.id as string, gearType);
  }
  async delete(id: GearTypeId): Promise<void> {
    this.store.delete(id as string);
  }
}

class InMemoryGearItemRepository implements GearItemRepository {
  private store = new Map<string, GearItem>();

  async findById(id: GearItemId): Promise<GearItem | null> {
    return this.store.get(id as string) ?? null;
  }
  async findByCode(code: string): Promise<GearItem | null> {
    const upper = code.toUpperCase();
    return [...this.store.values()].find((i) => i.code === upper) ?? null;
  }
  async findByGearTypeId(gearTypeId: GearTypeId): Promise<GearItem[]> {
    return [...this.store.values()].filter((i) => (i.gearTypeId as string) === (gearTypeId as string));
  }
  async findAll(): Promise<GearItem[]> {
    return [...this.store.values()];
  }
  async save(item: GearItem): Promise<void> {
    this.store.set(item.id as string, item);
  }
  async saveMany(items: GearItem[]): Promise<void> {
    for (const item of items) {
      this.store.set(item.id as string, item);
    }
  }
  async delete(id: GearItemId): Promise<void> {
    this.store.delete(id as string);
  }
}

// ============================================================================
// Test helpers
// ============================================================================

function makeDeps() {
  const clock = createMockClock();
  const idGenerator = createMockIdGenerator();
  const gearTypeRepo = new InMemoryGearTypeRepository();
  const gearItemRepo = new InMemoryGearItemRepository();

  return { clock, idGenerator, gearTypeRepo, gearItemRepo };
}

async function createTestGearType(
  deps: ReturnType<typeof makeDeps>,
  overrides?: Partial<{ name: string; category: string; trackingMode: string; totalQuantity: number }>
) {
  const result = await createGearType(
    { gearTypeRepo: deps.gearTypeRepo, idGenerator: deps.idGenerator, clock: deps.clock },
    {
      name: overrides?.name ?? 'Trek 820 Mountain Bike',
      category: (overrides?.category as any) ?? GearCategory.BIKE,
      trackingMode: (overrides?.trackingMode as any) ?? TrackingMode.INDIVIDUAL,
      totalQuantity: overrides?.totalQuantity
    }
  );
  return unwrap(result);
}

async function createTestItem(
  deps: ReturnType<typeof makeDeps>,
  gearTypeId: string,
  code: string,
  condition?: GearCondition
) {
  const result = await addGearItem(
    { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo, idGenerator: deps.idGenerator, clock: deps.clock },
    { gearTypeId, code, condition }
  );
  return unwrap(result);
}

// ============================================================================
// Tests
// ============================================================================

beforeEach(() => {
  idCounter = 0;
});

describe('createGearType', () => {
  it('creates an individual-tracked gear type', async () => {
    const deps = makeDeps();
    const result = await createGearType(
      { gearTypeRepo: deps.gearTypeRepo, idGenerator: deps.idGenerator, clock: deps.clock },
      { name: 'Trek 820', category: GearCategory.BIKE, trackingMode: TrackingMode.INDIVIDUAL }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Trek 820');
      expect(result.value.trackingMode).toBe(TrackingMode.INDIVIDUAL);
    }
  });

  it('creates a bulk-tracked gear type with quantity', async () => {
    const deps = makeDeps();
    const result = await createGearType(
      { gearTypeRepo: deps.gearTypeRepo, idGenerator: deps.idGenerator, clock: deps.clock },
      { name: 'Sleeping Pad', category: GearCategory.PAD, trackingMode: TrackingMode.BULK, totalQuantity: 20 }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalQuantity).toBe(20);
    }
  });

  it('rejects duplicate names', async () => {
    const deps = makeDeps();
    await createGearType(
      { gearTypeRepo: deps.gearTypeRepo, idGenerator: deps.idGenerator, clock: deps.clock },
      { name: 'Trek 820', category: GearCategory.BIKE, trackingMode: TrackingMode.INDIVIDUAL }
    );

    const result = await createGearType(
      { gearTypeRepo: deps.gearTypeRepo, idGenerator: deps.idGenerator, clock: deps.clock },
      { name: 'trek 820', category: GearCategory.BIKE, trackingMode: TrackingMode.INDIVIDUAL }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('duplicate_name');
    }
  });

  it('rejects empty name', async () => {
    const deps = makeDeps();
    const result = await createGearType(
      { gearTypeRepo: deps.gearTypeRepo, idGenerator: deps.idGenerator, clock: deps.clock },
      { name: '  ', category: GearCategory.BIKE, trackingMode: TrackingMode.INDIVIDUAL }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('empty_name');
    }
  });
});

describe('updateGearType', () => {
  it('updates name and notes', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);

    const result = await updateGearType(
      { gearTypeRepo: deps.gearTypeRepo, clock: deps.clock },
      { id: gearType.id as string, name: 'Updated Bike', notes: 'New notes' }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('Updated Bike');
      expect(result.value.notes).toBe('New notes');
    }
  });

  it('returns not_found for missing type', async () => {
    const deps = makeDeps();
    const result = await updateGearType(
      { gearTypeRepo: deps.gearTypeRepo, clock: deps.clock },
      { id: 'nonexistent' }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('not_found');
    }
  });
});

describe('updateBulkQuantity', () => {
  it('updates quantity for bulk types', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps, {
      name: 'Sleeping Pad',
      category: GearCategory.PAD,
      trackingMode: TrackingMode.BULK,
      totalQuantity: 10
    });

    const result = await updateBulkQuantity(
      { gearTypeRepo: deps.gearTypeRepo, clock: deps.clock },
      gearType.id as string,
      25
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalQuantity).toBe(25);
    }
  });

  it('rejects for individual-tracked types', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);

    const result = await updateBulkQuantity(
      { gearTypeRepo: deps.gearTypeRepo, clock: deps.clock },
      gearType.id as string,
      10
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('not_bulk_tracked');
    }
  });
});

describe('deleteGearType', () => {
  it('deletes a gear type and its items', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    await createTestItem(deps, gearType.id as string, 'BIKE-001');
    await createTestItem(deps, gearType.id as string, 'BIKE-002');

    const result = await deleteGearType(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo },
      gearType.id as string
    );

    expect(result.ok).toBe(true);

    // Verify type is gone
    const found = await deps.gearTypeRepo.findById(gearType.id);
    expect(found).toBeNull();

    // Verify items are gone
    const items = await deps.gearItemRepo.findByGearTypeId(gearType.id);
    expect(items).toHaveLength(0);
  });

  it('rejects if items are checked out', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    // Manually check out the item
    const checkedOut = unwrap(item.markCheckedOut(deps));
    await deps.gearItemRepo.save(checkedOut);

    const result = await deleteGearType(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo },
      gearType.id as string
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('has_checked_out_items');
    }
  });
});

describe('addGearItem', () => {
  it('adds an item to an individual-tracked type', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);

    const result = await addGearItem(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo, idGenerator: deps.idGenerator, clock: deps.clock },
      { gearTypeId: gearType.id as string, code: 'BIKE-001' }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.code).toBe('BIKE-001');
      expect(result.value.status).toBe(GearStatus.AVAILABLE);
    }
  });

  it('rejects for bulk-tracked types', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps, {
      name: 'Pad',
      category: GearCategory.PAD,
      trackingMode: TrackingMode.BULK,
      totalQuantity: 10
    });

    const result = await addGearItem(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo, idGenerator: deps.idGenerator, clock: deps.clock },
      { gearTypeId: gearType.id as string, code: 'PAD-001' }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('not_individual_tracked');
    }
  });

  it('rejects duplicate codes', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    await createTestItem(deps, gearType.id as string, 'BIKE-001');

    const result = await addGearItem(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo, idGenerator: deps.idGenerator, clock: deps.clock },
      { gearTypeId: gearType.id as string, code: 'BIKE-001' }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('duplicate_code');
    }
  });
});

describe('updateGearItem', () => {
  it('updates condition and notes', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    const result = await updateGearItem(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      { id: item.id as string, condition: GearCondition.FAIR, notes: 'Scratched frame' }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.condition).toBe(GearCondition.FAIR);
      expect(result.value.notes).toBe('Scratched frame');
    }
  });

  it('rejects condition update for checked-out items', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    const checkedOut = unwrap(item.markCheckedOut(deps));
    await deps.gearItemRepo.save(checkedOut);

    const result = await updateGearItem(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      { id: item.id as string, condition: GearCondition.FAIR }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('is_checked_out');
    }
  });
});

describe('sendItemToMaintenance', () => {
  it('sends an available item to maintenance', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    const result = await sendItemToMaintenance(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string,
      'Needs brake adjustment'
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe(GearStatus.MAINTENANCE);
      expect(result.value.notes).toBe('Needs brake adjustment');
    }
  });

  it('rejects if already in maintenance', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    // Send to maintenance first
    const maintained = unwrap(await sendItemToMaintenance(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string
    ));

    const result = await sendItemToMaintenance(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('already_in_maintenance');
    }
  });
});

describe('returnItemFromMaintenance', () => {
  it('returns an item from maintenance with new condition', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    // Send to maintenance first
    await sendItemToMaintenance(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string
    );

    const result = await returnItemFromMaintenance(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string,
      GearCondition.GOOD
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe(GearStatus.AVAILABLE);
      expect(result.value.condition).toBe(GearCondition.GOOD);
    }
  });

  it('rejects if not in maintenance', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    const result = await returnItemFromMaintenance(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string,
      GearCondition.GOOD
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('not_in_maintenance');
    }
  });
});

describe('retireItem', () => {
  it('retires an available item', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    const result = await retireItem(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe(GearStatus.RETIRED);
      expect(result.value.condition).toBe(GearCondition.RETIRED);
    }
  });

  it('rejects if item is checked out', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    const item = await createTestItem(deps, gearType.id as string, 'BIKE-001');

    const checkedOut = unwrap(item.markCheckedOut(deps));
    await deps.gearItemRepo.save(checkedOut);

    const result = await retireItem(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('is_checked_out');
    }
  });
});

describe('getGearTypeDetail', () => {
  it('returns gear type with items and status counts', async () => {
    const deps = makeDeps();
    const gearType = await createTestGearType(deps);
    await createTestItem(deps, gearType.id as string, 'BIKE-001');
    await createTestItem(deps, gearType.id as string, 'BIKE-002');
    const item3 = await createTestItem(deps, gearType.id as string, 'BIKE-003');

    // Send one to maintenance
    await sendItemToMaintenance(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item3.id as string
    );

    const result = await getGearTypeDetail(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo },
      gearType.id as string
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.gearType.name).toBe('Trek 820 Mountain Bike');
      expect(result.value.items).toHaveLength(3);
      expect(result.value.statusCounts.available).toBe(2);
      expect(result.value.statusCounts.maintenance).toBe(1);
      expect(result.value.statusCounts.total).toBe(3);
    }
  });

  it('returns not_found for missing type', async () => {
    const deps = makeDeps();
    const result = await getGearTypeDetail(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo },
      'nonexistent'
    );

    expect(result.ok).toBe(false);
  });
});

describe('listGearTypesWithStatus', () => {
  it('lists all gear types with status counts', async () => {
    const deps = makeDeps();
    await createTestGearType(deps, { name: 'Trek 820', category: GearCategory.BIKE });
    await createTestGearType(deps, { name: 'Sleeping Pad', category: GearCategory.PAD, trackingMode: TrackingMode.BULK, totalQuantity: 20 });

    const results = await listGearTypesWithStatus(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo }
    );

    expect(results).toHaveLength(2);
    // Sorted by category label: Bikes before Pads
    expect(results[0].gearType.name).toBe('Trek 820');
    expect(results[0].categoryLabel).toBe('Bikes');
    expect(results[1].gearType.name).toBe('Sleeping Pad');
    expect(results[1].statusCounts.available).toBe(20);
  });

  it('filters by category', async () => {
    const deps = makeDeps();
    await createTestGearType(deps, { name: 'Trek 820', category: GearCategory.BIKE });
    await createTestGearType(deps, { name: 'Sleeping Pad', category: GearCategory.PAD, trackingMode: TrackingMode.BULK, totalQuantity: 20 });

    const results = await listGearTypesWithStatus(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo },
      { category: GearCategory.BIKE }
    );

    expect(results).toHaveLength(1);
    expect(results[0].gearType.name).toBe('Trek 820');
  });

  it('filters by search term', async () => {
    const deps = makeDeps();
    await createTestGearType(deps, { name: 'Trek 820', category: GearCategory.BIKE });
    await createTestGearType(deps, { name: 'Sleeping Pad', category: GearCategory.PAD, trackingMode: TrackingMode.BULK, totalQuantity: 20 });

    const results = await listGearTypesWithStatus(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo },
      { searchTerm: 'trek' }
    );

    expect(results).toHaveLength(1);
    expect(results[0].gearType.name).toBe('Trek 820');
  });

  it('filters by item status', async () => {
    const deps = makeDeps();
    const bikeType = await createTestGearType(deps, { name: 'Trek 820', category: GearCategory.BIKE });
    const padType = await createTestGearType(deps, { name: 'Sleeping Pad', category: GearCategory.PAD, trackingMode: TrackingMode.BULK, totalQuantity: 20 });

    const item = await createTestItem(deps, bikeType.id as string, 'BIKE-001');
    await sendItemToMaintenance(
      { gearItemRepo: deps.gearItemRepo, clock: deps.clock },
      item.id as string
    );

    const results = await listGearTypesWithStatus(
      { gearTypeRepo: deps.gearTypeRepo, gearItemRepo: deps.gearItemRepo },
      { hasItemsInStatus: GearStatus.MAINTENANCE }
    );

    expect(results).toHaveLength(1);
    expect(results[0].gearType.name).toBe('Trek 820');
  });
});
