import { drizzle } from "drizzle-orm/node-postgres";
// import pg from "pg";
import { Pool } from "pg";
// import * as schema from "@shared/schema";

// const { Pool } = pg;

// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

export const pool = new Pool({ connectionString: "postgresql://appuser:secret@localhost:5432/revira" });
export const db = drizzle(pool);

export async function ensureCoreTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_challans (
      id serial PRIMARY KEY,
      project_id integer NOT NULL REFERENCES projects(id),
      delivery_challan_number text NOT NULL,
      revision text NOT NULL DEFAULT 'R-001',
      version integer NOT NULL DEFAULT 1,
      parent_delivery_challan_id integer REFERENCES delivery_challans(id),
      organisation_name text NOT NULL,
      registered_address text NOT NULL,
      consignee_address text NOT NULL,
      client_gstin text,
      work_order_no text,
      dispatch_details text,
      cgst_rate numeric(5,2) DEFAULT 9,
      sgst_rate numeric(5,2) DEFAULT 9,
      igst_rate numeric(5,2) DEFAULT 18,
      applied_tax_type text DEFAULT 'igst',
      total_amount numeric(14,2) DEFAULT 0,
      total_tax numeric(14,2) DEFAULT 0,
      grand_total numeric(14,2) DEFAULT 0,
      content_sections text,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_challan_items (
      id serial PRIMARY KEY,
      delivery_challan_id integer NOT NULL REFERENCES delivery_challans(id),
      serial_no integer NOT NULL,
      description text NOT NULL,
      hsn_code text,
      quantity numeric(10,3) NOT NULL,
      unit text DEFAULT 'LS',
      rate_per_unit numeric(12,2),
      percentage numeric(5,2),
      amount numeric(14,2) NOT NULL,
      remarks text
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_ledger_budgets (
      id serial PRIMARY KEY,
      project_id integer NOT NULL REFERENCES projects(id),
      project_value numeric(14,2) NOT NULL DEFAULT 0,
      updated_at timestamp DEFAULT now() NOT NULL,
      UNIQUE (project_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_ledger_entries (
      id serial PRIMARY KEY,
      project_id integer NOT NULL REFERENCES projects(id),
      entry_date text NOT NULL,
      entry_type text NOT NULL,
      category text NOT NULL,
      description text NOT NULL,
      amount numeric(14,2) NOT NULL,
      payment_mode text NOT NULL,
      remarks text,
      reference text,
      received_against text,
      cheque_number text,
      bank_name text,
      cheque_date text,
      utr_number text,
      attachment_url text,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `);
}

export async function normalizeLegacyQuotationText() {
  const tokenPattern = "DNSPL";
  const apexPattern = "m\\s*/\\s*s\\s+apex";

  await pool.query(
    `
      UPDATE quotations
      SET
        subject = regexp_replace(subject, $1, 'RNSPL', 'gi'),
        payment_terms = CASE
          WHEN payment_terms IS NULL THEN NULL
          ELSE regexp_replace(payment_terms, $1, 'RNSPL', 'gi')
        END,
        notes = CASE
          WHEN notes IS NULL THEN NULL
          ELSE regexp_replace(notes, $1, 'RNSPL', 'gi')
        END,
        content_sections = CASE
          WHEN content_sections IS NULL THEN NULL
          ELSE regexp_replace(content_sections, $1, 'RNSPL', 'gi')
        END
      WHERE
        subject ~* $1 OR
        COALESCE(payment_terms, '') ~* $1 OR
        COALESCE(notes, '') ~* $1 OR
        COALESCE(content_sections, '') ~* $1
    `,
    [tokenPattern],
  );

  await pool.query(
    `
      UPDATE quotation_items
      SET
        description = regexp_replace(description, $1, 'RNSPL', 'gi'),
        remarks = CASE
          WHEN remarks IS NULL THEN NULL
          ELSE regexp_replace(remarks, $1, 'RNSPL', 'gi')
        END
      WHERE
        description ~* $1 OR
        COALESCE(remarks, '') ~* $1
    `,
    [tokenPattern],
  );

  await pool.query(
    `
      UPDATE quotations
      SET
        subject = regexp_replace(subject, $1, 'your company', 'gi'),
        payment_terms = CASE
          WHEN payment_terms IS NULL THEN NULL
          ELSE regexp_replace(payment_terms, $1, 'your company', 'gi')
        END,
        notes = CASE
          WHEN notes IS NULL THEN NULL
          ELSE regexp_replace(notes, $1, 'your company', 'gi')
        END,
        content_sections = CASE
          WHEN content_sections IS NULL THEN NULL
          ELSE regexp_replace(content_sections, $1, 'your company', 'gi')
        END
      WHERE
        subject ~* $1 OR
        COALESCE(payment_terms, '') ~* $1 OR
        COALESCE(notes, '') ~* $1 OR
        COALESCE(content_sections, '') ~* $1
    `,
    [apexPattern],
  );

  await pool.query(
    `
      UPDATE quotation_items
      SET
        description = regexp_replace(description, $1, 'your company', 'gi'),
        remarks = CASE
          WHEN remarks IS NULL THEN NULL
          ELSE regexp_replace(remarks, $1, 'your company', 'gi')
        END
      WHERE
        description ~* $1 OR
        COALESCE(remarks, '') ~* $1
    `,
    [apexPattern],
  );
}
