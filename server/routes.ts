import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, hashPassword } from "./auth";
import { User } from "@shared/schema";
import tls from "tls";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

  // Client routes
  app.get(api.clients.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const clients = await storage.getClients();
    res.json(clients);
  });

  app.get(api.clients.get.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const client = await storage.getClient(Number(req.params.id));
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.json(client);
  });

  app.post(api.clients.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient({
        ...input,
        gstNo: input.gstNo ?? "",
        contactPerson: input.contactPerson ?? "",
        mobileNumber: input.mobileNumber ?? "",
        emailAddress: input.emailAddress ?? "",
      });
      res.status(201).json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.clients.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.clients.update.input.parse(req.body);
      const client = await storage.updateClient(Number(req.params.id), input);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.clients.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deleted = await storage.deleteClient(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(204).send();
  });

  // Project routes
  app.get(api.projects.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get(api.projects.get.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const project = await storage.getProject(Number(req.params.id));
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  });

  app.post(api.projects.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject(input);
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.projects.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.projects.update.input.parse(req.body);
      const project = await storage.updateProject(Number(req.params.id), input);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.projects.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deleted = await storage.deleteProject(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(204).send();
  });

  // Ledger routes
  app.get(api.ledger.getBudget.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const budget = await storage.getProjectLedgerBudget(Number(req.params.projectId));
    res.json(budget || null);
  });

  app.put(api.ledger.upsertBudget.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.ledger.upsertBudget.input.parse(req.body);
      const budget = await storage.upsertProjectLedgerBudget(Number(req.params.projectId), input.projectValue);
      res.json(budget);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.get(api.ledger.listEntries.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const entries = await storage.getProjectLedgerEntries(Number(req.params.projectId));
    res.json(entries);
  });

  app.post(api.ledger.createEntry.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.ledger.createEntry.input.parse(req.body);
      const entry = await storage.createProjectLedgerEntry({
        ...input,
        projectId: Number(req.params.projectId),
      });
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.ledger.updateEntry.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.ledger.updateEntry.input.parse(req.body);
      const entry = await storage.updateProjectLedgerEntry(Number(req.params.id), input);
      if (!entry) {
        return res.status(404).json({ message: "Ledger entry not found" });
      }
      res.json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.ledger.deleteEntry.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deleted = await storage.deleteProjectLedgerEntry(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Ledger entry not found" });
    }
    res.status(204).send();
  });

  // Quotation routes
  app.get(api.quotations.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const quotations = await storage.getQuotations();
    res.json(quotations);
  });

  app.get(api.quotations.get.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const quotation = await storage.getQuotation(Number(req.params.id));
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.json(quotation);
  });

  app.get(api.quotations.getByProject.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const quotation = await storage.getQuotationByProjectId(Number(req.params.projectId));
    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found for this project" });
    }
    res.json(quotation);
  });

  app.post(api.quotations.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.quotations.create.input.parse(req.body);
      const quotation = await storage.createQuotation(input);
      res.status(201).json(quotation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.quotations.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.quotations.update.input.parse(req.body);
      const quotation = await storage.updateQuotation(Number(req.params.id), input);
      if (!quotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }
      res.json(quotation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.quotations.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    // First delete all items associated with this quotation
    await storage.deleteQuotationItemsByQuotationId(Number(req.params.id));
    const deleted = await storage.deleteQuotation(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Quotation not found" });
    }
    res.status(204).send();
  });

  // Duplicate quotation
  app.post("/api/quotations/:id/duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const originalQuotation = await storage.getQuotation(Number(req.params.id));
      if (!originalQuotation) {
        return res.status(404).json({ message: "Quotation not found" });
      }

      // Get all versions of this quotation to determine next version number
      const allVersions = await storage.getQuotationVersions(originalQuotation.projectId);
      const nextVersion = allVersions.length + 1;
      const nextRevision = `R-${String(nextVersion).padStart(3, '0')}`;
      
      // Set enquiry number to match revision (R-002 = 002, R-003 = 003)
      let nextEnquiryNumber = originalQuotation.enquiryNumber;
      if (nextEnquiryNumber) {
        const match = nextEnquiryNumber.match(/^(.*)(\d{3})$/);
        if (match) {
          const prefix = match[1];
          nextEnquiryNumber = `${prefix}${String(nextVersion).padStart(3, '0')}`;
        }
      }

      // Create new quotation as duplicate
      const newQuotation = await storage.createQuotation({
        projectId: originalQuotation.projectId,
        quotationNumber: originalQuotation.quotationNumber,
        revision: nextRevision,
        version: nextVersion,
        parentQuotationId: originalQuotation.id,
        enquiryNumber: nextEnquiryNumber,
        subject: originalQuotation.subject,
        contactName: originalQuotation.contactName,
        contactMobile: originalQuotation.contactMobile,
        contactEmail: originalQuotation.contactEmail,
        buildingDescription: originalQuotation.buildingDescription,
        buildingArea: originalQuotation.buildingArea,
        frameType: originalQuotation.frameType,
        length: originalQuotation.length,
        width: originalQuotation.width,
        clearHeight: originalQuotation.clearHeight,
        roofSlope: originalQuotation.roofSlope,
        paymentTerms: originalQuotation.paymentTerms,
        notes: originalQuotation.notes,
        contentSections: originalQuotation.contentSections,
      });

      // Duplicate all items
      const originalItems = await storage.getQuotationItems(originalQuotation.id);
      for (const item of originalItems) {
        await storage.createQuotationItem({
          quotationId: newQuotation.id,
          serialNo: item.serialNo,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
          remarks: item.remarks,
        });
      }

      res.status(201).json(newQuotation);
    } catch (err) {
      console.error("Duplicate error:", err);
      res.status(500).json({ message: "Failed to duplicate quotation" });
    }
  });

  app.post("/api/quotations/:id/send-email", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = z.object({
        to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
        subject: z.string().min(1),
        message: z.string().min(1),
        fileName: z.string().min(1),
        pdfBase64: z.string().min(1),
      }).parse(req.body);

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || smtpUser;

      if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
        return res.status(500).json({
          message: "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.",
        });
      }

      const sendWithBareSmtp = async () => {
        if (smtpPort !== 465) {
          throw new Error("Built-in SMTP sender currently supports SSL SMTP on port 465 only.");
        }

        const recipients = Array.isArray(input.to) ? input.to : [input.to];
        const socket = tls.connect({
          host: smtpHost,
          port: smtpPort,
          rejectUnauthorized: false,
        });

        const readResponse = () =>
          new Promise<string>((resolve, reject) => {
            const onData = (buf: Buffer) => {
              const text = buf.toString("utf8");
              const lines = text.split(/\r?\n/).filter(Boolean);
              const last = lines[lines.length - 1] || "";
              const code = Number(last.slice(0, 3));
              const isMultiline = last.length >= 4 && last[3] === "-";
              if (Number.isFinite(code) && !isMultiline) {
                cleanup();
                if (code >= 400) {
                  reject(new Error(text.trim()));
                } else {
                  resolve(text);
                }
              }
            };
            const onError = (err: Error) => {
              cleanup();
              reject(err);
            };
            const cleanup = () => {
              socket.off("data", onData);
              socket.off("error", onError);
            };
            socket.on("data", onData);
            socket.on("error", onError);
          });

        const sendCmd = async (cmd: string) => {
          socket.write(`${cmd}\r\n`);
          await readResponse();
        };

        const base64 = (v: string) => Buffer.from(v, "utf8").toString("base64");
        const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        const wrap76 = (value: string) => value.replace(/(.{1,76})/g, "$1\r\n").trim();
        const safeText = input.message.replace(/\r?\n/g, "\r\n");
        const attachmentBase64 = wrap76(input.pdfBase64);
        const messageData =
          [
            `From: ${smtpFrom}`,
            `To: ${recipients.join(", ")}`,
            `Subject: ${input.subject}`,
            "MIME-Version: 1.0",
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            'Content-Type: text/plain; charset="utf-8"',
            "Content-Transfer-Encoding: 7bit",
            "",
            safeText,
            "",
            `--${boundary}`,
            `Content-Type: application/pdf; name="${input.fileName}"`,
            "Content-Transfer-Encoding: base64",
            `Content-Disposition: attachment; filename="${input.fileName}"`,
            "",
            attachmentBase64,
            "",
            `--${boundary}--`,
          ]
            .join("\r\n")
            .replace(/\n\./g, "\n..");

        await new Promise<void>((resolve, reject) => {
          socket.once("secureConnect", () => resolve());
          socket.once("error", reject);
        });
        await readResponse(); // 220
        await sendCmd("EHLO localhost");
        await sendCmd("AUTH LOGIN");
        await sendCmd(base64(smtpUser));
        await sendCmd(base64(smtpPass));
        await sendCmd(`MAIL FROM:<${smtpFrom}>`);
        for (const rcpt of recipients) {
          await sendCmd(`RCPT TO:<${rcpt}>`);
        }
        await sendCmd("DATA");
        socket.write(`${messageData}\r\n.\r\n`);
        await readResponse();
        await sendCmd("QUIT");
        socket.end();
      };

      let deliveryInfo: {
        accepted?: string[];
        rejected?: string[];
        response?: string;
        messageId?: string;
      } = {};

      try {
        const moduleName = "nodemailer";
        const nodemailerModule: any = await import(moduleName);
        const nodemailer = nodemailerModule?.default || nodemailerModule;
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        const result = await transporter.sendMail({
          from: smtpFrom,
          to: input.to,
          subject: input.subject,
          text: input.message,
          attachments: [
            {
              filename: input.fileName,
              content: Buffer.from(input.pdfBase64, "base64"),
              contentType: "application/pdf",
            },
          ],
        });
        deliveryInfo = {
          accepted: Array.isArray(result.accepted) ? result.accepted : [],
          rejected: Array.isArray(result.rejected) ? result.rejected : [],
          response: typeof result.response === "string" ? result.response : undefined,
          messageId: typeof result.messageId === "string" ? result.messageId : undefined,
        };

        if (!deliveryInfo.accepted || deliveryInfo.accepted.length === 0) {
          return res.status(502).json({
            message: `SMTP did not accept any recipient. ${deliveryInfo.response || ""}`.trim(),
          });
        }
      } catch (mailErr: any) {
        const isMissingMailer =
          mailErr?.code === "ERR_MODULE_NOT_FOUND" ||
          mailErr?.code === "MODULE_NOT_FOUND" ||
          String(mailErr?.message || "").toLowerCase().includes("nodemailer");
        if (!isMissingMailer) throw mailErr;

        await sendWithBareSmtp();
        deliveryInfo = {
          accepted: Array.isArray(input.to) ? input.to : [input.to],
        };
      }

      res.status(200).json({
        message: "Email queued successfully",
        accepted: deliveryInfo.accepted || [],
        rejected: deliveryInfo.rejected || [],
        smtpResponse: deliveryInfo.response,
        messageId: deliveryInfo.messageId,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      console.error("Send quotation email error:", err);
      return res.status(500).json({ message: "Failed to send quotation email" });
    }
  });

  app.post("/api/quotations/:id/send-whatsapp", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = z
        .object({
          to: z.string().min(7),
          message: z.string().min(1),
          fileName: z.string().min(1),
          pdfBase64: z.string().min(1),
        })
        .parse(req.body);

      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const apiVersion = process.env.WHATSAPP_API_VERSION || "v20.0";

      if (!accessToken || !phoneNumberId) {
        return res.status(500).json({
          message:
            "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.",
        });
      }

      const recipient = input.to.replace(/\D/g, "");
      const normalizedRecipient =
        recipient.length === 10 ? `91${recipient}` : recipient;
      if (!normalizedRecipient) {
        return res.status(400).json({ message: "Invalid recipient mobile number." });
      }

      const baseUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;
      const pdfBuffer = Buffer.from(input.pdfBase64, "base64");
      const boundary = `----whatsappFormBoundary${Date.now().toString(16)}`;
      const multipartBody = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`,
          "utf8",
        ),
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\napplication/pdf\r\n`,
          "utf8",
        ),
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${input.fileName.replace(/"/g, "")}"\r\nContent-Type: application/pdf\r\n\r\n`,
          "utf8",
        ),
        pdfBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`, "utf8"),
      ]);

      const mediaUploadResponse = await fetch(`${baseUrl}/media`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      const mediaUploadText = await mediaUploadResponse.text();
      const mediaUploadJson = (() => {
        try {
          return JSON.parse(mediaUploadText);
        } catch {
          return null;
        }
      })();

      if (!mediaUploadResponse.ok || !mediaUploadJson?.id) {
        return res.status(502).json({
          message: "Failed to upload PDF for WhatsApp send.",
          providerResponse: mediaUploadJson || mediaUploadText,
        });
      }

      if (input.message.trim()) {
        const textResponse = await fetch(`${baseUrl}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: normalizedRecipient,
            type: "text",
            text: { body: input.message.trim() },
          }),
        });

        if (!textResponse.ok) {
          const textPayload = await textResponse.text();
          return res.status(502).json({
            message: "Failed to send WhatsApp text message.",
            providerResponse: (() => {
              try {
                return JSON.parse(textPayload);
              } catch {
                return textPayload;
              }
            })(),
          });
        }
      }

      const docResponse = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedRecipient,
          type: "document",
          document: {
            id: mediaUploadJson.id,
            filename: input.fileName,
            caption: "Quotation PDF",
          },
        }),
      });

      const docText = await docResponse.text();
      const docPayload = (() => {
        try {
          return JSON.parse(docText);
        } catch {
          return null;
        }
      })();

      if (!docResponse.ok) {
        return res.status(502).json({
          message: "Failed to send WhatsApp document.",
          providerResponse: docPayload || docText,
        });
      }

      return res.status(200).json({
        message: "WhatsApp message sent successfully",
        to: normalizedRecipient,
        mediaId: mediaUploadJson.id,
        providerResponse: docPayload || docText,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      console.error("Send quotation whatsapp error:", err);
      return res.status(500).json({ message: "Failed to send quotation on WhatsApp" });
    }
  });

  // Get quotation versions
  app.get("/api/projects/:projectId/quotation-versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const versions = await storage.getQuotationVersions(Number(req.params.projectId));
    res.json(versions);
  });

  // Quotation Items routes
  app.get(api.quotationItems.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getQuotationItems(Number(req.params.quotationId));
    res.json(items);
  });

  app.post(api.quotationItems.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.quotationItems.create.input.parse(req.body);
      const item = await storage.createQuotationItem({
        ...input,
        quotationId: Number(req.params.quotationId),
      });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.quotationItems.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.quotationItems.update.input.parse(req.body);
      const item = await storage.updateQuotationItem(Number(req.params.id), input);
      if (!item) {
        return res.status(404).json({ message: "Quotation item not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.quotationItems.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deleted = await storage.deleteQuotationItem(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Quotation item not found" });
    }
    res.status(204).send();
  });

  // Public branding endpoint (for login page)
  app.get("/api/branding/public", async (req, res) => {
    let brandingData = await storage.getBranding();
    if (!brandingData) {
      return res.json({ logoUrl: null, entityName: null });
    }
    res.json({ 
      logoUrl: brandingData.logoUrl, 
      entityName: brandingData.entityName 
    });
  });

  // Branding routes
  app.get(api.branding.get.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    let brandingData = await storage.getBranding();
    if (!brandingData) {
      // Create default branding if it doesn't exist
      brandingData = await storage.createBranding({
        logoUrl: "https://reviranexgen.com/assets/logo-with-name.png",
        headerUrl: "https://reviranexgen.com/assets/header.jpg",
        footerUrl: "https://reviranexgen.com/assets/footer.jpg",
        stampUrl: "https://reviranexgen.com/assets/stamp.png",
        storeKeeperSignUrl: "",
        qcEnggSignUrl: "",
        storeInchargeSignUrl: "",
        plantHeadSignUrl: "",
        primaryColor: "#da2032",
        secondaryColor: "#2f3591",
        entityName: "Revira NexGen Structure Pvt. Ltd.",
        cin: "U16222DL2025PTC459465",
        companyGstin: "07AAPCR3026H1ZA",
        website: "www.reviranexgen.com",
        email: "info@reviranexgen.com",
        headOfficeAddress: "28, E2 Block, Shivram Park Nangloi Delhi - 110041",
        workshopAddress: "Flat No. 302, 3rd Floor Rajat Residency, Subharambha Society Near Toll Naka, Dabha, Nagpur 440023",
      });
    }
    res.json(brandingData);
  });

  app.put(api.branding.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.branding.update.input.parse(req.body);
      let brandingData = await storage.getBranding();
      if (!brandingData) {
        // Create branding if it doesn't exist
        brandingData = await storage.createBranding({
          logoUrl: input.logoUrl || "https://reviranexgen.com/assets/logo-with-name.png",
          headerUrl: input.headerUrl || "https://reviranexgen.com/assets/header.jpg",
          footerUrl: input.footerUrl || "https://reviranexgen.com/assets/footer.jpg",
          stampUrl: input.stampUrl || "https://reviranexgen.com/assets/stamp.png",
          storeKeeperSignUrl: input.storeKeeperSignUrl || "",
          qcEnggSignUrl: input.qcEnggSignUrl || "",
          storeInchargeSignUrl: input.storeInchargeSignUrl || "",
          plantHeadSignUrl: input.plantHeadSignUrl || "",
          primaryColor: input.primaryColor || "#da2032",
          secondaryColor: input.secondaryColor || "#2f3591",
          entityName: input.entityName || "Revira NexGen Structure Pvt. Ltd.",
          cin: input.cin || "U16222DL2025PTC459465",
          companyGstin: input.companyGstin || "07AAPCR3026H1ZA",
          website: input.website || "www.reviranexgen.com",
          email: input.email || "info@reviranexgen.com",
          headOfficeAddress: input.headOfficeAddress || "28, E2 Block, Shivram Park Nangloi Delhi - 110041",
          workshopAddress: input.workshopAddress || "Flat No. 302, 3rd Floor Rajat Residency, Subharambha Society Near Toll Naka, Dabha, Nagpur 440023",
        });
        return res.json(brandingData);
      }
      const updated = await storage.updateBranding(brandingData.id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  // Invoice routes
  app.get(api.invoices.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const invoicesList = await storage.getInvoices();
    res.json(invoicesList);
  });

  app.get(api.invoices.get.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const invoice = await storage.getInvoice(Number(req.params.id));
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.json(invoice);
  });

  app.get(api.invoices.getByProject.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const invoice = await storage.getInvoiceByProjectId(Number(req.params.projectId));
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found for this project" });
    }
    res.json(invoice);
  });

  app.post(api.invoices.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.invoices.create.input.parse(req.body);
      const invoice = await storage.createInvoice(input);
      res.status(201).json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.invoices.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.invoices.update.input.parse(req.body);
      const invoice = await storage.updateInvoice(Number(req.params.id), input);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.invoices.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteInvoiceItemsByInvoiceId(Number(req.params.id));
    const deleted = await storage.deleteInvoice(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    res.status(204).send();
  });

  // Duplicate invoice
  app.post("/api/invoices/:id/duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const originalInvoice = await storage.getInvoice(Number(req.params.id));
      if (!originalInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const allVersions = await storage.getInvoiceVersions(originalInvoice.projectId);
      const nextVersion = allVersions.length + 1;
      const nextRevision = `R-${String(nextVersion).padStart(3, '0')}`;

      const newInvoice = await storage.createInvoice({
        projectId: originalInvoice.projectId,
        invoiceNumber: originalInvoice.invoiceNumber,
        revision: nextRevision,
        version: nextVersion,
        parentInvoiceId: originalInvoice.id,
        organisationName: originalInvoice.organisationName,
        registeredAddress: originalInvoice.registeredAddress,
        consigneeAddress: originalInvoice.consigneeAddress,
        clientGstin: originalInvoice.clientGstin,
        workOrderNo: originalInvoice.workOrderNo,
        dispatchDetails: originalInvoice.dispatchDetails,
        cgstRate: originalInvoice.cgstRate,
        sgstRate: originalInvoice.sgstRate,
        igstRate: originalInvoice.igstRate,
        appliedTaxType: originalInvoice.appliedTaxType,
        totalAmount: originalInvoice.totalAmount,
        totalTax: originalInvoice.totalTax,
        grandTotal: originalInvoice.grandTotal,
        contentSections: originalInvoice.contentSections,
      });

      const originalItems = await storage.getInvoiceItems(originalInvoice.id);
      for (const item of originalItems) {
        await storage.createInvoiceItem({
          invoiceId: newInvoice.id,
          serialNo: item.serialNo,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unit: item.unit,
          ratePerUnit: item.ratePerUnit,
          percentage: item.percentage,
          amount: item.amount,
          remarks: item.remarks,
        });
      }

      res.status(201).json(newInvoice);
    } catch (err) {
      console.error("Duplicate invoice error:", err);
      res.status(500).json({ message: "Failed to duplicate invoice" });
    }
  });

  // Get invoice versions
  app.get("/api/projects/:projectId/invoice-versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const versions = await storage.getInvoiceVersions(Number(req.params.projectId));
    res.json(versions);
  });

  // Invoice Items routes
  app.get(api.invoiceItems.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getInvoiceItems(Number(req.params.invoiceId));
    res.json(items);
  });

  app.post(api.invoiceItems.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.invoiceItems.create.input.parse(req.body);
      const item = await storage.createInvoiceItem({
        ...input,
        invoiceId: Number(req.params.invoiceId),
      });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.invoiceItems.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.invoiceItems.update.input.parse(req.body);
      const item = await storage.updateInvoiceItem(Number(req.params.id), input);
      if (!item) {
        return res.status(404).json({ message: "Invoice item not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.invoiceItems.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deleted = await storage.deleteInvoiceItem(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Invoice item not found" });
    }
    res.status(204).send();
  });

  // Gate Pass routes
  app.get(api.gatePasses.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const gatePassesList = await storage.getGatePasses();
    res.json(gatePassesList);
  });

  app.get(api.gatePasses.get.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const gatePass = await storage.getGatePass(Number(req.params.id));
    if (!gatePass) {
      return res.status(404).json({ message: "Gate pass not found" });
    }
    res.json(gatePass);
  });

  app.get(api.gatePasses.getByProject.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const gatePass = await storage.getGatePassByProjectId(Number(req.params.projectId));
    if (!gatePass) {
      return res.status(404).json({ message: "Gate pass not found" });
    }
    res.json(gatePass);
  });

  app.post(api.gatePasses.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.gatePasses.create.input.parse(req.body);
      const gatePass = await storage.createGatePass(input);
      res.status(201).json(gatePass);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.gatePasses.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.gatePasses.update.input.parse(req.body);
      const gatePass = await storage.updateGatePass(Number(req.params.id), input);
      if (!gatePass) {
        return res.status(404).json({ message: "Gate pass not found" });
      }
      res.json(gatePass);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.gatePasses.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteGatePassItemsByGatePassId(Number(req.params.id));
    const deleted = await storage.deleteGatePass(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Gate pass not found" });
    }
    res.status(204).send();
  });

  // Duplicate gate pass
  app.post("/api/gate-passes/:id/duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const originalGatePass = await storage.getGatePass(Number(req.params.id));
      if (!originalGatePass) {
        return res.status(404).json({ message: "Gate pass not found" });
      }

      const allVersions = await storage.getGatePassVersions(originalGatePass.projectId);
      const nextVersion = allVersions.length + 1;
      const nextRevision = `R-${String(nextVersion).padStart(3, '0')}`;

      const newGatePass = await storage.createGatePass({
        projectId: originalGatePass.projectId,
        gatePassNumber: originalGatePass.gatePassNumber,
        revision: nextRevision,
        version: nextVersion,
        parentGatePassId: originalGatePass.id,
        organisationName: originalGatePass.organisationName,
        registeredAddress: originalGatePass.registeredAddress,
        consigneeAddress: originalGatePass.consigneeAddress,
        clientGstin: originalGatePass.clientGstin,
        workOrderNo: originalGatePass.workOrderNo,
        dispatchDetails: originalGatePass.dispatchDetails,
        cgstRate: originalGatePass.cgstRate,
        sgstRate: originalGatePass.sgstRate,
        igstRate: originalGatePass.igstRate,
        appliedTaxType: originalGatePass.appliedTaxType,
        totalAmount: originalGatePass.totalAmount,
        totalTax: originalGatePass.totalTax,
        grandTotal: originalGatePass.grandTotal,
        contentSections: originalGatePass.contentSections,
      });

      const originalItems = await storage.getGatePassItems(originalGatePass.id);
      for (const item of originalItems) {
        await storage.createGatePassItem({
          gatePassId: newGatePass.id,
          serialNo: item.serialNo,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unit: item.unit,
          ratePerUnit: item.ratePerUnit,
          percentage: item.percentage,
          amount: item.amount,
          remarks: item.remarks,
        });
      }

      res.status(201).json(newGatePass);
    } catch (err) {
      console.error("Duplicate gate pass error:", err);
      res.status(500).json({ message: "Failed to duplicate gate pass" });
    }
  });

  // Get gate pass versions
  app.get("/api/projects/:projectId/gate-pass-versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const versions = await storage.getGatePassVersions(Number(req.params.projectId));
    res.json(versions);
  });

  // Gate Pass Items routes
  app.get(api.gatePassItems.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getGatePassItems(Number(req.params.gatePassId));
    res.json(items);
  });

  app.post(api.gatePassItems.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.gatePassItems.create.input.parse(req.body);
      const item = await storage.createGatePassItem({
        ...input,
        gatePassId: Number(req.params.gatePassId),
      });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.gatePassItems.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.gatePassItems.update.input.parse(req.body);
      const item = await storage.updateGatePassItem(Number(req.params.id), input);
      if (!item) {
        return res.status(404).json({ message: "Gate pass item not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.gatePassItems.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deleted = await storage.deleteGatePassItem(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Gate pass item not found" });
    }
    res.status(204).send();
  });

  // Delivery Challan routes
  app.get(api.deliveryChallans.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deliveryChallansList = await storage.getDeliveryChallans();
    res.json(deliveryChallansList);
  });

  app.get(api.deliveryChallans.get.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deliveryChallan = await storage.getDeliveryChallan(Number(req.params.id));
    if (!deliveryChallan) {
      return res.status(404).json({ message: "Delivery challan not found" });
    }
    res.json(deliveryChallan);
  });

  app.get(api.deliveryChallans.getByProject.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deliveryChallan = await storage.getDeliveryChallanByProjectId(Number(req.params.projectId));
    if (!deliveryChallan) {
      return res.status(404).json({ message: "Delivery challan not found" });
    }
    res.json(deliveryChallan);
  });

  app.post(api.deliveryChallans.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.deliveryChallans.create.input.parse(req.body);
      const deliveryChallan = await storage.createDeliveryChallan(input);
      res.status(201).json(deliveryChallan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.deliveryChallans.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.deliveryChallans.update.input.parse(req.body);
      const deliveryChallan = await storage.updateDeliveryChallan(Number(req.params.id), input);
      if (!deliveryChallan) {
        return res.status(404).json({ message: "Delivery challan not found" });
      }
      res.json(deliveryChallan);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.deliveryChallans.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteDeliveryChallanItemsByDeliveryChallanId(Number(req.params.id));
    const deleted = await storage.deleteDeliveryChallan(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Delivery challan not found" });
    }
    res.status(204).send();
  });

  // Duplicate delivery challan
  app.post("/api/delivery-challans/:id/duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const originalDeliveryChallan = await storage.getDeliveryChallan(Number(req.params.id));
      if (!originalDeliveryChallan) {
        return res.status(404).json({ message: "Delivery challan not found" });
      }

      const allVersions = await storage.getDeliveryChallanVersions(originalDeliveryChallan.projectId);
      const nextVersion = allVersions.length + 1;
      const nextRevision = `R-${String(nextVersion).padStart(3, '0')}`;

      const newDeliveryChallan = await storage.createDeliveryChallan({
        projectId: originalDeliveryChallan.projectId,
        deliveryChallanNumber: originalDeliveryChallan.deliveryChallanNumber,
        revision: nextRevision,
        version: nextVersion,
        parentDeliveryChallanId: originalDeliveryChallan.id,
        organisationName: originalDeliveryChallan.organisationName,
        registeredAddress: originalDeliveryChallan.registeredAddress,
        consigneeAddress: originalDeliveryChallan.consigneeAddress,
        clientGstin: originalDeliveryChallan.clientGstin,
        workOrderNo: originalDeliveryChallan.workOrderNo,
        dispatchDetails: originalDeliveryChallan.dispatchDetails,
        cgstRate: originalDeliveryChallan.cgstRate,
        sgstRate: originalDeliveryChallan.sgstRate,
        igstRate: originalDeliveryChallan.igstRate,
        appliedTaxType: originalDeliveryChallan.appliedTaxType,
        totalAmount: originalDeliveryChallan.totalAmount,
        totalTax: originalDeliveryChallan.totalTax,
        grandTotal: originalDeliveryChallan.grandTotal,
        contentSections: originalDeliveryChallan.contentSections,
      });

      const originalItems = await storage.getDeliveryChallanItems(originalDeliveryChallan.id);
      for (const item of originalItems) {
        await storage.createDeliveryChallanItem({
          deliveryChallanId: newDeliveryChallan.id,
          serialNo: item.serialNo,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          unit: item.unit,
          ratePerUnit: item.ratePerUnit,
          percentage: item.percentage,
          amount: item.amount,
          remarks: item.remarks,
        });
      }

      res.status(201).json(newDeliveryChallan);
    } catch (err) {
      console.error("Duplicate delivery challan error:", err);
      res.status(500).json({ message: "Failed to duplicate delivery challan" });
    }
  });

  // Get delivery challan versions
  app.get("/api/projects/:projectId/delivery-challan-versions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const versions = await storage.getDeliveryChallanVersions(Number(req.params.projectId));
    res.json(versions);
  });

  // Delivery Challan Items routes
  app.get(api.deliveryChallanItems.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const items = await storage.getDeliveryChallanItems(Number(req.params.deliveryChallanId));
    res.json(items);
  });

  app.post(api.deliveryChallanItems.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.deliveryChallanItems.create.input.parse(req.body);
      const item = await storage.createDeliveryChallanItem({
        ...input,
        deliveryChallanId: Number(req.params.deliveryChallanId),
      });
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.deliveryChallanItems.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const input = api.deliveryChallanItems.update.input.parse(req.body);
      const item = await storage.updateDeliveryChallanItem(Number(req.params.id), input);
      if (!item) {
        return res.status(404).json({ message: "Delivery challan item not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.deliveryChallanItems.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const deleted = await storage.deleteDeliveryChallanItem(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: "Delivery challan item not found" });
    }
    res.status(204).send();
  });

  // User management routes
  app.get(api.users.list.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const users = await storage.getUsers();
    // Remove passwords from response
    const sanitizedUsers = users.map(u => ({ ...u, password: undefined }));
    res.json(sanitizedUsers);
  });

  app.get(api.users.get.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(Number(req.params.id));
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Remove password from response
    const { password, ...sanitizedUser } = user;
    res.json(sanitizedUser);
  });

  app.post(api.users.create.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    // Check if current user is Administrator
    const currentUser = req.user as User;
    if (currentUser.role !== "Administrator") {
      return res.status(403).json({ message: "Only administrators can create users" });
    }
    
    try {
      const { assignedClientIds, ...input } = api.users.create.input.parse(req.body);
      
      // Hash the password
      const hashedPassword = await hashPassword(input.password);
      
      // Create user with email same as username if not provided
      const user = await storage.createUser({
        ...input,
        password: hashedPassword,
        email: input.email || input.username,
      });
      
      // Set client assignments for Standard users
      if (input.role === "Standard" && assignedClientIds && assignedClientIds.length > 0) {
        await storage.setUserClientAssignments(user.id, assignedClientIds);
      }
      
      const { password, ...sanitizedUser } = user;
      res.status(201).json(sanitizedUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.put(api.users.update.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    // Check if current user is Administrator
    const currentUser = req.user as User;
    if (currentUser.role !== "Administrator") {
      return res.status(403).json({ message: "Only administrators can update users" });
    }
    
    try {
      const { assignedClientIds, ...input } = api.users.update.input.parse(req.body);
      
      // Hash password if provided
      const updates: any = { ...input };
      if (input.password) {
        updates.password = await hashPassword(input.password);
      }
      
      const user = await storage.updateUser(Number(req.params.id), updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update client assignments if provided
      if (assignedClientIds !== undefined) {
        await storage.setUserClientAssignments(user.id, assignedClientIds);
      }
      
      const { password, ...sanitizedUser } = user;
      res.json(sanitizedUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
        });
      }
      throw err;
    }
  });

  app.delete(api.users.delete.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    // Check if current user is Administrator
    const currentUser = req.user as User;
    if (currentUser.role !== "Administrator") {
      return res.status(403).json({ message: "Only administrators can delete users" });
    }
    
    // Prevent deleting yourself
    const userId = Number(req.params.id);
    if (userId === currentUser.id) {
      return res.status(403).json({ message: "Cannot delete your own account" });
    }
    
    const deleted = await storage.deleteUser(userId);
    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(204).send();
  });

  app.get(api.users.getClientAssignments.path.replace("/revira",""), async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const assignments = await storage.getUserClientAssignments(Number(req.params.id));
    const clientIds = assignments.map(a => a.clientId);
    res.json(clientIds);
  });

  return httpServer;
}
