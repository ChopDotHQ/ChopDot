drop extension if exists "pg_net";


  create table "public"."auth_nonces" (
    "address" text not null,
    "nonce" text not null,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."auth_nonces" enable row level security;


  create table "public"."contributions" (
    "id" uuid not null default gen_random_uuid(),
    "expense_id" uuid not null,
    "member_id" uuid not null,
    "share_minor" bigint not null,
    "paid" boolean not null default false,
    "created_at" timestamp with time zone not null default now(),
    "metadata" jsonb default '{}'::jsonb
      );



  create table "public"."crdt_changes" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pot_id" uuid not null,
    "change_data" bytea not null,
    "hash" text not null,
    "actor" text not null,
    "seq" integer not null,
    "user_id" uuid not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."crdt_changes" enable row level security;


  create table "public"."crdt_checkpoints" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pot_id" uuid not null,
    "document_data" bytea not null,
    "heads" text[] not null,
    "change_count" integer not null default 0,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "created_by" uuid not null
      );


alter table "public"."crdt_checkpoints" enable row level security;


  create table "public"."expenses" (
    "id" uuid not null default gen_random_uuid(),
    "pot_id" uuid not null,
    "creator_id" uuid not null,
    "amount_minor" bigint not null,
    "currency_code" text not null default 'DOT'::text,
    "description" text,
    "receipt_path" text,
    "receipt_thumb_path" text,
    "receipt_size" integer,
    "created_at" timestamp with time zone not null default now(),
    "metadata" jsonb default '{}'::jsonb
      );



  create table "public"."invites" (
    "id" uuid not null default gen_random_uuid(),
    "pot_id" uuid not null,
    "invitee_email" text not null,
    "status" text not null default 'pending'::text,
    "token" uuid not null default gen_random_uuid(),
    "expires_at" timestamp with time zone,
    "accepted_at" timestamp with time zone,
    "accepted_by" uuid,
    "created_by" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "declined_at" timestamp with time zone,
    "declined_by" uuid
      );


alter table "public"."invites" enable row level security;


  create table "public"."payments" (
    "id" uuid not null default gen_random_uuid(),
    "settlement_id" uuid not null,
    "method" text not null,
    "reference" text,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."pot_members" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pot_id" uuid not null,
    "user_id" uuid not null,
    "role" character varying(20) not null default 'member'::character varying,
    "status" character varying(20) not null default 'active'::character varying,
    "joined_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."pot_members" enable row level security;


  create table "public"."pots" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(100) not null,
    "created_by" uuid not null default auth.uid(),
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "archived_at" timestamp with time zone,
    "automerge_heads" text[],
    "last_synced_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "metadata" jsonb default '{}'::jsonb,
    "base_currency" text default 'DOT'::text,
    "pot_type" text default 'expense'::text,
    "checkpoint_enabled" boolean default true,
    "budget_enabled" boolean default false,
    "budget" numeric,
    "goal_amount" numeric,
    "goal_description" text,
    "last_edit_at" timestamp with time zone
      );


alter table "public"."pots" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "username" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."receipts" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "pot_id" uuid not null,
    "expense_id" character varying(100) not null,
    "cid" character varying(100) not null,
    "filename" character varying(255),
    "mime_type" character varying(100),
    "size_bytes" integer,
    "uploaded_by" uuid not null,
    "uploaded_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."receipts" enable row level security;


  create table "public"."settlements" (
    "id" uuid not null default gen_random_uuid(),
    "pot_id" uuid not null,
    "from_member_id" uuid not null,
    "to_member_id" uuid not null,
    "amount_minor" bigint not null,
    "currency_code" text not null default 'DOT'::text,
    "status" text not null default 'pending'::text,
    "tx_hash" text,
    "confirmations" integer not null default 0,
    "last_checked_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."users" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "wallet_address" character varying(255),
    "name" character varying(100),
    "avatar_url" text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "last_seen_at" timestamp with time zone
      );


alter table "public"."users" enable row level security;


  create table "public"."wallet_links" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "chain" text not null,
    "address" text not null,
    "provider" text not null,
    "verified_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."wallet_links" enable row level security;

CREATE INDEX auth_nonces_expires_at_idx ON public.auth_nonces USING btree (expires_at);

CREATE UNIQUE INDEX auth_nonces_pkey ON public.auth_nonces USING btree (address);

CREATE INDEX contributions_expense_idx ON public.contributions USING btree (expense_id);

