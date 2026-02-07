import type { MemberRepository, MemberFilter } from '../../application/ports/repositories.js';
import { Member, type MemberRecord } from '../../domain/entities/member.js';
import type { MemberId, CollegeId } from '../../domain/value-objects/index.js';
import type { GearRoomDatabase } from '../storage/database.js';

/**
 * Dexie (IndexedDB) implementation of MemberRepository.
 */
export class DexieMemberRepository implements MemberRepository {
  constructor(private readonly db: GearRoomDatabase) {}

  async findById(id: MemberId): Promise<Member | null> {
    const record = await this.db.members.get(id);
    return record ? Member.fromRecord(record) : null;
  }

  async findByCollegeId(collegeId: CollegeId): Promise<Member | null> {
    const record = await this.db.members.where('collegeId').equals(collegeId.value).first();
    return record ? Member.fromRecord(record) : null;
  }

  async findByEmail(email: string): Promise<Member | null> {
    const record = await this.db.members.where('email').equals(email.toLowerCase()).first();
    return record ? Member.fromRecord(record) : null;
  }

  async findAll(filter?: MemberFilter): Promise<Member[]> {
    let collection = this.db.members.toCollection();

    if (filter?.status) {
      collection = this.db.members.where('membershipStatus').equals(filter.status);
    }

    let records = await collection.toArray();

    // Apply in-memory filters
    if (filter?.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      records = records.filter(
        (r) =>
          r.firstName.toLowerCase().includes(term) ||
          r.lastName.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term)
      );
    }

    if (filter?.hasValidWaiver !== undefined) {
      const now = new Date();
      records = records.filter((r) => {
        const hasValid =
          r.waiverSigned && r.waiverExpiresAt && new Date(r.waiverExpiresAt) > now;
        return filter.hasValidWaiver ? hasValid : !hasValid;
      });
    }

    return records.map((r) => Member.fromRecord(r));
  }

  async save(member: Member): Promise<void> {
    await this.db.members.put(member.toRecord());
  }

  async delete(id: MemberId): Promise<void> {
    await this.db.members.delete(id);
  }
}
