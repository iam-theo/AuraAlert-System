export interface AuraAlertOptions {
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export class AuraAlert {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;

  constructor(apiKey: string, options: AuraAlertOptions = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://api.auraalert.io';
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
  }

  // Implementation skeleton for request with retry/idempotency/correlation ID
  private async request(method: string, path: string, options: { body?: any, headers?: Record<string, string>, idempotencyKey?: string } = {}) {
    const correlationId = Math.random().toString(36).substring(7);
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Aura-Correlation-ID': correlationId,
      ...options.headers
    };
    if (options.idempotencyKey) {
      headers['X-Idempotency-Key'] = options.idempotencyKey;
    }
    
    // Fetch implementation with timeout/retry logic would go here
    return { success: true };
  }

  async sendNotification(data: { templateName: string; recipient: string; variables?: Record<string, any> }, idempotencyKey?: string) {
    return this.request('POST', '/v1/notifications', { body: data, idempotencyKey });
  }
}
