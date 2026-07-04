--
-- PostgreSQL database dump
--

\restrict NHVeBHTz89fIWZsbyyY8nfFQ8sHolFf7RfD10kWlczoh64aQuvlDt2AgAIqpB4X

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: audit_action_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.audit_action_enum AS ENUM (
    'create',
    'update',
    'delete',
    'approve',
    'reject',
    'resolve'
);


ALTER TYPE public.audit_action_enum OWNER TO postgres;

--
-- Name: contribution_frequency_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contribution_frequency_enum AS ENUM (
    'weekly',
    'biweekly',
    'monthly'
);


ALTER TYPE public.contribution_frequency_enum OWNER TO postgres;

--
-- Name: contribution_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contribution_status_enum AS ENUM (
    'pending',
    'paid',
    'partial',
    'defaulted'
);


ALTER TYPE public.contribution_status_enum OWNER TO postgres;

--
-- Name: cycle_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.cycle_status_enum AS ENUM (
    'open',
    'closed'
);


ALTER TYPE public.cycle_status_enum OWNER TO postgres;

--
-- Name: document_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_status_enum AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public.document_status_enum OWNER TO postgres;

--
-- Name: document_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_type_enum AS ENUM (
    'contribution_statement',
    'loan_support_letter'
);


ALTER TYPE public.document_type_enum OWNER TO postgres;

--
-- Name: gender_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gender_enum AS ENUM (
    'male',
    'female',
    'other'
);


ALTER TYPE public.gender_enum OWNER TO postgres;

--
-- Name: kyc_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.kyc_status_enum AS ENUM (
    'unverified',
    'pending',
    'verified',
    'rejected'
);


ALTER TYPE public.kyc_status_enum OWNER TO postgres;

--
-- Name: membership_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.membership_role_enum AS ENUM (
    'admin',
    'treasurer',
    'member'
);


ALTER TYPE public.membership_role_enum OWNER TO postgres;

--
-- Name: membership_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.membership_status_enum AS ENUM (
    'active',
    'suspended',
    'exited'
);


ALTER TYPE public.membership_status_enum OWNER TO postgres;

--
-- Name: payout_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payout_status_enum AS ENUM (
    'pending',
    'disbursed',
    'failed',
    'reversed'
);


ALTER TYPE public.payout_status_enum OWNER TO postgres;

--
-- Name: severity_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.severity_enum AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE public.severity_enum OWNER TO postgres;

--
-- Name: auth_has_role(public.membership_role_enum[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auth_has_role(required_roles public.membership_role_enum[]) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.user_id = auth.uid()
      AND m.tenant_id = public.get_auth_tenant_id()
      AND m.status = 'active'
      AND m.role = ANY (required_roles)
  );
$$;


ALTER FUNCTION public.auth_has_role(required_roles public.membership_role_enum[]) OWNER TO postgres;

--
-- Name: custom_access_token_hook(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.custom_access_token_hook(event jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  claims jsonb;
  user_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO user_tenant_id
  FROM public.users
  WHERE id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  IF user_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;


ALTER FUNCTION public.custom_access_token_hook(event jsonb) OWNER TO postgres;

--
-- Name: derive_contribution_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.derive_contribution_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.amount_due > 0 AND NEW.amount_paid >= NEW.amount_due THEN
    NEW.status := 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status := 'partial';
  ELSIF NEW.status IS DISTINCT FROM 'defaulted' THEN
    NEW.status := 'pending';
  END IF;

  IF NEW.amount_paid > 0 AND NEW.payment_date IS NULL THEN
    NEW.payment_date := now();
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.derive_contribution_status() OWNER TO postgres;

--
-- Name: get_auth_tenant_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_auth_tenant_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'tenant_id', '')::uuid,
    (SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1)
  );
$$;


ALTER FUNCTION public.get_auth_tenant_id() OWNER TO postgres;

--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    actor_id uuid NOT NULL,
    action public.audit_action_enum NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id uuid NOT NULL,
    before_state jsonb,
    after_state jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: contribution_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contribution_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    contribution_amount numeric(12,2) NOT NULL,
    contribution_frequency public.contribution_frequency_enum NOT NULL,
    start_date date NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contribution_groups_contribution_amount_check CHECK ((contribution_amount > (0)::numeric))
);


