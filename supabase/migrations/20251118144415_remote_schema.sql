Dumping schemas from remote database...



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_crdt_changes"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."cleanup_old_crdt_changes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pot_members"("pot_uuid" "uuid") RETURNS TABLE("user_id" "uuid", "role" character varying, "status" character varying)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT pm.user_id, pm.role, pm.status
  FROM pot_members pm
  WHERE pm.pot_id = pot_uuid;
END;
$$;


ALTER FUNCTION "public"."get_pot_members"("pot_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_pot_member"("pot_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pot_members
    WHERE pot_id = pot_uuid
    AND user_id = user_uuid
    AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."is_pot_member"("pot_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "expense_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "share_minor" bigint NOT NULL,
    "paid" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crdt_changes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pot_id" "uuid" NOT NULL,
    "change_data" "bytea" NOT NULL,
    "hash" "text" NOT NULL,
    "actor" "text" NOT NULL,
    "seq" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."crdt_changes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."crdt_checkpoints" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pot_id" "uuid" NOT NULL,
    "document_data" "bytea" NOT NULL,
    "heads" "text"[] NOT NULL,
    "change_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_by" "uuid" NOT NULL
);


ALTER TABLE "public"."crdt_checkpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."expenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pot_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "amount_minor" bigint NOT NULL,
    "currency_code" "text" DEFAULT 'DOT'::"text" NOT NULL,
    "description" "text",
    "receipt_path" "text",
    "receipt_thumb_path" "text",
    "receipt_size" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."expenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "settlement_id" "uuid" NOT NULL,
    "method" "text" NOT NULL,
    "reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pot_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'member'::character varying NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "joined_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pot_members_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['owner'::character varying, 'member'::character varying])::"text"[]))),
    CONSTRAINT "pot_members_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'pending'::character varying, 'removed'::character varying])::"text"[])))
);


ALTER TABLE "public"."pot_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "archived_at" timestamp with time zone,
    "automerge_heads" "text"[],
    "last_synced_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "pot_id" "uuid" NOT NULL,
    "expense_id" character varying(100) NOT NULL,
    "cid" character varying(100) NOT NULL,
    "filename" character varying(255),
    "mime_type" character varying(100),
    "size_bytes" integer,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."settlements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pot_id" "uuid" NOT NULL,
    "from_member_id" "uuid" NOT NULL,
    "to_member_id" "uuid" NOT NULL,
    "amount_minor" bigint NOT NULL,
    "currency_code" "text" DEFAULT 'DOT'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "tx_hash" "text",
    "confirmations" integer DEFAULT 0 NOT NULL,
    "last_checked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "settlements_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'broadcast'::"text", 'finalised'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."settlements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "wallet_address" character varying(255),
    "name" character varying(100),
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "chain" "text" NOT NULL,
    "address" "text" NOT NULL,
    "provider" "text" NOT NULL,
    "verified_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "wallet_links_chain_check" CHECK (("chain" = ANY (ARRAY['polkadot'::"text", 'evm'::"text"])))
);


ALTER TABLE "public"."wallet_links" OWNER TO "postgres";


ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crdt_changes"
    ADD CONSTRAINT "crdt_changes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."crdt_changes"
    ADD CONSTRAINT "crdt_changes_pot_id_hash_key" UNIQUE ("pot_id", "hash");



ALTER TABLE ONLY "public"."crdt_checkpoints"
    ADD CONSTRAINT "crdt_checkpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pot_members"
    ADD CONSTRAINT "pot_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pot_members"
    ADD CONSTRAINT "pot_members_pot_id_user_id_key" UNIQUE ("pot_id", "user_id");



ALTER TABLE ONLY "public"."pots"
    ADD CONSTRAINT "pots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_cid_key" UNIQUE ("cid");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settlements"
    ADD CONSTRAINT "settlements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_wallet_address_key" UNIQUE ("wallet_address");



ALTER TABLE ONLY "public"."wallet_links"
    ADD CONSTRAINT "wallet_links_pkey" PRIMARY KEY ("id");



CREATE INDEX "contributions_expense_idx" ON "public"."contributions" USING "btree" ("expense_id");



CREATE INDEX "expenses_pot_created_idx" ON "public"."expenses" USING "btree" ("pot_id", "created_at" DESC);



