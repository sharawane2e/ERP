import { pgTable, text, serial, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoles = ["Standard", "Administrator"] as const;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull().default("Admin"),
  email: text("email"),
  mobile: text("mobile"),
  role: text("role").notNull().default("Standard"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userClientAssignments = pgTable("user_client_assignments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  gstNo: text("gst_no").notNull(),
  contactPerson: text("contact_person").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  emailAddress: text("email_address").notNull(),
});

export const quotationTypes = ["Supply and Fabrication", "Structural Fabrication", "Job Work"] as const;

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectName: text("project_name").notNull(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  location: text("location").notNull(),
  quotationType: text("quotation_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quotations = pgTable("quotations", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  quotationNumber: text("quotation_number").notNull(),
  revision: text("revision").notNull().default("R-000"),
  version: integer("version").notNull().default(1),
  parentQuotationId: integer("parent_quotation_id"),
  enquiryNumber: text("enquiry_number").notNull(),
  subject: text("subject").notNull(),
  contactName: text("contact_name").notNull(),
  contactMobile: text("contact_mobile").notNull(),
  contactEmail: text("contact_email").notNull(),
  // Building details for Supply and Fabrication
  buildingDescription: text("building_description"),
  buildingArea: text("building_area"),
  frameType: text("frame_type"),
  length: text("length"),
  width: text("width"),
  clearHeight: text("clear_height"),
  roofSlope: text("roof_slope"),
  // Payment terms
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  // Editable content sections stored as JSON
  contentSections: text("content_sections"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const quotationItems = pgTable("quotation_items", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotations.id),
  serialNo: integer("serial_no").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  rate: decimal("rate", { precision: 12, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  invoiceNumber: text("invoice_number").notNull(),
  revision: text("revision").notNull().default("R-001"),
  version: integer("version").notNull().default(1),
  parentInvoiceId: integer("parent_invoice_id"),
  // Client details
  organisationName: text("organisation_name").notNull(),
  registeredAddress: text("registered_address").notNull(),
  consigneeAddress: text("consignee_address").notNull(),
  clientGstin: text("client_gstin"),
  workOrderNo: text("work_order_no"),
  dispatchDetails: text("dispatch_details"),
  // Tax details
  cgstRate: decimal("cgst_rate", { precision: 5, scale: 2 }).default("9"),
  sgstRate: decimal("sgst_rate", { precision: 5, scale: 2 }).default("9"),
  igstRate: decimal("igst_rate", { precision: 5, scale: 2 }).default("18"),
  appliedTaxType: text("applied_tax_type").default("igst"), // 'cgst_sgst' or 'igst'
  // Totals
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).default("0"),
  totalTax: decimal("total_tax", { precision: 14, scale: 2 }).default("0"),
  grandTotal: decimal("grand_total", { precision: 14, scale: 2 }).default("0"),
  // Editable content sections stored as JSON
  contentSections: text("content_sections"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  serialNo: integer("serial_no").notNull(),
  description: text("description").notNull(),
  hsnCode: text("hsn_code"),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").default("LS"),
  ratePerUnit: decimal("rate_per_unit", { precision: 12, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
});

export const gatePasses = pgTable("gate_passes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  gatePassNumber: text("gate_pass_number").notNull(),
  revision: text("revision").notNull().default("R-001"),
  version: integer("version").notNull().default(1),
  parentGatePassId: integer("parent_gate_pass_id"),
  organisationName: text("organisation_name").notNull(),
  registeredAddress: text("registered_address").notNull(),
  consigneeAddress: text("consignee_address").notNull(),
  clientGstin: text("client_gstin"),
  workOrderNo: text("work_order_no"),
  dispatchDetails: text("dispatch_details"),
  cgstRate: decimal("cgst_rate", { precision: 5, scale: 2 }).default("9"),
  sgstRate: decimal("sgst_rate", { precision: 5, scale: 2 }).default("9"),
  igstRate: decimal("igst_rate", { precision: 5, scale: 2 }).default("18"),
  appliedTaxType: text("applied_tax_type").default("igst"),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).default("0"),
  totalTax: decimal("total_tax", { precision: 14, scale: 2 }).default("0"),
  grandTotal: decimal("grand_total", { precision: 14, scale: 2 }).default("0"),
  contentSections: text("content_sections"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gatePassItems = pgTable("gate_pass_items", {
  id: serial("id").primaryKey(),
  gatePassId: integer("gate_pass_id").notNull().references(() => gatePasses.id),
  serialNo: integer("serial_no").notNull(),
  description: text("description").notNull(),
  hsnCode: text("hsn_code"),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").default("LS"),
  ratePerUnit: decimal("rate_per_unit", { precision: 12, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
});

export const deliveryChallans = pgTable("delivery_challans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  deliveryChallanNumber: text("delivery_challan_number").notNull(),
  revision: text("revision").notNull().default("R-001"),
  version: integer("version").notNull().default(1),
  parentDeliveryChallanId: integer("parent_delivery_challan_id"),
  organisationName: text("organisation_name").notNull(),
  registeredAddress: text("registered_address").notNull(),
  consigneeAddress: text("consignee_address").notNull(),
  clientGstin: text("client_gstin"),
  workOrderNo: text("work_order_no"),
  dispatchDetails: text("dispatch_details"),
  cgstRate: decimal("cgst_rate", { precision: 5, scale: 2 }).default("9"),
  sgstRate: decimal("sgst_rate", { precision: 5, scale: 2 }).default("9"),
  igstRate: decimal("igst_rate", { precision: 5, scale: 2 }).default("18"),
  appliedTaxType: text("applied_tax_type").default("igst"),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).default("0"),
  totalTax: decimal("total_tax", { precision: 14, scale: 2 }).default("0"),
  grandTotal: decimal("grand_total", { precision: 14, scale: 2 }).default("0"),
  contentSections: text("content_sections"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deliveryChallanItems = pgTable("delivery_challan_items", {
  id: serial("id").primaryKey(),
  deliveryChallanId: integer("delivery_challan_id").notNull().references(() => deliveryChallans.id),
  serialNo: integer("serial_no").notNull(),
  description: text("description").notNull(),
  hsnCode: text("hsn_code"),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unit: text("unit").default("LS"),
  ratePerUnit: decimal("rate_per_unit", { precision: 12, scale: 2 }),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  remarks: text("remarks"),
});

export const projectLedgerBudgets = pgTable("project_ledger_budgets", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  projectValue: decimal("project_value", { precision: 14, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectLedgerEntries = pgTable("project_ledger_entries", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  entryDate: text("entry_date").notNull(),
  entryType: text("entry_type").notNull(), // expense | receipt
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull(),
  remarks: text("remarks"),
  reference: text("reference"),
  receivedAgainst: text("received_against"),
  chequeNumber: text("cheque_number"),
  bankName: text("bank_name"),
  chequeDate: text("cheque_date"),
  utrNumber: text("utr_number"),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const branding = pgTable("branding", {
  id: serial("id").primaryKey(),
  logoUrl: text("logo_url").notNull().default("https://reviranexgen.com/assets/logo-with-name.png"),
  headerUrl: text("header_url").notNull().default("https://reviranexgen.com/assets/header.jpg"),
  footerUrl: text("footer_url").notNull().default("https://reviranexgen.com/assets/footer.jpg"),
  stampUrl: text("stamp_url").notNull().default("https://reviranexgen.com/assets/stamp.png"),
  storeKeeperSignUrl: text("store_keeper_sign_url").notNull().default(""),
  qcEnggSignUrl: text("qc_engg_sign_url").notNull().default(""),
  storeInchargeSignUrl: text("store_incharge_sign_url").notNull().default(""),
  plantHeadSignUrl: text("plant_head_sign_url").notNull().default(""),
  primaryColor: text("primary_color").notNull().default("#da2032"),
  secondaryColor: text("secondary_color").notNull().default("#2f3591"),
  entityName: text("entity_name").notNull().default("Revira NexGen Structure Pvt. Ltd."),
  cin: text("cin").notNull().default("U16222DL2025PTC459465"),
  companyGstin: text("company_gstin").notNull().default("07AAPCR3026H1ZA"),
  website: text("website").notNull().default("www.reviranexgen.com"),
  email: text("email").notNull().default("info@reviranexgen.com"),
  headOfficeAddress: text("head_office_address").notNull().default("28, E2 Block, Shivram Park Nangloi Delhi - 110041"),
  workshopAddress: text("workshop_address").notNull().default("Flat No. 302, 3rd Floor Rajat Residency, Subharambha Society Near Toll Naka, Dabha, Nagpur 440023"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients);
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertQuotationSchema = createInsertSchema(quotations).omit({ id: true, createdAt: true });
export const insertQuotationItemSchema = createInsertSchema(quotationItems).omit({ id: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export const insertInvoiceItemSchema = createInsertSchema(invoiceItems).omit({ id: true });
export const insertGatePassSchema = createInsertSchema(gatePasses).omit({ id: true, createdAt: true });
export const insertGatePassItemSchema = createInsertSchema(gatePassItems).omit({ id: true });
export const insertDeliveryChallanSchema = createInsertSchema(deliveryChallans).omit({ id: true, createdAt: true });
export const insertDeliveryChallanItemSchema = createInsertSchema(deliveryChallanItems).omit({ id: true });
export const insertProjectLedgerBudgetSchema = createInsertSchema(projectLedgerBudgets).omit({ id: true, updatedAt: true });
export const insertProjectLedgerEntrySchema = createInsertSchema(projectLedgerEntries).omit({ id: true, createdAt: true });
export const insertBrandingSchema = createInsertSchema(branding).omit({ id: true, updatedAt: true });
export const insertUserClientAssignmentSchema = createInsertSchema(userClientAssignments).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Quotation = typeof quotations.$inferSelect;
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type InsertQuotationItem = z.infer<typeof insertQuotationItemSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type GatePass = typeof gatePasses.$inferSelect;
export type InsertGatePass = z.infer<typeof insertGatePassSchema>;
export type GatePassItem = typeof gatePassItems.$inferSelect;
export type InsertGatePassItem = z.infer<typeof insertGatePassItemSchema>;
export type DeliveryChallan = typeof deliveryChallans.$inferSelect;
export type InsertDeliveryChallan = z.infer<typeof insertDeliveryChallanSchema>;
export type DeliveryChallanItem = typeof deliveryChallanItems.$inferSelect;
export type InsertDeliveryChallanItem = z.infer<typeof insertDeliveryChallanItemSchema>;
export type ProjectLedgerBudget = typeof projectLedgerBudgets.$inferSelect;
export type InsertProjectLedgerBudget = z.infer<typeof insertProjectLedgerBudgetSchema>;
export type ProjectLedgerEntry = typeof projectLedgerEntries.$inferSelect;
export type InsertProjectLedgerEntry = z.infer<typeof insertProjectLedgerEntrySchema>;
export type Branding = typeof branding.$inferSelect;
export type InsertBranding = z.infer<typeof insertBrandingSchema>;
export type UserClientAssignment = typeof userClientAssignments.$inferSelect;
export type InsertUserClientAssignment = z.infer<typeof insertUserClientAssignmentSchema>;