CREATE UNIQUE INDEX contributions_pkey ON public.contributions USING btree (id);

CREATE UNIQUE INDEX crdt_changes_pkey ON public.crdt_changes USING btree (id);

CREATE UNIQUE INDEX crdt_changes_pot_id_hash_key ON public.crdt_changes USING btree (pot_id, hash);

CREATE UNIQUE INDEX crdt_checkpoints_pkey ON public.crdt_checkpoints USING btree (id);

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

CREATE INDEX expenses_pot_created_idx ON public.expenses USING btree (pot_id, created_at DESC);

CREATE INDEX idx_crdt_changes_created_at ON public.crdt_changes USING btree (created_at);

CREATE INDEX idx_crdt_changes_hash ON public.crdt_changes USING btree (hash);

CREATE INDEX idx_crdt_changes_pot_id ON public.crdt_changes USING btree (pot_id);

CREATE INDEX idx_crdt_checkpoints_created_at ON public.crdt_checkpoints USING btree (created_at);

CREATE INDEX idx_crdt_checkpoints_pot_id ON public.crdt_checkpoints USING btree (pot_id);

CREATE INDEX idx_pot_members_pot_id ON public.pot_members USING btree (pot_id);

CREATE INDEX idx_pot_members_status ON public.pot_members USING btree (status);

CREATE INDEX idx_pot_members_user_id ON public.pot_members USING btree (user_id);

CREATE INDEX idx_pots_archived_at ON public.pots USING btree (archived_at);

CREATE INDEX idx_pots_created_by ON public.pots USING btree (created_by);

CREATE INDEX idx_receipts_cid ON public.receipts USING btree (cid);

CREATE INDEX idx_receipts_expense_id ON public.receipts USING btree (expense_id);

CREATE INDEX idx_receipts_pot_id ON public.receipts USING btree (pot_id);

CREATE INDEX idx_users_wallet ON public.users USING btree (wallet_address);

CREATE UNIQUE INDEX invites_pkey ON public.invites USING btree (id);

CREATE UNIQUE INDEX invites_pot_email_idx ON public.invites USING btree (pot_id, invitee_email);

CREATE UNIQUE INDEX invites_pot_email_pending_idx ON public.invites USING btree (pot_id, invitee_email) WHERE (status = 'pending'::text);

CREATE INDEX invites_pot_idx ON public.invites USING btree (pot_id);

CREATE INDEX invites_status_idx ON public.invites USING btree (status);

CREATE UNIQUE INDEX invites_token_idx ON public.invites USING btree (token);

CREATE UNIQUE INDEX payments_pkey ON public.payments USING btree (id);

CREATE INDEX payments_settlement_idx ON public.payments USING btree (settlement_id);

CREATE UNIQUE INDEX pot_members_pkey ON public.pot_members USING btree (id);

CREATE UNIQUE INDEX pot_members_pot_id_user_id_key ON public.pot_members USING btree (pot_id, user_id);

CREATE UNIQUE INDEX pots_pkey ON public.pots USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX profiles_username_lower_unique ON public.profiles USING btree (lower(username)) WHERE (username IS NOT NULL);

CREATE UNIQUE INDEX receipts_cid_key ON public.receipts USING btree (cid);

CREATE UNIQUE INDEX receipts_pkey ON public.receipts USING btree (id);

CREATE UNIQUE INDEX settlements_pkey ON public.settlements USING btree (id);

CREATE INDEX settlements_pot_created_idx ON public.settlements USING btree (pot_id, created_at DESC);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX users_wallet_address_key ON public.users USING btree (wallet_address);

CREATE INDEX wallet_links_address_idx ON public.wallet_links USING btree (lower(address));

CREATE INDEX wallet_links_chain_idx ON public.wallet_links USING btree (chain);

CREATE UNIQUE INDEX wallet_links_pkey ON public.wallet_links USING btree (id);

CREATE UNIQUE INDEX wallet_links_user_chain_address_unique_idx ON public.wallet_links USING btree (user_id, chain, lower(address));

CREATE INDEX wallet_links_user_id_idx ON public.wallet_links USING btree (user_id);

CREATE INDEX wallet_links_verified_at_idx ON public.wallet_links USING btree (verified_at);

CREATE UNIQUE INDEX wallet_links_verified_unique ON public.wallet_links USING btree (lower(address), chain) WHERE (verified_at IS NOT NULL);

