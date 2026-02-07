/**
 * Branded ID types for type safety.
 * These are simple string wrappers that prevent mixing up different ID types.
 */

// Brand symbol for nominal typing
declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

export type MemberId = Brand<string, 'MemberId'>;
export type GearTypeId = Brand<string, 'GearTypeId'>;
export type GearItemId = Brand<string, 'GearItemId'>;
export type CheckoutId = Brand<string, 'CheckoutId'>;
export type StaffMemberId = Brand<string, 'StaffMemberId'>;

/**
 * Create a MemberId from a raw string (trusted source).
 */
export function memberId(id: string): MemberId {
  return id as MemberId;
}

/**
 * Create a GearTypeId from a raw string (trusted source).
 */
export function gearTypeId(id: string): GearTypeId {
  return id as GearTypeId;
}

/**
 * Create a GearItemId from a raw string (trusted source).
 */
export function gearItemId(id: string): GearItemId {
  return id as GearItemId;
}

/**
 * Create a CheckoutId from a raw string (trusted source).
 */
export function checkoutId(id: string): CheckoutId {
  return id as CheckoutId;
}

/**
 * Create a StaffMemberId from a raw string (trusted source).
 */
export function staffMemberId(id: string): StaffMemberId {
  return id as StaffMemberId;
}
