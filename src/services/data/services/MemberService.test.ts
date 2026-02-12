import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberService } from './MemberService';
import { ValidationError } from '../errors';

describe('MemberService', () => {
  const repository = {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const cacheInvalidator = {
    invalidate: vi.fn(),
  };

  const service = new MemberService(repository as any, cacheInvalidator);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('addMember validates member name', async () => {
    await expect(service.addMember('pot-1', { name: '', potId: 'pot-1' } as any)).rejects.toBeInstanceOf(ValidationError);
  });

  it('addMember delegates to repository', async () => {
    repository.create.mockResolvedValue({ id: 'm1', name: 'Alice' });

    const result = await service.addMember('pot-1', { name: 'Alice', potId: 'pot-1' } as any);

    expect(result).toEqual({ id: 'm1', name: 'Alice' });
    expect(repository.create).toHaveBeenCalledWith('pot-1', expect.objectContaining({ name: 'Alice' }));
    expect(cacheInvalidator.invalidate).toHaveBeenCalledWith('pot-1');
  });

  it('updateMember and removeMember delegate to repository', async () => {
    repository.update.mockResolvedValue({ id: 'm1', name: 'Bob' });

    await expect(service.updateMember('pot-1', 'm1', { name: 'Bob' })).resolves.toEqual({ id: 'm1', name: 'Bob' });
    await expect(service.removeMember('pot-1', 'm1')).resolves.toBeUndefined();

    expect(repository.update).toHaveBeenCalledWith('pot-1', 'm1', { name: 'Bob' });
    expect(repository.remove).toHaveBeenCalledWith('pot-1', 'm1');
    expect(cacheInvalidator.invalidate).toHaveBeenCalledWith('pot-1');
  });
});
