import { describe, it, expect } from 'vitest';
import { UserAggregate } from '../../../server/microkernel/domain.js';

describe('UserAggregate', () => {
  it('should correctly initialize and update password', () => {
    const user = new UserAggregate('user-1', {
      email: 'test@example.com',
      passwordHash: 'old-hash',
      roleId: 'role-user'
    });

    expect(user.id).toBe('user-1');
    expect(user.email).toBe('test@example.com');
    expect(user.passwordHash).toBe('old-hash');

    user.updatePassword('new-hash');
    expect(user.passwordHash).toBe('new-hash');
  });

  it('should correctly identify equality', () => {
    const user1 = new UserAggregate('user-1', { email: 'a@a.com', passwordHash: 'h', roleId: 'r' });
    const user2 = new UserAggregate('user-1', { email: 'b@b.com', passwordHash: 'h2', roleId: 'r2' });
    const user3 = new UserAggregate('user-3', { email: 'a@a.com', passwordHash: 'h', roleId: 'r' });

    expect(user1.equals(user2)).toBe(true);
    expect(user1.equals(user3)).toBe(false);
  });
});