alter table "public"."auth_nonces" add constraint "auth_nonces_pkey" PRIMARY KEY using index "auth_nonces_pkey";

alter table "public"."contributions" add constraint "contributions_pkey" PRIMARY KEY using index "contributions_pkey";

alter table "public"."crdt_changes" add constraint "crdt_changes_pkey" PRIMARY KEY using index "crdt_changes_pkey";

alter table "public"."crdt_checkpoints" add constraint "crdt_checkpoints_pkey" PRIMARY KEY using index "crdt_checkpoints_pkey";

alter table "public"."expenses" add constraint "expenses_pkey" PRIMARY KEY using index "expenses_pkey";

alter table "public"."invites" add constraint "invites_pkey" PRIMARY KEY using index "invites_pkey";

alter table "public"."payments" add constraint "payments_pkey" PRIMARY KEY using index "payments_pkey";

alter table "public"."pot_members" add constraint "pot_members_pkey" PRIMARY KEY using index "pot_members_pkey";

alter table "public"."pots" add constraint "pots_pkey" PRIMARY KEY using index "pots_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."receipts" add constraint "receipts_pkey" PRIMARY KEY using index "receipts_pkey";

alter table "public"."settlements" add constraint "settlements_pkey" PRIMARY KEY using index "settlements_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."wallet_links" add constraint "wallet_links_pkey" PRIMARY KEY using index "wallet_links_pkey";

alter table "public"."contributions" add constraint "contributions_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE not valid;

alter table "public"."contributions" validate constraint "contributions_expense_id_fkey";

alter table "public"."crdt_changes" add constraint "crdt_changes_pot_id_fkey" FOREIGN KEY (pot_id) REFERENCES public.pots(id) ON DELETE CASCADE not valid;

alter table "public"."crdt_changes" validate constraint "crdt_changes_pot_id_fkey";

alter table "public"."crdt_changes" add constraint "crdt_changes_pot_id_hash_key" UNIQUE using index "crdt_changes_pot_id_hash_key";

alter table "public"."crdt_changes" add constraint "crdt_changes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) not valid;

alter table "public"."crdt_changes" validate constraint "crdt_changes_user_id_fkey";

alter table "public"."crdt_checkpoints" add constraint "crdt_checkpoints_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."crdt_checkpoints" validate constraint "crdt_checkpoints_created_by_fkey";

alter table "public"."crdt_checkpoints" add constraint "crdt_checkpoints_pot_id_fkey" FOREIGN KEY (pot_id) REFERENCES public.pots(id) ON DELETE CASCADE not valid;

alter table "public"."crdt_checkpoints" validate constraint "crdt_checkpoints_pot_id_fkey";

alter table "public"."expenses" add constraint "expenses_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."expenses" validate constraint "expenses_creator_id_fkey";

alter table "public"."invites" add constraint "invites_accepted_by_fkey" FOREIGN KEY (accepted_by) REFERENCES auth.users(id) not valid;

alter table "public"."invites" validate constraint "invites_accepted_by_fkey";

alter table "public"."invites" add constraint "invites_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."invites" validate constraint "invites_created_by_fkey";

alter table "public"."invites" add constraint "invites_declined_by_fkey" FOREIGN KEY (declined_by) REFERENCES auth.users(id) not valid;

alter table "public"."invites" validate constraint "invites_declined_by_fkey";

alter table "public"."invites" add constraint "invites_pot_id_fkey" FOREIGN KEY (pot_id) REFERENCES public.pots(id) ON DELETE CASCADE not valid;

alter table "public"."invites" validate constraint "invites_pot_id_fkey";

alter table "public"."invites" add constraint "invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text, 'declined'::text]))) not valid;

alter table "public"."invites" validate constraint "invites_status_check";

alter table "public"."payments" add constraint "payments_settlement_id_fkey" FOREIGN KEY (settlement_id) REFERENCES public.settlements(id) ON DELETE CASCADE not valid;

alter table "public"."payments" validate constraint "payments_settlement_id_fkey";

alter table "public"."pot_members" add constraint "pot_members_pot_id_fkey" FOREIGN KEY (pot_id) REFERENCES public.pots(id) ON DELETE CASCADE not valid;

alter table "public"."pot_members" validate constraint "pot_members_pot_id_fkey";

alter table "public"."pot_members" add constraint "pot_members_pot_id_user_id_key" UNIQUE using index "pot_members_pot_id_user_id_key";

