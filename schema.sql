


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."audit_action_enum" AS ENUM (
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'resolve'
);


ALTER TYPE "public"."audit_action_enum" OWNER TO "postgres";


CREATE TYPE "public"."contribution_frequency_enum" AS ENUM (
    'weekly',
    'biweekly',
    'monthly'
);


ALTER TYPE "public"."contribution_frequency_enum" OWNER TO "postgres";


CREATE TYPE "public"."contribution_status_enum" AS ENUM (
    'pending',
    'paid',
    'partial',
    'defaulted'
);


ALTER TYPE "public"."contribution_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."cycle_status_enum" AS ENUM (
    'open',
    'closed'
);


ALTER TYPE "public"."cycle_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."document_status_enum" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."document_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."document_type_enum" AS ENUM (
    'contribution_statement',
    'loan_support_letter'
);


ALTER TYPE "public"."document_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."gender_enum" AS ENUM (
    'male',
    'female',
    'other'
);


ALTER TYPE "public"."gender_enum" OWNER TO "postgres";


CREATE TYPE "public"."kyc_status_enum" AS ENUM (
    'unverified',
    'pending',
    'verified',
    'rejected'
);


ALTER TYPE "public"."kyc_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."membership_role_enum" AS ENUM (
    'admin',
    'treasurer',
    'member'
);


ALTER TYPE "public"."membership_role_enum" OWNER TO "postgres";


CREATE TYPE "public"."membership_status_enum" AS ENUM (
    'active',
    'suspended',
    'exited'
);


ALTER TYPE "public"."membership_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."payout_status_enum" AS ENUM (
    'pending',
    'disbursed',
    'failed',
    'reversed'
);


ALTER TYPE "public"."payout_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."severity_enum" AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE "public"."severity_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."custom_access_token_hook"("event" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  claims JSONB;
  user_tenant_id UUID;
  user_id TEXT;
BEGIN
  -- Try both camelCase and snake_case
  user_id := COALESCE(
    event->>'userId',
    event->>'user_id',
    event->'user'->>'id'
  );

  SELECT tenant_id INTO user_tenant_id
  FROM public.users
  WHERE id = user_id::UUID;

  claims := event->'claims';

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::TEXT));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;


ALTER FUNCTION "public"."custom_access_token_hook"("event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_tenant_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT tenant_id FROM users WHERE id = auth.uid() LIMIT 1;
$$;


ALTER FUNCTION "public"."get_auth_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_tenant_context"("tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id::TEXT, false);
END;
$$;


ALTER FUNCTION "public"."set_tenant_context"("tenant_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action" "public"."audit_action_enum" NOT NULL,
    "table_name" character varying(100) NOT NULL,
    "record_id" "uuid" NOT NULL,
    "before_state" "jsonb",
    "after_state" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contributions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "amount_due" numeric(12,2) NOT NULL,
    "amount_paid" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_date" timestamp with time zone,
    "status" "public"."contribution_status_enum" DEFAULT 'pending'::"public"."contribution_status_enum" NOT NULL,
    "recorded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "contributions_amount_due_check" CHECK (("amount_due" >= (0)::numeric)),
    CONSTRAINT "contributions_amount_paid_check" CHECK (("amount_paid" >= (0)::numeric))
);


ALTER TABLE "public"."contributions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "thrift_group_id" "uuid" NOT NULL,
    "cycle_number" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "public"."cycle_status_enum" DEFAULT 'open'::"public"."cycle_status_enum" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cycles_cycle_number_check" CHECK (("cycle_number" > 0)),
    CONSTRAINT "cycles_end_after_start" CHECK (("end_date" > "start_date"))
);


ALTER TABLE "public"."cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "type" "public"."document_type_enum" NOT NULL,
    "status" "public"."document_status_enum" DEFAULT 'pending'::"public"."document_status_enum" NOT NULL,
    "file_url" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "severity" "public"."severity_enum" DEFAULT 'low'::"public"."severity_enum" NOT NULL,
    "raised_by" "uuid" NOT NULL,
    "resolved_by" "uuid",
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."flags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "thrift_group_id" "uuid" NOT NULL,
    "role" "public"."membership_role_enum" DEFAULT 'member'::"public"."membership_role_enum" NOT NULL,
    "join_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "public"."membership_status_enum" DEFAULT 'active'::"public"."membership_status_enum" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(150) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "payout_amount" numeric(12,2) NOT NULL,
    "payout_date" timestamp with time zone,
    "status" "public"."payout_status_enum" DEFAULT 'pending'::"public"."payout_status_enum" NOT NULL,
    "disbursed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payouts_payout_amount_check" CHECK (("payout_amount" >= (0)::numeric))
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(150) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" character varying(50)
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."thrift_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(150) NOT NULL,
    "contribution_amount" numeric(12,2) NOT NULL,
    "contribution_frequency" "public"."contribution_frequency_enum" NOT NULL,
    "start_date" "date" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "thrift_groups_contribution_amount_check" CHECK (("contribution_amount" > (0)::numeric))
);


