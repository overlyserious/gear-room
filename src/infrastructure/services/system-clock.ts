import type { Clock } from '../../application/ports/services.js';

/**
 * System clock implementation using Date.now().
 */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  today(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
