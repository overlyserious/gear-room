import { type Result, ok, err } from '../../application/result.js';
import { GearCondition, GearStatus } from '../types.js';
import { type GearItemId, gearItemId, type GearTypeId, gearTypeId } from '../value-objects/index.js';

/**
 * Props for creating a new GearItem.
 */
export interface CreateGearItemInput {
  gearTypeId: string;
  code: string; // Unique identifier like "BIKE-003"
  condition?: GearCondition;
  notes?: string;
}

/**
 * Props for hydrating a GearItem from database.
 */
export interface GearItemRecord {
  id: string;
  gearTypeId: string;
  code: string;
  condition: GearCondition;
  status: GearStatus;
  notes: string | null;
  acquiredAt: string;
  retiredAt: string | null;
  updatedAt: string;
}

interface GearItemProps {
  id: GearItemId;
  gearTypeId: GearTypeId;
  code: string;
  condition: GearCondition;
  status: GearStatus;
  notes: string | null;
  acquiredAt: Date;
  retiredAt: Date | null;
  updatedAt: Date;
}

export type CreateGearItemError =
  | { type: 'empty_code' }
  | { type: 'invalid_code_format'; code: string };

/**
 * GearItem represents a specific piece of equipment for INDIVIDUAL tracking.
 * Each GearItem belongs to a GearType and has a unique code (e.g., "BIKE-003").
 */
export class GearItem {
  private constructor(private readonly props: GearItemProps) {}

