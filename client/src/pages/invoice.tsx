import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, FileText, Download, Trash2, Copy, Eye, Plus, X, MapPin, Mail, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import type { Project, Client, Invoice, InvoiceItem, Branding } from "@shared/schema";
import jsPDF from "jspdf";

interface InvoiceLineItem {
  id: number;
  serialNo: number;
  description: string;
  hsnCode: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  percentage: number;
  amount: number;
  remarks: string;
}

type InvoiceType = "PROFORMA INVOICE" | "TAX INVOICE";

interface InvoiceContentSectionsData {
  invoiceType?: InvoiceType;
  orderReferenceType?: "wo" | "po";
  showWorkOrderNo?: boolean;
  showPurchaseOrderNo?: boolean;
  purchaseOrderNo?: string;
  vehicleNo?: string;
  showDispatchLrNo?: boolean;
  showDispatchPo?: boolean;
  showDispatchGatePass?: boolean;
  dispatchLrNo?: string;
  dispatchPoNo?: string;
  dispatchGatePass?: string;
}

export default function InvoicePage() {
  const params = useParams<{ id: string; invoiceId?: string }>();
  const projectId = params.id;
  const invoiceId = params.invoiceId;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: "",
    subject: "",
    message: "",
  });
  const [whatsAppForm, setWhatsAppForm] = useState({
    mobile: "",
    message: "",
  });

  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: "",
    revision: "R-001",
    invoiceType: "PROFORMA INVOICE" as InvoiceType,
    organisationName: "",
    registeredAddress: "",
    consigneeAddress: "",
    clientGstin: "",
    workOrderNo: "NIL",
    orderReferenceType: "wo" as "wo" | "po",
    purchaseOrderNo: "",
    dispatchDetails: "-",
    vehicleNo: "",
    showDispatchLrNo: false,
    showDispatchPo: false,
    showDispatchGatePass: false,
    dispatchLrNo: "",
    dispatchPoNo: "",
    dispatchGatePass: "",
    appliedTaxType: "igst" as "cgst_sgst" | "igst",
    cgstRate: "9",
    sgstRate: "9",
    igstRate: "18",
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { id: 1, serialNo: 1, description: "", hsnCode: "940610", quantity: 1, unit: "LS", ratePerUnit: 0, percentage: 0, amount: 0, remarks: "" }
  ]);

  const { data: user } = useUser();

  const { data: project } = useQuery<Project>({
    queryKey: ["/revira/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/revira/api/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/revira/api/clients", project?.clientId],
    queryFn: async () => {
      const res = await fetch(`/revira/api/clients/${project?.clientId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch client");
      return res.json();
    },
    enabled: !!project?.clientId,
  });

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/revira/api/branding"],
    enabled: !!user,
  });

  const { data: existingInvoice } = useQuery<Invoice>({
    queryKey: ["/revira/api/invoices", invoiceId],
    queryFn: async () => {
      if (invoiceId) {
        const res = await fetch(`/revira/api/invoices/${invoiceId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch invoice");
        return res.json();
      }
      const res = await fetch(`/revira/api/projects/${projectId}/invoice`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch invoice");
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: existingItems } = useQuery<InvoiceItem[]>({
    queryKey: ["/revira/api/invoices", existingInvoice?.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/revira/api/invoices/${existingInvoice?.id}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!existingInvoice?.id,
  });

  const { data: invoiceVersions } = useQuery<Invoice[]>({
    queryKey: ["/revira/api/projects", projectId, "invoice-versions"],
    queryFn: async () => {
      const res = await fetch(`/revira/api/projects/${projectId}/invoice-versions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  const parseInvoiceContentSections = (raw: string | null | undefined): InvoiceContentSectionsData => {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as InvoiceContentSectionsData;
      }
      return {};
    } catch {
      return {};
    }
  };

  const buildWorkOrderSummary = useCallback(() => {
    if (invoiceData.orderReferenceType === "po") {
      return invoiceData.purchaseOrderNo || "-";
    }
    return invoiceData.workOrderNo || "-";
  }, [invoiceData.orderReferenceType, invoiceData.workOrderNo, invoiceData.purchaseOrderNo]);

  const buildDispatchSummary = useCallback(() => {
    const parts: string[] = [];
    if (invoiceData.vehicleNo.trim()) {
      parts.push(`Vehicle No.: ${invoiceData.vehicleNo.trim()}`);
    }
    if (invoiceData.showDispatchLrNo) {
      parts.push(`L.R. No.: ${invoiceData.dispatchLrNo || "-"}`);
    }
    if (invoiceData.showDispatchPo) {
      parts.push(`P.O.: ${invoiceData.dispatchPoNo || "-"}`);
    }
    if (invoiceData.showDispatchGatePass) {
      parts.push(`Gate Pass: ${invoiceData.dispatchGatePass || "-"}`);
    }
    return parts.length ? parts.join(" | ") : "-";
  }, [
    invoiceData.vehicleNo,
    invoiceData.showDispatchLrNo,
    invoiceData.dispatchLrNo,
    invoiceData.showDispatchPo,
    invoiceData.dispatchPoNo,
    invoiceData.showDispatchGatePass,
    invoiceData.dispatchGatePass,
  ]);

  const buildInvoiceContentSections = useCallback(() => {
    const payload: InvoiceContentSectionsData = {
      invoiceType: invoiceData.invoiceType,
      orderReferenceType: invoiceData.orderReferenceType,
      showWorkOrderNo: invoiceData.orderReferenceType === "wo",
      showPurchaseOrderNo: invoiceData.orderReferenceType === "po",
      purchaseOrderNo: invoiceData.purchaseOrderNo,
      vehicleNo: invoiceData.vehicleNo,
      showDispatchLrNo: invoiceData.showDispatchLrNo,
      showDispatchPo: invoiceData.showDispatchPo,
      showDispatchGatePass: invoiceData.showDispatchGatePass,
      dispatchLrNo: invoiceData.dispatchLrNo,
      dispatchPoNo: invoiceData.dispatchPoNo,
      dispatchGatePass: invoiceData.dispatchGatePass,
    };
    return JSON.stringify(payload);
  }, [invoiceData]);

  // Set defaults for new invoices
  useEffect(() => {
    if (project && client && !existingInvoice) {
      const date = new Date();
      const financeYear = date.getMonth() >= 3 
        ? `${date.getFullYear()}-${(date.getFullYear() + 1).toString().slice(-2)}`
        : `${date.getFullYear() - 1}-${date.getFullYear().toString().slice(-2)}`;
      
      setInvoiceData(prev => ({
        ...prev,
        invoiceNumber: `RNS/${financeYear}/RNS-SL-${String(project.id).padStart(3, '0')}`,
        organisationName: `M/s ${client.name}`,
        registeredAddress: client.location,
        consigneeAddress: `M/s ${client.name}, ${client.location}`,
        clientGstin: client.gstNo || "",
      }));
    }
  }, [project, client, existingInvoice]);

  // Load existing invoice data
  useEffect(() => {
    if (existingInvoice) {
      const parsedContent = parseInvoiceContentSections(existingInvoice.contentSections);
      const cleanReferenceValue = (value: string | null | undefined) =>
        (value || "").replace(/^W\.O\.\s*No\.\s*:\s*/i, "").replace(/^P\.O\.\s*No\.\s*:\s*/i, "").trim();
      const orderReferenceType =
        parsedContent.orderReferenceType ||
        (parsedContent.showPurchaseOrderNo ? "po" : "wo");
      const hasDispatchConfig =
        parsedContent.vehicleNo !== undefined ||
        parsedContent.showDispatchLrNo !== undefined ||
        parsedContent.showDispatchPo !== undefined ||
        parsedContent.showDispatchGatePass !== undefined ||
        parsedContent.dispatchLrNo !== undefined ||
        parsedContent.dispatchPoNo !== undefined ||
        parsedContent.dispatchGatePass !== undefined;
      setInvoiceData({
        invoiceNumber: existingInvoice.invoiceNumber,
        revision: existingInvoice.revision,
        invoiceType: parsedContent.invoiceType || "PROFORMA INVOICE",
        organisationName: existingInvoice.organisationName,
        registeredAddress: existingInvoice.registeredAddress,
        consigneeAddress: existingInvoice.consigneeAddress,
        clientGstin: existingInvoice.clientGstin || "",
        workOrderNo: cleanReferenceValue(existingInvoice.workOrderNo) || "NIL",
        orderReferenceType,
        purchaseOrderNo: parsedContent.purchaseOrderNo || (orderReferenceType === "po" ? cleanReferenceValue(existingInvoice.workOrderNo) : ""),
        dispatchDetails: existingInvoice.dispatchDetails || "-",
        vehicleNo: parsedContent.vehicleNo || (!hasDispatchConfig && existingInvoice.dispatchDetails && existingInvoice.dispatchDetails !== "-" ? existingInvoice.dispatchDetails : ""),
        showDispatchLrNo: parsedContent.showDispatchLrNo ?? false,
        showDispatchPo: parsedContent.showDispatchPo ?? false,
        showDispatchGatePass: parsedContent.showDispatchGatePass ?? false,
        dispatchLrNo: parsedContent.dispatchLrNo || "",
        dispatchPoNo: parsedContent.dispatchPoNo || "",
        dispatchGatePass: parsedContent.dispatchGatePass || "",
        appliedTaxType: (existingInvoice.appliedTaxType as "cgst_sgst" | "igst") || "igst",
        cgstRate: existingInvoice.cgstRate || "9",
        sgstRate: existingInvoice.sgstRate || "9",
        igstRate: existingInvoice.igstRate || "18",
      });
    }
  }, [existingInvoice]);

  // Load existing items
  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setLineItems(existingItems.map(item => ({
        id: item.id,
        serialNo: item.serialNo,
        description: item.description,
        hsnCode: item.hsnCode || "940610",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "LS",
        ratePerUnit: Number(item.ratePerUnit) || 0,
        percentage: Number(item.percentage) || 0,
        amount: Number(item.amount) || 0,
        remarks: item.remarks || "",
      })));
    }
  }, [existingItems]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const totalAmount = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (invoiceData.appliedTaxType === "cgst_sgst") {
      cgstAmount = totalAmount * (Number(invoiceData.cgstRate) / 100);
      sgstAmount = totalAmount * (Number(invoiceData.sgstRate) / 100);
    } else {
      igstAmount = totalAmount * (Number(invoiceData.igstRate) / 100);
    }

    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const grandTotal = totalAmount + totalTax;

    return { totalAmount, cgstAmount, sgstAmount, igstAmount, totalTax, grandTotal };
  }, [lineItems, invoiceData.appliedTaxType, invoiceData.cgstRate, invoiceData.sgstRate, invoiceData.igstRate]);

  const totals = calculateTotals();

  const getPersistableLineItems = useCallback(() => {
    return lineItems
      .filter((item) => item.description.trim());
  }, [lineItems]);

  // Number to words conversion
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };
    
    const convertToIndianSystem = (n: number): string => {
      if (n === 0) return '';
      
      const crore = Math.floor(n / 10000000);
      const lakh = Math.floor((n % 10000000) / 100000);
      const thousand = Math.floor((n % 100000) / 1000);
      const remainder = n % 1000;
      
      let result = '';
      if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
      if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
      if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
      if (remainder > 0) result += convertLessThanThousand(remainder);
      
      return result.trim();
    };
    
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    
    let result = convertToIndianSystem(rupees) + ' Rupees';
    if (paise > 0) {
      result += ' and ' + convertLessThanThousand(paise) + ' Paise';
    }
    result += ' Only';
    
    return result;
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      const persistableLineItems = getPersistableLineItems();
      const invoiceRes = await apiRequest("POST", "/revira/api/invoices", {
        projectId: Number(projectId),
        invoiceNumber: invoiceData.invoiceNumber,
        revision: invoiceData.revision,
        organisationName: invoiceData.organisationName,
        registeredAddress: invoiceData.registeredAddress,
        consigneeAddress: invoiceData.consigneeAddress,
        clientGstin: invoiceData.clientGstin,
        workOrderNo: buildWorkOrderSummary(),
        dispatchDetails: buildDispatchSummary(),
        appliedTaxType: invoiceData.appliedTaxType,
        cgstRate: invoiceData.cgstRate,
        sgstRate: invoiceData.sgstRate,
        igstRate: invoiceData.igstRate,
        contentSections: buildInvoiceContentSections(),
        totalAmount: String(totals.totalAmount),
        totalTax: String(totals.totalTax),
        grandTotal: String(totals.grandTotal),
      });
      const invoice = await invoiceRes.json();
      
      for (const item of persistableLineItems) {
        await apiRequest("POST", `/revira/api/invoices/${invoice.id}/items`, {
          serialNo: item.serialNo,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: String(item.quantity),
          unit: item.unit,
          ratePerUnit: String(item.ratePerUnit),
          percentage: String(item.percentage),
          amount: String(item.amount),
          remarks: item.remarks,
        });
      }
      
      return invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "invoice-versions"] });
      setLocation(`/revira/projects/${projectId}/invoice/${data.id}`);
      toast({
        title: "Invoice saved",
        description: "The invoice has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const persistableLineItems = getPersistableLineItems();
      await apiRequest("PUT", `/revira/api/invoices/${existingInvoice?.id}`, {
        invoiceNumber: invoiceData.invoiceNumber,
        revision: invoiceData.revision,
        organisationName: invoiceData.organisationName,
        registeredAddress: invoiceData.registeredAddress,
        consigneeAddress: invoiceData.consigneeAddress,
        clientGstin: invoiceData.clientGstin,
        workOrderNo: buildWorkOrderSummary(),
        dispatchDetails: buildDispatchSummary(),
        appliedTaxType: invoiceData.appliedTaxType,
        cgstRate: invoiceData.cgstRate,
        sgstRate: invoiceData.sgstRate,
        igstRate: invoiceData.igstRate,
        contentSections: buildInvoiceContentSections(),
        totalAmount: String(totals.totalAmount),
        totalTax: String(totals.totalTax),
        grandTotal: String(totals.grandTotal),
      });

      let itemsToDelete = existingItems || [];
      if (!itemsToDelete.length) {
        const res = await fetch(`/revira/api/invoices/${existingInvoice?.id}/items`, { credentials: "include" });
        if (res.ok) {
          itemsToDelete = await res.json();
        }
      }

      for (const item of itemsToDelete) {
        await apiRequest("DELETE", `/revira/api/invoice-items/${item.id}`);
      }

      for (const item of persistableLineItems) {
        await apiRequest("POST", `/revira/api/invoices/${existingInvoice?.id}/items`, {
          serialNo: item.serialNo,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: String(item.quantity),
          unit: item.unit,
          ratePerUnit: String(item.ratePerUnit),
          percentage: String(item.percentage),
          amount: String(item.amount),
          remarks: item.remarks,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/invoices", existingInvoice?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "invoice-versions"] });
      toast({
        title: "Invoice updated",
        description: "The invoice has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const duplicateInvoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/revira/api/invoices/${existingInvoice?.id}/duplicate`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "invoice-versions"] });
      setLocation(`/revira/projects/${projectId}/invoice/${data.id}`);
      toast({
        title: "Invoice duplicated",
        description: `Created new version: ${data.revision}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate invoice",
        variant: "destructive",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/revira/api/invoices/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "invoice-versions"] });
      toast({
        title: "Invoice deleted",
        description: "The invoice version has been deleted.",
      });
      setVersionsDialogOpen(false);
      if (invoiceVersions && invoiceVersions.length > 1) {
        const remaining = invoiceVersions.filter(v => v.id !== existingInvoice?.id);
        if (remaining.length > 0) {
          setLocation(`/revira/projects/${projectId}/invoice/${remaining[0].id}`);
        } else {
          setLocation(`/revira/projects/${projectId}/invoice`);
        }
      } else {
        setLocation(`/revira/projects/${projectId}/invoice`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (existingInvoice) {
      updateInvoiceMutation.mutate();
    } else {
      createInvoiceMutation.mutate();
    }
  };

  const addLineItem = () => {
    const newId = Math.max(...lineItems.map(i => i.id), 0) + 1;
    setLineItems([...lineItems, {
      id: newId,
      serialNo: lineItems.length + 1,
      description: "",
      hsnCode: "940610",
      quantity: 1,
      unit: "LS",
      ratePerUnit: 0,
      percentage: 0,
      amount: 0,
      remarks: "",
    }]);
  };

  const removeLineItem = (id: number) => {
    if (lineItems.length > 1) {
      const updated = lineItems.filter(item => item.id !== id);
      setLineItems(updated.map((item, idx) => ({ ...item, serialNo: idx + 1 })));
    }
  };

  const updateLineItem = (id: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "ratePerUnit") {
          updated.amount = Number(updated.quantity) * Number(updated.ratePerUnit);
        }
        return updated;
      }
      return item;
    }));
  };

  const formatCurrency = (amount: number) => {
    return `\u20B9${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const exportToPDF = async (opts?: { save?: boolean; silent?: boolean; returnDataUri?: boolean }) => {
    const save = opts?.save ?? true;
    const silent = opts?.silent ?? false;
    const returnDataUri = opts?.returnDataUri ?? false;
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const headerHeight = 35;
      const footerHeight = 30;
      const pxToMm = (px: number) => px * 0.2646;
      const stampSize = pxToMm(80);
      const stampRight = pxToMm(50);
      const stampBottom = pxToMm(80);
      const blockGap = pxToMm(10);
      const cellTopPad = pxToMm(3);
      const cellInnerPad = pxToMm(3);
      const borderColor = "#eeb7b7";
      const headerBg = "#fff5f5";

      let currentY = headerHeight + 10;
      let currentPage = 1;

      const formatAmountValue = (amount: number) =>
        amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formatAmountWithRupee = (amount: number) => formatAmountValue(amount);

      const loadImage = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = reject;
          img.src = url;
        });
      };

      let headerImg: string | null = null;
      let footerImg: string | null = null;
      let stampImg: string | null = null;

      try {
        if (branding?.headerUrl) headerImg = await loadImage(branding.headerUrl);
        if (branding?.footerUrl) footerImg = await loadImage(branding.footerUrl);
        if (branding?.stampUrl) stampImg = await loadImage(branding.stampUrl);
      } catch (e) {
        console.warn("Failed to load branding images:", e);
      }

      const addHeaderFooterStamp = (pageNum: number) => {
        if (headerImg) {
          pdf.addImage(headerImg, "PNG", 0, 0, pageWidth, headerHeight);
        }
        if (footerImg) {
          pdf.addImage(footerImg, "PNG", 0, pageHeight - footerHeight, pageWidth, footerHeight);
        }
        if (stampImg) {
          pdf.addImage(stampImg, "PNG", pageWidth - stampRight - stampSize, pageHeight - stampBottom - stampSize, stampSize, stampSize);
        }
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      };

      const checkNewPage = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - footerHeight - 10) {
          pdf.addPage();
          currentPage++;
          addHeaderFooterStamp(currentPage);
          currentY = headerHeight + 10;
          return true;
        }
        return false;
      };

      const addSectionTitle = (text: string, size = 12) => {
        currentY += 4;
        checkNewPage(12);
        pdf.setFillColor("#d92134");
        pdf.rect(margin, currentY - 3.5, 4, 5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(size);
        pdf.setTextColor("#1e3a5f");
        pdf.text(text, margin + 7, currentY);
        currentY += 5.5;
      };

      const addFourColumnClientTable = (
        mergedRows: Array<[string, string]>,
        pairRows: Array<[[string, string], [string, string]?]>,
        trailingMergedRows: Array<[string, string]> = []
      ) => {
        const colWidths = [32, 63, 32, 63];
        const baseRowHeight = 5.8;
        const padding = cellInnerPad;
        const tableCellTopPad = pxToMm(3);
        const rowTop = (y: number) => y - 3.0;
        const textY = (y: number, idx = 0) => rowTop(y) + tableCellTopPad + 2.5 + idx * 3.2;

        checkNewPage(baseRowHeight + 4);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);

        let rowIndex = 0;
        const drawMergedRows = (rows: Array<[string, string]>) => rows.forEach(([label, value]) => {
          const labelLines = pdf.splitTextToSize(label, colWidths[0] - padding * 2);
          const valueLines = pdf.splitTextToSize(value || "-", colWidths[1] + colWidths[2] + colWidths[3] - padding * 2);
          const maxLines = Math.max(labelLines.length || 1, valueLines.length || 1);
          const rowHeight = Math.max(baseRowHeight, maxLines * 3.2 + 1.2);
          checkNewPage(rowHeight + 2);
          if (rowIndex % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, rowTop(currentY), contentWidth, rowHeight, "F");
          }
          pdf.setDrawColor(borderColor);
          pdf.rect(margin, rowTop(currentY), contentWidth, rowHeight, "S");
          pdf.line(margin + colWidths[0], rowTop(currentY), margin + colWidths[0], rowTop(currentY) + rowHeight);

          pdf.setFont("helvetica", "bold");
          labelLines.forEach((line: string, lineIdx: number) => {
            pdf.text(line, margin + padding, textY(currentY, lineIdx));
          });
          if (label === "Dispatch Details" && value) {
            const entries = value.split(",").map((part) => part.trim()).filter(Boolean);
            const startX = margin + colWidths[0] + padding;
            const maxX = margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - padding;
            let cursorX = startX;
            let cursorY = textY(currentY, 0);

            entries.forEach((entry, idx) => {
              const separator = idx < entries.length - 1 ? ", " : "";
              const dashIdx = entry.indexOf(" - ");
              const key = dashIdx > -1 ? entry.slice(0, dashIdx) : entry;
              const val = dashIdx > -1 ? entry.slice(dashIdx) : "";

              const keyWidth = pdf.getTextWidth(key);
              const valWidth = pdf.getTextWidth(val + separator);

              if (cursorX + keyWidth + valWidth > maxX) {
                cursorX = startX;
                cursorY += 3.2;
              }

              pdf.setFont("helvetica", "bold");
              pdf.text(key, cursorX, cursorY);
              cursorX += keyWidth;

              pdf.setFont("helvetica", "normal");
              pdf.text(val + separator, cursorX, cursorY);
              cursorX += valWidth;
            });
          } else {
            pdf.setFont("helvetica", "normal");
            valueLines.forEach((line: string, lineIdx: number) => {
              pdf.text(line, margin + colWidths[0] + padding, textY(currentY, lineIdx));
            });
          }
          currentY += rowHeight;
          rowIndex += 1;
        });
        drawMergedRows(mergedRows);

        pairRows.forEach((row) => {
          const [left, right] = row;
          const l1 = pdf.splitTextToSize(left?.[0] || "", colWidths[0] - padding * 2);
          const l2 = pdf.splitTextToSize(left?.[1] || "-", colWidths[1] - padding * 2);
          const r1 = pdf.splitTextToSize(right?.[0] || "", colWidths[2] - padding * 2);
          const r2 = pdf.splitTextToSize(right?.[1] || "", colWidths[3] - padding * 2);
          const maxLines = Math.max(l1.length || 1, l2.length || 1, r1.length || 1, r2.length || 1);
          const rowHeight = Math.max(baseRowHeight, maxLines * 3.2 + 1.2);
          checkNewPage(rowHeight + 2);
          if (rowIndex % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, rowTop(currentY), contentWidth, rowHeight, "F");
          }
          pdf.setDrawColor(borderColor);
          pdf.rect(margin, rowTop(currentY), contentWidth, rowHeight, "S");
          let x = margin;
          for (let i = 0; i < 3; i++) {
            x += colWidths[i];
            pdf.line(x, rowTop(currentY), x, rowTop(currentY) + rowHeight);
          }

          pdf.setFont("helvetica", "bold");
          l1.forEach((line: string, i: number) => pdf.text(line, margin + padding, textY(currentY, i)));
          r1.forEach((line: string, i: number) => pdf.text(line, margin + colWidths[0] + colWidths[1] + padding, textY(currentY, i)));
          pdf.setFont("helvetica", "normal");
          l2.forEach((line: string, i: number) => pdf.text(line, margin + colWidths[0] + padding, textY(currentY, i)));
          r2.forEach((line: string, i: number) => pdf.text(line, margin + colWidths[0] + colWidths[1] + colWidths[2] + padding, textY(currentY, i)));
          currentY += rowHeight;
          rowIndex += 1;
        });

        drawMergedRows(trailingMergedRows);
      };

      const addFourColumnPairsTable = (rows: Array<[[string, string], [string, string]?]>) => {
        const colWidths = [32, 75, 32, 51];
        const baseRowHeight = 5.8;
        const padding = cellInnerPad;
        const tableCellTopPad = pxToMm(3);
        const rowTop = (y: number) => y - 3.0;
        const textY = (y: number, idx = 0) => rowTop(y) + tableCellTopPad + 2.5 + idx * 3.2;

        checkNewPage(baseRowHeight + 4);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        rows.forEach((row, idx) => {
          const [left, right] = row;
          const l1 = pdf.splitTextToSize(left?.[0] || "", colWidths[0] - padding * 2);
          const l2 = pdf.splitTextToSize(left?.[1] || "-", colWidths[1] - padding * 2);
          const r1 = pdf.splitTextToSize(right?.[0] || "", colWidths[2] - padding * 2);
          const r2 = pdf.splitTextToSize(right?.[1] || "", colWidths[3] - padding * 2);
          const maxLines = Math.max(l1.length || 1, l2.length || 1, r1.length || 1, r2.length || 1);
          const rowHeight = Math.max(baseRowHeight, maxLines * 3.2 + 1.2);
          checkNewPage(rowHeight + 2);
          if (idx % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, rowTop(currentY), contentWidth, rowHeight, "F");
          }
          pdf.setDrawColor(borderColor);
          pdf.rect(margin, rowTop(currentY), contentWidth, rowHeight, "S");
          let x = margin;
          for (let i = 0; i < 3; i++) {
            x += colWidths[i];
            pdf.line(x, rowTop(currentY), x, rowTop(currentY) + rowHeight);
          }

          pdf.setFont("helvetica", "bold");
          l1.forEach((line: string, i: number) => pdf.text(line, margin + padding, textY(currentY, i)));
          r1.forEach((line: string, i: number) => pdf.text(line, margin + colWidths[0] + colWidths[1] + padding, textY(currentY, i)));
          pdf.setFont("helvetica", "normal");
          l2.forEach((line: string, i: number) => pdf.text(line, margin + colWidths[0] + padding, textY(currentY, i)));
          r2.forEach((line: string, i: number) => pdf.text(line, margin + colWidths[0] + colWidths[1] + colWidths[2] + padding, textY(currentY, i)));
          currentY += rowHeight;
        });
      };

      const addThreeColumnSummaryTable = (
        amountInWords: string,
        rows: Array<{ detail: string; value: string }>
      ) => {
        const colWidths = [95, 55, contentWidth - 150];
        const baseRowHeight = 5.8;
        const padding = cellInnerPad;

        checkNewPage(baseRowHeight + 6);
        pdf.setFillColor(headerBg);
        pdf.setDrawColor(borderColor);
        pdf.setLineWidth(0.2);
        pdf.rect(margin, currentY - 3.2, contentWidth, baseRowHeight, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.text("Total Amount In Words", margin + cellInnerPad, currentY + 0.8);
        pdf.text("Details", margin + colWidths[0] + cellInnerPad, currentY + 0.8);
        pdf.text("Amount", margin + colWidths[0] + colWidths[1] + cellInnerPad, currentY + 0.8);
        pdf.line(margin + colWidths[0], currentY - 3.2, margin + colWidths[0], currentY - 3.2 + baseRowHeight);
        pdf.line(margin + colWidths[0] + colWidths[1], currentY - 3.2, margin + colWidths[0] + colWidths[1], currentY - 3.2 + baseRowHeight);
        currentY += baseRowHeight;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);

        const preparedRows = rows.map((row) => {
          const detailLines = pdf.splitTextToSize(row.detail, colWidths[1] - padding * 2);
          const valueLines = pdf.splitTextToSize(row.value, colWidths[2] - padding * 2);
          const maxLines = Math.max(detailLines.length || 1, valueLines.length || 1);
          const rowHeight = Math.max(baseRowHeight, maxLines * 3.2 + 1.2);
          return { detailLines, valueLines, rowHeight };
        });
        const totalRowsHeight = preparedRows.reduce((sum, row) => sum + row.rowHeight, 0);
        checkNewPage(totalRowsHeight + 2);

        pdf.setDrawColor(borderColor);
        pdf.rect(margin, currentY - 3.2, colWidths[0], totalRowsHeight, "S");
        const wordsLines = pdf.splitTextToSize(amountInWords, colWidths[0] - padding * 3);
        pdf.setFont("helvetica", "bold");
        wordsLines.forEach((line: string, lineIdx: number) => {
          pdf.text(line, margin + padding, currentY + 0.1 + cellTopPad + lineIdx * 3.2);
        });

        let rowY = currentY;
        preparedRows.forEach((row, idx) => {
          if (idx % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin + colWidths[0], rowY - 3.2, colWidths[1] + colWidths[2], row.rowHeight, "F");
          }

          pdf.setDrawColor(borderColor);
          pdf.rect(margin + colWidths[0], rowY - 3.2, colWidths[1] + colWidths[2], row.rowHeight, "S");
          pdf.line(
            margin + colWidths[0] + colWidths[1],
            rowY - 3.2,
            margin + colWidths[0] + colWidths[1],
            rowY - 3.2 + row.rowHeight
          );

          if ((rows[idx]?.detail || "").trim().toLowerCase() === "grand total") {
            pdf.setFont("helvetica", "bold");
          } else {
            pdf.setFont("helvetica", "normal");
          }
          row.detailLines.forEach((line: string, lineIdx: number) => {
            pdf.text(line, margin + colWidths[0] + padding, rowY + 0.1 + cellTopPad + lineIdx * 3.2);
          });
          if ((rows[idx]?.detail || "").trim().toLowerCase() === "grand total") {
            pdf.setFont("helvetica", "bold");
          } else {
            pdf.setFont("helvetica", "normal");
          }
          row.valueLines.forEach((line: string, lineIdx: number) => {
            pdf.text(line, margin + colWidths[0] + colWidths[1] + padding, rowY + 0.1 + cellTopPad + lineIdx * 3.2);
          });

          rowY += row.rowHeight;
        });
        currentY = rowY;
      };

      const invoiceTitle = invoiceData.invoiceType || "PROFORMA INVOICE";
      const invoiceNumberLabel = invoiceTitle === "TAX INVOICE" ? "T.I. No" : "P.I No";
      const invoiceTypeCode = invoiceTitle === "TAX INVOICE" ? "TI" : "PI";
      const now = new Date();
      const invoiceFinanceYear =
        now.getMonth() >= 3
          ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
          : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
      const invoiceSequence = String(project?.id || 0).padStart(3, "0");
      const invoiceNumberForPdf = `RNS/${invoiceFinanceYear}/RNS-${invoiceTypeCode}-${invoiceSequence}`;
      const clientDetailEntries: Array<[string, string]> = [["GSTIN", invoiceData.clientGstin || ""]];
      const dispatchEntries: string[] = [];
      if (invoiceData.orderReferenceType === "po") {
        clientDetailEntries.push(["P.O. No.", invoiceData.purchaseOrderNo || "-"]);
      } else {
        clientDetailEntries.push(["W.O. No.", invoiceData.workOrderNo || "-"]);
      }
      if (invoiceData.vehicleNo.trim()) dispatchEntries.push(`Vehicle No. - ${invoiceData.vehicleNo.trim()}`);
      if (invoiceData.showDispatchLrNo) dispatchEntries.push(`L.R. No. - ${invoiceData.dispatchLrNo || "-"}`);
      if (invoiceData.showDispatchPo) dispatchEntries.push(`D.C No. - ${invoiceData.dispatchPoNo || "-"}`);
      if (invoiceData.showDispatchGatePass) dispatchEntries.push(`Gate Pass - ${invoiceData.dispatchGatePass || "-"}`);
      const dispatchDetailsLine = dispatchEntries.length ? dispatchEntries.join(",    ") : "-";
      const clientPairRows: Array<[[string, string], [string, string]?]> = [];
      for (let i = 0; i < clientDetailEntries.length; i += 2) {
        clientPairRows.push([clientDetailEntries[i], clientDetailEntries[i + 1]]);
      }

      addHeaderFooterStamp(currentPage);

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor("#da2032");
      pdf.text(invoiceTitle, pageWidth / 2, currentY, { align: "center" });
      currentY += 10;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.text(`CIN: ${branding?.cin || ""}`, margin, currentY);
      pdf.text(`Company GSTIN: ${branding?.companyGstin || "07AAPCR3026H1ZA"}`, pageWidth / 2 - 20, currentY);
      pdf.text(`${invoiceNumberLabel}: ${invoiceNumberForPdf}`, pageWidth - margin - 50, currentY);
      currentY += 5;
      pdf.text(`Email: ${branding?.email || "sales@reviranexgen.com"}`, pageWidth / 2 - 20, currentY);
      pdf.text(`Date: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`, pageWidth - margin - 50, currentY);
      currentY += 8;

      addSectionTitle("Client Details", 11);
      addFourColumnClientTable(
        [
          ["Organisation Name", invoiceData.organisationName],
          ["Registered Address", invoiceData.registeredAddress],
          ["Consignee Address", invoiceData.consigneeAddress],
        ],
        clientPairRows,
        [["Dispatch Details", dispatchDetailsLine]]
      );
      currentY += blockGap;

      const tableHeaders = ["Sr.No.", "Description of Goods", "HSN Code", "Qty.", "Unit", "Rate", "%age", "Basic Amount (INR)"];
      const colWidths = [12, 55, 20, 13, 13, 20, 14, 43];
      const tableRows = lineItems
        .filter((item) => item.description.trim())
        .map((item) => [
          String(item.serialNo),
          item.description,
          item.hsnCode,
          String(item.quantity),
          item.unit || "LS",
          formatAmountValue(Number(item.ratePerUnit) || 0),
          `${Number(item.percentage) || 0}%`,
          formatAmountValue(Number(item.amount) || 0),
        ]);

      checkNewPage(15);
      pdf.setFillColor(headerBg);
      pdf.setDrawColor(borderColor);
      pdf.setLineWidth(0.2);
      pdf.rect(margin, currentY - 3.0, contentWidth, 5.8, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      let tableX = margin;
      tableHeaders.forEach((header, i) => {
        pdf.line(tableX, currentY - 3.0, tableX, currentY + 2.8);
        pdf.text(header, tableX + cellInnerPad, currentY + 0.8);
        tableX += colWidths[i];
      });
      pdf.line(tableX, currentY - 3.0, tableX, currentY + 2.8);
      currentY += 5.8;

      pdf.setFont("helvetica", "normal");
      tableRows.forEach((row, rowIdx) => {
        const preparedCells = row.map((cell, i) => pdf.splitTextToSize(cell, colWidths[i] - cellInnerPad * 2));
        const maxLines = Math.max(...preparedCells.map((lines) => lines.length));
        const rowHeight = Math.max(5.8, maxLines * 3.2 + 1.2);
        checkNewPage(rowHeight + 2);

        if (rowIdx % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, currentY - 3.0, contentWidth, rowHeight, "F");
        }
        pdf.setDrawColor(borderColor);
        pdf.rect(margin, currentY - 3.0, contentWidth, rowHeight, "S");

        let rowX = margin;
        preparedCells.forEach((cellLines, i) => {
          pdf.line(rowX, currentY - 3.0, rowX, currentY - 3.0 + rowHeight);
          if (i === 0) {
            pdf.setFont("helvetica", "bold");
          } else {
            pdf.setFont("helvetica", "normal");
          }
          cellLines.forEach((line: string, lineIdx: number) => {
            pdf.text(line, rowX + cellInnerPad, currentY + 0.1 + cellTopPad + lineIdx * 3.2);
          });
          rowX += colWidths[i];
        });
        pdf.line(rowX, currentY - 3.0, rowX, currentY - 3.0 + rowHeight);
        currentY += rowHeight;
      });

      currentY += blockGap;
      const summaryRows = [
        { detail: "Total Amount (INR)", value: formatAmountWithRupee(totals.totalAmount) },
        { detail: "Total Amount before Tax", value: formatAmountWithRupee(totals.totalAmount) },
        { detail: "(1) Add: CGST", value: formatAmountWithRupee(totals.cgstAmount) },
        { detail: "(2) Add: SGST", value: formatAmountWithRupee(totals.sgstAmount) },
        { detail: "(3) Add: IGST", value: formatAmountWithRupee(totals.igstAmount) },
        { detail: "Total GST", value: formatAmountWithRupee(totals.totalTax) },
        { detail: "Grand Total", value: formatAmountWithRupee(totals.grandTotal) },
      ];
      addThreeColumnSummaryTable(numberToWords(totals.grandTotal), summaryRows);

      currentY += blockGap;
      addSectionTitle("Bank Details", 11);
      addFourColumnPairsTable([
        [["Account Name", branding?.entityName || "Revira NexGen Structures Pvt. Ltd"], ["Account Number", "73361900002657"]],
        [["Address", branding?.headOfficeAddress || "28, E2 Block, Shivram Park Nangloi Delhi - 110041"], ["IFSC Code", "YESB0000733"]],
      ]);

      currentY += blockGap;
      checkNewPage(20);
      pdf.text(`For, ${branding?.entityName || "Revira NexGen Structures Pvt. Ltd"}`, pageWidth - margin - 60, currentY);
      currentY += 18;
      pdf.text("Authorised Signatory", pageWidth - margin - 50, currentY);

      const date = new Date();
      const dateStr = `${String(date.getDate()).padStart(2, "0")}${String(date.getMonth() + 1).padStart(2, "0")}${date.getFullYear()}`;
      const companyShort = (branding?.entityName || "RNS").split(" ").map((w) => w[0]).join("");
      const titlePrefix = invoiceTitle === "TAX INVOICE" ? "TAX_INVOICE" : "PROFORMA_INVOICE";
      const fileName = `${titlePrefix}_${dateStr}_${companyShort}_${invoiceData.revision}.pdf`;
      const dataUri = returnDataUri ? (pdf.output("datauristring", { filename: fileName }) as string) : undefined;
      if (save) {
        pdf.save(fileName);
      }
      if (!silent) {
        toast({
          title: save ? "PDF exported" : "PDF generated",
          description: save ? `Invoice saved as ${fileName}` : "Invoice PDF is ready.",
        });
      }
      return { fileName, dataUri };
    } catch (error) {
      console.error("PDF export error:", error);
      if (!silent) {
        toast({
          title: "Export failed",
          description: "Failed to export invoice PDF. Please try again.",
          variant: "destructive",
        });
      }
      return null;
    }
  };

  const defaultEmailSignature =
    "-------------\nThanks & Regards\nHareram Sharma\nRevira Nexgen Structures Pvt. Ltd.\nMo. No. 8390491843";

  const openSendEmailDialog = () => {
    if (!existingInvoice?.id) {
      toast({
        title: "Save required",
        description: "Please save invoice first, then send via email.",
        variant: "destructive",
      });
      return;
    }
    setEmailForm({
      to: client?.emailAddress || "",
      subject: `Invoice ${invoiceData.invoiceNumber || ""} ${invoiceData.revision || ""}`.trim(),
      message: `Please find the attached file for details\n\n${defaultEmailSignature}`,
    });
    setEmailDialogOpen(true);
  };

  const submitSendEmail = async () => {
    if (!existingInvoice?.id) {
      toast({
        title: "Save required",
        description: "Please save invoice first, then send via email.",
        variant: "destructive",
      });
      return;
    }
    const emails = emailForm.to
      .split(/[,\s;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast({
        title: "Email required",
        description: "Please enter at least one recipient email id.",
        variant: "destructive",
      });
      return;
    }
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      toast({
        title: "Fields required",
        description: "Please enter subject and message body.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingEmail(true);
    const generated = await exportToPDF({ save: false, silent: true, returnDataUri: true });
    if (!generated?.dataUri) {
      setIsSendingEmail(false);
      toast({
        title: "PDF failed",
        description: "Unable to generate invoice PDF for email.",
        variant: "destructive",
      });
      return;
    }
    try {
      const base64 = generated.dataUri.split(",")[1] || "";
      const emailRes = await apiRequest("POST", `/revira/api/invoices/${existingInvoice.id}/send-email`, {
        to: emails,
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim(),
        fileName: generated.fileName,
        pdfBase64: base64,
      });
      const emailPayload = await emailRes.json();
      const acceptedList = Array.isArray(emailPayload?.accepted) ? emailPayload.accepted : [];
      const acceptedText = acceptedList.length > 0 ? acceptedList.join(", ") : emails.join(", ");
      toast({
        title: "Email queued",
        description: `SMTP accepted: ${acceptedText}.`,
      });
      setEmailDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Failed to send email.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const openSendWhatsAppDialog = () => {
    if (!existingInvoice?.id) {
      toast({
        title: "Save required",
        description: "Please save invoice first, then send on WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    const rawPhone = (client?.mobileNumber || "").replace(/\D/g, "");
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    setWhatsAppForm({
      mobile: phone,
      message: `Please find the attached file for details\n\n${defaultEmailSignature}`,
    });
    setWhatsappDialogOpen(true);
  };

  const submitSendWhatsApp = async () => {
    if (!existingInvoice?.id) {
      toast({
        title: "Save required",
        description: "Please save invoice first, then send on WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    const phones = whatsAppForm.mobile
      .split(/[,\s;]+/)
      .map((value) => value.replace(/\D/g, ""))
      .filter(Boolean);
    if (phones.length === 0) {
      toast({
        title: "Mobile required",
        description: "Please enter at least one mobile number.",
        variant: "destructive",
      });
      return;
    }
    if (!whatsAppForm.message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter message body.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingWhatsApp(true);
    const generated = await exportToPDF({ save: false, silent: true, returnDataUri: true });
    if (!generated?.dataUri) {
      setIsSendingWhatsApp(false);
      toast({
        title: "PDF failed",
        description: "Unable to generate invoice PDF for WhatsApp send.",
        variant: "destructive",
      });
      return;
    }
    try {
      const base64 = generated.dataUri.split(",")[1] || "";
      await apiRequest("POST", `/revira/api/invoices/${existingInvoice.id}/send-whatsapp`, {
        to: phones,
        message: whatsAppForm.message.trim(),
        fileName: generated.fileName,
        pdfBase64: base64,
      });
      toast({
        title: "WhatsApp sent",
        description: `Invoice sent to ${phones.join(", ")}.`,
      });
      setWhatsappDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Failed to send WhatsApp message.",
        variant: "destructive",
      });
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  if (!project || !client || !user) {
    return (
      <LayoutShell user={user}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell user={user}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation("/revira/projects")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{project.projectName}</h1>
              <div className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {project.location}
              </div>
            </div>
          </div>
          
          <Button
            className="bg-[#d92134] hover:bg-[#b51c2c]"
            data-testid="button-new-invoice"
          >
            <FileText className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>

        {/* Action Bar */}
        <div className="bg-[#d92134] rounded-xl p-4 mb-6 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-90"
            onClick={() => setVersionsDialogOpen(true)}
            data-testid="button-versions-count"
          >
            <span className="text-white font-medium">Versions</span>
            <div className="flex items-center justify-center px-3 h-8 bg-white text-[#d92134] rounded font-bold">
              {existingInvoice?.revision || invoiceData.revision || 'R-001'}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              onClick={() => setVersionsDialogOpen(true)}
              data-testid="button-view-versions"
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            {existingInvoice && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => duplicateInvoiceMutation.mutate()}
                disabled={duplicateInvoiceMutation.isPending}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="button-duplicate"
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              onClick={exportToPDF}
              className="bg-[#22c55e] hover:bg-[#16a34a] text-white"
              data-testid="button-export-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={openSendEmailDialog}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              data-testid="button-send-email-invoice"
              title="Send invoice by email"
            >
              <Mail className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={openSendWhatsAppDialog}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              data-testid="button-send-whatsapp-invoice"
              title="Send invoice on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={createInvoiceMutation.isPending || updateInvoiceMutation.isPending}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              data-testid="button-save-invoice"
            >
              <Save className="w-4 h-4 mr-2" />
              {createInvoiceMutation.isPending || updateInvoiceMutation.isPending 
                ? "Saving..." 
                : "Save Changes"}
            </Button>
            
            {existingInvoice && invoiceVersions && invoiceVersions.length > 1 && (
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-red-200"
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete this invoice (${existingInvoice.revision})?`)) {
                    deleteInvoiceMutation.mutate(existingInvoice.id);
                  }
                }}
                data-testid="button-delete-invoice"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Content */}
        <div className="space-y-6">
        {/* Invoice Header Info */}
        <Card>
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-lg text-slate-700 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              INVOICE DETAILS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-500">Invoice Type</label>
              <Select
                value={invoiceData.invoiceType}
                onValueChange={(value) => setInvoiceData({ ...invoiceData, invoiceType: value as InvoiceType })}
              >
                <SelectTrigger data-testid="select-invoice-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFORMA INVOICE">PROFORMA INVOICE</SelectItem>
                  <SelectItem value="TAX INVOICE">TAX INVOICE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-500">Invoice No.</label>
              <Input
                value={invoiceData.invoiceNumber}
                onChange={(e) => setInvoiceData({ ...invoiceData, invoiceNumber: e.target.value })}
                data-testid="input-invoice-number"
              />
            </div>
            <div>
              <label className="text-sm text-slate-500">Date</label>
              <Input
                value={new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                disabled
              />
            </div>
          </CardContent>
        </Card>

        {/* Client Details */}
        <Card>
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-lg text-slate-700">CLIENT DETAILS</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-500">Organisation Name</label>
                <Input
                  value={invoiceData.organisationName}
                  onChange={(e) => setInvoiceData({ ...invoiceData, organisationName: e.target.value })}
                  data-testid="input-organisation-name"
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">Client GSTIN</label>
                <Input
                  value={invoiceData.clientGstin}
                  onChange={(e) => setInvoiceData({ ...invoiceData, clientGstin: e.target.value })}
                  data-testid="input-client-gstin"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-500">Registered Address</label>
              <Input
                value={invoiceData.registeredAddress}
                onChange={(e) => setInvoiceData({ ...invoiceData, registeredAddress: e.target.value })}
                data-testid="input-registered-address"
              />
            </div>
            <div>
              <label className="text-sm text-slate-500">Consignee Address</label>
              <Textarea
                value={invoiceData.consigneeAddress}
                onChange={(e) => setInvoiceData({ ...invoiceData, consigneeAddress: e.target.value })}
                rows={2}
                data-testid="input-consignee-address"
              />
            </div>
            <div className="space-y-3 border rounded-md p-3">
              <label className="text-sm font-medium text-slate-600">Order Reference Selection</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500">Reference Type</label>
                  <Select
                    value={invoiceData.orderReferenceType}
                    onValueChange={(value) => setInvoiceData({ ...invoiceData, orderReferenceType: value as "wo" | "po" })}
                  >
                    <SelectTrigger data-testid="select-order-reference-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wo">W.O. No.</SelectItem>
                      <SelectItem value="po">P.O. No.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-slate-500">{invoiceData.orderReferenceType === "po" ? "P.O. No." : "W.O. No."}</label>
                  <Input
                    value={invoiceData.orderReferenceType === "po" ? invoiceData.purchaseOrderNo : invoiceData.workOrderNo}
                    onChange={(e) =>
                      setInvoiceData({
                        ...invoiceData,
                        ...(invoiceData.orderReferenceType === "po"
                          ? { purchaseOrderNo: e.target.value }
                          : { workOrderNo: e.target.value }),
                      })
                    }
                    data-testid={invoiceData.orderReferenceType === "po" ? "input-po-number" : "input-work-order"}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 border rounded-md p-3">
              <label className="text-sm font-medium text-slate-600">Dispatch Details</label>
              <div>
                <label className="text-sm text-slate-500">Vehicle No.</label>
                <Input
                  value={invoiceData.vehicleNo}
                  onChange={(e) => setInvoiceData({ ...invoiceData, vehicleNo: e.target.value })}
                  data-testid="input-vehicle-no"
                />
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <Checkbox
                    checked={invoiceData.showDispatchLrNo}
                    onCheckedChange={(checked) => setInvoiceData({ ...invoiceData, showDispatchLrNo: checked === true })}
                    data-testid="checkbox-dispatch-lr"
                  />
                  L.R. No.
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <Checkbox
                    checked={invoiceData.showDispatchPo}
                    onCheckedChange={(checked) => setInvoiceData({ ...invoiceData, showDispatchPo: checked === true })}
                    data-testid="checkbox-dispatch-po"
                  />
                  D.C No.
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <Checkbox
                    checked={invoiceData.showDispatchGatePass}
                    onCheckedChange={(checked) => setInvoiceData({ ...invoiceData, showDispatchGatePass: checked === true })}
                    data-testid="checkbox-dispatch-gate-pass"
                  />
                  Gate Pass
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {invoiceData.showDispatchLrNo && (
                  <div>
                    <label className="text-sm text-slate-500">L.R. No.</label>
                    <Input
                      value={invoiceData.dispatchLrNo}
                      onChange={(e) => setInvoiceData({ ...invoiceData, dispatchLrNo: e.target.value })}
                      data-testid="input-dispatch-lr"
                    />
                  </div>
                )}
                {invoiceData.showDispatchPo && (
                  <div>
                    <label className="text-sm text-slate-500">D.C No.</label>
                    <Input
                      value={invoiceData.dispatchPoNo}
                      onChange={(e) => setInvoiceData({ ...invoiceData, dispatchPoNo: e.target.value })}
                      data-testid="input-dispatch-po"
                    />
                  </div>
                )}
                {invoiceData.showDispatchGatePass && (
                  <div>
                    <label className="text-sm text-slate-500">Gate Pass</label>
                    <Input
                      value={invoiceData.dispatchGatePass}
                      onChange={(e) => setInvoiceData({ ...invoiceData, dispatchGatePass: e.target.value })}
                      data-testid="input-dispatch-gate-pass"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Table */}
        <Card>
          <CardHeader className="bg-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-slate-700">INVOICE ITEMS</CardTitle>
            <Button size="sm" onClick={addLineItem} data-testid="button-add-item">
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-16">Sr.</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600">Description</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-24">HSN Code</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-20">Qty</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-20">Unit</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-24">Rate</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-28">Amount</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">
                        <Input
                          value={item.serialNo}
                          onChange={(e) => updateLineItem(item.id, "serialNo", parseInt(e.target.value) || 1)}
                          className="w-14 text-center"
                          data-testid={`input-serial-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                          rows={2}
                          placeholder="Description"
                          data-testid={`input-description-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.hsnCode}
                          onChange={(e) => updateLineItem(item.id, "hsnCode", e.target.value)}
                          data-testid={`input-hsn-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                          data-testid={`input-qty-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.unit}
                          onChange={(e) => updateLineItem(item.id, "unit", e.target.value)}
                          data-testid={`input-unit-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.ratePerUnit}
                          onChange={(e) => updateLineItem(item.id, "ratePerUnit", parseFloat(e.target.value) || 0)}
                          data-testid={`input-rate-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateLineItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                          data-testid={`input-amount-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                          className="text-red-500 hover:text-red-700"
                          data-testid={`button-remove-item-${item.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tax & Totals */}
        <Card>
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-lg text-slate-700">TAX & TOTALS</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-500">Tax Type</label>
                  <Select
                    value={invoiceData.appliedTaxType}
                    onValueChange={(value) => setInvoiceData({ ...invoiceData, appliedTaxType: value as "cgst_sgst" | "igst" })}
                  >
                    <SelectTrigger data-testid="select-tax-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="igst">IGST (Interstate)</SelectItem>
                      <SelectItem value="cgst_sgst">CGST + SGST (Intrastate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {invoiceData.appliedTaxType === "cgst_sgst" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">CGST Rate (%)</label>
                      <Input
                        type="number"
                        value={invoiceData.cgstRate}
                        onChange={(e) => setInvoiceData({ ...invoiceData, cgstRate: e.target.value })}
                        data-testid="input-cgst-rate"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">SGST Rate (%)</label>
                      <Input
                        type="number"
                        value={invoiceData.sgstRate}
                        onChange={(e) => setInvoiceData({ ...invoiceData, sgstRate: e.target.value })}
                        data-testid="input-sgst-rate"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-sm text-slate-500">IGST Rate (%)</label>
                    <Input
                      type="number"
                      value={invoiceData.igstRate}
                      onChange={(e) => setInvoiceData({ ...invoiceData, igstRate: e.target.value })}
                      data-testid="input-igst-rate"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Amount</span>
                  <span className="font-medium">{formatCurrency(totals.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Amount before Tax</span>
                  <span className="font-medium">{formatCurrency(totals.totalAmount)}</span>
                </div>
                {invoiceData.appliedTaxType === "cgst_sgst" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">CGST</span>
                      <span>{formatCurrency(totals.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">SGST</span>
                      <span>{formatCurrency(totals.sgstAmount)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">IGST</span>
                    <span>{formatCurrency(totals.igstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-600">Total Tax</span>
                  <span className="font-medium">{formatCurrency(totals.totalTax)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg">
                  <span className="font-bold text-slate-700">Grand Total</span>
                  <span className="font-bold text-blue-600">{formatCurrency(totals.grandTotal)}</span>
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  {numberToWords(totals.grandTotal)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-lg text-slate-700">BANK DETAILS</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Account Name:</span>
                <span className="ml-2 font-medium">{branding?.entityName || "Revira NexGen Structures Pvt. Ltd"}</span>
              </div>
              <div>
                <span className="text-slate-500">Account Number:</span>
                <span className="ml-2 font-medium">073361900002657</span>
              </div>
              <div>
                <span className="text-slate-500">Bank Address:</span>
                <span className="ml-2 font-medium">{branding?.headOfficeAddress || "28 E2 Block, Shivram Park, Nangloi, Delhi 41"}</span>
              </div>
              <div>
                <span className="text-slate-500">IFSC Code:</span>
                <span className="ml-2 font-medium">YESB0000733</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Versions Dialog */}
      <Dialog open={versionsDialogOpen} onOpenChange={setVersionsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invoice Versions</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {invoiceVersions?.map((v) => (
              <div
                key={v.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  v.id === existingInvoice?.id
                    ? "bg-red-50 border-red-200"
                    : "hover:bg-slate-50"
                }`}
                onClick={() => {
                  setLocation(`/revira/projects/${projectId}/invoice/${v.id}`);
                  setVersionsDialogOpen(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center justify-center px-3 h-7 bg-[#d92134] text-white rounded font-bold text-sm mb-1 w-fit">
                      {v.revision}
                    </div>
                    <p className="text-sm text-slate-600">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {invoiceVersions && invoiceVersions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete version ${v.revision}?`)) {
                          deleteInvoiceMutation.mutate(v.id);
                        }
                      }}
                      data-testid={`button-delete-version-${v.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Send Invoice by Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Email id(s)</label>
              <Input
                value={emailForm.to}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                placeholder="sample@domain.com, sample2@domain.com"
                data-testid="input-send-email-to-invoice"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Subject for email</label>
              <Input
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                data-testid="input-send-email-subject-invoice"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Body message</label>
              <Textarea
                value={emailForm.message}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                className="min-h-[120px]"
                data-testid="input-send-email-message-invoice"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailDialogOpen(false)}
                disabled={isSendingEmail}
                data-testid="button-send-email-cancel-invoice"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitSendEmail}
                disabled={isSendingEmail}
                data-testid="button-send-email-submit-invoice"
              >
                {isSendingEmail ? "Sending..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Invoice on WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Mobile Number(s)</label>
              <Input
                value={whatsAppForm.mobile}
                onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, mobile: e.target.value }))}
                placeholder="919876543210, 918888777666"
                data-testid="input-send-whatsapp-mobile-invoice"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Message body</label>
              <Textarea
                value={whatsAppForm.message}
                onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, message: e.target.value }))}
                className="min-h-[120px]"
                data-testid="input-send-whatsapp-message-invoice"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWhatsappDialogOpen(false)}
                disabled={isSendingWhatsApp}
                data-testid="button-send-whatsapp-cancel-invoice"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitSendWhatsApp}
                disabled={isSendingWhatsApp}
                data-testid="button-send-whatsapp-submit-invoice"
              >
                {isSendingWhatsApp ? "Sending..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
