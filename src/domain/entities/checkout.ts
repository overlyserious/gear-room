import { type Result, ok, err } from '../../application/result.js';
import { CheckoutStatus, GearCondition } from '../types.js';
import {
  type CheckoutId,
  checkoutId,
  type MemberId,
  memberId,
  type GearItemId,
  gearItemId,
  type GearTypeId,
  gearTypeId,
  type StaffMemberId,
  staffMemberId
} from '../value-objects/index.js';

/**
 * A checkout item can be either:
 * - An individual gear item (for INDIVIDUAL tracking)
 * - A bulk quantity of a gear type (for BULK tracking)
 */
export type CheckoutItemInput =
  | { type: 'individual'; gearItemId: string }
  | { type: 'bulk'; gearTypeId: string; quantity: number };

/**
 * Internal representation of a checkout item.
 */
export interface CheckoutItem {
  // Either individual or bulk
  readonly gearItemId: GearItemId | null;
  readonly gearTypeId: GearTypeId | null;
  readonly quantity: number; // 1 for individual, N for bulk

  // Timing
  readonly checkedOutAt: Date;
  readonly dueAt: Date;
  readonly returnedAt: Date | null;

  // For bulk items, tracks how many have been returned
  readonly returnedQuantity: number;

  // Condition tracking (for individual items)
  readonly conditionAtCheckout: GearCondition | null;
  readonly conditionAtReturn: GearCondition | null;

  // Notes about this specific item
  readonly returnNotes: string | null;
}

/**
 * Props for creating a new Checkout.
 */
export interface CreateCheckoutInput {
  memberId: string;
  staffMemberId: string;
  items: Array<{
    input: CheckoutItemInput;
    dueAt: Date;
    conditionAtCheckout?: GearCondition; // For individual items
  }>;
  notes?: string;
}

/**
 * Props for hydrating a Checkout from database.
 */
export interface CheckoutRecord {
  id: string;
  memberId: string;
  staffMemberId: string;
  items: string; // JSON serialized CheckoutItem[]
  status: CheckoutStatus;
  createdAt: string;
  completedAt: string | null;
  notes: string | null;
}

interface CheckoutProps {
  id: CheckoutId;
  memberId: MemberId;
  staffMemberId: StaffMemberId;
  items: CheckoutItem[];
  status: CheckoutStatus;
  createdAt: Date;
  completedAt: Date | null;
  notes: string | null;
}

export type CreateCheckoutError =
  | { type: 'no_items' }
  | { type: 'invalid_quantity'; index: number; quantity: number };

export type ReturnItemError =
  | { type: 'item_not_found'; gearItemId: string }
  | { type: 'item_already_returned' }
  | { type: 'checkout_completed' };

export type ReturnBulkError =
  | { type: 'item_not_found'; gearTypeId: string }
  | { type: 'invalid_quantity'; requested: number; remaining: number }
  | { type: 'checkout_completed' };

/**
 * Checkout is the aggregate root for the checkout transaction.
 * It contains all items being borrowed in a single transaction.
 */
export class Checkout {
  private constructor(private readonly props: CheckoutProps) {}

  // Getters
  get id(): CheckoutId {
    return this.props.id;
  }
  get memberId(): MemberId {
    return this.props.memberId;
  }
  get staffMemberId(): StaffMemberId {
    return this.props.staffMemberId;
  }
  get items(): readonly CheckoutItem[] {
    return this.props.items;
  }
  get status(): CheckoutStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get completedAt(): Date | null {
    return this.props.completedAt;
  }
  get notes(): string | null {
    return this.props.notes;
  }

