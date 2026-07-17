import { describe, it, expect } from 'vitest';
import container from '../../server/microkernel/container.js';

describe('AuraAlert Microkernel Smoke Test', () => {
  it('should bootstrap successfully', () => {
    expect(container).toBeDefined();
    // Check if key services were registered
    expect(container.serviceDiscovery.resolve('EventBus')).toBeDefined();
    expect(container.serviceDiscovery.resolve('CommandBus')).toBeDefined();
  });
});
