import { db } from "../server/db";
import { users, clients, projects, quotations, quotationItems, invoices, invoiceItems, branding, userClientAssignments } from "../shared/schema";
import * as fs from "fs";
import * as path from "path";

async function exportData() {
  const dataDir = path.join(process.cwd(), "data");
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log("Exporting database data to data folder...\n");

  try {
    const usersData = await db.select().from(users);
    fs.writeFileSync(path.join(dataDir, "users.json"), JSON.stringify(usersData, null, 2));
    console.log(`✓ Exported ${usersData.length} users`);

    const clientsData = await db.select().from(clients);
    fs.writeFileSync(path.join(dataDir, "clients.json"), JSON.stringify(clientsData, null, 2));
    console.log(`✓ Exported ${clientsData.length} clients`);

    const projectsData = await db.select().from(projects);
    fs.writeFileSync(path.join(dataDir, "projects.json"), JSON.stringify(projectsData, null, 2));
    console.log(`✓ Exported ${projectsData.length} projects`);

    const quotationsData = await db.select().from(quotations);
    fs.writeFileSync(path.join(dataDir, "quotations.json"), JSON.stringify(quotationsData, null, 2));
    console.log(`✓ Exported ${quotationsData.length} quotations`);

    const quotationItemsData = await db.select().from(quotationItems);
    fs.writeFileSync(path.join(dataDir, "quotation_items.json"), JSON.stringify(quotationItemsData, null, 2));
    console.log(`✓ Exported ${quotationItemsData.length} quotation items`);

    const invoicesData = await db.select().from(invoices);
    fs.writeFileSync(path.join(dataDir, "invoices.json"), JSON.stringify(invoicesData, null, 2));
    console.log(`✓ Exported ${invoicesData.length} invoices`);

    const invoiceItemsData = await db.select().from(invoiceItems);
    fs.writeFileSync(path.join(dataDir, "invoice_items.json"), JSON.stringify(invoiceItemsData, null, 2));
    console.log(`✓ Exported ${invoiceItemsData.length} invoice items`);

    const brandingData = await db.select().from(branding);
    fs.writeFileSync(path.join(dataDir, "branding.json"), JSON.stringify(brandingData, null, 2));
    console.log(`✓ Exported ${brandingData.length} branding records`);

    const userClientAssignmentsData = await db.select().from(userClientAssignments);
    fs.writeFileSync(path.join(dataDir, "user_client_assignments.json"), JSON.stringify(userClientAssignmentsData, null, 2));
    console.log(`✓ Exported ${userClientAssignmentsData.length} user-client assignments`);

    console.log("\n✅ All data exported successfully to the 'data' folder!");
    console.log("You can now download the project with all database data included.");
    
  } catch (error) {
    console.error("Error exporting data:", error);
    process.exit(1);
  }

  process.exit(0);
}

exportData();
