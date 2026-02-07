import { type Result, ok, err } from '../../application/result.js';
import { GearCategory, TrackingMode } from '../types.js';
import { type GearTypeId, gearTypeId } from '../value-objects/index.js';

/**
 * Props for creating a new GearType.
 */
export interface CreateGearTypeInput {
  name: string;
  category: GearCategory;
  trackingMode: TrackingMode;
  totalQuantity?: number; // Required for BULK, ignored for INDIVIDUAL
  checkoutDurationDays?: number;
  notes?: string;
  imageUrl?: string;
}

/**
 * Props for hydrating a GearType from database.
 */
export interface GearTypeRecord {
  id: string;
  name: string;
  category: GearCategory;
  trackingMode: TrackingMode;
  totalQuantity: number;
  checkoutDurationDays: number;
  notes: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GearTypeProps {
  id: GearTypeId;
  name: string;
  category: GearCategory;
  trackingMode: TrackingMode;
  totalQuantity: number;
  checkoutDurationDays: number;
  notes: string | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateGearTypeError =
  | { type: 'empty_name' }
  | { type: 'bulk_requires_quantity' }
  | { type: 'invalid_quantity'; value: number };

const DEFAULT_CHECKOUT_DAYS = 7;

/**
 * GearType represents a category of gear (e.g., "Winter Sleeping Bag", "Trek 820 Bike").
 * For BULK tracking, quantity is managed at this level.
 * For INDIVIDUAL tracking, GearItem records represent each physical item.
 */
export class GearType {
  private constructor(private readonly props: GearTypeProps) {}

  // Getters
  get id(): GearTypeId {
    return this.props.id;
  }
  get name(): string {
    return this.props.name;
  }
  get category(): GearCategory {
    return this.props.category;
  }
  get trackingMode(): TrackingMode {
    return this.props.trackingMode;
  }
  get totalQuantity(): number {
    return this.props.totalQuantity;
  }
  get checkoutDurationDays(): number {
    return this.props.checkoutDurationDays;
  }
  get notes(): string | null {
    return this.props.notes;
  }
  get imageUrl(): string | null {
    return this.props.imageUrl;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Whether this gear type tracks individual items.
   */
  get isIndividuallyTracked(): boolean {
    return this.props.trackingMode === TrackingMode.INDIVIDUAL;
  }

  /**
   * Whether this gear type tracks by quantity only.
   */
  get isBulkTracked(): boolean {
    return this.props.trackingMode === TrackingMode.BULK;
  }

  /**
   * Factory method to create a new GearType with validation.
   */
  static create(
    input: CreateGearTypeInput,
    deps: { idGenerator: { generate(): string }; clock: { now(): Date } }
  ): Result<GearType, CreateGearTypeError> {
    const name = input.name.trim();
    if (!name) {
      return err({ type: 'empty_name' });
    }

    // BULK tracking requires a quantity
    if (input.trackingMode === TrackingMode.BULK) {
      if (input.totalQuantity === undefined || input.totalQuantity < 0) {
        return err({ type: 'bulk_requires_quantity' });
      }
    }

    const totalQuantity =
      input.trackingMode === TrackingMode.BULK ? input.totalQuantity! : 0;

    if (totalQuantity < 0) {
      return err({ type: 'invalid_quantity', value: totalQuantity });
    }

    const now = deps.clock.now();

    return ok(
      new GearType({
        id: gearTypeId(deps.idGenerator.generate()),
        name,
        category: input.category,
        trackingMode: input.trackingMode,
        totalQuantity,
        checkoutDurationDays: input.checkoutDurationDays ?? DEFAULT_CHECKOUT_DAYS,
        notes: input.notes?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        createdAt: now,
        updatedAt: now
      })
    );
  }

  /**
   * Hydrate a GearType from database record.
   */
  static fromRecord(record: GearTypeRecord): GearType {
    return new GearType({
      id: gearTypeId(record.id),
      name: record.name,
      category: record.category,
      trackingMode: record.trackingMode,
      totalQuantity: record.totalQuantity,
      checkoutDurationDays: record.checkoutDurationDays,
      notes: record.notes,
      imageUrl: record.imageUrl,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt)
    });
  }

  /**
   * Convert to a record for database storage.
   */
  toRecord(): GearTypeRecord {
    return {
      id: this.props.id,
      name: this.props.name,
      category: this.props.category,
      trackingMode: this.props.trackingMode,
      totalQuantity: this.props.totalQuantity,
      checkoutDurationDays: this.props.checkoutDurationDays,
      notes: this.props.notes,
      imageUrl: this.props.imageUrl,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString()
    };
  }

  /**
   * Update the total quantity (for BULK tracked items).
   */
  updateQuantity(
    newQuantity: number,
    deps: { clock: { now(): Date } }
  ): Result<GearType, { type: 'not_bulk_tracked' } | { type: 'invalid_quantity'; value: number }> {
    if (this.props.trackingMode !== TrackingMode.BULK) {
      return err({ type: 'not_bulk_tracked' });
    }
    if (newQuantity < 0) {
      return err({ type: 'invalid_quantity', value: newQuantity });
    }

    return ok(
      new GearType({
        ...this.props,
        totalQuantity: newQuantity,
        updatedAt: deps.clock.now()
      })
    );
  }

  /**
   * Update gear type details.
   */
  update(
    updates: {
      name?: string;
      checkoutDurationDays?: number;
      notes?: string;
      imageUrl?: string;
    },
    deps: { clock: { now(): Date } }
  ): Result<GearType, { type: 'empty_name' }> {
    const name = updates.name !== undefined ? updates.name.trim() : this.props.name;
    if (!name) {
      return err({ type: 'empty_name' });
    }

    return ok(
      new GearType({
        ...this.props,
        name,
        checkoutDurationDays: updates.checkoutDurationDays ?? this.props.checkoutDurationDays,
        notes: updates.notes !== undefined ? updates.notes.trim() || null : this.props.notes,
        imageUrl: updates.imageUrl !== undefined ? updates.imageUrl.trim() || null : this.props.imageUrl,
        updatedAt: deps.clock.now()
      })
    );
  }
}