alter table "public"."pot_members" add constraint "pot_members_role_check" CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'member'::character varying])::text[]))) not valid;

alter table "public"."pot_members" validate constraint "pot_members_role_check";

alter table "public"."pot_members" add constraint "pot_members_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'pending'::character varying, 'removed'::character varying])::text[]))) not valid;

alter table "public"."pot_members" validate constraint "pot_members_status_check";

alter table "public"."pot_members" add constraint "pot_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."pot_members" validate constraint "pot_members_user_id_fkey";

alter table "public"."pots" add constraint "pots_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) not valid;

alter table "public"."pots" validate constraint "pots_created_by_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."receipts" add constraint "receipts_cid_key" UNIQUE using index "receipts_cid_key";

alter table "public"."receipts" add constraint "receipts_pot_id_fkey" FOREIGN KEY (pot_id) REFERENCES public.pots(id) ON DELETE CASCADE not valid;

alter table "public"."receipts" validate constraint "receipts_pot_id_fkey";

alter table "public"."receipts" add constraint "receipts_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.users(id) not valid;

alter table "public"."receipts" validate constraint "receipts_uploaded_by_fkey";

alter table "public"."settlements" add constraint "settlements_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'broadcast'::text, 'finalised'::text, 'failed'::text, 'cancelled'::text]))) not valid;

alter table "public"."settlements" validate constraint "settlements_status_check";

alter table "public"."users" add constraint "users_wallet_address_key" UNIQUE using index "users_wallet_address_key";

alter table "public"."wallet_links" add constraint "wallet_links_chain_check" CHECK ((chain = ANY (ARRAY['polkadot'::text, 'evm'::text]))) not valid;

alter table "public"."wallet_links" validate constraint "wallet_links_chain_check";