ALTER TABLE public.contribution_groups OWNER TO postgres;

--
-- Name: contributions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    membership_id uuid NOT NULL,
    cycle_id uuid NOT NULL,
    amount_due numeric(12,2) NOT NULL,
    amount_paid numeric(12,2) DEFAULT 0 NOT NULL,
    payment_date timestamp with time zone,
    status public.contribution_status_enum DEFAULT 'pending'::public.contribution_status_enum NOT NULL,
    recorded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contributions_amount_due_check CHECK ((amount_due >= (0)::numeric)),
    CONSTRAINT contributions_amount_paid_check CHECK ((amount_paid >= (0)::numeric))
);


ALTER TABLE public.contributions OWNER TO postgres;

--
-- Name: cycles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cycles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    contribution_group_id uuid NOT NULL,
    cycle_number integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status public.cycle_status_enum DEFAULT 'open'::public.cycle_status_enum NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cycles_cycle_number_check CHECK ((cycle_number > 0)),
    CONSTRAINT cycles_end_after_start CHECK ((end_date > start_date))
);


ALTER TABLE public.cycles OWNER TO postgres;

--
-- Name: document_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    membership_id uuid NOT NULL,
    type public.document_type_enum NOT NULL,
    status public.document_status_enum DEFAULT 'pending'::public.document_status_enum NOT NULL,
    file_url text,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_requests OWNER TO postgres;

--
-- Name: flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    membership_id uuid NOT NULL,
    reason text NOT NULL,
    severity public.severity_enum DEFAULT 'low'::public.severity_enum NOT NULL,
    raised_by uuid NOT NULL,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.flags OWNER TO postgres;

--
-- Name: memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.memberships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    user_id uuid NOT NULL,
    contribution_group_id uuid NOT NULL,
    role public.membership_role_enum DEFAULT 'member'::public.membership_role_enum NOT NULL,
    join_date date DEFAULT CURRENT_DATE NOT NULL,
    status public.membership_status_enum DEFAULT 'active'::public.membership_status_enum NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.memberships OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    name character varying(150) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: payouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    cycle_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    payout_amount numeric(12,2) NOT NULL,
    payout_date timestamp with time zone,
    status public.payout_status_enum DEFAULT 'pending'::public.payout_status_enum NOT NULL,
    disbursed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT payouts_payout_amount_check CHECK ((payout_amount >= (0)::numeric))
);


ALTER TABLE public.payouts OWNER TO postgres;

--
-- Name: tenants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    slug character varying(50),
    currency text DEFAULT 'NGN'::text NOT NULL
);


ALTER TABLE public.tenants OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid DEFAULT public.get_auth_tenant_id() NOT NULL,
    full_name character varying(150) NOT NULL,
    email character varying(150) NOT NULL,
    phone character varying(20),
    date_of_birth date,
    gender public.gender_enum,
    kyc_status public.kyc_status_enum DEFAULT 'unverified'::public.kyc_status_enum NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: contribution_groups contribution_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contribution_groups
    ADD CONSTRAINT contribution_groups_pkey PRIMARY KEY (id);


--
-- Name: contributions contributions_membership_cycle_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_membership_cycle_unique UNIQUE (membership_id, cycle_id);


--
-- Name: contributions contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_pkey PRIMARY KEY (id);


--
-- Name: cycles cycles_group_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_group_number_unique UNIQUE (contribution_group_id, cycle_number);


--
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- Name: document_requests document_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_pkey PRIMARY KEY (id);


