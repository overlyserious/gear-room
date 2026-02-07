import type { CheckoutRepository, CheckoutFilter } from '../../application/ports/repositories.js';
import { Checkout } from '../../domain/entities/checkout.js';
import type { CheckoutId, MemberId } from '../../domain/value-objects/index.js';
import { CheckoutStatus } from '../../domain/types.js';
import type { GearRoomDatabase } from '../storage/database.js';

/**
 * Dexie (IndexedDB) implementation of CheckoutRepository.
 */
export class DexieCheckoutRepository implements CheckoutRepository {
  constructor(private readonly db: GearRoomDatabase) {}

  async findById(id: CheckoutId): Promise<Checkout | null> {
    const record = await this.db.checkouts.get(id);
    return record ? Checkout.fromRecord(record) : null;
  }

  async findByMemberId(memberId: MemberId, filter?: CheckoutFilter): Promise<Checkout[]> {
    let collection = this.db.checkouts.where('memberId').equals(memberId);

    let records = await collection.toArray();

    // Apply in-memory filters
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      records = records.filter((r) => statuses.includes(r.status));
    }

    if (filter?.fromDate) {
      records = records.filter((r) => new Date(r.createdAt) >= filter.fromDate!);
    }

    if (filter?.toDate) {
      records = records.filter((r) => new Date(r.createdAt) <= filter.toDate!);
    }

    return records.map((r) => Checkout.fromRecord(r));
  }

  async findActiveByMemberId(memberId: MemberId): Promise<Checkout[]> {
    return this.findByMemberId(memberId, {
      status: [CheckoutStatus.ACTIVE, CheckoutStatus.PARTIALLY_RETURNED]
    });
  }

  async findOverdue(asOf: Date): Promise<Checkout[]> {
    // Get all active/partial checkouts and filter for overdue items
    const records = await this.db.checkouts
      .where('status')
      .anyOf([CheckoutStatus.ACTIVE, CheckoutStatus.PARTIALLY_RETURNED])
      .toArray();

    const checkouts = records.map((r) => Checkout.fromRecord(r));
    return checkouts.filter((c) => c.isOverdue(asOf));
  }

  async findAll(filter?: CheckoutFilter): Promise<Checkout[]> {
    let records = await this.db.checkouts.toArray();

    // Apply in-memory filters
    if (filter?.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      records = records.filter((r) => statuses.includes(r.status));
    }

    if (filter?.fromDate) {
      records = records.filter((r) => new Date(r.createdAt) >= filter.fromDate!);
    }

    if (filter?.toDate) {
      records = records.filter((r) => new Date(r.createdAt) <= filter.toDate!);
    }

    return records.map((r) => Checkout.fromRecord(r));
  }

  async save(checkout: Checkout): Promise<void> {
    await this.db.checkouts.put(checkout.toRecord());
  }
}