  /**
   * Factory method to create a new Checkout with validation.
   */
  static create(
    input: CreateCheckoutInput,
    deps: { idGenerator: { generate(): string }; clock: { now(): Date } }
  ): Result<Checkout, CreateCheckoutError> {
    if (input.items.length === 0) {
      return err({ type: 'no_items' });
    }

    const now = deps.clock.now();
    const checkoutItems: CheckoutItem[] = [];

    for (let i = 0; i < input.items.length; i++) {
      const itemInput = input.items[i];

      if (itemInput.input.type === 'bulk' && itemInput.input.quantity < 1) {
        return err({ type: 'invalid_quantity', index: i, quantity: itemInput.input.quantity });
      }

      const checkoutItem: CheckoutItem = {
        gearItemId:
          itemInput.input.type === 'individual'
            ? gearItemId(itemInput.input.gearItemId)
            : null,
        gearTypeId:
          itemInput.input.type === 'bulk' ? gearTypeId(itemInput.input.gearTypeId) : null,
        quantity: itemInput.input.type === 'bulk' ? itemInput.input.quantity : 1,
        checkedOutAt: now,
        dueAt: itemInput.dueAt,
        returnedAt: null,
        returnedQuantity: 0,
        conditionAtCheckout: itemInput.conditionAtCheckout ?? null,
        conditionAtReturn: null,
        returnNotes: null
      };

      checkoutItems.push(checkoutItem);
    }

    return ok(
      new Checkout({
        id: checkoutId(deps.idGenerator.generate()),
        memberId: memberId(input.memberId),
        staffMemberId: staffMemberId(input.staffMemberId),
        items: checkoutItems,
        status: CheckoutStatus.ACTIVE,
        createdAt: now,
        completedAt: null,
        notes: input.notes?.trim() || null
      })
    );
  }

  /**
   * Hydrate a Checkout from database record.
   */
  static fromRecord(record: CheckoutRecord): Checkout {
    const items: CheckoutItem[] = JSON.parse(record.items).map((item: any) => ({
      gearItemId: item.gearItemId ? gearItemId(item.gearItemId) : null,
      gearTypeId: item.gearTypeId ? gearTypeId(item.gearTypeId) : null,
      quantity: item.quantity,
      checkedOutAt: new Date(item.checkedOutAt),
      dueAt: new Date(item.dueAt),
      returnedAt: item.returnedAt ? new Date(item.returnedAt) : null,
      returnedQuantity: item.returnedQuantity ?? 0,
      conditionAtCheckout: item.conditionAtCheckout,
      conditionAtReturn: item.conditionAtReturn,
      returnNotes: item.returnNotes
    }));

    return new Checkout({
      id: checkoutId(record.id),
      memberId: memberId(record.memberId),
      staffMemberId: staffMemberId(record.staffMemberId),
      items,
      status: record.status,
      createdAt: new Date(record.createdAt),
      completedAt: record.completedAt ? new Date(record.completedAt) : null,
      notes: record.notes
    });
  }

  /**
   * Convert to a record for database storage.
   */
  toRecord(): CheckoutRecord {
    return {
      id: this.props.id,
      memberId: this.props.memberId,
      staffMemberId: this.props.staffMemberId,
      items: JSON.stringify(
        this.props.items.map((item) => ({
          gearItemId: item.gearItemId,
          gearTypeId: item.gearTypeId,
          quantity: item.quantity,
          checkedOutAt: item.checkedOutAt.toISOString(),
          dueAt: item.dueAt.toISOString(),
          returnedAt: item.returnedAt?.toISOString() ?? null,
          returnedQuantity: item.returnedQuantity,
          conditionAtCheckout: item.conditionAtCheckout,
          conditionAtReturn: item.conditionAtReturn,
          returnNotes: item.returnNotes
        }))
      ),
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      completedAt: this.props.completedAt?.toISOString() ?? null,
      notes: this.props.notes
    };
  }

  // Query methods

  /**
   * Check if any items are overdue.
   */
  isOverdue(asOf: Date = new Date()): boolean {
    return this.props.items.some(
      (item) => !this.isItemFullyReturned(item) && item.dueAt < asOf
    );
  }

  /**
   * Get all overdue items.
   */
  getOverdueItems(asOf: Date = new Date()): CheckoutItem[] {
    return this.props.items.filter(
      (item) => !this.isItemFullyReturned(item) && item.dueAt < asOf
    );
  }

  /**
   * Get all items that haven't been fully returned.
   */
  getActiveItems(): CheckoutItem[] {
    return this.props.items.filter((item) => !this.isItemFullyReturned(item));
  }

  /**
   * Get the maximum days overdue across all items.
   */
  daysOverdue(asOf: Date = new Date()): number {
    const overdueItems = this.getOverdueItems(asOf);
    if (overdueItems.length === 0) return 0;

    const maxOverdue = Math.max(
      ...overdueItems.map((item) =>
        Math.floor((asOf.getTime() - item.dueAt.getTime()) / (1000 * 60 * 60 * 24))
      )
    );
    return Math.max(0, maxOverdue);
  }

