import { type Result, ok, err } from '../../application/result.js';
import { MembershipStatus } from '../types.js';
import {
  type MemberId,
  memberId,
  type CollegeId,
  collegeIdFromRecord,
  createCollegeId,
  type CollegeIdError,
  type Email,
  emailFromRecord,
  createEmail,
  type EmailError
} from '../value-objects/index.js';

/**
 * WaiverStatus is embedded in Member and tracks waiver signing state.
 */
export interface WaiverStatus {
  readonly signed: boolean;
  readonly signedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly waiverVersion: string | null;
}

/**
 * Props for creating a new Member.
 */
export interface CreateMemberInput {
  collegeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

/**
 * Props for hydrating a Member from database.
 */
export interface MemberRecord {
  id: string;
  collegeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  membershipStatus: MembershipStatus;
  waiverSigned: boolean;
  waiverSignedAt: string | null;
  waiverExpiresAt: string | null;
  waiverVersion: string | null;
  registeredAt: string;
  updatedAt: string;
}

interface MemberProps {
  id: MemberId;
  collegeId: CollegeId;
  firstName: string;
  lastName: string;
  email: Email;
  phone: string | null;
  membershipStatus: MembershipStatus;
  waiverStatus: WaiverStatus;
  registeredAt: Date;
  updatedAt: Date;
}

export type CreateMemberError =
  | { type: 'invalid_college_id'; error: CollegeIdError }
  | { type: 'invalid_email'; error: EmailError }
  | { type: 'empty_first_name' }
  | { type: 'empty_last_name' };

export type SignWaiverError = { type: 'waiver_already_signed'; signedAt: Date };

export type SuspendError = { type: 'already_suspended' };

export type ReinstateError = { type: 'not_suspended' };

/**
 * Member entity representing a person who can check out gear.
 * Immutable - all mutations return new instances.
 */
export class Member {
  private constructor(private readonly props: MemberProps) {}

