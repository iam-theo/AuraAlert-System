import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';

describe('Metrics Endpoint', () => {
  it('should return prometheus metrics', async () => {
    const response = await request(app).get('/api/metrics');
    expect(response.status).toBe(200);
    expect(response.text).toContain('http_requests_total');
  });
});