alter table "public"."wallet_links" add constraint "wallet_links_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."wallet_links" validate constraint "wallet_links_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.can_access_pot(pot_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    exists (
      select 1 from public.pots p
      where p.id = pot_uuid
        and p.created_by = auth.uid()
    )
    or exists (
      select 1 from public.pot_members pm
      where pm.pot_id = pot_uuid
        and pm.user_id = auth.uid()
        and pm.status = 'active'
    );
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_crdt_changes()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  DELETE FROM crdt_changes
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY pot_id ORDER BY created_at DESC) as rn
      FROM crdt_changes
    ) t
    WHERE t.rn > 1000
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_pot_members(pot_uuid uuid)
 RETURNS TABLE(user_id uuid, role character varying, status character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT pm.user_id, pm.role, pm.status
  FROM pot_members pm
  WHERE pm.pot_id = pot_uuid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_pot_member(pot_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pot_members
    WHERE pot_id = pot_uuid
    AND user_id = user_uuid
    AND status = 'active'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pots_ensure_owner_member()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  insert into public.pot_members (pot_id, user_id, role, status)
  values (new.id, new.created_by, 'owner', 'active')
  on conflict (pot_id, user_id) do update
    set role = excluded.role,
        status = excluded.status;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pots_preserve_creator()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pots_set_created_by()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  if new.created_by is null then
    raise exception 'pots.created_by is required (auth.uid() was null)';
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."auth_nonces" to "anon";

grant insert on table "public"."auth_nonces" to "anon";

grant references on table "public"."auth_nonces" to "anon";

grant select on table "public"."auth_nonces" to "anon";

grant trigger on table "public"."auth_nonces" to "anon";

grant truncate on table "public"."auth_nonces" to "anon";

grant update on table "public"."auth_nonces" to "anon";

grant delete on table "public"."auth_nonces" to "authenticated";

grant insert on table "public"."auth_nonces" to "authenticated";

grant references on table "public"."auth_nonces" to "authenticated";

grant select on table "public"."auth_nonces" to "authenticated";

grant trigger on table "public"."auth_nonces" to "authenticated";

grant truncate on table "public"."auth_nonces" to "authenticated";

grant update on table "public"."auth_nonces" to "authenticated";

grant delete on table "public"."auth_nonces" to "service_role";

grant insert on table "public"."auth_nonces" to "service_role";

grant references on table "public"."auth_nonces" to "service_role";

grant select on table "public"."auth_nonces" to "service_role";

grant trigger on table "public"."auth_nonces" to "service_role";

grant truncate on table "public"."auth_nonces" to "service_role";

grant update on table "public"."auth_nonces" to "service_role";

grant delete on table "public"."contributions" to "anon";

grant insert on table "public"."contributions" to "anon";

grant references on table "public"."contributions" to "anon";

grant select on table "public"."contributions" to "anon";

grant trigger on table "public"."contributions" to "anon";

grant truncate on table "public"."contributions" to "anon";

grant update on table "public"."contributions" to "anon";

grant delete on table "public"."contributions" to "authenticated";

grant insert on table "public"."contributions" to "authenticated";

grant references on table "public"."contributions" to "authenticated";

grant select on table "public"."contributions" to "authenticated";

grant trigger on table "public"."contributions" to "authenticated";

grant truncate on table "public"."contributions" to "authenticated";

grant update on table "public"."contributions" to "authenticated";

grant delete on table "public"."contributions" to "service_role";

grant insert on table "public"."contributions" to "service_role";

grant references on table "public"."contributions" to "service_role";

grant select on table "public"."contributions" to "service_role";

grant trigger on table "public"."contributions" to "service_role";

grant truncate on table "public"."contributions" to "service_role";

grant update on table "public"."contributions" to "service_role";

grant insert on table "public"."crdt_changes" to "authenticated";

grant select on table "public"."crdt_changes" to "authenticated";

grant delete on table "public"."crdt_changes" to "service_role";

grant insert on table "public"."crdt_changes" to "service_role";

grant references on table "public"."crdt_changes" to "service_role";

grant select on table "public"."crdt_changes" to "service_role";

grant trigger on table "public"."crdt_changes" to "service_role";

grant truncate on table "public"."crdt_changes" to "service_role";

grant update on table "public"."crdt_changes" to "service_role";

grant delete on table "public"."crdt_checkpoints" to "authenticated";

grant insert on table "public"."crdt_checkpoints" to "authenticated";

grant select on table "public"."crdt_checkpoints" to "authenticated";

grant delete on table "public"."crdt_checkpoints" to "service_role";

grant insert on table "public"."crdt_checkpoints" to "service_role";

grant references on table "public"."crdt_checkpoints" to "service_role";

grant select on table "public"."crdt_checkpoints" to "service_role";

grant trigger on table "public"."crdt_checkpoints" to "service_role";

grant truncate on table "public"."crdt_checkpoints" to "service_role";

grant update on table "public"."crdt_checkpoints" to "service_role";

grant delete on table "public"."expenses" to "anon";

grant insert on table "public"."expenses" to "anon";

grant references on table "public"."expenses" to "anon";

grant select on table "public"."expenses" to "anon";

grant trigger on table "public"."expenses" to "anon";

grant truncate on table "public"."expenses" to "anon";

grant update on table "public"."expenses" to "anon";

grant delete on table "public"."expenses" to "authenticated";

grant insert on table "public"."expenses" to "authenticated";

grant references on table "public"."expenses" to "authenticated";

grant select on table "public"."expenses" to "authenticated";

grant trigger on table "public"."expenses" to "authenticated";

grant truncate on table "public"."expenses" to "authenticated";

grant update on table "public"."expenses" to "authenticated";

grant delete on table "public"."expenses" to "service_role";

grant insert on table "public"."expenses" to "service_role";

grant references on table "public"."expenses" to "service_role";

grant select on table "public"."expenses" to "service_role";

grant trigger on table "public"."expenses" to "service_role";

grant truncate on table "public"."expenses" to "service_role";

grant update on table "public"."expenses" to "service_role";

grant delete on table "public"."invites" to "authenticated";

grant insert on table "public"."invites" to "authenticated";

grant select on table "public"."invites" to "authenticated";

grant update on table "public"."invites" to "authenticated";

grant delete on table "public"."invites" to "service_role";

grant insert on table "public"."invites" to "service_role";

grant references on table "public"."invites" to "service_role";

grant select on table "public"."invites" to "service_role";

grant trigger on table "public"."invites" to "service_role";

grant truncate on table "public"."invites" to "service_role";

grant update on table "public"."invites" to "service_role";

grant delete on table "public"."payments" to "anon";

grant insert on table "public"."payments" to "anon";

grant references on table "public"."payments" to "anon";

grant select on table "public"."payments" to "anon";

grant trigger on table "public"."payments" to "anon";

grant truncate on table "public"."payments" to "anon";

grant update on table "public"."payments" to "anon";

grant delete on table "public"."payments" to "authenticated";

grant insert on table "public"."payments" to "authenticated";

grant references on table "public"."payments" to "authenticated";

grant select on table "public"."payments" to "authenticated";

grant trigger on table "public"."payments" to "authenticated";

grant truncate on table "public"."payments" to "authenticated";

grant update on table "public"."payments" to "authenticated";

grant delete on table "public"."payments" to "service_role";

grant insert on table "public"."payments" to "service_role";

grant references on table "public"."payments" to "service_role";

grant select on table "public"."payments" to "service_role";

grant trigger on table "public"."payments" to "service_role";

grant truncate on table "public"."payments" to "service_role";

grant update on table "public"."payments" to "service_role";

grant delete on table "public"."pot_members" to "authenticated";

grant insert on table "public"."pot_members" to "authenticated";

grant select on table "public"."pot_members" to "authenticated";

grant update on table "public"."pot_members" to "authenticated";

grant delete on table "public"."pot_members" to "service_role";

grant insert on table "public"."pot_members" to "service_role";

grant references on table "public"."pot_members" to "service_role";

grant select on table "public"."pot_members" to "service_role";

grant trigger on table "public"."pot_members" to "service_role";

grant truncate on table "public"."pot_members" to "service_role";

grant update on table "public"."pot_members" to "service_role";

grant delete on table "public"."pots" to "authenticated";

grant insert on table "public"."pots" to "authenticated";

grant select on table "public"."pots" to "authenticated";

grant update on table "public"."pots" to "authenticated";

grant delete on table "public"."pots" to "service_role";

grant insert on table "public"."pots" to "service_role";

grant references on table "public"."pots" to "service_role";

grant select on table "public"."pots" to "service_role";

grant trigger on table "public"."pots" to "service_role";

grant truncate on table "public"."pots" to "service_role";

grant update on table "public"."pots" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant insert on table "public"."receipts" to "authenticated";

grant select on table "public"."receipts" to "authenticated";

grant delete on table "public"."receipts" to "service_role";

grant insert on table "public"."receipts" to "service_role";

grant references on table "public"."receipts" to "service_role";

grant select on table "public"."receipts" to "service_role";

grant trigger on table "public"."receipts" to "service_role";

grant truncate on table "public"."receipts" to "service_role";

grant update on table "public"."receipts" to "service_role";

grant delete on table "public"."settlements" to "anon";

grant insert on table "public"."settlements" to "anon";

grant references on table "public"."settlements" to "anon";

grant select on table "public"."settlements" to "anon";

grant trigger on table "public"."settlements" to "anon";

grant truncate on table "public"."settlements" to "anon";

grant update on table "public"."settlements" to "anon";

grant delete on table "public"."settlements" to "authenticated";

grant insert on table "public"."settlements" to "authenticated";

grant references on table "public"."settlements" to "authenticated";

grant select on table "public"."settlements" to "authenticated";

grant trigger on table "public"."settlements" to "authenticated";

grant truncate on table "public"."settlements" to "authenticated";

grant update on table "public"."settlements" to "authenticated";

grant delete on table "public"."settlements" to "service_role";

grant insert on table "public"."settlements" to "service_role";

grant references on table "public"."settlements" to "service_role";

grant select on table "public"."settlements" to "service_role";

grant trigger on table "public"."settlements" to "service_role";

grant truncate on table "public"."settlements" to "service_role";

grant update on table "public"."settlements" to "service_role";

grant insert on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."wallet_links" to "authenticated";

grant insert on table "public"."wallet_links" to "authenticated";

grant select on table "public"."wallet_links" to "authenticated";

grant update on table "public"."wallet_links" to "authenticated";

grant delete on table "public"."wallet_links" to "service_role";

grant insert on table "public"."wallet_links" to "service_role";

grant references on table "public"."wallet_links" to "service_role";

grant select on table "public"."wallet_links" to "service_role";

grant trigger on table "public"."wallet_links" to "service_role";

grant truncate on table "public"."wallet_links" to "service_role";

grant update on table "public"."wallet_links" to "service_role";


  create policy "Members can insert changes"
  on "public"."crdt_changes"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = crdt_changes.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text))))));



  create policy "Members can read changes"
  on "public"."crdt_changes"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = crdt_changes.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text)))));



  create policy "Members can create checkpoints"
  on "public"."crdt_checkpoints"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = crdt_checkpoints.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text))))));



  create policy "Members can delete old checkpoints"
  on "public"."crdt_checkpoints"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = crdt_checkpoints.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text)))));



  create policy "Members can read checkpoints"
  on "public"."crdt_checkpoints"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = crdt_checkpoints.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text)))));



  create policy "Invitee can view own invites"
  on "public"."invites"
  as permissive
  for select
  to authenticated