  // Getters
  get id(): MemberId {
    return this.props.id;
  }
  get collegeId(): CollegeId {
    return this.props.collegeId;
  }
  get firstName(): string {
    return this.props.firstName;
  }
  get lastName(): string {
    return this.props.lastName;
  }
  get fullName(): string {
    return `${this.props.firstName} ${this.props.lastName}`;
  }
  get email(): Email {
    return this.props.email;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get membershipStatus(): MembershipStatus {
    return this.props.membershipStatus;
  }
  get waiverStatus(): WaiverStatus {
    return this.props.waiverStatus;
  }
  get registeredAt(): Date {
    return this.props.registeredAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  /**
   * Factory method to create a new Member with validation.
   */
  static create(
    input: CreateMemberInput,
    deps: { idGenerator: { generate(): string }; clock: { now(): Date } }
  ): Result<Member, CreateMemberError> {
    // Validate college ID
    const collegeIdResult = createCollegeId(input.collegeId);
    if (!collegeIdResult.ok) {
      return err({ type: 'invalid_college_id', error: collegeIdResult.error });
    }

    // Validate email
    const emailResult = createEmail(input.email);
    if (!emailResult.ok) {
      return err({ type: 'invalid_email', error: emailResult.error });
    }

    // Validate names
    const firstName = input.firstName.trim();
    if (!firstName) {
      return err({ type: 'empty_first_name' });
    }

    const lastName = input.lastName.trim();
    if (!lastName) {
      return err({ type: 'empty_last_name' });
    }

    const now = deps.clock.now();

    return ok(
      new Member({
        id: memberId(deps.idGenerator.generate()),
        collegeId: collegeIdResult.value,
        firstName,
        lastName,
        email: emailResult.value,
        phone: input.phone?.trim() || null,
        membershipStatus: MembershipStatus.ACTIVE,
        waiverStatus: {
          signed: false,
          signedAt: null,
          expiresAt: null,
          waiverVersion: null
        },
        registeredAt: now,
        updatedAt: now
      })
    );
  }

  /**
   * Hydrate a Member from database record (no validation).
   */
  static fromRecord(record: MemberRecord): Member {
    return new Member({
      id: memberId(record.id),
      collegeId: collegeIdFromRecord(record.collegeId),
      firstName: record.firstName,
      lastName: record.lastName,
      email: emailFromRecord(record.email),
      phone: record.phone,
      membershipStatus: record.membershipStatus,
      waiverStatus: {
        signed: record.waiverSigned,
        signedAt: record.waiverSignedAt ? new Date(record.waiverSignedAt) : null,
        expiresAt: record.waiverExpiresAt ? new Date(record.waiverExpiresAt) : null,
        waiverVersion: record.waiverVersion
      },
      registeredAt: new Date(record.registeredAt),
      updatedAt: new Date(record.updatedAt)
    });
  }

  /**
   * Convert to a record for database storage.
   */
  toRecord(): MemberRecord {
    return {
      id: this.props.id,
      collegeId: this.props.collegeId.value,
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      email: this.props.email.value,
      phone: this.props.phone,
      membershipStatus: this.props.membershipStatus,
      waiverSigned: this.props.waiverStatus.signed,
      waiverSignedAt: this.props.waiverStatus.signedAt?.toISOString() ?? null,
      waiverExpiresAt: this.props.waiverStatus.expiresAt?.toISOString() ?? null,
      waiverVersion: this.props.waiverStatus.waiverVersion,
      registeredAt: this.props.registeredAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString()
    };
  }

  // State predicates

  /**
   * Check if the member has a valid (signed and not expired) waiver.
   */
  hasValidWaiver(asOf: Date = new Date()): boolean {
    if (!this.props.waiverStatus.signed) {
      return false;
    }
    if (!this.props.waiverStatus.expiresAt) {
      return false;
    }
    return this.props.waiverStatus.expiresAt > asOf;
  }

  /**
   * Check if the member can check out gear.
   * Requires active status and valid waiver.
   */
  canCheckout(asOf: Date = new Date()): boolean {
    return this.props.membershipStatus === MembershipStatus.ACTIVE && this.hasValidWaiver(asOf);
  }

  // State transitions

  /**
   * Sign the waiver. Sets expiration to 1 year from now.
   */
  signWaiver(
    waiverVersion: string,
    deps: { clock: { now(): Date } }
  ): Result<Member, SignWaiverError> {
    if (this.props.waiverStatus.signed && this.hasValidWaiver(deps.clock.now())) {
      return err({ type: 'waiver_already_signed', signedAt: this.props.waiverStatus.signedAt! });
    }

    const now = deps.clock.now();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    return ok(
      new Member({
        ...this.props,
        waiverStatus: {
          signed: true,
          signedAt: now,
          expiresAt,
          waiverVersion
        },
        updatedAt: now
      })
    );
  }

  /**
   * Suspend the member (e.g., for overdue items or policy violation).
   */
  suspend(deps: { clock: { now(): Date } }): Result<Member, SuspendError> {
    if (this.props.membershipStatus === MembershipStatus.SUSPENDED) {
      return err({ type: 'already_suspended' });
    }

    return ok(
      new Member({
        ...this.props,
        membershipStatus: MembershipStatus.SUSPENDED,
        updatedAt: deps.clock.now()
      })
    );
  }

  /**
   * Reinstate a suspended member.
   */
  reinstate(deps: { clock: { now(): Date } }): Result<Member, ReinstateError> {
    if (this.props.membershipStatus !== MembershipStatus.SUSPENDED) {
      return err({ type: 'not_suspended' });
    }

    return ok(
      new Member({
        ...this.props,
        membershipStatus: MembershipStatus.ACTIVE,
        updatedAt: deps.clock.now()
      })
    );
  }

  /**
   * Update contact information.
   */
  updateContactInfo(
    updates: { email?: string; phone?: string },
    deps: { clock: { now(): Date } }
  ): Result<Member, { type: 'invalid_email'; error: EmailError }> {
    let email = this.props.email;

    if (updates.email !== undefined) {
      const emailResult = createEmail(updates.email);
      if (!emailResult.ok) {
        return err({ type: 'invalid_email', error: emailResult.error });
      }
      email = emailResult.value;
    }

    return ok(
      new Member({
        ...this.props,
        email,
        phone: updates.phone !== undefined ? updates.phone.trim() || null : this.props.phone,
        updatedAt: deps.clock.now()
      })
    );
  }
}
