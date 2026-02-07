/**
 * Domain enums and shared types.
 * These define the vocabulary of the gear room domain.
 */

export const MembershipStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  EXPIRED: 'EXPIRED'
} as const;
export type MembershipStatus = (typeof MembershipStatus)[keyof typeof MembershipStatus];

export const GearCategory = {
  SLEEPING_BAG: 'SLEEPING_BAG',
  TENT: 'TENT',
  BACKPACK: 'BACKPACK',
  STOVE: 'STOVE',
  BIKE: 'BIKE',
  PAD: 'PAD',
  POLES: 'POLES',
  COOKWARE: 'COOKWARE',
  CLIMBING: 'CLIMBING',
  WATER: 'WATER',
  OTHER: 'OTHER'
} as const;
export type GearCategory = (typeof GearCategory)[keyof typeof GearCategory];

export const GearCondition = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  NEEDS_REPAIR: 'NEEDS_REPAIR',
  RETIRED: 'RETIRED'
} as const;
export type GearCondition = (typeof GearCondition)[keyof typeof GearCondition];

export const GearStatus = {
  AVAILABLE: 'AVAILABLE',
  CHECKED_OUT: 'CHECKED_OUT',
  MAINTENANCE: 'MAINTENANCE',
  RETIRED: 'RETIRED'
} as const;
export type GearStatus = (typeof GearStatus)[keyof typeof GearStatus];

export const TrackingMode = {
  INDIVIDUAL: 'INDIVIDUAL',
  BULK: 'BULK'
} as const;
export type TrackingMode = (typeof TrackingMode)[keyof typeof TrackingMode];

export const CheckoutStatus = {
  ACTIVE: 'ACTIVE',
  PARTIALLY_RETURNED: 'PARTIALLY_RETURNED',
  COMPLETED: 'COMPLETED'
} as const;
export type CheckoutStatus = (typeof CheckoutStatus)[keyof typeof CheckoutStatus];
