import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberRepository } from './MemberRepository';
import { NotFoundError } from '../errors';
import type { Pot } from '../types';
import type { DataSource } from './PotRepository';

function potWithMembers(members: Pot['members'] = []): Pot {
  return {
    id: 'pot-1',
    name: 'Trip',
    type: 'expense',
    baseCurrency: 'USD',
    members,
    expenses: [],
    history: [],
    budgetEnabled: false,
    checkpointEnabled: false,
    mode: 'casual',
    archived: false,
  };
}

describe('MemberRepository', () => {
  let source: DataSource & { deleteMemberRow?: (potId: string, memberId: string) => Promise<void> };

  beforeEach(() => {
    source = {
      getPots: vi.fn(),
      getPot: vi.fn().mockResolvedValue(potWithMembers([{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }])),
      savePots: vi.fn(),
      savePot: vi.fn(),
      deletePot: vi.fn(),
      exportPot: vi.fn(),
      importPot: vi.fn(),
    };
  });

  it('lists and gets members, throwing when missing', async () => {
    const repo = new MemberRepository(source);
    const members = await repo.list('pot-1');
    expect(members.length).toBe(1);

    await expect(repo.get('pot-1', 'owner')).resolves.toEqual(expect.objectContaining({ id: 'owner' }));
    await expect(repo.get('pot-1', 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates and updates a member', async () => {
    const repo = new MemberRepository(source);
    (source.getPot as any).mockResolvedValueOnce(potWithMembers([{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }]));
    const created = await repo.create('pot-1', { potId: 'pot-1', name: 'Alice' } as any);
    expect(created.name).toBe('Alice');
    expect(source.savePot).toHaveBeenCalled();

    (source.getPot as any).mockResolvedValueOnce(potWithMembers([{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }, { ...created, id: 'm1' } as any]));
    const updated = await repo.update('pot-1', 'm1', { name: 'Alice v2' });
    expect(updated.name).toBe('Alice v2');
  });

  it('remove delegates to deleteMemberRow when available', async () => {
    source.deleteMemberRow = vi.fn().mockResolvedValue(undefined);
    const repo = new MemberRepository(source);
    await repo.remove('pot-1', 'member-1');
    expect(source.deleteMemberRow).toHaveBeenCalledWith('pot-1', 'member-1');
  });

  it('remove is idempotent when member is absent in local mode', async () => {
    const repo = new MemberRepository(source);
    (source.getPot as any).mockResolvedValueOnce(potWithMembers([{ id: 'owner', name: 'You', role: 'Owner', status: 'active' }]));
    await repo.remove('pot-1', 'missing');
    expect(source.savePot).not.toHaveBeenCalled();
  });
});
