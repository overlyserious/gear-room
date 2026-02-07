import { type Result, ok, err } from '../result.js';
import type { MemberRepository, CheckoutRepository } from '../ports/repositories.js';
import type { IdGenerator, Clock, EventPublisher } from '../ports/services.js';
import { Member, type CreateMemberInput, type CreateMemberError } from '../../domain/entities/member.js';
import { collegeIdFromRecord, type MemberId } from '../../domain/value-objects/index.js';
import { CheckoutStatus } from '../../domain/types.js';

// Re-export for convenience
export type { CreateMemberInput } from '../../domain/entities/member.js';

// ============================================================================
// Register Member
// ============================================================================

export type RegisterMemberError =
  | CreateMemberError
  | { type: 'college_id_already_exists'; collegeId: string }
  | { type: 'email_already_exists'; email: string };

export interface RegisterMemberDeps {
  memberRepo: MemberRepository;
  idGenerator: IdGenerator;
  clock: Clock;
  eventPublisher: EventPublisher;
}

/**
 * Register a new member. Validates that college ID and email are unique.
 */
export async function registerMember(
  deps: RegisterMemberDeps,
  input: CreateMemberInput
): Promise<Result<Member, RegisterMemberError>> {
  // Check for existing college ID
  const existingByCollegeId = await deps.memberRepo.findByCollegeId(collegeIdFromRecord(input.collegeId));
  if (existingByCollegeId) {
    return err({ type: 'college_id_already_exists', collegeId: input.collegeId });
  }

  // Check for existing email
  const existingByEmail = await deps.memberRepo.findByEmail(input.email);
  if (existingByEmail) {
    return err({ type: 'email_already_exists', email: input.email });
  }

  // Create the member
  const memberResult = Member.create(input, {
    idGenerator: deps.idGenerator,
    clock: deps.clock
  });

  if (!memberResult.ok) {
    return memberResult;
  }

  const member = memberResult.value;

  // Persist
  await deps.memberRepo.save(member);

  // Publish event
  await deps.eventPublisher.publish({
    id: deps.idGenerator.generate(),
    type: 'MemberRegistered',
    aggregateId: member.id,
    occurredAt: deps.clock.now(),
    payload: {
      memberId: member.id,
      collegeId: member.collegeId.value,
      email: member.email.value
    }
  });

  return ok(member);
}

// ============================================================================
// Sign Waiver
// ============================================================================

export type SignWaiverError =
  | { type: 'member_not_found'; memberId: string }
  | { type: 'waiver_already_signed'; signedAt: Date };

export interface SignWaiverDeps {
  memberRepo: MemberRepository;
  clock: Clock;
  eventPublisher: EventPublisher;
  idGenerator: IdGenerator;
}

export interface SignWaiverInput {
  memberId: string;
  waiverVersion: string;
}

/**
 * Record waiver signature for a member.
 */
export async function signWaiver(
  deps: SignWaiverDeps,
  input: SignWaiverInput
): Promise<Result<Member, SignWaiverError>> {
  const member = await deps.memberRepo.findById(input.memberId as MemberId);
  if (!member) {
    return err({ type: 'member_not_found', memberId: input.memberId });
  }

  const signResult = member.signWaiver(input.waiverVersion, { clock: deps.clock });
  if (!signResult.ok) {
    return err({ type: 'waiver_already_signed', signedAt: signResult.error.signedAt });
  }

  const updatedMember = signResult.value;
  await deps.memberRepo.save(updatedMember);

  await deps.eventPublisher.publish({
    id: deps.idGenerator.generate(),
    type: 'WaiverSigned',
    aggregateId: updatedMember.id,
    occurredAt: deps.clock.now(),
    payload: {
      memberId: updatedMember.id,
      waiverVersion: input.waiverVersion,
      expiresAt: updatedMember.waiverStatus.expiresAt?.toISOString()
    }
  });

  return ok(updatedMember);
}

// ============================================================================
// Lookup Member by College ID
// ============================================================================

export interface LookupMemberDeps {
  memberRepo: MemberRepository;
}

/**
 * Look up a member by their college ID (from NFC tap or manual entry).
 */
export async function lookupMemberByCollegeId(
  deps: LookupMemberDeps,
  collegeId: string
): Promise<Member | null> {
  return deps.memberRepo.findByCollegeId(collegeIdFromRecord(collegeId));
}

// ============================================================================
// Get Checkout Eligibility
// ============================================================================

export type CheckoutEligibility =
  | { eligible: true; member: Member }
  | { eligible: false; member: Member; reasons: CheckoutIneligibilityReason[] }
  | { eligible: false; member: null; reasons: [{ type: 'member_not_found' }] };

export type CheckoutIneligibilityReason =
  | { type: 'member_not_found' }
  | { type: 'membership_not_active'; status: string }
  | { type: 'waiver_not_signed' }
  | { type: 'waiver_expired'; expiredAt: Date }
  | { type: 'has_overdue_items'; count: number };

export interface GetCheckoutEligibilityDeps {
  memberRepo: MemberRepository;
  checkoutRepo: CheckoutRepository;
  clock: Clock;
}

/**
 * Check if a member is eligible to check out gear.
 * Returns reasons for ineligibility if not eligible.
 */
export async function getCheckoutEligibility(
  deps: GetCheckoutEligibilityDeps,
  memberId: string
): Promise<CheckoutEligibility> {
  const member = await deps.memberRepo.findById(memberId as MemberId);
  if (!member) {
    return {
      eligible: false,
      member: null,
      reasons: [{ type: 'member_not_found' }]
    };
  }

  const now = deps.clock.now();
  const reasons: CheckoutIneligibilityReason[] = [];

  // Check membership status
  if (member.membershipStatus !== 'ACTIVE') {
    reasons.push({ type: 'membership_not_active', status: member.membershipStatus });
  }

  // Check waiver status
  if (!member.waiverStatus.signed) {
    reasons.push({ type: 'waiver_not_signed' });
  } else if (!member.hasValidWaiver(now)) {
    reasons.push({ type: 'waiver_expired', expiredAt: member.waiverStatus.expiresAt! });
  }

  // Check for overdue items
  const activeCheckouts = await deps.checkoutRepo.findActiveByMemberId(memberId as MemberId);
  const overdueCheckouts = activeCheckouts.filter(c => c.isOverdue(now));
  if (overdueCheckouts.length > 0) {
    const overdueCount = overdueCheckouts.reduce(
      (sum, c) => sum + c.getOverdueItems(now).length,
      0
    );
    reasons.push({ type: 'has_overdue_items', count: overdueCount });
  }

  if (reasons.length > 0) {
    return { eligible: false, member, reasons };
  }

  return { eligible: true, member };
}

// ============================================================================
// Search Members
// ============================================================================

export interface SearchMembersDeps {
  memberRepo: MemberRepository;
}

/**
 * Search for members by name, email, or college ID.
 */
export async function searchMembers(
  deps: SearchMembersDeps,
  searchTerm: string
): Promise<Member[]> {
  if (!searchTerm.trim()) {
    return [];
  }
  return deps.memberRepo.findAll({ searchTerm: searchTerm.trim() });
}
