import type { Member } from '../../domain/entities/member.js';
import type { GearType } from '../../domain/entities/gear-type.js';
import type { GearItem } from '../../domain/entities/gear-item.js';
import type { Checkout } from '../../domain/entities/checkout.js';
import type { MemberId, GearTypeId, GearItemId, CheckoutId, CollegeId } from '../../domain/value-objects/index.js';
import type { MembershipStatus, GearCategory, GearStatus, CheckoutStatus } from '../../domain/types.js';

/**
 * Repository interface for Member persistence.
 */
export interface MemberRepository {
  findById(id: MemberId): Promise<Member | null>;
  findByCollegeId(collegeId: CollegeId): Promise<Member | null>;
  findByEmail(email: string): Promise<Member | null>;
  findAll(filter?: MemberFilter): Promise<Member[]>;
  save(member: Member): Promise<void>;
  delete(id: MemberId): Promise<void>;
}

export interface MemberFilter {
  status?: MembershipStatus;
  hasValidWaiver?: boolean;
  searchTerm?: string;
}

/**
 * Repository interface for GearType persistence.
 */
export interface GearTypeRepository {
  findById(id: GearTypeId): Promise<GearType | null>;
  findByCategory(category: GearCategory): Promise<GearType[]>;
  search(searchTerm: string): Promise<GearType[]>;
  findAll(): Promise<GearType[]>;
  save(gearType: GearType): Promise<void>;
  delete(id: GearTypeId): Promise<void>;
}

/**
 * Repository interface for GearItem persistence.
 */
export interface GearItemRepository {
  findById(id: GearItemId): Promise<GearItem | null>;
  findByCode(code: string): Promise<GearItem | null>;
  findByGearTypeId(gearTypeId: GearTypeId): Promise<GearItem[]>;
  findAll(filter?: GearItemFilter): Promise<GearItem[]>;
  save(item: GearItem): Promise<void>;
  saveMany(items: GearItem[]): Promise<void>;
  delete(id: GearItemId): Promise<void>;
}

export interface GearItemFilter {
  status?: GearStatus | GearStatus[];
  gearTypeId?: GearTypeId;
}

/**
 * Repository interface for Checkout persistence.
 */
export interface CheckoutRepository {
  findById(id: CheckoutId): Promise<Checkout | null>;
  findByMemberId(memberId: MemberId, filter?: CheckoutFilter): Promise<Checkout[]>;
  findActiveByMemberId(memberId: MemberId): Promise<Checkout[]>;
  findOverdue(asOf: Date): Promise<Checkout[]>;
  findAll(filter?: CheckoutFilter): Promise<Checkout[]>;
  save(checkout: Checkout): Promise<void>;
}

export interface CheckoutFilter {
  status?: CheckoutStatus | CheckoutStatus[];
  fromDate?: Date;
  toDate?: Date;
}