--
-- Name: flags flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flags
    ADD CONSTRAINT flags_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_user_group_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_group_unique UNIQUE (user_id, contribution_group_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_membership_cycle_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_membership_cycle_unique UNIQUE (membership_id, cycle_id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: users users_email_tenant_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_tenant_unique UNIQUE (tenant_id, email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_audit_logs_actor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs USING btree (actor_id);


--
-- Name: idx_audit_logs_record_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_record_id ON public.audit_logs USING btree (record_id);


--
-- Name: idx_audit_logs_table_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_contribution_groups_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contribution_groups_organization_id ON public.contribution_groups USING btree (organization_id);


--
-- Name: idx_contribution_groups_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contribution_groups_tenant_id ON public.contribution_groups USING btree (tenant_id);


--
-- Name: idx_contributions_cycle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contributions_cycle_id ON public.contributions USING btree (cycle_id);


--
-- Name: idx_contributions_membership_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contributions_membership_id ON public.contributions USING btree (membership_id);


--
-- Name: idx_contributions_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contributions_tenant_id ON public.contributions USING btree (tenant_id);


--
-- Name: idx_cycles_contribution_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cycles_contribution_group_id ON public.cycles USING btree (contribution_group_id);


--
-- Name: idx_cycles_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cycles_tenant_id ON public.cycles USING btree (tenant_id);


--
-- Name: idx_document_requests_membership_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_requests_membership_id ON public.document_requests USING btree (membership_id);


--
-- Name: idx_document_requests_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_requests_tenant_id ON public.document_requests USING btree (tenant_id);


--
-- Name: idx_flags_membership_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_flags_membership_id ON public.flags USING btree (membership_id);


--
-- Name: idx_flags_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_flags_tenant_id ON public.flags USING btree (tenant_id);


--
-- Name: idx_memberships_contribution_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memberships_contribution_group_id ON public.memberships USING btree (contribution_group_id);


--
-- Name: idx_memberships_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memberships_tenant_id ON public.memberships USING btree (tenant_id);


--
-- Name: idx_memberships_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memberships_user_id ON public.memberships USING btree (user_id);


--
-- Name: idx_organizations_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_organizations_tenant_id ON public.organizations USING btree (tenant_id);


--
-- Name: idx_payouts_cycle_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payouts_cycle_id ON public.payouts USING btree (cycle_id);


--
-- Name: idx_payouts_membership_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payouts_membership_id ON public.payouts USING btree (membership_id);


--
-- Name: idx_payouts_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payouts_tenant_id ON public.payouts USING btree (tenant_id);


--
-- Name: idx_users_tenant_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_tenant_id ON public.users USING btree (tenant_id);


--
-- Name: users_email_tenant_ci_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_tenant_ci_unique ON public.users USING btree (tenant_id, lower((email)::text));


--
-- Name: audit_logs audit_logs_no_delete; Type: RULE; Schema: public; Owner: postgres
--

CREATE RULE audit_logs_no_delete AS
    ON DELETE TO public.audit_logs DO INSTEAD NOTHING;


--
-- Name: audit_logs audit_logs_no_update; Type: RULE; Schema: public; Owner: postgres
--

CREATE RULE audit_logs_no_update AS
    ON UPDATE TO public.audit_logs DO INSTEAD NOTHING;


--
-- Name: contribution_groups contribution_groups_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER contribution_groups_updated_at BEFORE UPDATE ON public.contribution_groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: contributions contributions_derive_status; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER contributions_derive_status BEFORE INSERT OR UPDATE OF amount_due, amount_paid, status ON public.contributions FOR EACH ROW EXECUTE FUNCTION public.derive_contribution_status();


--
-- Name: contributions contributions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER contributions_updated_at BEFORE UPDATE ON public.contributions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: cycles cycles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER cycles_updated_at BEFORE UPDATE ON public.cycles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: document_requests document_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER document_requests_updated_at BEFORE UPDATE ON public.document_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: flags flags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER flags_updated_at BEFORE UPDATE ON public.flags FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: memberships memberships_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER memberships_updated_at BEFORE UPDATE ON public.memberships FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: organizations organizations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: payouts payouts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: tenants tenants_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: contribution_groups contribution_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contribution_groups
    ADD CONSTRAINT contribution_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: contribution_groups contribution_groups_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contribution_groups
    ADD CONSTRAINT contribution_groups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: contribution_groups contribution_groups_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contribution_groups
    ADD CONSTRAINT contribution_groups_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: contributions contributions_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE RESTRICT;


--
-- Name: contributions contributions_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE RESTRICT;


--
-- Name: contributions contributions_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: contributions contributions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contributions
    ADD CONSTRAINT contributions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: cycles cycles_contribution_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_contribution_group_id_fkey FOREIGN KEY (contribution_group_id) REFERENCES public.contribution_groups(id) ON DELETE RESTRICT;


--
-- Name: cycles cycles_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: cycles cycles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: document_requests document_requests_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE RESTRICT;


--
-- Name: document_requests document_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: document_requests document_requests_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_requests
    ADD CONSTRAINT document_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: flags flags_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flags
    ADD CONSTRAINT flags_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE RESTRICT;


--
-- Name: flags flags_raised_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flags
    ADD CONSTRAINT flags_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: flags flags_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flags
    ADD CONSTRAINT flags_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: flags flags_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flags
    ADD CONSTRAINT flags_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: memberships memberships_contribution_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_contribution_group_id_fkey FOREIGN KEY (contribution_group_id) REFERENCES public.contribution_groups(id) ON DELETE RESTRICT;


--
-- Name: memberships memberships_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: memberships memberships_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: organizations organizations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: organizations organizations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: payouts payouts_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE RESTRICT;


--
-- Name: payouts payouts_disbursed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_disbursed_by_fkey FOREIGN KEY (disbursed_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: payouts payouts_membership_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_membership_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id) ON DELETE RESTRICT;


--
-- Name: payouts payouts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: users users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE RESTRICT;


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: contribution_groups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.contribution_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: contributions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: cycles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;

--
-- Name: document_requests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: contributions financial_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY financial_delete ON public.contributions FOR DELETE USING (((tenant_id = public.get_auth_tenant_id()) AND public.auth_has_role(ARRAY['admin'::public.membership_role_enum, 'treasurer'::public.membership_role_enum])));


--
-- Name: cycles financial_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY financial_delete ON public.cycles FOR DELETE USING (((tenant_id = public.get_auth_tenant_id()) AND public.auth_has_role(ARRAY['admin'::public.membership_role_enum, 'treasurer'::public.membership_role_enum])));


--
-- Name: payouts financial_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY financial_delete ON public.payouts FOR DELETE USING (((tenant_id = public.get_auth_tenant_id()) AND public.auth_has_role(ARRAY['admin'::public.membership_role_enum, 'treasurer'::public.membership_role_enum])));


--
-- Name: payouts financial_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY financial_insert ON public.payouts FOR INSERT WITH CHECK (((tenant_id = public.get_auth_tenant_id()) AND public.auth_has_role(ARRAY['admin'::public.membership_role_enum, 'treasurer'::public.membership_role_enum])));


--
-- Name: contributions financial_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY financial_update ON public.contributions FOR UPDATE USING (((tenant_id = public.get_auth_tenant_id()) AND public.auth_has_role(ARRAY['admin'::public.membership_role_enum, 'treasurer'::public.membership_role_enum]))) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: cycles financial_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY financial_update ON public.cycles FOR UPDATE USING (((tenant_id = public.get_auth_tenant_id()) AND public.auth_has_role(ARRAY['admin'::public.membership_role_enum, 'treasurer'::public.membership_role_enum]))) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: payouts financial_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY financial_update ON public.payouts FOR UPDATE USING (((tenant_id = public.get_auth_tenant_id()) AND public.auth_has_role(ARRAY['admin'::public.membership_role_enum, 'treasurer'::public.membership_role_enum]))) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: flags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: payouts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: contribution_groups tenant_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_delete ON public.contribution_groups FOR DELETE USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: document_requests tenant_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_delete ON public.document_requests FOR DELETE USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: flags tenant_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_delete ON public.flags FOR DELETE USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: memberships tenant_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_delete ON public.memberships FOR DELETE USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: organizations tenant_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_delete ON public.organizations FOR DELETE USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: users tenant_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_delete ON public.users FOR DELETE USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: audit_logs tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.audit_logs FOR INSERT WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: contribution_groups tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.contribution_groups FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: contributions tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.contributions FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: cycles tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.cycles FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: document_requests tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.document_requests FOR INSERT WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: flags tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.flags FOR INSERT WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: memberships tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.memberships FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: organizations tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.organizations FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: users tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_insert ON public.users FOR INSERT TO authenticated WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: audit_logs tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.audit_logs FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: contribution_groups tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.contribution_groups FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: contributions tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.contributions FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: cycles tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.cycles FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: document_requests tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.document_requests FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: flags tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.flags FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: memberships tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.memberships FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: organizations tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.organizations FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: payouts tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.payouts FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: users tenant_isolation; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_isolation ON public.users FOR SELECT TO authenticated USING ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: tenants tenant_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_read ON public.tenants FOR SELECT USING ((id = public.get_auth_tenant_id()));


--
-- Name: contribution_groups tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_update ON public.contribution_groups FOR UPDATE USING ((tenant_id = public.get_auth_tenant_id())) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: document_requests tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_update ON public.document_requests FOR UPDATE USING ((tenant_id = public.get_auth_tenant_id())) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: flags tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_update ON public.flags FOR UPDATE USING ((tenant_id = public.get_auth_tenant_id())) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: memberships tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_update ON public.memberships FOR UPDATE USING ((tenant_id = public.get_auth_tenant_id())) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: organizations tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_update ON public.organizations FOR UPDATE USING ((tenant_id = public.get_auth_tenant_id())) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: users tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tenant_update ON public.users FOR UPDATE USING ((tenant_id = public.get_auth_tenant_id())) WITH CHECK ((tenant_id = public.get_auth_tenant_id()));


--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;


--
-- Name: FUNCTION auth_has_role(required_roles public.membership_role_enum[]); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auth_has_role(required_roles public.membership_role_enum[]) TO anon;
GRANT ALL ON FUNCTION public.auth_has_role(required_roles public.membership_role_enum[]) TO authenticated;
GRANT ALL ON FUNCTION public.auth_has_role(required_roles public.membership_role_enum[]) TO service_role;


--
-- Name: FUNCTION custom_access_token_hook(event jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.custom_access_token_hook(event jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.custom_access_token_hook(event jsonb) TO service_role;
GRANT ALL ON FUNCTION public.custom_access_token_hook(event jsonb) TO supabase_auth_admin;


--
-- Name: FUNCTION derive_contribution_status(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.derive_contribution_status() TO anon;
GRANT ALL ON FUNCTION public.derive_contribution_status() TO authenticated;
GRANT ALL ON FUNCTION public.derive_contribution_status() TO service_role;


--
-- Name: FUNCTION get_auth_tenant_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_auth_tenant_id() TO anon;
GRANT ALL ON FUNCTION public.get_auth_tenant_id() TO authenticated;
GRANT ALL ON FUNCTION public.get_auth_tenant_id() TO service_role;


--
-- Name: FUNCTION handle_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_updated_at() TO anon;
GRANT ALL ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.handle_updated_at() TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE contribution_groups; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contribution_groups TO anon;
GRANT ALL ON TABLE public.contribution_groups TO authenticated;
GRANT ALL ON TABLE public.contribution_groups TO service_role;


--
-- Name: TABLE contributions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.contributions TO anon;
GRANT ALL ON TABLE public.contributions TO authenticated;
GRANT ALL ON TABLE public.contributions TO service_role;


--
-- Name: TABLE cycles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.cycles TO anon;
GRANT ALL ON TABLE public.cycles TO authenticated;
GRANT ALL ON TABLE public.cycles TO service_role;


--
-- Name: TABLE document_requests; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.document_requests TO anon;
GRANT ALL ON TABLE public.document_requests TO authenticated;
GRANT ALL ON TABLE public.document_requests TO service_role;


--
-- Name: TABLE flags; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.flags TO anon;
GRANT ALL ON TABLE public.flags TO authenticated;
GRANT ALL ON TABLE public.flags TO service_role;


--
-- Name: TABLE memberships; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.memberships TO anon;
GRANT ALL ON TABLE public.memberships TO authenticated;
GRANT ALL ON TABLE public.memberships TO service_role;


--
-- Name: TABLE organizations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.organizations TO anon;
GRANT ALL ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;


--
-- Name: TABLE payouts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payouts TO anon;
GRANT ALL ON TABLE public.payouts TO authenticated;
GRANT ALL ON TABLE public.payouts TO service_role;


--
-- Name: TABLE tenants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.tenants TO anon;
GRANT ALL ON TABLE public.tenants TO authenticated;
GRANT ALL ON TABLE public.tenants TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;
GRANT SELECT ON TABLE public.users TO supabase_auth_admin;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict NHVeBHTz89fIWZsbyyY8nfFQ8sHolFf7RfD10kWlczoh64aQuvlDt2AgAIqpB4X