CREATE INDEX "idx_crdt_changes_created_at" ON "public"."crdt_changes" USING "btree" ("created_at");



CREATE INDEX "idx_crdt_changes_hash" ON "public"."crdt_changes" USING "btree" ("hash");



CREATE INDEX "idx_crdt_changes_pot_id" ON "public"."crdt_changes" USING "btree" ("pot_id");



CREATE INDEX "idx_crdt_checkpoints_created_at" ON "public"."crdt_checkpoints" USING "btree" ("created_at");



CREATE INDEX "idx_crdt_checkpoints_pot_id" ON "public"."crdt_checkpoints" USING "btree" ("pot_id");



CREATE INDEX "idx_pot_members_pot_id" ON "public"."pot_members" USING "btree" ("pot_id");



CREATE INDEX "idx_pot_members_status" ON "public"."pot_members" USING "btree" ("status");



CREATE INDEX "idx_pot_members_user_id" ON "public"."pot_members" USING "btree" ("user_id");



CREATE INDEX "idx_pots_archived_at" ON "public"."pots" USING "btree" ("archived_at");



CREATE INDEX "idx_pots_created_by" ON "public"."pots" USING "btree" ("created_by");



CREATE INDEX "idx_receipts_cid" ON "public"."receipts" USING "btree" ("cid");



CREATE INDEX "idx_receipts_expense_id" ON "public"."receipts" USING "btree" ("expense_id");



CREATE INDEX "idx_receipts_pot_id" ON "public"."receipts" USING "btree" ("pot_id");



CREATE INDEX "idx_users_wallet" ON "public"."users" USING "btree" ("wallet_address");



CREATE INDEX "payments_settlement_idx" ON "public"."payments" USING "btree" ("settlement_id");



CREATE UNIQUE INDEX "profiles_username_lower_unique" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "settlements_pot_created_idx" ON "public"."settlements" USING "btree" ("pot_id", "created_at" DESC);



CREATE UNIQUE INDEX "wallet_links_user_chain_addr_unique" ON "public"."wallet_links" USING "btree" ("user_id", "chain", "lower"("address"));



CREATE UNIQUE INDEX "wallet_links_verified_unique" ON "public"."wallet_links" USING "btree" ("lower"("address"), "chain") WHERE ("verified_at" IS NOT NULL);



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_pots_updated_at" BEFORE UPDATE ON "public"."pots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "wallet_links_set_updated_at" BEFORE UPDATE ON "public"."wallet_links" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crdt_changes"
    ADD CONSTRAINT "crdt_changes_pot_id_fkey" FOREIGN KEY ("pot_id") REFERENCES "public"."pots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."crdt_changes"
    ADD CONSTRAINT "crdt_changes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crdt_checkpoints"
    ADD CONSTRAINT "crdt_checkpoints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."crdt_checkpoints"
    ADD CONSTRAINT "crdt_checkpoints_pot_id_fkey" FOREIGN KEY ("pot_id") REFERENCES "public"."pots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."expenses"
    ADD CONSTRAINT "expenses_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pot_members"
    ADD CONSTRAINT "pot_members_pot_id_fkey" FOREIGN KEY ("pot_id") REFERENCES "public"."pots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pot_members"
    ADD CONSTRAINT "pot_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pots"
    ADD CONSTRAINT "pots_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pot_id_fkey" FOREIGN KEY ("pot_id") REFERENCES "public"."pots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."wallet_links"
    ADD CONSTRAINT "wallet_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Members can create checkpoints" ON "public"."crdt_checkpoints" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."pot_members"
  WHERE (("pot_members"."pot_id" = "crdt_checkpoints"."pot_id") AND ("pot_members"."user_id" = "auth"."uid"()) AND (("pot_members"."status")::"text" = 'active'::"text"))))));



CREATE POLICY "Members can insert changes" ON "public"."crdt_changes" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."pot_members"
  WHERE (("pot_members"."pot_id" = "crdt_changes"."pot_id") AND ("pot_members"."user_id" = "auth"."uid"()) AND (("pot_members"."status")::"text" = 'active'::"text"))))));