  private isItemFullyReturned(item: CheckoutItem): boolean {
    if (item.gearItemId !== null) {
      // Individual item
      return item.returnedAt !== null;
    } else {
      // Bulk item
      return item.returnedQuantity >= item.quantity;
    }
  }

  // State transitions

  /**
   * Return an individual gear item.
   */
  returnItem(
    itemId: string,
    condition: GearCondition,
    notes: string | undefined,
    deps: { clock: { now(): Date } }
  ): Result<Checkout, ReturnItemError> {
    if (this.props.status === CheckoutStatus.COMPLETED) {
      return err({ type: 'checkout_completed' });
    }

    const itemIndex = this.props.items.findIndex(
      (item) => item.gearItemId === itemId
    );

    if (itemIndex === -1) {
      return err({ type: 'item_not_found', gearItemId: itemId });
    }

    const item = this.props.items[itemIndex];
    if (item.returnedAt !== null) {
      return err({ type: 'item_already_returned' });
    }

    const now = deps.clock.now();
    const updatedItems = [...this.props.items];
    updatedItems[itemIndex] = {
      ...item,
      returnedAt: now,
      conditionAtReturn: condition,
      returnNotes: notes?.trim() || null
    };

    const newStatus = this.calculateStatus(updatedItems);

    return ok(
      new Checkout({
        ...this.props,
        items: updatedItems,
        status: newStatus,
        completedAt: newStatus === CheckoutStatus.COMPLETED ? now : null
      })
    );
  }

  /**
   * Return a quantity of bulk items.
   */
  returnBulkItem(
    typeId: string,
    quantity: number,
    notes: string | undefined,
    deps: { clock: { now(): Date } }
  ): Result<Checkout, ReturnBulkError> {
    if (this.props.status === CheckoutStatus.COMPLETED) {
      return err({ type: 'checkout_completed' });
    }

    const itemIndex = this.props.items.findIndex(
      (item) => item.gearTypeId === typeId
    );

    if (itemIndex === -1) {
      return err({ type: 'item_not_found', gearTypeId: typeId });
    }

    const item = this.props.items[itemIndex];
    const remaining = item.quantity - item.returnedQuantity;

    if (quantity > remaining) {
      return err({ type: 'invalid_quantity', requested: quantity, remaining });
    }

    const now = deps.clock.now();
    const newReturnedQuantity = item.returnedQuantity + quantity;
    const isFullyReturned = newReturnedQuantity >= item.quantity;

    const updatedItems = [...this.props.items];
    updatedItems[itemIndex] = {
      ...item,
      returnedQuantity: newReturnedQuantity,
      returnedAt: isFullyReturned ? now : item.returnedAt,
      returnNotes: notes?.trim() || item.returnNotes
    };

    const newStatus = this.calculateStatus(updatedItems);

    return ok(
      new Checkout({
        ...this.props,
        items: updatedItems,
        status: newStatus,
        completedAt: newStatus === CheckoutStatus.COMPLETED ? now : null
      })
    );
  }

  /**
   * Extend the due date for an item.
   */
  extendDueDate(
    itemId: string,
    newDueDate: Date
  ): Result<Checkout, { type: 'item_not_found' } | { type: 'item_already_returned' }> {
    const itemIndex = this.props.items.findIndex(
      (item) => item.gearItemId === itemId || item.gearTypeId === itemId
    );

    if (itemIndex === -1) {
      return err({ type: 'item_not_found' });
    }

    const item = this.props.items[itemIndex];
    if (this.isItemFullyReturned(item)) {
      return err({ type: 'item_already_returned' });
    }

    const updatedItems = [...this.props.items];
    updatedItems[itemIndex] = {
      ...item,
      dueAt: newDueDate
    };

    return ok(
      new Checkout({
        ...this.props,
        items: updatedItems
      })
    );
  }

  private calculateStatus(items: CheckoutItem[]): CheckoutStatus {
    const allReturned = items.every((item) => this.isItemFullyReturned(item));
    const someReturned = items.some((item) => {
      if (item.gearItemId !== null) {
        return item.returnedAt !== null;
      } else {
        return item.returnedQuantity > 0;
      }
    });

    if (allReturned) {
      return CheckoutStatus.COMPLETED;
    } else if (someReturned) {
      return CheckoutStatus.PARTIALLY_RETURNED;
    } else {
      return CheckoutStatus.ACTIVE;
    }
  }
}
