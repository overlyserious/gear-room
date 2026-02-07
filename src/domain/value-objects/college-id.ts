import { type Result, ok, err } from '../../application/result.js';

/**
 * CollegeId represents the identifier read from a college NFC card.
 * This is the primary way members are identified during checkout.
 */
export interface CollegeId {
  readonly value: string;
}

export type CollegeIdError = { type: 'empty_college_id' } | { type: 'invalid_format'; value: string };

/**
 * Create a CollegeId with validation.
 * College IDs must be non-empty strings.
 */
export function createCollegeId(value: string): Result<CollegeId, CollegeIdError> {
  const trimmed = value.trim();

  if (!trimmed) {
    return err({ type: 'empty_college_id' });
  }

  // Basic format validation - adjust based on your college's ID format
  // Currently allows alphanumeric with optional dashes
  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
    return err({ type: 'invalid_format', value: trimmed });
  }

  return ok({ value: trimmed });
}

/**
 * Create a CollegeId from a trusted source (database).
 * Skips validation since the data is already validated.
 */
export function collegeIdFromRecord(value: string): CollegeId {
  return { value };
}