using ((lower(invitee_email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))));



  create policy "Inviter or members can delete invites"
  on "public"."invites"
  as permissive
  for delete
  to public
using (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = invites.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text))))));



  create policy "Inviter or members can insert invites"
  on "public"."invites"
  as permissive
  for insert
  to public
with check (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = invites.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text))))));



  create policy "Inviter or members can update invites"
  on "public"."invites"
  as permissive
  for update
  to public
using (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = invites.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text))))));



  create policy "Inviter or members can view invites"
  on "public"."invites"
  as permissive
  for select
  to public
using (((created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = invites.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text))))));



  create policy "Members can leave pot"
  on "public"."pot_members"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "Members can read pot_members"
  on "public"."pot_members"
  as permissive
  for select
  to public
using (public.can_access_pot(pot_id));



  create policy "Pot creators can add members"
  on "public"."pot_members"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.pots p
  WHERE ((p.id = pot_members.pot_id) AND (p.created_by = auth.uid())))));



  create policy "Pot creators can remove members"
  on "public"."pot_members"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.pots p
  WHERE ((p.id = pot_members.pot_id) AND (p.created_by = auth.uid())))));



  create policy "Pot creators can update members"
  on "public"."pot_members"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.pots p
  WHERE ((p.id = pot_members.pot_id) AND (p.created_by = auth.uid())))));



  create policy "Users can create pots"
  on "public"."pots"
  as permissive
  for insert
  to public
