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
SET default_tablespace = '';
SET default_table_access_method = heap;
CREATE TABLE public.branding (
    id integer NOT NULL,
    logo_url text DEFAULT 'https://reviranexgen.com/assets/logo-with-name.png'::text NOT NULL,
    primary_color text DEFAULT '#da2032'::text NOT NULL,
    secondary_color text DEFAULT '#2f3591'::text NOT NULL,
    entity_name text DEFAULT 'Revira NexGen Structure Pvt. Ltd.'::text NOT NULL,
    cin text DEFAULT 'U16222DL2025PTC459465'::text NOT NULL,
    website text DEFAULT 'www.reviranexgen.com'::text NOT NULL,
    email text DEFAULT 'info@reviranexgen.com'::text NOT NULL,
    head_office_address text DEFAULT '28, E2 Block, Shivram Park Nangloi Delhi - 110041'::text NOT NULL,
    workshop_address text DEFAULT 'Flat No. 302, 3rd Floor Rajat Residency, Subharambha Society Near Toll Naka, Dabha, Nagpur 440023'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    header_url text DEFAULT 'https://reviranexgen.com/assets/header.jpg'::text NOT NULL,
    footer_url text DEFAULT 'https://reviranexgen.com/assets/footer.jpg'::text NOT NULL,
    stamp_url text DEFAULT 'https://reviranexgen.com/assets/stamp.png'::text NOT NULL
);
CREATE SEQUENCE public.branding_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.branding_id_seq OWNED BY public.branding.id;
CREATE TABLE public.clients (
    id integer NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    gst_no text NOT NULL,
    contact_person text NOT NULL,
    mobile_number text NOT NULL,
    email_address text NOT NULL
);
CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;
CREATE TABLE public.invoice_items (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    serial_no integer NOT NULL,
    description text NOT NULL,
    hsn_code text,
    quantity numeric(10,3) NOT NULL,
    unit text DEFAULT 'LS'::text,
    rate_per_unit numeric(12,2),
    percentage numeric(5,2),
    amount numeric(14,2) NOT NULL,
    remarks text
);
CREATE SEQUENCE public.invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;
CREATE TABLE public.invoices (
    id integer NOT NULL,
    project_id integer NOT NULL,
    invoice_number text NOT NULL,
    revision text DEFAULT 'R-001'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    parent_invoice_id integer,
    organisation_name text NOT NULL,
    registered_address text NOT NULL,
    consignee_address text NOT NULL,
    client_gstin text,
    work_order_no text,
    dispatch_details text,
    cgst_rate numeric(5,2) DEFAULT 9,
    sgst_rate numeric(5,2) DEFAULT 9,
    igst_rate numeric(5,2) DEFAULT 18,
    applied_tax_type text DEFAULT 'igst'::text,
    total_amount numeric(14,2) DEFAULT 0,
    total_tax numeric(14,2) DEFAULT 0,
    grand_total numeric(14,2) DEFAULT 0,
    content_sections text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;
CREATE TABLE public.projects (
    id integer NOT NULL,
    project_name text NOT NULL,
    client_id integer NOT NULL,
    location text NOT NULL,
    quotation_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;
CREATE TABLE public.quotation_items (
    id integer NOT NULL,
    quotation_id integer NOT NULL,
    serial_no integer NOT NULL,
    description text NOT NULL,
    unit text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    rate numeric(12,2) NOT NULL,
    amount numeric(14,2) NOT NULL,
    remarks text
);
CREATE SEQUENCE public.quotation_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.quotation_items_id_seq OWNED BY public.quotation_items.id;
CREATE TABLE public.quotations (
    id integer NOT NULL,
    project_id integer NOT NULL,
    quotation_number text NOT NULL,
    revision text DEFAULT 'R-000'::text NOT NULL,
    enquiry_number text NOT NULL,
    subject text NOT NULL,
    contact_name text NOT NULL,
    contact_mobile text NOT NULL,
    contact_email text NOT NULL,
    building_description text,
    building_area text,
    frame_type text,
    length text,
    width text,
    clear_height text,
    roof_slope text,
    payment_terms text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    parent_quotation_id integer,
    content_sections text
);
CREATE SEQUENCE public.quotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.quotations_id_seq OWNED BY public.quotations.id;
CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);
CREATE TABLE public.user_client_assignments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    client_id integer NOT NULL
);
CREATE SEQUENCE public.user_client_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.user_client_assignments_id_seq OWNED BY public.user_client_assignments.id;
CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    name text DEFAULT 'Admin'::text NOT NULL,
    email text,
    mobile text,
    role text DEFAULT 'Standard'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
ALTER TABLE ONLY public.branding ALTER COLUMN id SET DEFAULT nextval('public.branding_id_seq'::regclass);
ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);
ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);
ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);
ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);
ALTER TABLE ONLY public.quotation_items ALTER COLUMN id SET DEFAULT nextval('public.quotation_items_id_seq'::regclass);
ALTER TABLE ONLY public.quotations ALTER COLUMN id SET DEFAULT nextval('public.quotations_id_seq'::regclass);
ALTER TABLE ONLY public.user_client_assignments ALTER COLUMN id SET DEFAULT nextval('public.user_client_assignments_id_seq'::regclass);
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
ALTER TABLE ONLY public.branding
    ADD CONSTRAINT branding_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
ALTER TABLE ONLY public.user_client_assignments
    ADD CONSTRAINT user_client_assignments_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);
CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);
ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);
ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_clients_id_fk FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE ONLY public.quotation_items
    ADD CONSTRAINT quotation_items_quotation_id_quotations_id_fk FOREIGN KEY (quotation_id) REFERENCES public.quotations(id);
ALTER TABLE ONLY public.quotations
    ADD CONSTRAINT quotations_project_id_projects_id_fk FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE ONLY public.user_client_assignments
    ADD CONSTRAINT user_client_assignments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE ONLY public.user_client_assignments
    ADD CONSTRAINT user_client_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
\unrestrict UjhJbtmocSMf3ULOHKPV0LR225lhtaEGiSVJeEWP3BAeteQecoK0T2rE9lx4mCk