ALTER TABLE "public"."thrift_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "full_name" character varying(150) NOT NULL,
    "email" character varying(150) NOT NULL,
    "phone" character varying(20),
    "date_of_birth" "date",
    "gender" "public"."gender_enum",
    "kyc_status" "public"."kyc_status_enum" DEFAULT 'unverified'::"public"."kyc_status_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_membership_cycle_unique" UNIQUE ("membership_id", "cycle_id");



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_group_number_unique" UNIQUE ("thrift_group_id", "cycle_number");



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_requests"
    ADD CONSTRAINT "document_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_group_unique" UNIQUE ("user_id", "thrift_group_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_membership_cycle_unique" UNIQUE ("membership_id", "cycle_id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."thrift_groups"
    ADD CONSTRAINT "thrift_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_tenant_unique" UNIQUE ("tenant_id", "email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_actor_id" ON "public"."audit_logs" USING "btree" ("actor_id");



CREATE INDEX "idx_audit_logs_record_id" ON "public"."audit_logs" USING "btree" ("record_id");



CREATE INDEX "idx_audit_logs_table_name" ON "public"."audit_logs" USING "btree" ("table_name");



CREATE INDEX "idx_audit_logs_tenant_id" ON "public"."audit_logs" USING "btree" ("tenant_id");



CREATE INDEX "idx_contributions_cycle_id" ON "public"."contributions" USING "btree" ("cycle_id");



CREATE INDEX "idx_contributions_membership_id" ON "public"."contributions" USING "btree" ("membership_id");



CREATE INDEX "idx_contributions_tenant_id" ON "public"."contributions" USING "btree" ("tenant_id");



CREATE INDEX "idx_cycles_tenant_id" ON "public"."cycles" USING "btree" ("tenant_id");



CREATE INDEX "idx_cycles_thrift_group_id" ON "public"."cycles" USING "btree" ("thrift_group_id");



CREATE INDEX "idx_document_requests_membership_id" ON "public"."document_requests" USING "btree" ("membership_id");



CREATE INDEX "idx_document_requests_tenant_id" ON "public"."document_requests" USING "btree" ("tenant_id");



CREATE INDEX "idx_flags_membership_id" ON "public"."flags" USING "btree" ("membership_id");



CREATE INDEX "idx_flags_tenant_id" ON "public"."flags" USING "btree" ("tenant_id");



CREATE INDEX "idx_memberships_tenant_id" ON "public"."memberships" USING "btree" ("tenant_id");



CREATE INDEX "idx_memberships_thrift_group_id" ON "public"."memberships" USING "btree" ("thrift_group_id");



CREATE INDEX "idx_memberships_user_id" ON "public"."memberships" USING "btree" ("user_id");



CREATE INDEX "idx_organizations_tenant_id" ON "public"."organizations" USING "btree" ("tenant_id");



CREATE INDEX "idx_payouts_cycle_id" ON "public"."payouts" USING "btree" ("cycle_id");



CREATE INDEX "idx_payouts_membership_id" ON "public"."payouts" USING "btree" ("membership_id");



CREATE INDEX "idx_payouts_tenant_id" ON "public"."payouts" USING "btree" ("tenant_id");



CREATE INDEX "idx_thrift_groups_organization_id" ON "public"."thrift_groups" USING "btree" ("organization_id");



CREATE INDEX "idx_thrift_groups_tenant_id" ON "public"."thrift_groups" USING "btree" ("tenant_id");



CREATE INDEX "idx_users_tenant_id" ON "public"."users" USING "btree" ("tenant_id");



CREATE RULE "audit_logs_no_delete" AS
    ON DELETE TO "public"."audit_logs" DO INSTEAD NOTHING;



CREATE RULE "audit_logs_no_update" AS
    ON UPDATE TO "public"."audit_logs" DO INSTEAD NOTHING;



CREATE OR REPLACE TRIGGER "contributions_updated_at" BEFORE UPDATE ON "public"."contributions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "cycles_updated_at" BEFORE UPDATE ON "public"."cycles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "document_requests_updated_at" BEFORE UPDATE ON "public"."document_requests" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "flags_updated_at" BEFORE UPDATE ON "public"."flags" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "memberships_updated_at" BEFORE UPDATE ON "public"."memberships" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "payouts_updated_at" BEFORE UPDATE ON "public"."payouts" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "tenants_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "thrift_groups_updated_at" BEFORE UPDATE ON "public"."thrift_groups" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."contributions"
    ADD CONSTRAINT "contributions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."cycles"
    ADD CONSTRAINT "cycles_thrift_group_id_fkey" FOREIGN KEY ("thrift_group_id") REFERENCES "public"."thrift_groups"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."document_requests"
    ADD CONSTRAINT "document_requests_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."document_requests"
    ADD CONSTRAINT "document_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."document_requests"
    ADD CONSTRAINT "document_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."flags"
    ADD CONSTRAINT "flags_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_thrift_group_id_fkey" FOREIGN KEY ("thrift_group_id") REFERENCES "public"."thrift_groups"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."memberships"
    ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_disbursed_by_fkey" FOREIGN KEY ("disbursed_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."thrift_groups"
    ADD CONSTRAINT "thrift_groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."thrift_groups"
    ADD CONSTRAINT "thrift_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."thrift_groups"
    ADD CONSTRAINT "thrift_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contributions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cycles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."flags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_insert" ON "public"."contributions" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_insert" ON "public"."cycles" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_insert" ON "public"."memberships" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_insert" ON "public"."organizations" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_insert" ON "public"."thrift_groups" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_insert" ON "public"."users" FOR INSERT WITH CHECK (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."audit_logs" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."contributions" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."cycles" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."document_requests" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."flags" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."memberships" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."organizations" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."payouts" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."thrift_groups" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_isolation" ON "public"."users" FOR SELECT USING (("tenant_id" = "public"."get_auth_tenant_id"()));



CREATE POLICY "tenant_read" ON "public"."tenants" FOR SELECT USING (true);



ALTER TABLE "public"."thrift_groups" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";






















































































































































REVOKE ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "service_role";
GRANT ALL ON FUNCTION "public"."custom_access_token_hook"("event" "jsonb") TO "supabase_auth_admin";



GRANT ALL ON FUNCTION "public"."get_auth_tenant_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_tenant_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_tenant_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_tenant_context"("tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."set_tenant_context"("tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_tenant_context"("tenant_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."contributions" TO "anon";
GRANT ALL ON TABLE "public"."contributions" TO "authenticated";
GRANT ALL ON TABLE "public"."contributions" TO "service_role";



GRANT ALL ON TABLE "public"."cycles" TO "anon";
GRANT ALL ON TABLE "public"."cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."cycles" TO "service_role";



GRANT ALL ON TABLE "public"."document_requests" TO "anon";
GRANT ALL ON TABLE "public"."document_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."document_requests" TO "service_role";



GRANT ALL ON TABLE "public"."flags" TO "anon";
GRANT ALL ON TABLE "public"."flags" TO "authenticated";
GRANT ALL ON TABLE "public"."flags" TO "service_role";



GRANT ALL ON TABLE "public"."memberships" TO "anon";
GRANT ALL ON TABLE "public"."memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."memberships" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."thrift_groups" TO "anon";
GRANT ALL ON TABLE "public"."thrift_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."thrift_groups" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT SELECT ON TABLE "public"."users" TO "supabase_auth_admin";









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































