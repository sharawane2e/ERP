import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, FileText, Download, Trash2, Copy, Eye, MapPin, Mail, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import type { Project, Client, GatePass, GatePassItem, Branding } from "@shared/schema";
import jsPDF from "jspdf";

interface GatePassLineItem {
  id: number;
  serialNo: number;
  partMark: string;
  materialDescription: string;
  materialSize: string;
  quantity: number;
  asslyPartSl: string;
  approxValue: string;
  remarks: string;
}

type GatePassType = "GATE PASS";

interface GatePassContentSectionsData {
  gatePassType?: GatePassType;
  issueNo?: string;
  issueDate?: string;
  revNo?: string;
  revDate?: string;
  consigneeName?: string;
  consigneeAddressText?: string;
  modeOfTransport?: string;
  vehicleNumber?: string;
  transportVehicle?: string;
  contactNo?: string;
  contactPerson?: string;
  remarkText?: string;
  storeKeeperSignature?: string;
  qcEnggSignature?: string;
  storeInchargeSignature?: string;
  plantHeadSignature?: string;
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

interface FooterAddButtonProps {
  label: string;
  onClick: () => void;
  testId?: string;
}

const FooterAddButton = ({ label, onClick, testId }: FooterAddButtonProps) => (
  <div className="relative flex w-full items-center justify-center">
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dotted border-[#d92134]"
    />
    <Button
      type="button"
      onClick={onClick}
      className="relative z-10 h-10 min-w-[220px] rounded-full border border-[#d92134]/35 bg-white px-8 text-sm font-semibold text-[#d92134] shadow-none transition hover:bg-[#fff5f6]"
      data-testid={testId}
    >
      + {label}
    </Button>
  </div>
);

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: (() => void) | null;
}

export default function GatePassPage() {
  type SignatureField =
    | "storeKeeperSignature"
    | "qcEnggSignature"
    | "storeInchargeSignature"
    | "plantHeadSignature";
  const params = useParams<{ id: string; gatePassId?: string }>();
  const projectId = params.id;
  const gatePassId = params.gatePassId;
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
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
    onConfirm: null,
  });

  const [gatePassData, setGatePassData] = useState({
    gatePassNumber: "",
    revision: "R-001",
    gatePassType: "GATE PASS" as GatePassType,
    issueNo: "001",
    issueDate: "",
    revNo: "00",
    revDate: "",
    consigneeName: "Company Name",
    consigneeAddressText: "PLOT NO. D3, MIDC Umred, Girad Mohpa Road, Belgaon Umred Nagpur, Maharashtra-441203",
    modeOfTransport: "By Road",
    vehicleNumber: "MH 40 CX 2839",
    transportVehicle: "By Road - MH 40 CX 2839",
    contactNo: "7972800638",
    contactPerson: "SAILESH",
    remarkText: "",
    storeKeeperSignature: "",
    qcEnggSignature: "",
    storeInchargeSignature: "",
    plantHeadSignature: "",
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

  const getProjectShortName = (name: string) => {
    const words = name
      .split(/\s+/)
      .map((w) => w.trim())
      .filter(Boolean);
    if (!words.length) return "PROJECT";
    return words.map((w) => w[0]).join("").toUpperCase();
  };

  const toDocDate = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}-${mm}-${yy}`;
  };

  const [lineItems, setLineItems] = useState<GatePassLineItem[]>([
    { id: 1, serialNo: 1, partMark: "PRA-BS2-193", materialDescription: "BEAM", materialSize: "20", quantity: 1, asslyPartSl: "5/8", approxValue: "-", remarks: "" },
    { id: 2, serialNo: 2, partMark: "PRA-BS2-193", materialDescription: "BEAM", materialSize: "30", quantity: 1, asslyPartSl: "6/8", approxValue: "-", remarks: "" },
    { id: 3, serialNo: 3, partMark: "PRA-BS2-193", materialDescription: "BEAM", materialSize: "-", quantity: 1, asslyPartSl: "7/8", approxValue: "-", remarks: "" },
    { id: 4, serialNo: 4, partMark: "PRA-BS2-193", materialDescription: "BEAM", materialSize: "10", quantity: 1, asslyPartSl: "8/7", approxValue: "-", remarks: "" },
    { id: 5, serialNo: 5, partMark: "PRA-BS2-B168", materialDescription: "BEAM", materialSize: "-", quantity: 1, asslyPartSl: "1/1", approxValue: "-", remarks: "" },
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

  const { data: existingGatePass } = useQuery<GatePass>({
    queryKey: ["/revira/api/gate-passes", gatePassId],
    queryFn: async () => {
      if (gatePassId) {
        const res = await fetch(`/revira/api/gate-passes/${gatePassId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch gate pass");
        return res.json();
      }
      const res = await fetch(`/revira/api/projects/${projectId}/gate-pass`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch gate pass");
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: existingItems } = useQuery<GatePassItem[]>({
    queryKey: ["/revira/api/gate-passes", existingGatePass?.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/revira/api/gate-passes/${existingGatePass?.id}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!existingGatePass?.id,
  });

  const { data: gatePassVersions } = useQuery<GatePass[]>({
    queryKey: ["/revira/api/projects", projectId, "gate-pass-versions"],
    queryFn: async () => {
      const res = await fetch(`/revira/api/projects/${projectId}/gate-pass-versions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!projectId,
  });

  const parseGatePassContentSections = (raw: string | null | undefined): GatePassContentSectionsData => {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as GatePassContentSectionsData;
      }
      return {};
    } catch {
      return {};
    }
  };

  const buildWorkOrderSummary = useCallback(() => {
    if (gatePassData.orderReferenceType === "po") {
      return gatePassData.purchaseOrderNo || "-";
    }
    return gatePassData.workOrderNo || "-";
  }, [gatePassData.orderReferenceType, gatePassData.workOrderNo, gatePassData.purchaseOrderNo]);

  const buildDispatchSummary = useCallback(() => {
    const parts: string[] = [];
    if (gatePassData.vehicleNo.trim()) {
      parts.push(`Vehicle No.: ${gatePassData.vehicleNo.trim()}`);
    }
    if (gatePassData.showDispatchLrNo) {
      parts.push(`L.R. No.: ${gatePassData.dispatchLrNo || "-"}`);
    }
    if (gatePassData.showDispatchPo) {
      parts.push(`P.O.: ${gatePassData.dispatchPoNo || "-"}`);
    }
    if (gatePassData.showDispatchGatePass) {
      parts.push(`Gate Pass: ${gatePassData.dispatchGatePass || "-"}`);
    }
    return parts.length ? parts.join(" | ") : "-";
  }, [
    gatePassData.vehicleNo,
    gatePassData.showDispatchLrNo,
    gatePassData.dispatchLrNo,
    gatePassData.showDispatchPo,
    gatePassData.dispatchPoNo,
    gatePassData.showDispatchGatePass,
    gatePassData.dispatchGatePass,
  ]);

  const buildGatePassContentSections = useCallback(() => {
    const payload: GatePassContentSectionsData = {
      gatePassType: gatePassData.gatePassType,
      issueNo: gatePassData.issueNo,
      issueDate: gatePassData.issueDate,
      revNo: gatePassData.revNo,
      revDate: gatePassData.revDate,
      consigneeName: gatePassData.consigneeName,
      consigneeAddressText: gatePassData.consigneeAddressText,
      modeOfTransport: gatePassData.modeOfTransport,
      vehicleNumber: gatePassData.vehicleNumber,
      transportVehicle: gatePassData.transportVehicle,
      contactNo: gatePassData.contactNo,
      contactPerson: gatePassData.contactPerson,
      remarkText: gatePassData.remarkText,
      storeKeeperSignature: gatePassData.storeKeeperSignature,
      qcEnggSignature: gatePassData.qcEnggSignature,
      storeInchargeSignature: gatePassData.storeInchargeSignature,
      plantHeadSignature: gatePassData.plantHeadSignature,
      orderReferenceType: gatePassData.orderReferenceType,
      showWorkOrderNo: gatePassData.orderReferenceType === "wo",
      showPurchaseOrderNo: gatePassData.orderReferenceType === "po",
      purchaseOrderNo: gatePassData.purchaseOrderNo,
      vehicleNo: gatePassData.vehicleNo,
      showDispatchLrNo: gatePassData.showDispatchLrNo,
      showDispatchPo: gatePassData.showDispatchPo,
      showDispatchGatePass: gatePassData.showDispatchGatePass,
      dispatchLrNo: gatePassData.dispatchLrNo,
      dispatchPoNo: gatePassData.dispatchPoNo,
      dispatchGatePass: gatePassData.dispatchGatePass,
    };
    return JSON.stringify(payload);
  }, [gatePassData]);

  // Set defaults for New Gate Pass
  useEffect(() => {
    if (project && client && !existingGatePass) {
      const date = new Date();
      const shortName = getProjectShortName(project.projectName);
      const docDate = toDocDate(date);
      
      setGatePassData(prev => ({
        ...prev,
        gatePassNumber: `RNS/${shortName}/${docDate}/RNS-GT-002`,
        issueDate: date.toISOString().split("T")[0],
        revDate: date.toISOString().split("T")[0],
        consigneeName: "Company Name",
        consigneeAddressText: "PLOT NO. D3, MIDC Umred, Girad Mohpa Road, Belgaon Umred Nagpur, Maharashtra-441203",
        modeOfTransport: "By Road",
        vehicleNumber: "MH 40 CX 2839",
        transportVehicle: "By Road - MH 40 CX 2839",
        contactNo: "7972800638",
        contactPerson: "SAILESH",
        organisationName: client.name,
        registeredAddress: client.location,
        consigneeAddress: `${client.name}\n${client.location}`,
        clientGstin: client.gstNo || "",
      }));
    }
  }, [project, client, existingGatePass]);

  // Load existing gate pass data
  useEffect(() => {
    if (existingGatePass) {
      const parsedContent = parseGatePassContentSections(existingGatePass.contentSections);
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
      const legacyTransport = parsedContent.transportVehicle || existingGatePass.dispatchDetails || "";
      const transportParts = legacyTransport.includes("-")
        ? legacyTransport.split("-").map((v) => v.trim())
        : [];
      setGatePassData({
        gatePassNumber: existingGatePass.gatePassNumber,
        revision: existingGatePass.revision,
        gatePassType: parsedContent.gatePassType || "GATE PASS",
        issueNo: parsedContent.issueNo || "001",
        issueDate: parsedContent.issueDate || "",
        revNo: parsedContent.revNo || "00",
        revDate: parsedContent.revDate || "",
        consigneeName: parsedContent.consigneeName || existingGatePass.organisationName || "",
        consigneeAddressText: parsedContent.consigneeAddressText || existingGatePass.registeredAddress || "",
        modeOfTransport: parsedContent.modeOfTransport || transportParts[0] || "By Road",
        vehicleNumber: parsedContent.vehicleNumber || transportParts[1] || "",
        transportVehicle: parsedContent.transportVehicle || parsedContent.vehicleNo || existingGatePass.dispatchDetails || "",
        contactNo: parsedContent.contactNo || "",
        contactPerson: parsedContent.contactPerson || "",
        remarkText: parsedContent.remarkText || "",
        storeKeeperSignature: parsedContent.storeKeeperSignature || "",
        qcEnggSignature: parsedContent.qcEnggSignature || "",
        storeInchargeSignature: parsedContent.storeInchargeSignature || "",
        plantHeadSignature: parsedContent.plantHeadSignature || "",
        organisationName: existingGatePass.organisationName,
        registeredAddress: existingGatePass.registeredAddress,
        consigneeAddress: existingGatePass.consigneeAddress,
        clientGstin: existingGatePass.clientGstin || "",
        workOrderNo: cleanReferenceValue(existingGatePass.workOrderNo) || "NIL",
        orderReferenceType,
        purchaseOrderNo: parsedContent.purchaseOrderNo || (orderReferenceType === "po" ? cleanReferenceValue(existingGatePass.workOrderNo) : ""),
        dispatchDetails: existingGatePass.dispatchDetails || "-",
        vehicleNo: parsedContent.vehicleNo || (!hasDispatchConfig && existingGatePass.dispatchDetails && existingGatePass.dispatchDetails !== "-" ? existingGatePass.dispatchDetails : ""),
        showDispatchLrNo: parsedContent.showDispatchLrNo ?? false,
        showDispatchPo: parsedContent.showDispatchPo ?? false,
        showDispatchGatePass: parsedContent.showDispatchGatePass ?? false,
        dispatchLrNo: parsedContent.dispatchLrNo || "",
        dispatchPoNo: parsedContent.dispatchPoNo || "",
        dispatchGatePass: parsedContent.dispatchGatePass || "",
        appliedTaxType: (existingGatePass.appliedTaxType as "cgst_sgst" | "igst") || "igst",
        cgstRate: existingGatePass.cgstRate || "9",
        sgstRate: existingGatePass.sgstRate || "9",
        igstRate: existingGatePass.igstRate || "18",
      });
    }
  }, [existingGatePass]);

  // Load existing items
  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setLineItems(existingItems.map((item, idx) => ({
        id: item.id,
        serialNo: item.serialNo > 0 ? item.serialNo : idx + 1,
        partMark: item.hsnCode || "",
        materialDescription: item.description || "",
        materialSize: item.ratePerUnit && item.ratePerUnit !== "0" ? item.ratePerUnit : "-",
        quantity: Number(item.quantity) || 0,
        asslyPartSl: item.unit || "",
        approxValue: item.amount && item.amount !== "0" ? item.amount : "-",
        remarks: item.remarks || "",
      })));
    }
  }, [existingItems]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const totalAmount = lineItems.reduce((sum, item) => {
      const numeric = Number(String(item.approxValue).replace(/,/g, ""));
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (gatePassData.appliedTaxType === "cgst_sgst") {
      cgstAmount = totalAmount * (Number(gatePassData.cgstRate) / 100);
      sgstAmount = totalAmount * (Number(gatePassData.sgstRate) / 100);
    } else {
      igstAmount = totalAmount * (Number(gatePassData.igstRate) / 100);
    }

    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const grandTotal = totalAmount + totalTax;

    return { totalAmount, cgstAmount, sgstAmount, igstAmount, totalTax, grandTotal };
  }, [lineItems, gatePassData.appliedTaxType, gatePassData.cgstRate, gatePassData.sgstRate, gatePassData.igstRate]);

  const totals = calculateTotals();

  const toDecimalString = (value: string | number, fallback = "0") => {
    const n = Number(String(value ?? "").replace(/,/g, "").trim());
    return Number.isFinite(n) ? String(n) : fallback;
  };

  const toggleBrandingSignature = (
    field: SignatureField,
    brandingField: "storeKeeperSignUrl" | "qcEnggSignUrl" | "storeInchargeSignUrl" | "plantHeadSignUrl"
  ) => {
    const source = branding?.[brandingField] || "";
    setGatePassData((prev) => {
      if (prev[field]) return { ...prev, [field]: "" };
      if (!source) {
        toast({
          title: "No branding signature",
          description: "Upload this signature image in Branding page first.",
          variant: "destructive",
        });
        return prev;
      }
      return { ...prev, [field]: source };
    });
  };

  const getPersistableLineItems = useCallback(() => {
    return lineItems
      .slice(0, 5)
      .filter((item) => item.partMark.trim() || item.materialDescription.trim());
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

  const createGatePassMutation = useMutation({
    mutationFn: async () => {
      const persistableLineItems = getPersistableLineItems();
      const gatePassRes = await apiRequest("POST", "/revira/api/gate-passes", {
        projectId: Number(projectId),
        gatePassNumber: gatePassData.gatePassNumber,
        revision: gatePassData.revision,
        organisationName: gatePassData.consigneeName || "Company Name",
        registeredAddress: gatePassData.consigneeAddressText || "-",
        consigneeAddress: `${gatePassData.consigneeName || "Company Name"}\n${gatePassData.consigneeAddressText || "-"}`.trim(),
        clientGstin: gatePassData.clientGstin,
        workOrderNo: gatePassData.issueNo || "-",
        dispatchDetails: `${gatePassData.modeOfTransport || "By Road"} - ${gatePassData.vehicleNumber || "-"}`,
        appliedTaxType: gatePassData.appliedTaxType,
        cgstRate: gatePassData.cgstRate,
        sgstRate: gatePassData.sgstRate,
        igstRate: gatePassData.igstRate,
        contentSections: buildGatePassContentSections(),
        totalAmount: String(totals.totalAmount),
        totalTax: String(totals.totalTax),
        grandTotal: String(totals.grandTotal),
      });
      const gatePass = await gatePassRes.json();
      
      for (let idx = 0; idx < persistableLineItems.length; idx++) {
        const item = persistableLineItems[idx];
        await apiRequest("POST", `/revira/api/gate-passes/${gatePass.id}/items`, {
          serialNo: item.serialNo > 0 ? item.serialNo : idx + 1,
          description: item.materialDescription,
          hsnCode: item.partMark,
          quantity: toDecimalString(item.quantity),
          unit: item.asslyPartSl,
          ratePerUnit: toDecimalString(item.materialSize, "0"),
          percentage: "0",
          amount: toDecimalString(item.approxValue, "0"),
          remarks: item.remarks,
        });
      }
      
      return gatePass;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "gate-pass-versions"] });
      setLocation(`/revira/projects/${projectId}/gate-pass/${data.id}`);
      toast({
        title: "Gate Pass saved",
        description: "The gate pass has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create gate pass",
        variant: "destructive",
      });
    },
  });

  const updateGatePassMutation = useMutation({
    mutationFn: async () => {
      const persistableLineItems = getPersistableLineItems();
      await apiRequest("PUT", `/revira/api/gate-passes/${existingGatePass?.id}`, {
        gatePassNumber: gatePassData.gatePassNumber || "RNS/PROJECT/00-00-00/RNS-GT-002",
        revision: gatePassData.revision,
        organisationName: gatePassData.consigneeName || "Company Name",
        registeredAddress: gatePassData.consigneeAddressText || "-",
        consigneeAddress: `${gatePassData.consigneeName || "Company Name"}\n${gatePassData.consigneeAddressText || "-"}`.trim(),
        clientGstin: gatePassData.clientGstin,
        workOrderNo: gatePassData.issueNo || "-",
        dispatchDetails: `${gatePassData.modeOfTransport || "By Road"} - ${gatePassData.vehicleNumber || "-"}`,
        appliedTaxType: gatePassData.appliedTaxType,
        cgstRate: gatePassData.cgstRate,
        sgstRate: gatePassData.sgstRate,
        igstRate: gatePassData.igstRate,
        contentSections: buildGatePassContentSections(),
        totalAmount: String(totals.totalAmount),
        totalTax: String(totals.totalTax),
        grandTotal: String(totals.grandTotal),
      });

      let itemsToDelete = existingItems || [];
      if (!itemsToDelete.length) {
        const res = await fetch(`/revira/api/gate-passes/${existingGatePass?.id}/items`, { credentials: "include" });
        if (res.ok) {
          itemsToDelete = await res.json();
        }
      }

      for (const item of itemsToDelete) {
        await apiRequest("DELETE", `/revira/api/gate-pass-items/${item.id}`);
      }

      for (let idx = 0; idx < persistableLineItems.length; idx++) {
        const item = persistableLineItems[idx];
        await apiRequest("POST", `/revira/api/gate-passes/${existingGatePass?.id}/items`, {
          serialNo: item.serialNo > 0 ? item.serialNo : idx + 1,
          description: item.materialDescription,
          hsnCode: item.partMark,
          quantity: toDecimalString(item.quantity),
          unit: item.asslyPartSl,
          ratePerUnit: toDecimalString(item.materialSize, "0"),
          percentage: "0",
          amount: toDecimalString(item.approxValue, "0"),
          remarks: item.remarks,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/gate-passes"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/gate-passes", existingGatePass?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "gate-pass-versions"] });
      toast({
        title: "Gate Pass updated",
        description: "The gate pass has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update gate pass",
        variant: "destructive",
      });
    },
  });

  const duplicateGatePassMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/revira/api/gate-passes/${existingGatePass?.id}/duplicate`, {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "gate-pass-versions"] });
      setLocation(`/revira/projects/${projectId}/gate-pass/${data.id}`);
      toast({
        title: "Gate Pass duplicated",
        description: `Created new version: ${data.revision}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate gate pass",
        variant: "destructive",
      });
    },
  });

  const deleteGatePassMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/revira/api/gate-passes/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "gate-pass-versions"] });
      toast({
        title: "Gate Pass deleted",
        description: "The gate pass version has been deleted.",
      });
      setVersionsDialogOpen(false);
      if (gatePassVersions && gatePassVersions.length > 1) {
        const remaining = gatePassVersions.filter(v => v.id !== existingGatePass?.id);
        if (remaining.length > 0) {
          setLocation(`/revira/projects/${projectId}/gate-pass/${remaining[0].id}`);
        } else {
          setLocation(`/revira/projects/${projectId}/gate-pass`);
        }
      } else {
        setLocation(`/revira/projects/${projectId}/gate-pass`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete gate pass",
        variant: "destructive",
      });
    },
  });

  const handleSaveGatePass = () => {
    if (existingGatePass) {
      updateGatePassMutation.mutate();
    } else {
      createGatePassMutation.mutate();
    }
  };

  const addLineItem = () => {
    const newId = Math.max(...lineItems.map(i => i.id), 0) + 1;
    setLineItems([...lineItems, {
      id: newId,
      serialNo: lineItems.length + 1,
      partMark: "",
      materialDescription: "",
      materialSize: "-",
      quantity: 0,
      asslyPartSl: "",
      approxValue: "-",
      remarks: "",
    }]);
  };

  const removeLineItem = (id: number) => {
    if (lineItems.length > 1) {
      const updated = lineItems.filter(item => item.id !== id);
      setLineItems(updated.map((item, idx) => ({ ...item, serialNo: idx + 1 })));
    }
  };

  const updateLineItem = (id: number, field: keyof GatePassLineItem, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
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

  const getApproxValueTotal = () => {
    return lineItems.reduce((sum, item) => {
      const numeric = Number(String(item.approxValue || "").replace(/,/g, "").trim());
      return sum + (Number.isFinite(numeric) ? numeric : 0);
    }, 0);
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
        const colWidths = [38, 57, 38, 57];
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

      const gatePassTitle = "NON-RETURNABLE GATE PASS";
      const issueDateText = gatePassData.issueDate
        ? new Date(gatePassData.issueDate).toLocaleDateString("en-GB")
        : new Date().toLocaleDateString("en-GB");
      const revDateText = gatePassData.revDate
        ? new Date(gatePassData.revDate).toLocaleDateString("en-GB")
        : new Date().toLocaleDateString("en-GB");

      addHeaderFooterStamp(currentPage);

      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor("#da2032");
      pdf.text(gatePassTitle, pageWidth / 2, currentY, { align: "center" });
      currentY += 8;

      addSectionTitle("Gate Pass Details", 11);
      addFourColumnClientTable(
        [
          ["Doc. No", gatePassData.gatePassNumber || "RNS/PROJECT/00-00-00/RNS-GT-002"],
          ["Date", issueDateText || "-"],
          ["CONSIGNEE NAME", gatePassData.consigneeName || "Company Name"],
          ["CONSIGNEE ADDRESS", gatePassData.consigneeAddressText || "PLOT NO. D3, MIDC Umred, Girad Mohpa Road, Belgaon Umred Nagpur, Maharashtra-441203"],
          ["Mode of transport", gatePassData.modeOfTransport || "By Road"],
          ["Vehicle No.", gatePassData.vehicleNumber || "MH 40 CX 2839"],
          ["Contact No.", gatePassData.contactNo || "7972800638"],
          ["Contact person", gatePassData.contactPerson || "SAILESH"],
        ],
        []
      );
      currentY += blockGap;

      const tableHeaders = ["SR. NO.", "PARTMARK", "MATERIAL DISCRIPTION", "MATERIAL SIZE", "QUANTITY", "ASSLY PART SL", "APPROX. VALUE"];
      const colWidths = [14, 25, 40, 29, 20, 24, 28];
      const tableRows = lineItems
        .filter((item) => item.partMark.trim() || item.materialDescription.trim())
        .map((item) => [
          item.serialNo ? String(item.serialNo) : "",
          item.partMark,
          item.materialDescription,
          item.materialSize,
          String(item.quantity),
          item.asslyPartSl,
          item.approxValue,
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

      const totalQty = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      const totalApproxValue = getApproxValueTotal();
      const totalRow = ["", "", "TOTAL", "", String(totalQty), "", totalApproxValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })];
      const totalCells = totalRow.map((cell, i) => pdf.splitTextToSize(cell, colWidths[i] - cellInnerPad * 2));
      const totalMaxLines = Math.max(...totalCells.map((lines) => lines.length));
      const totalRowHeight = Math.max(5.8, totalMaxLines * 3.2 + 1.2);
      checkNewPage(totalRowHeight + 2);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, currentY - 3.0, contentWidth, totalRowHeight, "F");
      pdf.setDrawColor(borderColor);
      pdf.rect(margin, currentY - 3.0, contentWidth, totalRowHeight, "S");
      let totalX = margin;
      totalCells.forEach((cellLines, i) => {
        pdf.line(totalX, currentY - 3.0, totalX, currentY - 3.0 + totalRowHeight);
        pdf.setFont("helvetica", i === 2 || i === 4 || i === 5 || i === 6 ? "bold" : "normal");
        cellLines.forEach((line: string, lineIdx: number) => {
          pdf.text(line, totalX + cellInnerPad, currentY + 0.1 + cellTopPad + lineIdx * 3.2);
        });
        totalX += colWidths[i];
      });
      pdf.line(totalX, currentY - 3.0, totalX, currentY - 3.0 + totalRowHeight);
      currentY += totalRowHeight;

      currentY += blockGap;
      addSectionTitle("Remark", 11);
      const remarkHeight = 18;
      checkNewPage(remarkHeight + 5);
      pdf.setDrawColor(borderColor);
      pdf.rect(margin, currentY - 3.0, contentWidth, remarkHeight, "S");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      const remarkLines = pdf.splitTextToSize(gatePassData.remarkText || "-", contentWidth - 2 * cellInnerPad);
      remarkLines.forEach((line: string, idx: number) => {
        pdf.text(line, margin + cellInnerPad, currentY + 0.1 + cellTopPad + idx * 3.2);
      });
      currentY += remarkHeight + blockGap;

      addSectionTitle("Signature", 11);
      const signatures: Array<{ label: string; data: string }> = [
        { label: "Store Keeper", data: gatePassData.storeKeeperSignature },
        { label: "Qc Engg.", data: gatePassData.qcEnggSignature },
        { label: "Store Incharge", data: gatePassData.storeInchargeSignature },
        { label: "Plant Head", data: gatePassData.plantHeadSignature },
      ];
      const signGap = 3;
      const signBoxHeight = 22;
      const signBoxWidth = (contentWidth - signGap * 3) / 4;
      checkNewPage(signBoxHeight + 12);
      signatures.forEach((sig, idx) => {
        const x = margin + idx * (signBoxWidth + signGap);
        pdf.rect(x, currentY - 3.0, signBoxWidth, signBoxHeight, "S");
        if (sig.data) {
          try {
            const imgProps = pdf.getImageProperties(sig.data);
            const naturalW = imgProps.width || 1;
            const naturalH = imgProps.height || 1;
            const targetW = signBoxWidth - 2;
            const targetH = signBoxHeight - 7;
            const imgRatio = naturalW / naturalH;
            const boxRatio = targetW / targetH;

            let drawW = targetW;
            let drawH = targetH;
            if (imgRatio > boxRatio) {
              drawH = targetW / imgRatio;
            } else {
              drawW = targetH * imgRatio;
            }

            const drawX = x + 1 + (targetW - drawW) / 2;
            const drawY = currentY - 2.2 + (targetH - drawH) / 2;
            pdf.addImage(sig.data, "PNG", drawX, drawY, drawW, drawH);
          } catch {
            // ignore bad image
          }
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.text(sig.label, x + signBoxWidth / 2, currentY + signBoxHeight - 1.2, { align: "center" });
      });
      currentY += signBoxHeight;

      const date = new Date();
      const dateStr = `${String(date.getDate()).padStart(2, "0")}${String(date.getMonth() + 1).padStart(2, "0")}${date.getFullYear()}`;
      const companyShort = (branding?.entityName || "RNS").split(" ").map((w) => w[0]).join("");
      const titlePrefix = "GATE_PASS";
      const fileName = `${titlePrefix}_${dateStr}_${companyShort}_${gatePassData.revision}.pdf`;

      const dataUri = returnDataUri ? (pdf.output("datauristring", { filename: fileName }) as string) : undefined;
      if (save) {
        pdf.save(fileName);
      }
      if (!silent) {
        toast({
          title: save ? "PDF exported" : "PDF generated",
          description: save ? `Gate Pass saved as ${fileName}` : "Gate pass PDF is ready.",
        });
      }
      return { fileName, dataUri };
    } catch (error) {
      console.error("PDF export error:", error);
      if (!silent) {
        toast({
          title: "Export failed",
          description: "Failed to export gate pass PDF. Please try again.",
          variant: "destructive",
        });
      }
      return null;
    }
  };

  const defaultEmailSignature =
    "-------------\nThanks & Regards\nHareram Sharma\nRevira Nexgen Structures Pvt. Ltd.\nMo. No. 8390491843";

  const openSendEmailDialog = () => {
    if (!existingGatePass?.id) {
      toast({
        title: "Save required",
        description: "Please save gate pass first, then send via email.",
        variant: "destructive",
      });
      return;
    }
    setEmailForm({
      to: client?.emailAddress || "",
      subject: `Gate Pass ${gatePassData.gatePassNumber || ""} ${gatePassData.revision || ""}`.trim(),
      message: `Please find the attached file for details\n\n${defaultEmailSignature}`,
    });
    setEmailDialogOpen(true);
  };

  const submitSendEmail = async () => {
    if (!existingGatePass?.id) {
      toast({
        title: "Save required",
        description: "Please save gate pass first, then send via email.",
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
        description: "Unable to generate gate pass PDF for email.",
        variant: "destructive",
      });
      return;
    }
    try {
      const base64 = generated.dataUri.split(",")[1] || "";
      const emailRes = await apiRequest("POST", `/revira/api/gate-passes/${existingGatePass.id}/send-email`, {
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
    if (!existingGatePass?.id) {
      toast({
        title: "Save required",
        description: "Please save gate pass first, then send on WhatsApp.",
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
    if (!existingGatePass?.id) {
      toast({
        title: "Save required",
        description: "Please save gate pass first, then send on WhatsApp.",
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
        description: "Unable to generate gate pass PDF for WhatsApp send.",
        variant: "destructive",
      });
      return;
    }
    try {
      const base64 = generated.dataUri.split(",")[1] || "";
      await apiRequest("POST", `/revira/api/gate-passes/${existingGatePass.id}/send-whatsapp`, {
        to: phones,
        message: whatsAppForm.message.trim(),
        fileName: generated.fileName,
        pdfBase64: base64,
      });
      toast({
        title: "WhatsApp sent",
        description: `Gate pass sent to ${phones.join(", ")}.`,
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
            onClick={() => setLocation(`/revira/projects/${projectId}/gate-pass`)}
            data-testid="button-new-gate-pass"
          >
            <FileText className="w-4 h-4 mr-2" />
            New Gate Pass
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
              {existingGatePass?.revision || gatePassData.revision || 'R-001'}
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
            
            {existingGatePass && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => duplicateGatePassMutation.mutate()}
                disabled={duplicateGatePassMutation.isPending}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                data-testid="button-duplicate-gate-pass"
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
              data-testid="button-send-email-gate-pass"
              title="Send gate pass by email"
            >
              <Mail className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={openSendWhatsAppDialog}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              data-testid="button-send-whatsapp-gate-pass"
              title="Send gate pass on WhatsApp"
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSaveGatePass}
              disabled={createGatePassMutation.isPending || updateGatePassMutation.isPending}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              data-testid="button-save-gate-pass"
            >
              <Save className="w-4 h-4 mr-2" />
              {createGatePassMutation.isPending || updateGatePassMutation.isPending 
                ? "Saving..." 
                : "Save Changes"}
            </Button>
            
            {existingGatePass && gatePassVersions && gatePassVersions.length > 1 && (
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-red-200"
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    title: "Delete Gate Pass?",
                    description: `Are you sure you want to delete this gate pass (${existingGatePass.revision})?`,
                    onConfirm: () => deleteGatePassMutation.mutate(existingGatePass.id),
                  })
                }
                data-testid="button-delete-gate-pass"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Gate Pass Content */}
        <div className="space-y-6">
        <Card>
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-lg text-slate-700 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              GATE PASS DETAILS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-500">Doc. No</label>
                <Input
                  value={gatePassData.gatePassNumber}
                  onChange={(e) => setGatePassData({ ...gatePassData, gatePassNumber: e.target.value })}
                  data-testid="input-doc-no"
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">Date</label>
                <Input
                  type="date"
                  value={gatePassData.issueDate}
                  onChange={(e) => setGatePassData({ ...gatePassData, issueDate: e.target.value })}
                  data-testid="input-date"
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-500">CONSIGNEE NAME</label>
              <Input
                value={gatePassData.consigneeName}
                onChange={(e) => setGatePassData({ ...gatePassData, consigneeName: e.target.value })}
                data-testid="input-consignee-name"
              />
            </div>
            <div>
              <label className="text-sm text-slate-500">CONSIGNEE ADDRESS</label>
              <Textarea
                value={gatePassData.consigneeAddressText}
                onChange={(e) => setGatePassData({ ...gatePassData, consigneeAddressText: e.target.value })}
                rows={3}
                data-testid="input-consignee-address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-500">Mode of transport</label>
                <Input
                  value={gatePassData.modeOfTransport}
                  onChange={(e) => setGatePassData({ ...gatePassData, modeOfTransport: e.target.value })}
                  data-testid="input-mode-of-transport"
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">Vehicle No.</label>
                <Input
                  value={gatePassData.vehicleNumber}
                  onChange={(e) => setGatePassData({ ...gatePassData, vehicleNumber: e.target.value })}
                  data-testid="input-vehicle-number"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-500">Contact No.</label>
                <Input
                  value={gatePassData.contactNo}
                  onChange={(e) => setGatePassData({ ...gatePassData, contactNo: e.target.value })}
                  data-testid="input-contact-no"
                />
              </div>
              <div>
                <label className="text-sm text-slate-500">Contact Person</label>
                <Input
                  value={gatePassData.contactPerson}
                  onChange={(e) => setGatePassData({ ...gatePassData, contactPerson: e.target.value })}
                  data-testid="input-contact-person"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Table */}
        <Card>
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-lg text-slate-700">GATE PASS ITEMS</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-16">SR. NO.</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-44">PARTMARK</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-48">MATERIAL DISCRIPTION</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-24">MATERIAL SIZE</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-20">QUANTITY</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-28">ASSLY PART SL</th>
                    <th className="p-3 text-left text-sm font-medium text-slate-600 w-24">APPROX. VALUE</th>
                    <th className="p-3 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3">
                        <Input
                          value={item.serialNo === 0 ? "" : item.serialNo}
                          onChange={(e) => updateLineItem(item.id, "serialNo", parseInt(e.target.value) || 0)}
                          className="w-14 text-center"
                          data-testid={`input-serial-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.partMark}
                          onChange={(e) => updateLineItem(item.id, "partMark", e.target.value)}
                          data-testid={`input-partmark-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.materialDescription}
                          onChange={(e) => updateLineItem(item.id, "materialDescription", e.target.value)}
                          data-testid={`input-material-description-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.materialSize}
                          onChange={(e) => updateLineItem(item.id, "materialSize", e.target.value)}
                          data-testid={`input-material-size-${item.id}`}
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
                          value={item.asslyPartSl}
                          onChange={(e) => updateLineItem(item.id, "asslyPartSl", e.target.value)}
                          data-testid={`input-assly-part-sl-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.approxValue}
                          onChange={(e) => updateLineItem(item.id, "approxValue", e.target.value)}
                          data-testid={`input-approx-value-${item.id}`}
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          disabled={lineItems.length === 1}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          data-testid={`button-remove-item-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t bg-slate-50">
                    <td className="p-3"></td>
                    <td className="p-3"></td>
                    <td className="p-3 font-semibold">TOTAL</td>
                    <td className="p-3"></td>
                    <td className="p-3 font-semibold">
                      {lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}
                    </td>
                    <td className="p-3 font-semibold"></td>
                    <td className="p-3 font-semibold">
                      {getApproxValueTotal().toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t bg-gradient-to-b from-white to-slate-50/70 text-center">
              <FooterAddButton label="Add Row" onClick={addLineItem} testId="button-add-item" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-lg text-slate-700">REMARK</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Textarea
              value={gatePassData.remarkText}
              onChange={(e) => setGatePassData({ ...gatePassData, remarkText: e.target.value })}
              rows={4}
              placeholder="Add remark..."
              data-testid="input-gate-pass-remark"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="bg-slate-100">
            <CardTitle className="text-lg text-slate-700">SIGNATURE</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="border rounded-md p-2">
                <button
                  type="button"
                  className={`w-full h-20 border rounded bg-white overflow-hidden ${gatePassData.storeKeeperSignature ? "ring-2 ring-[#d92134]" : ""}`}
                  onClick={() => toggleBrandingSignature("storeKeeperSignature", "storeKeeperSignUrl")}
                  data-testid="signature-store-keeper"
                >
                  {gatePassData.storeKeeperSignature ? (
                    <img src={gatePassData.storeKeeperSignature} alt="Store Keeper Signature" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Click to select</div>
                  )}
                </button>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Store Keeper</span>
                  <span className="text-xs text-slate-500">{gatePassData.storeKeeperSignature ? "Selected" : "Not selected"}</span>
                </div>
              </div>
              <div className="border rounded-md p-2">
                <button
                  type="button"
                  className={`w-full h-20 border rounded bg-white overflow-hidden ${gatePassData.qcEnggSignature ? "ring-2 ring-[#d92134]" : ""}`}
                  onClick={() => toggleBrandingSignature("qcEnggSignature", "qcEnggSignUrl")}
                  data-testid="signature-qc-engg"
                >
                  {gatePassData.qcEnggSignature ? (
                    <img src={gatePassData.qcEnggSignature} alt="Qc Engg. Signature" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Click to select</div>
                  )}
                </button>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Qc Engg.</span>
                  <span className="text-xs text-slate-500">{gatePassData.qcEnggSignature ? "Selected" : "Not selected"}</span>
                </div>
              </div>
              <div className="border rounded-md p-2">
                <button
                  type="button"
                  className={`w-full h-20 border rounded bg-white overflow-hidden ${gatePassData.storeInchargeSignature ? "ring-2 ring-[#d92134]" : ""}`}
                  onClick={() => toggleBrandingSignature("storeInchargeSignature", "storeInchargeSignUrl")}
                  data-testid="signature-store-incharge"
                >
                  {gatePassData.storeInchargeSignature ? (
                    <img src={gatePassData.storeInchargeSignature} alt="Store Incharge Signature" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Click to select</div>
                  )}
                </button>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Store Incharge</span>
                  <span className="text-xs text-slate-500">{gatePassData.storeInchargeSignature ? "Selected" : "Not selected"}</span>
                </div>
              </div>
              <div className="border rounded-md p-2">
                <button
                  type="button"
                  className={`w-full h-20 border rounded bg-white overflow-hidden ${gatePassData.plantHeadSignature ? "ring-2 ring-[#d92134]" : ""}`}
                  onClick={() => toggleBrandingSignature("plantHeadSignature", "plantHeadSignUrl")}
                  data-testid="signature-plant-head"
                >
                  {gatePassData.plantHeadSignature ? (
                    <img src={gatePassData.plantHeadSignature} alt="Plant Head Signature" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">Click to select</div>
                  )}
                </button>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Plant Head</span>
                  <span className="text-xs text-slate-500">{gatePassData.plantHeadSignature ? "Selected" : "Not selected"}</span>
                </div>
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
            <DialogTitle>Gate Pass Versions</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {gatePassVersions?.map((v) => (
              <div
                key={v.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  v.id === existingGatePass?.id
                    ? "bg-red-50 border-red-200"
                    : "hover:bg-slate-50"
                }`}
                onClick={() => {
                  setLocation(`/revira/projects/${projectId}/gate-pass/${v.id}`);
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
                  {gatePassVersions && gatePassVersions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDialog({
                          open: true,
                          title: "Delete Gate Pass Version?",
                          description: `Are you sure you want to delete version ${v.revision}?`,
                          onConfirm: () => deleteGatePassMutation.mutate(v.id),
                        });
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
            <DialogTitle>Send Gate Pass by Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Email id(s)</label>
              <Input
                value={emailForm.to}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                placeholder="sample@domain.com, sample2@domain.com"
                data-testid="input-send-email-to-gate-pass"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Subject for email</label>
              <Input
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                data-testid="input-send-email-subject-gate-pass"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Body message</label>
              <Textarea
                value={emailForm.message}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                className="min-h-[120px]"
                data-testid="input-send-email-message-gate-pass"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailDialogOpen(false)}
                disabled={isSendingEmail}
                data-testid="button-send-email-cancel-gate-pass"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitSendEmail}
                disabled={isSendingEmail}
                data-testid="button-send-email-submit-gate-pass"
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
            <DialogTitle>Send Gate Pass on WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Mobile Number(s)</label>
              <Input
                value={whatsAppForm.mobile}
                onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, mobile: e.target.value }))}
                placeholder="919876543210, 918888777666"
                data-testid="input-send-whatsapp-mobile-gate-pass"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Message body</label>
              <Textarea
                value={whatsAppForm.message}
                onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, message: e.target.value }))}
                className="min-h-[120px]"
                data-testid="input-send-whatsapp-message-gate-pass"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWhatsappDialogOpen(false)}
                disabled={isSendingWhatsApp}
                data-testid="button-send-whatsapp-cancel-gate-pass"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitSendWhatsApp}
                disabled={isSendingWhatsApp}
                data-testid="button-send-whatsapp-submit-gate-pass"
              >
                {isSendingWhatsApp ? "Sending..." : "Submit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ConfirmActionDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, title: "", description: "", onConfirm: null });
          }
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
          setConfirmDialog({ open: false, title: "", description: "", onConfirm: null });
        }}
        confirmLabel="Delete"
        confirmTestId="confirm-delete-gate-pass-action"
        cancelTestId="cancel-delete-gate-pass-action"
      />
    </LayoutShell>
  );
}




