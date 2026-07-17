import { randomUUID } from 'crypto';

/**
 * Support Services for AuraAlert Event-Driven Microkernel
 */

export class TelemetryService {
  public createCorrelationId(): string {
    return randomUUID();
  }

  public log(level: 'info' | 'warn' | 'error', message: string, context: Record<string, any> = {}) {
    console.log(JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
}

export class RateLimiter {
  private rateLimits = new Map<string, { count: number; resetAt: number }>();

  public isAllowed(key: string, limit: number): boolean {
    const now = Date.now();
    const windowMs = 60000;
    const limitRecord = this.rateLimits.get(key);

    if (!limitRecord || now > limitRecord.resetAt) {
      this.rateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (limitRecord.count >= limit) {
      return false;
    }

    limitRecord.count += 1;
    return true;
  }
}
