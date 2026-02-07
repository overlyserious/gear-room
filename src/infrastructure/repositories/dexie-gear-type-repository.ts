import type { GearTypeRepository } from '../../application/ports/repositories.js';
import { GearType } from '../../domain/entities/gear-type.js';
import type { GearTypeId } from '../../domain/value-objects/index.js';
import type { GearCategory } from '../../domain/types.js';
import type { GearRoomDatabase } from '../storage/database.js';

/**
 * Dexie (IndexedDB) implementation of GearTypeRepository.
 */
export class DexieGearTypeRepository implements GearTypeRepository {
  constructor(private readonly db: GearRoomDatabase) {}

  async findById(id: GearTypeId): Promise<GearType | null> {
    const record = await this.db.gearTypes.get(id);
    return record ? GearType.fromRecord(record) : null;
  }

  async findByCategory(category: GearCategory): Promise<GearType[]> {
    const records = await this.db.gearTypes.where('category').equals(category).toArray();
    return records.map((r) => GearType.fromRecord(r));
  }

  async search(searchTerm: string): Promise<GearType[]> {
    const term = searchTerm.toLowerCase();
    const records = await this.db.gearTypes
      .filter((r) => r.name.toLowerCase().includes(term))
      .toArray();
    return records.map((r) => GearType.fromRecord(r));
  }

  async findAll(): Promise<GearType[]> {
    const records = await this.db.gearTypes.toArray();
    return records.map((r) => GearType.fromRecord(r));
  }

  async save(gearType: GearType): Promise<void> {
    await this.db.gearTypes.put(gearType.toRecord());
  }

  async delete(id: GearTypeId): Promise<void> {
    await this.db.gearTypes.delete(id);
  }
}