with check ((created_by = auth.uid()));



  create policy "Users can delete their own pots"
  on "public"."pots"
  as permissive
  for delete
  to public
using ((created_by = auth.uid()));



  create policy "Users can read accessible pots"
  on "public"."pots"
  as permissive
  for select
  to public
using (public.can_access_pot(id));



  create policy "Users can update accessible pots"
  on "public"."pots"
  as permissive
  for update
  to authenticated
using (public.can_access_pot(id));



  create policy "Users can update their own pots"
  on "public"."pots"
  as permissive
  for update
  to public
using ((created_by = auth.uid()));



  create policy "Members can read receipts"
  on "public"."receipts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = receipts.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text)))));



  create policy "Members can upload receipts"
  on "public"."receipts"
  as permissive
  for insert
  to authenticated
with check (((auth.uid() = uploaded_by) AND (EXISTS ( SELECT 1
   FROM public.pot_members pm
  WHERE ((pm.pot_id = receipts.pot_id) AND (pm.user_id = auth.uid()) AND ((pm.status)::text = 'active'::text))))));



  create policy "Users can insert their own record"
  on "public"."users"
  as permissive
  for insert
  to public
with check ((id = auth.uid()));



  create policy "Users can read all users"
  on "public"."users"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Users can update their own profile"
  on "public"."users"
  as permissive
  for update
  to authenticated
using ((id = auth.uid()))
with check ((id = auth.uid()));



  create policy "Users can delete own wallet links"
  on "public"."wallet_links"
  as permissive
  for delete
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can insert own wallet links"
  on "public"."wallet_links"
  as permissive
  for insert
  to authenticated
with check ((user_id = auth.uid()));



  create policy "Users can read own wallet links"
  on "public"."wallet_links"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "Users can update own wallet links"
  on "public"."wallet_links"
  as permissive
  for update
  to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


CREATE TRIGGER pots_ensure_owner_member AFTER INSERT ON public.pots FOR EACH ROW EXECUTE FUNCTION public.pots_ensure_owner_member();

CREATE TRIGGER pots_preserve_creator BEFORE UPDATE ON public.pots FOR EACH ROW EXECUTE FUNCTION public.pots_preserve_creator();

CREATE TRIGGER pots_set_created_by BEFORE INSERT ON public.pots FOR EACH ROW EXECUTE FUNCTION public.pots_set_created_by();

CREATE TRIGGER update_pots_updated_at BEFORE UPDATE ON public.pots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER wallet_links_set_updated_at BEFORE UPDATE ON public.wallet_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