  // Getters
  get id(): GearItemId {
    return this.props.id;
  }
  get gearTypeId(): GearTypeId {
    return this.props.gearTypeId;
  }
  get code(): string {
    return this.props.code;
  }
  get condition(): GearCondition {
    return this.props.condition;
  }
  get status(): GearStatus {
    return this.props.status;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get acquiredAt(): Date {
    return this.props.acquiredAt;
  }
  get retiredAt(): Date | null {
    return this.props.retiredAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Factory method to create a new GearItem with validation.
   */
  static create(
    input: CreateGearItemInput,
    deps: { idGenerator: { generate(): string }; clock: { now(): Date } }
  ): Result<GearItem, CreateGearItemError> {
    const code = input.code.trim().toUpperCase();
    if (!code) {
      return err({ type: 'empty_code' });
    }

    // Code should be alphanumeric with optional dashes
    if (!/^[A-Z0-9-]+$/.test(code)) {
      return err({ type: 'invalid_code_format', code });
    }

    const now = deps.clock.now();

    return ok(
      new GearItem({
        id: gearItemId(deps.idGenerator.generate()),
        gearTypeId: gearTypeId(input.gearTypeId),
        code,
        condition: input.condition ?? GearCondition.EXCELLENT,
        status: GearStatus.AVAILABLE,
        notes: input.notes?.trim() || null,
        acquiredAt: now,
        retiredAt: null,
        updatedAt: now
      })
    );
  }

  /**
   * Hydrate a GearItem from database record.
   */
  static fromRecord(record: GearItemRecord): GearItem {
    return new GearItem({
      id: gearItemId(record.id),
      gearTypeId: gearTypeId(record.gearTypeId),
      code: record.code,
      condition: record.condition,
      status: record.status,
      notes: record.notes,
      acquiredAt: new Date(record.acquiredAt),
      retiredAt: record.retiredAt ? new Date(record.retiredAt) : null,
      updatedAt: new Date(record.updatedAt)
    });
  }

  /**
   * Convert to a record for database storage.
   */
  toRecord(): GearItemRecord {
    return {
      id: this.props.id,
      gearTypeId: this.props.gearTypeId,
      code: this.props.code,
      condition: this.props.condition,
      status: this.props.status,
      notes: this.props.notes,
      acquiredAt: this.props.acquiredAt.toISOString(),
      retiredAt: this.props.retiredAt?.toISOString() ?? null,
      updatedAt: this.props.updatedAt.toISOString()
    };
  }

  // State predicates

  /**
   * Check if the item can be checked out.
   */
  canCheckout(): boolean {
    return this.props.status === GearStatus.AVAILABLE;
  }

  /**
   * Check if the item is currently checked out.
   */
  isCheckedOut(): boolean {
    return this.props.status === GearStatus.CHECKED_OUT;
  }

  /**
   * Check if the item is retired.
   */
  isRetired(): boolean {
    return this.props.status === GearStatus.RETIRED;
  }

  // State transitions

  /**
   * Mark the item as checked out.
   */
  markCheckedOut(deps: { clock: { now(): Date } }): Result<GearItem, { type: 'not_available' }> {
    if (this.props.status !== GearStatus.AVAILABLE) {
      return err({ type: 'not_available' });
    }

    return ok(
      new GearItem({
        ...this.props,
        status: GearStatus.CHECKED_OUT,
        updatedAt: deps.clock.now()
      })
    );
  }

  /**
   * Mark the item as returned with updated condition.
   */
  markReturned(
    condition: GearCondition,
    deps: { clock: { now(): Date } }
  ): Result<GearItem, { type: 'not_checked_out' }> {
    if (this.props.status !== GearStatus.CHECKED_OUT) {
      return err({ type: 'not_checked_out' });
    }

    // If condition is NEEDS_REPAIR, send to maintenance instead of available
    const newStatus =
      condition === GearCondition.NEEDS_REPAIR
        ? GearStatus.MAINTENANCE
        : GearStatus.AVAILABLE;

    return ok(
      new GearItem({
        ...this.props,
        status: newStatus,
        condition,
        updatedAt: deps.clock.now()
      })
    );
  }

  /**
   * Send the item to maintenance.
   */
  sendToMaintenance(
    notes: string | undefined,
    deps: { clock: { now(): Date } }
  ): Result<GearItem, { type: 'already_in_maintenance' } | { type: 'is_checked_out' } | { type: 'is_retired' }> {
    if (this.props.status === GearStatus.MAINTENANCE) {
      return err({ type: 'already_in_maintenance' });
    }
    if (this.props.status === GearStatus.CHECKED_OUT) {
      return err({ type: 'is_checked_out' });
    }
    if (this.props.status === GearStatus.RETIRED) {
      return err({ type: 'is_retired' });
    }

    return ok(
      new GearItem({
        ...this.props,
        status: GearStatus.MAINTENANCE,
        notes: notes?.trim() || this.props.notes,
        updatedAt: deps.clock.now()
      })
    );
  }

  /**
   * Return from maintenance with updated condition.
   */
  returnFromMaintenance(
    condition: GearCondition,
    deps: { clock: { now(): Date } }
  ): Result<GearItem, { type: 'not_in_maintenance' }> {
    if (this.props.status !== GearStatus.MAINTENANCE) {
      return err({ type: 'not_in_maintenance' });
    }

    return ok(
      new GearItem({
        ...this.props,
        status: GearStatus.AVAILABLE,
        condition,
        updatedAt: deps.clock.now()
      })
    );
  }

  /**
   * Retire the item permanently.
   */
  retire(deps: { clock: { now(): Date } }): Result<GearItem, { type: 'is_checked_out' } | { type: 'already_retired' }> {
    if (this.props.status === GearStatus.CHECKED_OUT) {
      return err({ type: 'is_checked_out' });
    }
    if (this.props.status === GearStatus.RETIRED) {
      return err({ type: 'already_retired' });
    }

    const now = deps.clock.now();

    return ok(
      new GearItem({
        ...this.props,
        status: GearStatus.RETIRED,
        condition: GearCondition.RETIRED,
        retiredAt: now,
        updatedAt: now
      })
    );
  }

  /**
   * Update the condition of the item.
   * Rejects if the item is currently checked out or retired.
   */
  updateCondition(
    condition: GearCondition,
    deps: { clock: { now(): Date } }
  ): Result<GearItem, { type: 'is_checked_out' } | { type: 'is_retired' }> {
    if (this.props.status === GearStatus.CHECKED_OUT) {
      return err({ type: 'is_checked_out' });
    }
    if (this.props.status === GearStatus.RETIRED) {
      return err({ type: 'is_retired' });
    }

    return ok(
      new GearItem({
        ...this.props,
        condition,
        updatedAt: deps.clock.now()
      })
    );
  }

  /**
   * Update item notes.
   */
  updateNotes(notes: string | undefined, deps: { clock: { now(): Date } }): GearItem {
    return new GearItem({
      ...this.props,
      notes: notes?.trim() || null,
      updatedAt: deps.clock.now()
    });
  }
}
