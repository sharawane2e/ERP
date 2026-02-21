import { db } from "./db";
import { 
  users, clients, projects, quotations, quotationItems, invoices, invoiceItems, gatePasses, gatePassItems, deliveryChallans, deliveryChallanItems, projectLedgerBudgets, projectLedgerEntries, branding, userClientAssignments,
  type User, type InsertUser, 
  type Client, type InsertClient, 
  type Project, type InsertProject,
  type Quotation, type InsertQuotation,
  type QuotationItem, type InsertQuotationItem,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type GatePass, type InsertGatePass,
  type GatePassItem, type InsertGatePassItem,
  type DeliveryChallan, type InsertDeliveryChallan,
  type DeliveryChallanItem, type InsertDeliveryChallanItem,
  type ProjectLedgerBudget, type InsertProjectLedgerBudget,
  type ProjectLedgerEntry, type InsertProjectLedgerEntry,
  type Branding, type InsertBranding,
  type UserClientAssignment, type InsertUserClientAssignment
} from "@shared/schema";
import { desc, eq, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  getUserClientAssignments(userId: number): Promise<UserClientAssignment[]>;
  setUserClientAssignments(userId: number, clientIds: number[]): Promise<void>;
  getClientsForUser(userId: number): Promise<Client[]>;
  getProjectsForUser(userId: number): Promise<Project[]>;
  
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  getQuotations(): Promise<Quotation[]>;
  getQuotation(id: number): Promise<Quotation | undefined>;
  getQuotationByProjectId(projectId: number): Promise<Quotation | undefined>;
  getQuotationVersions(projectId: number): Promise<Quotation[]>;
  createQuotation(quotation: InsertQuotation): Promise<Quotation>;
  updateQuotation(id: number, updates: Partial<InsertQuotation>): Promise<Quotation | undefined>;
  deleteQuotation(id: number): Promise<boolean>;

  getQuotationItems(quotationId: number): Promise<QuotationItem[]>;
  createQuotationItem(item: InsertQuotationItem): Promise<QuotationItem>;
  updateQuotationItem(id: number, updates: Partial<InsertQuotationItem>): Promise<QuotationItem | undefined>;
  deleteQuotationItem(id: number): Promise<boolean>;
  deleteQuotationItemsByQuotationId(quotationId: number): Promise<boolean>;

  getBranding(): Promise<Branding | undefined>;
  createBranding(brandingData: InsertBranding): Promise<Branding>;
  updateBranding(id: number, updates: Partial<InsertBranding>): Promise<Branding | undefined>;

  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoiceByProjectId(projectId: number): Promise<Invoice | undefined>;
  getInvoiceVersions(projectId: number): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<boolean>;

  getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]>;
  createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem>;
  updateInvoiceItem(id: number, updates: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined>;
  deleteInvoiceItem(id: number): Promise<boolean>;
  deleteInvoiceItemsByInvoiceId(invoiceId: number): Promise<boolean>;

  getGatePasses(): Promise<GatePass[]>;
  getGatePass(id: number): Promise<GatePass | undefined>;
  getGatePassByProjectId(projectId: number): Promise<GatePass | undefined>;
  getGatePassVersions(projectId: number): Promise<GatePass[]>;
  createGatePass(gatePass: InsertGatePass): Promise<GatePass>;
  updateGatePass(id: number, updates: Partial<InsertGatePass>): Promise<GatePass | undefined>;
  deleteGatePass(id: number): Promise<boolean>;

  getGatePassItems(gatePassId: number): Promise<GatePassItem[]>;
  createGatePassItem(item: InsertGatePassItem): Promise<GatePassItem>;
  updateGatePassItem(id: number, updates: Partial<InsertGatePassItem>): Promise<GatePassItem | undefined>;
  deleteGatePassItem(id: number): Promise<boolean>;
  deleteGatePassItemsByGatePassId(gatePassId: number): Promise<boolean>;

  getDeliveryChallans(): Promise<DeliveryChallan[]>;
  getDeliveryChallan(id: number): Promise<DeliveryChallan | undefined>;
  getDeliveryChallanByProjectId(projectId: number): Promise<DeliveryChallan | undefined>;
  getDeliveryChallanVersions(projectId: number): Promise<DeliveryChallan[]>;
  createDeliveryChallan(deliveryChallan: InsertDeliveryChallan): Promise<DeliveryChallan>;
  updateDeliveryChallan(id: number, updates: Partial<InsertDeliveryChallan>): Promise<DeliveryChallan | undefined>;
  deleteDeliveryChallan(id: number): Promise<boolean>;

  getDeliveryChallanItems(deliveryChallanId: number): Promise<DeliveryChallanItem[]>;
  createDeliveryChallanItem(item: InsertDeliveryChallanItem): Promise<DeliveryChallanItem>;
  updateDeliveryChallanItem(id: number, updates: Partial<InsertDeliveryChallanItem>): Promise<DeliveryChallanItem | undefined>;
  deleteDeliveryChallanItem(id: number): Promise<boolean>;
  deleteDeliveryChallanItemsByDeliveryChallanId(deliveryChallanId: number): Promise<boolean>;

  getProjectLedgerBudget(projectId: number): Promise<ProjectLedgerBudget | undefined>;
  upsertProjectLedgerBudget(projectId: number, projectValue: string): Promise<ProjectLedgerBudget>;
  getProjectLedgerEntries(projectId: number): Promise<ProjectLedgerEntry[]>;
  createProjectLedgerEntry(entry: InsertProjectLedgerEntry): Promise<ProjectLedgerEntry>;
  updateProjectLedgerEntry(id: number, updates: Partial<InsertProjectLedgerEntry>): Promise<ProjectLedgerEntry | undefined>;
  deleteProjectLedgerEntry(id: number): Promise<boolean>;
  deleteProjectLedgerEntriesByProjectId(projectId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<boolean> {
    // First delete user client assignments
    await db.delete(userClientAssignments).where(eq(userClientAssignments.userId, id));
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getUserClientAssignments(userId: number): Promise<UserClientAssignment[]> {
    return await db.select().from(userClientAssignments).where(eq(userClientAssignments.userId, userId));
  }

  async setUserClientAssignments(userId: number, clientIds: number[]): Promise<void> {
    // Delete existing assignments
    await db.delete(userClientAssignments).where(eq(userClientAssignments.userId, userId));
    
    // Insert new assignments
    if (clientIds.length > 0) {
      await db.insert(userClientAssignments).values(
        clientIds.map(clientId => ({ userId, clientId }))
      );
    }
  }

  async getClientsForUser(userId: number): Promise<Client[]> {
    const user = await this.getUser(userId);
    if (!user) return [];
    
    // Administrators see all clients
    if (user.role === "Administrator") {
      return await this.getClients();
    }
    
    // Standard users only see assigned clients
    const assignments = await this.getUserClientAssignments(userId);
    if (assignments.length === 0) return [];
    
    const clientIds = assignments.map(a => a.clientId);
    return await db.select().from(clients).where(inArray(clients.id, clientIds));
  }

  async getProjectsForUser(userId: number): Promise<Project[]> {
    const user = await this.getUser(userId);
    if (!user) return [];
    
    // Administrators see all projects
    if (user.role === "Administrator") {
      return await this.getProjects();
    }
    
    // Standard users only see projects of assigned clients
    const userClients = await this.getClientsForUser(userId);
    if (userClients.length === 0) return [];
    
    const clientIds = userClients.map(c => c.id);
    return await db.select().from(projects).where(inArray(projects.clientId, clientIds));
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set(updates).where(eq(clients.id, id)).returning();
    return client;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning();
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    // First, get all quotations for this project
    const projectQuotations = await db.select().from(quotations).where(eq(quotations.projectId, id));
    
    // Delete all quotation items for each quotation
    for (const quotation of projectQuotations) {
      await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotation.id));
    }
    
    // Delete all quotations for this project
    await db.delete(quotations).where(eq(quotations.projectId, id));
    
    // Get all invoices for this project
    const projectInvoices = await db.select().from(invoices).where(eq(invoices.projectId, id));
    
    // Delete all invoice items for each invoice
    for (const invoice of projectInvoices) {
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoice.id));
    }
    
    // Delete all invoices for this project
    await db.delete(invoices).where(eq(invoices.projectId, id));

    // Get all gate passes for this project
    const projectGatePasses = await db.select().from(gatePasses).where(eq(gatePasses.projectId, id));

    // Delete all gate pass items for each gate pass
    for (const gatePass of projectGatePasses) {
      await db.delete(gatePassItems).where(eq(gatePassItems.gatePassId, gatePass.id));
    }

    // Delete all gate passes for this project
    await db.delete(gatePasses).where(eq(gatePasses.projectId, id));

    // Get all delivery challans for this project
    const projectDeliveryChallans = await db.select().from(deliveryChallans).where(eq(deliveryChallans.projectId, id));

    // Delete all delivery challan items for each delivery challan
    for (const deliveryChallan of projectDeliveryChallans) {
      await db.delete(deliveryChallanItems).where(eq(deliveryChallanItems.deliveryChallanId, deliveryChallan.id));
    }

    // Delete all delivery challans for this project
    await db.delete(deliveryChallans).where(eq(deliveryChallans.projectId, id));

    // Delete ledger entries and budget for this project
    await db.delete(projectLedgerEntries).where(eq(projectLedgerEntries.projectId, id));
    await db.delete(projectLedgerBudgets).where(eq(projectLedgerBudgets.projectId, id));
    
    // Now delete the project
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async getQuotations(): Promise<Quotation[]> {
    return await db.select().from(quotations);
  }

  async getQuotation(id: number): Promise<Quotation | undefined> {
    const [quotation] = await db.select().from(quotations).where(eq(quotations.id, id));
    return quotation;
  }

  async getQuotationByProjectId(projectId: number): Promise<Quotation | undefined> {
    const [quotation] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.projectId, projectId))
      .orderBy(desc(quotations.version));
    return quotation;
  }

  async getQuotationVersions(projectId: number): Promise<Quotation[]> {
    return await db.select().from(quotations).where(eq(quotations.projectId, projectId));
  }

  async createQuotation(insertQuotation: InsertQuotation): Promise<Quotation> {
    const [quotation] = await db.insert(quotations).values(insertQuotation).returning();
    return quotation;
  }

  async updateQuotation(id: number, updates: Partial<InsertQuotation>): Promise<Quotation | undefined> {
    const [quotation] = await db.update(quotations).set(updates).where(eq(quotations.id, id)).returning();
    return quotation;
  }

  async deleteQuotation(id: number): Promise<boolean> {
    const result = await db.delete(quotations).where(eq(quotations.id, id)).returning();
    return result.length > 0;
  }

  async getQuotationItems(quotationId: number): Promise<QuotationItem[]> {
    return await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId));
  }

  async createQuotationItem(item: InsertQuotationItem): Promise<QuotationItem> {
    const [quotationItem] = await db.insert(quotationItems).values(item).returning();
    return quotationItem;
  }

  async updateQuotationItem(id: number, updates: Partial<InsertQuotationItem>): Promise<QuotationItem | undefined> {
    const [item] = await db.update(quotationItems).set(updates).where(eq(quotationItems.id, id)).returning();
    return item;
  }

  async deleteQuotationItem(id: number): Promise<boolean> {
    const result = await db.delete(quotationItems).where(eq(quotationItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteQuotationItemsByQuotationId(quotationId: number): Promise<boolean> {
    const result = await db.delete(quotationItems).where(eq(quotationItems.quotationId, quotationId)).returning();
    return result.length > 0;
  }

  async getBranding(): Promise<Branding | undefined> {
    const [brandingData] = await db.select().from(branding);
    return brandingData;
  }

  async createBranding(insertBranding: InsertBranding): Promise<Branding> {
    const [newBranding] = await db.insert(branding).values(insertBranding).returning();
    return newBranding;
  }

  async updateBranding(id: number, updates: Partial<InsertBranding>): Promise<Branding | undefined> {
    const [updatedBranding] = await db.update(branding).set({ ...updates, updatedAt: new Date() }).where(eq(branding.id, id)).returning();
    return updatedBranding;
  }

  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices);
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoiceByProjectId(projectId: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.projectId, projectId));
    return invoice;
  }

  async getInvoiceVersions(projectId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.projectId, projectId));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const [invoice] = await db.update(invoices).set(updates).where(eq(invoices.id, id)).returning();
    return invoice;
  }

  async deleteInvoice(id: number): Promise<boolean> {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const result = await db.delete(invoices).where(eq(invoices.id, id)).returning();
    return result.length > 0;
  }

  async getInvoiceItems(invoiceId: number): Promise<InvoiceItem[]> {
    return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  }

  async createInvoiceItem(item: InsertInvoiceItem): Promise<InvoiceItem> {
    const [invoiceItem] = await db.insert(invoiceItems).values(item).returning();
    return invoiceItem;
  }

  async updateInvoiceItem(id: number, updates: Partial<InsertInvoiceItem>): Promise<InvoiceItem | undefined> {
    const [item] = await db.update(invoiceItems).set(updates).where(eq(invoiceItems.id, id)).returning();
    return item;
  }

  async deleteInvoiceItem(id: number): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteInvoiceItemsByInvoiceId(invoiceId: number): Promise<boolean> {
    const result = await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).returning();
    return result.length > 0;
  }

  async getGatePasses(): Promise<GatePass[]> {
    return await db.select().from(gatePasses);
  }

  async getGatePass(id: number): Promise<GatePass | undefined> {
    const [gatePass] = await db.select().from(gatePasses).where(eq(gatePasses.id, id));
    return gatePass;
  }

  async getGatePassByProjectId(projectId: number): Promise<GatePass | undefined> {
    const [gatePass] = await db.select().from(gatePasses).where(eq(gatePasses.projectId, projectId));
    return gatePass;
  }

  async getGatePassVersions(projectId: number): Promise<GatePass[]> {
    return await db.select().from(gatePasses).where(eq(gatePasses.projectId, projectId));
  }

  async createGatePass(insertGatePass: InsertGatePass): Promise<GatePass> {
    const [gatePass] = await db.insert(gatePasses).values(insertGatePass).returning();
    return gatePass;
  }

  async updateGatePass(id: number, updates: Partial<InsertGatePass>): Promise<GatePass | undefined> {
    const [gatePass] = await db.update(gatePasses).set(updates).where(eq(gatePasses.id, id)).returning();
    return gatePass;
  }

  async deleteGatePass(id: number): Promise<boolean> {
    await db.delete(gatePassItems).where(eq(gatePassItems.gatePassId, id));
    const result = await db.delete(gatePasses).where(eq(gatePasses.id, id)).returning();
    return result.length > 0;
  }

  async getGatePassItems(gatePassId: number): Promise<GatePassItem[]> {
    return await db.select().from(gatePassItems).where(eq(gatePassItems.gatePassId, gatePassId));
  }

  async createGatePassItem(item: InsertGatePassItem): Promise<GatePassItem> {
    const [gatePassItem] = await db.insert(gatePassItems).values(item).returning();
    return gatePassItem;
  }

  async updateGatePassItem(id: number, updates: Partial<InsertGatePassItem>): Promise<GatePassItem | undefined> {
    const [item] = await db.update(gatePassItems).set(updates).where(eq(gatePassItems.id, id)).returning();
    return item;
  }

  async deleteGatePassItem(id: number): Promise<boolean> {
    const result = await db.delete(gatePassItems).where(eq(gatePassItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteGatePassItemsByGatePassId(gatePassId: number): Promise<boolean> {
    const result = await db.delete(gatePassItems).where(eq(gatePassItems.gatePassId, gatePassId)).returning();
    return result.length > 0;
  }

  async getDeliveryChallans(): Promise<DeliveryChallan[]> {
    return await db.select().from(deliveryChallans);
  }

  async getDeliveryChallan(id: number): Promise<DeliveryChallan | undefined> {
    const [deliveryChallan] = await db.select().from(deliveryChallans).where(eq(deliveryChallans.id, id));
    return deliveryChallan;
  }

  async getDeliveryChallanByProjectId(projectId: number): Promise<DeliveryChallan | undefined> {
    const [deliveryChallan] = await db.select().from(deliveryChallans).where(eq(deliveryChallans.projectId, projectId));
    return deliveryChallan;
  }

  async getDeliveryChallanVersions(projectId: number): Promise<DeliveryChallan[]> {
    return await db.select().from(deliveryChallans).where(eq(deliveryChallans.projectId, projectId));
  }

  async createDeliveryChallan(insertDeliveryChallan: InsertDeliveryChallan): Promise<DeliveryChallan> {
    const [deliveryChallan] = await db.insert(deliveryChallans).values(insertDeliveryChallan).returning();
    return deliveryChallan;
  }

  async updateDeliveryChallan(id: number, updates: Partial<InsertDeliveryChallan>): Promise<DeliveryChallan | undefined> {
    const [deliveryChallan] = await db.update(deliveryChallans).set(updates).where(eq(deliveryChallans.id, id)).returning();
    return deliveryChallan;
  }

  async deleteDeliveryChallan(id: number): Promise<boolean> {
    await db.delete(deliveryChallanItems).where(eq(deliveryChallanItems.deliveryChallanId, id));
    const result = await db.delete(deliveryChallans).where(eq(deliveryChallans.id, id)).returning();
    return result.length > 0;
  }

  async getDeliveryChallanItems(deliveryChallanId: number): Promise<DeliveryChallanItem[]> {
    return await db.select().from(deliveryChallanItems).where(eq(deliveryChallanItems.deliveryChallanId, deliveryChallanId));
  }

  async createDeliveryChallanItem(item: InsertDeliveryChallanItem): Promise<DeliveryChallanItem> {
    const [deliveryChallanItem] = await db.insert(deliveryChallanItems).values(item).returning();
    return deliveryChallanItem;
  }

  async updateDeliveryChallanItem(id: number, updates: Partial<InsertDeliveryChallanItem>): Promise<DeliveryChallanItem | undefined> {
    const [item] = await db.update(deliveryChallanItems).set(updates).where(eq(deliveryChallanItems.id, id)).returning();
    return item;
  }

  async deleteDeliveryChallanItem(id: number): Promise<boolean> {
    const result = await db.delete(deliveryChallanItems).where(eq(deliveryChallanItems.id, id)).returning();
    return result.length > 0;
  }

  async deleteDeliveryChallanItemsByDeliveryChallanId(deliveryChallanId: number): Promise<boolean> {
    const result = await db.delete(deliveryChallanItems).where(eq(deliveryChallanItems.deliveryChallanId, deliveryChallanId)).returning();
    return result.length > 0;
  }

  async getProjectLedgerBudget(projectId: number): Promise<ProjectLedgerBudget | undefined> {
    const [budget] = await db.select().from(projectLedgerBudgets).where(eq(projectLedgerBudgets.projectId, projectId));
    return budget;
  }

  async upsertProjectLedgerBudget(projectId: number, projectValue: string): Promise<ProjectLedgerBudget> {
    const existing = await this.getProjectLedgerBudget(projectId);
    if (existing) {
      const [updated] = await db
        .update(projectLedgerBudgets)
        .set({ projectValue, updatedAt: new Date() })
        .where(eq(projectLedgerBudgets.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(projectLedgerBudgets)
      .values({ projectId, projectValue })
      .returning();
    return created;
  }

  async getProjectLedgerEntries(projectId: number): Promise<ProjectLedgerEntry[]> {
    return await db
      .select()
      .from(projectLedgerEntries)
      .where(eq(projectLedgerEntries.projectId, projectId))
      .orderBy(desc(projectLedgerEntries.id));
  }

  async createProjectLedgerEntry(entry: InsertProjectLedgerEntry): Promise<ProjectLedgerEntry> {
    const [created] = await db.insert(projectLedgerEntries).values(entry).returning();
    return created;
  }

  async updateProjectLedgerEntry(id: number, updates: Partial<InsertProjectLedgerEntry>): Promise<ProjectLedgerEntry | undefined> {
    const [updated] = await db.update(projectLedgerEntries).set(updates).where(eq(projectLedgerEntries.id, id)).returning();
    return updated;
  }

  async deleteProjectLedgerEntry(id: number): Promise<boolean> {
    const result = await db.delete(projectLedgerEntries).where(eq(projectLedgerEntries.id, id)).returning();
    return result.length > 0;
  }

  async deleteProjectLedgerEntriesByProjectId(projectId: number): Promise<boolean> {
    const result = await db.delete(projectLedgerEntries).where(eq(projectLedgerEntries.projectId, projectId)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
