import { type Result, ok, err } from '../../application/result.js';

/**
 * Email represents a validated email address.
 */
export interface Email {
  readonly value: string;
}

export type EmailError = { type: 'empty_email' } | { type: 'invalid_email_format'; value: string };

// Simple email regex - not RFC compliant but good enough for practical use
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create an Email with validation.
 */
export function createEmail(value: string): Result<Email, EmailError> {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return err({ type: 'empty_email' });
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return err({ type: 'invalid_email_format', value: trimmed });
  }

  return ok({ value: trimmed });
}

/**
 * Create an Email from a trusted source (database).
 */
export function emailFromRecord(value: string): Email {
  return { value };
}
