import type { GearItemRepository, GearItemFilter } from '../../application/ports/repositories.js';
import { GearItem } from '../../domain/entities/gear-item.js';
import type { GearItemId, GearTypeId } from '../../domain/value-objects/index.js';
import type { GearRoomDatabase } from '../storage/database.js';

/**
 * Dexie (IndexedDB) implementation of GearItemRepository.
 */
export class DexieGearItemRepository implements GearItemRepository {
  constructor(private readonly db: GearRoomDatabase) {}

  async findById(id: GearItemId): Promise<GearItem | null> {
    const record = await this.db.gearItems.get(id);
    return record ? GearItem.fromRecord(record) : null;
  }

  async findByCode(code: string): Promise<GearItem | null> {
    const record = await this.db.gearItems
      .where('code')
      .equals(code.toUpperCase())
      .first();
    return record ? GearItem.fromRecord(record) : null;
  }

  async findByGearTypeId(gearTypeId: GearTypeId): Promise<GearItem[]> {
    const records = await this.db.gearItems
      .where('gearTypeId')
      .equals(gearTypeId)
      .toArray();
    return records.map((r) => GearItem.fromRecord(r));
  }

  async findAll(filter?: GearItemFilter): Promise<GearItem[]> {
    let collection = this.db.gearItems.toCollection();

    if (filter?.gearTypeId) {
      collection = this.db.gearItems.where('gearTypeId').equals(filter.gearTypeId);
    }

    let records = await collection.toArray();

    // Apply in-memory status filter
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      records = records.filter((r) => statuses.includes(r.status));
    }

    return records.map((r) => GearItem.fromRecord(r));
  }

  async save(item: GearItem): Promise<void> {
    await this.db.gearItems.put(item.toRecord());
  }

  async saveMany(items: GearItem[]): Promise<void> {
    await this.db.gearItems.bulkPut(items.map((i) => i.toRecord()));
  }

  async delete(id: GearItemId): Promise<void> {
    await this.db.gearItems.delete(id);
  }
}
