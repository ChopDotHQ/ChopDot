import { describe, expect, it, vi } from "vitest";
import { InviteService } from "./InviteService";

type HarnessOptions = {
  sessionUser?: { id: string; email?: string } | null;
  getUserUser?: { id: string; email?: string } | null;
  existingInvite?: { id: string; token: string } | null;
  insertedToken?: string;
  pendingInvites?: any[];
};

const createHarness = (options: HarnessOptions = {}) => {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    ilike: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: options.existingInvite ?? null, error: null })),
    insert: vi.fn((_payload: any) => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { token: options.insertedToken ?? "token-123" },
          error: null,
        })),
      })),
    })),
    order: vi.fn(async () => ({ data: options.pendingInvites ?? [], error: null })),
  };

  const supabase: any = {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: options.sessionUser
            ? { user: options.sessionUser, access_token: "access-token" }
            : null,
        },
      })),
      getUser: vi.fn(async () => ({ data: { user: options.getUserUser ?? null } })),
    },
    from: vi.fn(() => query),
  };

  return {
    service: new InviteService(supabase),
    supabase,
    query,
  };
};

describe("InviteService", () => {
  it("uses session user for createInvite when getUser is unavailable", async () => {
    const { service, supabase, query } = createHarness({
      sessionUser: { id: "session-user", email: "owner@chopdot.io" },
      getUserUser: null,
    });

    const result = await service.createInvite("pot-1", "Alice@Example.com");

    expect(result).toEqual({ success: true, token: "token-123" });
    expect(query.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pot_id: "pot-1",
        invitee_email: "alice@example.com",
        created_by: "session-user",
        status: "pending",
      }),
    );
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("returns a clear error when auth user is not yet resolved", async () => {
    const { service, query } = createHarness({
      sessionUser: null,
      getUserUser: null,
    });

    const result = await service.createInvite("pot-1", "alice@example.com");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Sign-in is still initializing");
    expect(query.insert).not.toHaveBeenCalled();
  });

  it("loads pending invites using session email fallback", async () => {
    const pending = [{ id: "inv-1", invitee_email: "owner@chopdot.io", status: "pending" }];
    const { service, query, supabase } = createHarness({
      sessionUser: { id: "session-user", email: "OWNER@CHOPDOT.IO" },
      getUserUser: null,
      pendingInvites: pending,
    });

    const result = await service.getMyPendingInvites();

    expect(result).toEqual(pending);
    expect(query.ilike).toHaveBeenCalledWith("invitee_email", "owner@chopdot.io");
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("reuses existing pending invite token instead of returning duplicate error", async () => {
    const { service, query } = createHarness({
      sessionUser: { id: "session-user", email: "owner@chopdot.io" },
      existingInvite: { id: "inv-1", token: "existing-token" },
    });

    const result = await service.createInvite("pot-1", "alice@example.com");

    expect(result).toEqual({
      success: true,
      token: "existing-token",
      alreadyExists: true,
    });
    expect(query.insert).not.toHaveBeenCalled();
  });
});