CREATE POLICY "Members can read changes" ON "public"."crdt_changes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pot_members"
  WHERE (("pot_members"."pot_id" = "crdt_changes"."pot_id") AND ("pot_members"."user_id" = "auth"."uid"()) AND (("pot_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Members can read checkpoints" ON "public"."crdt_checkpoints" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pot_members"
  WHERE (("pot_members"."pot_id" = "crdt_checkpoints"."pot_id") AND ("pot_members"."user_id" = "auth"."uid"()) AND (("pot_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Members can read receipts" ON "public"."receipts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pot_members"
  WHERE (("pot_members"."pot_id" = "receipts"."pot_id") AND ("pot_members"."user_id" = "auth"."uid"()) AND (("pot_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Members can upload receipts" ON "public"."receipts" FOR INSERT WITH CHECK ((("auth"."uid"() = "uploaded_by") AND (EXISTS ( SELECT 1
   FROM "public"."pot_members"
  WHERE (("pot_members"."pot_id" = "receipts"."pot_id") AND ("pot_members"."user_id" = "auth"."uid"()) AND (("pot_members"."status")::"text" = 'active'::"text"))))));



CREATE POLICY "Pot owners can manage members" ON "public"."pot_members" USING ((EXISTS ( SELECT 1
   FROM "public"."pot_members" "pm"
  WHERE (("pm"."pot_id" = "pot_members"."pot_id") AND ("pm"."user_id" = "auth"."uid"()) AND (("pm"."role")::"text" = 'owner'::"text")))));



CREATE POLICY "Pot owners can update pots" ON "public"."pots" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."pot_members"
  WHERE (("pot_members"."pot_id" = "pots"."id") AND ("pot_members"."user_id" = "auth"."uid"()) AND (("pot_members"."role")::"text" = 'owner'::"text")))));



CREATE POLICY "Users can create pots" ON "public"."pots" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can read all users" ON "public"."users" FOR SELECT USING (true);



CREATE POLICY "Users can read pot members if they are a member" ON "public"."pot_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pot_members" "pm"
  WHERE (("pm"."pot_id" = "pot_members"."pot_id") AND ("pm"."user_id" = "auth"."uid"()) AND (("pm"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Users can read pots they are members of" ON "public"."pots" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."pot_members"
  WHERE (("pot_members"."pot_id" = "pots"."id") AND ("pot_members"."user_id" = "auth"."uid"()) AND (("pot_members"."status")::"text" = 'active'::"text")))));



CREATE POLICY "Users can update their own profile" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."crdt_changes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."crdt_checkpoints" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pot_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_crdt_changes"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_crdt_changes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_crdt_changes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_pot_members"("pot_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_pot_members"("pot_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pot_members"("pot_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_pot_member"("pot_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_pot_member"("pot_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_pot_member"("pot_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."contributions" TO "anon";
GRANT ALL ON TABLE "public"."contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."contributions" TO "service_role";



GRANT ALL ON TABLE "public"."crdt_changes" TO "anon";
GRANT ALL ON TABLE "public"."crdt_changes" TO "authenticated";
GRANT ALL ON TABLE "public"."crdt_changes" TO "service_role";



GRANT ALL ON TABLE "public"."crdt_checkpoints" TO "anon";
GRANT ALL ON TABLE "public"."crdt_checkpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."crdt_checkpoints" TO "service_role";



GRANT ALL ON TABLE "public"."expenses" TO "anon";
GRANT ALL ON TABLE "public"."expenses" TO "authenticated";
GRANT ALL ON TABLE "public"."expenses" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."pot_members" TO "anon";
GRANT ALL ON TABLE "public"."pot_members" TO "authenticated";
GRANT ALL ON TABLE "public"."pot_members" TO "service_role";



GRANT ALL ON TABLE "public"."pots" TO "anon";
GRANT ALL ON TABLE "public"."pots" TO "authenticated";
GRANT ALL ON TABLE "public"."pots" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."receipts" TO "anon";
GRANT ALL ON TABLE "public"."receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."receipts" TO "service_role";



GRANT ALL ON TABLE "public"."settlements" TO "anon";
GRANT ALL ON TABLE "public"."settlements" TO "authenticated";
GRANT ALL ON TABLE "public"."settlements" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_links" TO "anon";
GRANT ALL ON TABLE "public"."wallet_links" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_links" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







RESET ALL;
A new version of Supabase CLI is available: v2.58.5 (currently installed v2.51.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
