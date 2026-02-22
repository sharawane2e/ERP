import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  FileText, 
  Save, 
  Plus, 
  Trash2,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  Eye,
  MapPin,
  Mail,
  MessageCircle
} from "lucide-react";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project, Client, Quotation, QuotationItem, Branding } from "@shared/schema";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface LineItem {
  id?: number;
  serialNo: number;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  remarks: string;
}

interface ContentSection {
  id: string;
  type: 'paragraph' | 'heading';
  content: string;
  editable?: boolean;
}

interface ScopeTableRow {
  slNo: number;
  description: string;
  details: string;
}

interface CommercialTermRow {
  slNo: number;
  description: string;
  conditions: string;
}

interface BankDetailRow {
  particular: string;
  value: string;
}

interface PaymentTermSection {
  id: string;
  heading: string;
  terms: string[];
}

interface DrawingUploadItem {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
}

type AccordionBlockType =
  | "scopeBrief"
  | "scopeBasic"
  | "scopeAdditions"
  | "steelWork"
  | "designLoads"
  | "applicableCodes"
  | "materialSpecs"
  | "drawingsDelivery"
  | "erectionScopeClient"
  | "erectionScopeCompany"
  | "commercialPrice"
  | "paymentTerms"
  | "commercialTerms";

interface AccordionBlockInstance {
  id: string;
  type: AccordionBlockType;
  heading: string;
}

interface ScopeTableProps {
  data: ScopeTableRow[];
  section: string;
  showAddButton?: boolean;
  onUpdateRow: (section: string, index: number, field: 'description' | 'details', value: string) => void;
  onRemoveRow: (section: string, index: number) => void;
  onAddRow: (section: string) => void;
}

const ScopeTable = memo(function ScopeTable({ 
  data, 
  section, 
  showAddButton = true,
  onUpdateRow,
  onRemoveRow,
  onAddRow
}: ScopeTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b">
            <th className="text-left p-3 w-16 text-slate-600 font-medium">Sr. No.</th>
            <th className="text-left p-3 text-slate-600 font-medium">Description</th>
            <th className="text-left p-3 text-slate-600 font-medium">Details</th>
            <th className="w-12 p-3"></th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={`${section}-${index}`} className="border-b hover:bg-slate-50">
              <td className="p-3 text-center text-slate-600">{row.slNo}</td>
              <td className="p-3">
                <Input
                  value={row.description}
                  onChange={(e) => onUpdateRow(section, index, 'description', e.target.value)}
                  className="h-8 border-0 bg-transparent focus:bg-white"
                  data-testid={`input-${section}-desc-${index}`}
                />
              </td>
              <td className="p-3">
                <Input
                  value={row.details}
                  onChange={(e) => onUpdateRow(section, index, 'details', e.target.value)}
                  className="h-8 border-0 bg-transparent focus:bg-white"
                  data-testid={`input-${section}-details-${index}`}
                />
              </td>
              <td className="p-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveRow(section, index)}
                  disabled={data.length === 1}
                  className="h-8 w-8 text-red-500"
                  data-testid={`button-remove-${section}-${index}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showAddButton && (
        <div className="p-3 border-t bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onAddRow(section)}
            className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
            data-testid={`button-add-${section}`}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
        </div>
      )}
    </div>
  );
});

interface QuotationContentSections {
  proposalTitle?: string;
  toLabel?: string;
  msLabel?: string;
  accordionBlocks?: AccordionBlockInstance[];
  introSections: ContentSection[];
  paymentTerms: string[];
  notes: string[];
  closingParagraphs: ContentSection[];
  closingThanks: string;
  closingCompanyName: string;
  scopeBriefDetails: ScopeTableRow[];
  scopeBasicBuilding: ScopeTableRow[];
  scopeBuildingAdditions: ScopeTableRow[];
  steelWorkFinish: ScopeTableRow[];
  designLoads: ScopeTableRow[];
  applicableCodes: string[];
  materialSpecs: ScopeTableRow[];
  drawingsDelivery: string[];
  erectionScopeClient: string[];
  erectionScopeCompany: string[];
  paymentTermSections: PaymentTermSection[];
  commercialTerms: CommercialTermRow[];
  bankDetails: BankDetailRow[];
  uploadDrawings: DrawingUploadItem[];
}

const createEmptyDrawingUpload = (): DrawingUploadItem => ({
  id: `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  fileName: "",
  mimeType: "",
  dataUrl: "",
});

const normalizeDrawingUploads = (value: unknown): DrawingUploadItem[] => {
  if (!Array.isArray(value) || value.length === 0) {
    return [createEmptyDrawingUpload()];
  }
  const normalized = value
    .filter((item): item is Partial<DrawingUploadItem> => Boolean(item && typeof item === "object"))
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `drawing-${Date.now()}-${index}`,
      fileName: typeof item.fileName === "string" ? item.fileName : "",
      mimeType: typeof item.mimeType === "string" ? item.mimeType : "",
      dataUrl: typeof item.dataUrl === "string" ? item.dataUrl : "",
    }));
  return normalized.length > 0 ? normalized : [createEmptyDrawingUpload()];
};

const ensureDrawingUploads = (value: unknown): DrawingUploadItem[] => {
  return normalizeDrawingUploads(value);
};

const createPaymentTermSection = (heading: string, terms: string[]): PaymentTermSection => ({
  id: `payment-section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  heading,
  terms,
});

const getDefaultPaymentTermSections = (): PaymentTermSection[] => ([
  createPaymentTermSection("Supply and Erection", [
    "20% advance on confirmation of order/PO.",
    "40% after finalisation & submission of GA drawing.",
    "30% before dispatch of material.",
    "5% after Structure Erection.",
    "5% after Building Handing over.",
  ]),
  createPaymentTermSection("Civil Construction", [
    "20% Advance along with PO",
    "40% on GA drawing Approval",
    "20% Excavation, PCC and Fiiling",
    "10% on Plinth & RCC floor completion",
    "5% on brickwork completion",
    "5% on handingover",
  ]),
]);

const normalizePaymentTermSections = (value: unknown, fallbackTerms?: string[]): PaymentTermSection[] => {
  const normalizedHeading = (heading: string, index: number) => {
    const h = heading.trim();
    if (!h) return `Heading ${index + 1}`;
    if (h.toLowerCase() === "peb - supply and erection") return "Supply and Erection";
    return h;
  };
  if (Array.isArray(value) && value.length > 0) {
    const sections = value
      .filter((item): item is Partial<PaymentTermSection> => Boolean(item && typeof item === "object"))
      .map((item, index) => ({
        id: typeof item.id === "string" && item.id.trim() ? item.id : `payment-section-${Date.now()}-${index}`,
        heading: normalizedHeading(typeof item.heading === "string" ? item.heading : "", index),
        terms: Array.isArray(item.terms) ? item.terms.filter((t): t is string => typeof t === "string") : [],
      }))
      .filter((item) => item.terms.length > 0 || item.heading.trim().length > 0);
    if (sections.length > 0) return sections;
  }
  if (Array.isArray(fallbackTerms) && fallbackTerms.length > 0) {
    return [
      createPaymentTermSection("Supply and Erection", fallbackTerms),
      createPaymentTermSection("Civil Construction", [
        "20% Advance along with PO",
        "40% on GA drawing Approval",
        "20% Excavation, PCC and Fiiling",
        "10% on Plinth & RCC floor completion",
        "5% on brickwork completion",
        "5% on handingover",
      ]),
    ];
  }
  return getDefaultPaymentTermSections();
};

const defaultSupplyFabricationContent: QuotationContentSections = {
  proposalTitle: 'Techno-Commercial Offer',
  introSections: [
    { id: 'intro1', type: 'paragraph', content: 'We are pleased to submit our proposal for the supply & erection of steel Structure against your subject enquiry.' },
    { id: 'intro2', type: 'paragraph', content: 'Our area of expertise is in complete design, manufacture, installation & commissioning of Heavy Structural Fabrication & Pre-Engineered Building.' },
    { id: 'intro3', type: 'paragraph', content: 'This proposal is detailed for your ready reference and includes scope of supply, building description, design loads/criteria, material specifications, time delivery, etc complete.' },
    { id: 'intro4', type: 'paragraph', content: 'We trust you will find that our proposal is in line with your requirements and we look forward to your valued order.' },
  ],
  paymentTerms: [
    '15% advance on confirmation of Work order before Labour mobilization.',
    '85% after fabrication Completion',
  ],
  notes: [
    'Above mentioned rates are quoted on the basis of inputs received and discussion.',
    'GST @ 18% Extra.',
    'Billing as per BOQ.',
    'No third-party inspection or any inspection charges bear by the Revira Nexgen.',
    'NDT test will be performed at shop only and excluding all machines, testing and consumables.',
    'All Machines, Hydra, EOT cranes, raw materials, consumables, bed material. Skids for fabrication.',
  ],
  closingParagraphs: [
    { id: 'closing1', type: 'paragraph', content: "We hope you'll find our offer in line with your requirement & place your valued WO on us giving us an opportunity to serve you. However, please feel free to contact us for any sort of additional information that you may feel is required pertaining to this offer. We assure you our best support at all times." },
  ],
  closingThanks: 'Thanking you',
  closingCompanyName: 'Revira Nexgen Structures Pvt. Ltd.',
  scopeBriefDetails: [
    { slNo: 1, description: 'Building Nos.', details: '01' },
    { slNo: 2, description: 'Building Description', details: 'PEB Shed' },
    { slNo: 3, description: 'Building built-up Area', details: '15494 SQF' },
  ],
  scopeBasicBuilding: [
    { slNo: 1, description: 'Frame Type', details: 'RF/MF' },
    { slNo: 2, description: 'Length (M)', details: '36' },
    { slNo: 3, description: 'Width (M) or Span', details: '21' },
    { slNo: 4, description: 'Clear Height (M)', details: '9.0' },
    { slNo: 5, description: 'Brick Wall Height (M)', details: '3.0' },
    { slNo: 6, description: 'Side wall Column Spacing (M)', details: 'As Per Drawing' },
    { slNo: 7, description: 'Roof Slope', details: '1:10' },
    { slNo: 8, description: 'End Wall Column Spacing (M)', details: 'As Per GA' },
    { slNo: 9, description: 'Bay Spacing (M)', details: 'As Per GA' },
    { slNo: 10, description: 'Type of end frames', details: 'Non-Expandable Frames' },
    { slNo: 11, description: 'Wind bracing', details: 'As per GA drawing' },
    { slNo: 12, description: 'Roof cladding', details: 'As per GA drawing' },
    { slNo: 13, description: 'Wall cladding', details: 'As per GA drawing' },
  ],
  scopeBuildingAdditions: [
    { slNo: 1, description: 'Canopy - Location', details: 'As per approved drawing' },
    { slNo: 2, description: 'Framed openings', details: 'As per approved drawing' },
  ],
  steelWorkFinish: [
    { slNo: 1, description: 'Welding', details: 'Continuous FCAW welding along with Intermediate, AWS D1.1' },
    { slNo: 2, description: 'Frames, Built-up / HR sections/Bracings', details: 'Mechanical Cleaning with swipe blast on heavy mill scale and one coat of primer and one coat of Finish Enamel paint' },
    { slNo: 3, description: 'Purlins / Girts', details: 'ASTM A653' },
    { slNo: 4, description: 'Profile sheets', details: 'Bare-0.47 mm thk and colour -0.5 mm thk blue RAL5012' },
  ],
  designLoads: [
    { slNo: 1, description: 'Dead load', details: '0.15 KN/M2' },
    { slNo: 2, description: 'Live load', details: '0.57 KN/M2' },
    { slNo: 3, description: 'Crane Capacity', details: '-' },
    { slNo: 4, description: 'Wind load (Kmph or m/sec)', details: '44 M/sec' },
    { slNo: 5, description: 'Mezzanine Load -Kg/SQM', details: '-' },
    { slNo: 6, description: 'Slab Thickness (MM)', details: '-' },
    { slNo: 7, description: 'Seismic load (Zone no.)', details: 'III' },
  ],
  applicableCodes: [
    'Frame members are designed in accordance with AISC-LRFD (American Institute of Steel Construction).',
    'Cold Formed members are designed in accordance with the AISC For Use of Cold-Formed Light Gauge Steel Structural Member\'s In General Building Construction.',
    'Deflection as per IS 800-2007.',
    'All welding is done in accordance with the 2000 Edition of the American Welding Society (AWS D1.1).',
    'Structural Welding Code-Steel. All Welders are qualified for the type of welds performed.',
    'Manufacturing dimensional tolerances are in accordance with the requirements of the 1996 Edition of the Metal Building Manufacturer Association (MBMA) of the USA.; "Low rise building systems Manual".',
  ],
  materialSpecs: [
    { slNo: 1, description: 'Primary Members - Built up sections (Make – SAIL/JINDAL/TATA)', details: 'Min. Y.S. 350 MPA' },
    { slNo: 2, description: 'Hot Rolled Sections - Channels (Make – TATA/Apollo/SAIL)', details: 'IS: 2062 / A 572, Grade 36, Min. Y.S. 250 MPA' },
    { slNo: 3, description: 'Purlins/Girts (Make – JSW/TATA)', details: 'ASTM A653' },
    { slNo: 4, description: 'Anchor bolts', details: 'IS 2062 E250A' },
    { slNo: 5, description: 'Primary Connection bolts Electroplated/Pre galvanised', details: 'High Strength Bolts, IS: 1367 / 8.8 Grade' },
    { slNo: 6, description: 'Secondary connection bolts Pre galvanised', details: 'Bolt as per ASTM A 325, Grade 4.6' },
  ],
  drawingsDelivery: [
    'RNSPL will issue shop Approval Drawings within 1 week from date of signing contract/issue of Purchase Order and receipt of advance payment.',
    'BUYER must return the accepted approval drawings preferably within 1 week thereafter; otherwise, may result in revision to delivery commitment.',
    'Anchor bolts & Layout drawings for fixing anchor bolts will be provided within 10 days from the date of receipt of Advance payment.',
    'Dispatch of materials will start as per agreed time frame from the date of receipt of signed Approval drawings with receipt of payment as per agreed terms.',
  ],
  erectionScopeClient: [
    'After completion of Anchor bolt fixing, back filling of the murum up to the FFL level & rolling is under the scope of the client.',
    'Anchor bolt shall be provided to site and fixing in presence of our engineer at site only.',
    'Minimum 15 days curing time is to be given after Anchor Bolt Casting is done.',
    'Free Power and water to be provided close to site.',
    'If power not available, DG has to be provided.',
    'We assumed that, crane can move inside the proposed building while erecting the main frames.',
    'Security of the material is under the scope of the client.',
    'Shelter/accommodation to be provided to the workers till completion of the work.',
  ],
  erectionScopeCompany: [
    'Unloading and stacking of the material at site, Erection of material as per RNSPL specifications.',
    'Anchor Bolt Supply & Periodic Supervision is in our Scope.',
    'Alignment of columns and rafters.',
    'Plumb and checking water level of columns & Portal frame.',
    'Cleaning and touch up paint work for the structure on damaged surfaces during transportation and site movement.',
    'Alignment of Purlins and Girts.',
    'Fixing of roof sheeting, wall sheeting and accessories.',
  ],
  paymentTermSections: getDefaultPaymentTermSections(),
  commercialTerms: [
    { slNo: 1, description: 'Payment Terms including taxes', conditions: 'Above mentioned.' },
    { slNo: 2, description: 'Delivery period', conditions: 'Delivery as per mutually agreed from the date of receipt of signed approved drawings and receipt of payment as per agreed terms.' },
    { slNo: 3, description: 'Erection period', conditions: 'Erection Period as per mutually agreed after delivery of complete material.' },
    { slNo: 4, description: 'GST', conditions: 'Extra @ 18% for supply and Erection both.' },
    { slNo: 5, description: 'Scope of contract', conditions: 'This Contract is the only Agreement between the SELLER & BUYER and the terms which have been Expressly stated will be binding.' },
    { slNo: 6, description: 'Proposal validity', conditions: 'This proposal is valid for (5) days from the date of this proposal.' },
    { slNo: 7, description: 'Erection drawing', conditions: 'The SELLER will furnish the BUYER with all standard erection drawings required for erection of buildings.' },
    { slNo: 8, description: 'Specification changes', conditions: 'SELLER reserves the right to modify design and substitute material equal or superior to originally specified.' },
    { slNo: 9, description: 'Change in scope', conditions: 'Any change to the stated scope of supply may lead to variation in price and delivery period.' },
    { slNo: 10, description: 'Our liability', conditions: 'SELLER liability is restricted to scope of this contract only.' },
    { slNo: 11, description: 'Ownership Of Un-Approved Material', conditions: 'All unapproved material supplied to site shall be the property of SELLER.' },
    { slNo: 12, description: 'Warranty', conditions: 'Products supplied are warranted against defective material & workmanship for One year.' },
    { slNo: 13, description: 'Permits', conditions: 'SELLER shall not be responsible for obtaining permits to erect or install any product.' },
    { slNo: 14, description: 'Force Majeure', conditions: 'SELLER shall not be liable for delays due to circumstances beyond control.' },
    { slNo: 15, description: 'Weighment', conditions: 'Weight mentioned in SELLER Bill of Supply will be final for billing purposes.' },
    { slNo: 16, description: 'Safety at site', conditions: 'BUYER shall provide secured area for unloading and storing all material.' },
    { slNo: 17, description: 'Exclusions', conditions: 'Anything not mentioned in the offer.' },
  ],
  bankDetails: [
    { particular: 'Account holder', value: 'REVIRA NEXGEN STRUCTURES PRIVATE LIMITED' },
    { particular: 'Bank Name', value: 'YES Bank' },
    { particular: 'A/C No.', value: '073361900002657' },
    { particular: 'IFSC Code', value: 'YESB0000733' },
  ],
  uploadDrawings: [createEmptyDrawingUpload()],
};

const DEFAULT_LINE_ITEMS: LineItem[] = [
  {
    serialNo: 1,
    description:
      "Fabrication of Structural steel hot rolled section on job work-labour basis i.e. Pipe rack str excluding detailing.",
    unit: "Rs/MT",
    quantity: 600,
    rate: 7440,
    amount: 4464000,
    remarks: "",
  },
];

type QuotationTypeOption = "Supply and Fabrication" | "Structural Fabrication" | "Job Work";
const QUOTATION_TYPE_OPTIONS: QuotationTypeOption[] = [
  "Supply and Fabrication",
  "Structural Fabrication",
  "Job Work",
];

const SUPPLY_ACCORDION_BLOCK_TYPES: AccordionBlockType[] = [
  "scopeBrief",
  "scopeBasic",
  "scopeAdditions",
  "steelWork",
  "designLoads",
  "applicableCodes",
  "materialSpecs",
  "drawingsDelivery",
  "erectionScopeClient",
  "erectionScopeCompany",
  "commercialPrice",
  "paymentTerms",
  "commercialTerms",
];

const NON_SUPPLY_ACCORDION_BLOCK_TYPES: AccordionBlockType[] = ["commercialPrice", "paymentTerms"];

const BLOCK_LABELS: Record<AccordionBlockType, string> = {
  scopeBrief: "SCOPE OF SUPPLY - BRIEF DETAILS",
  scopeBasic: "SCOPE OF SUPPLY - BASIC BUILDING DESCRIPTION",
  scopeAdditions: "STANDARD BUILDING ADDITIONS (CANOPY / FASCIA / LINER / PARTITIONS)",
  steelWork: "STEEL WORK FINISH",
  designLoads: "DESIGN LOADS",
  applicableCodes: "APPLICABLE CODES for Design",
  materialSpecs: "MATERIAL SPECIFICATIONS",
  drawingsDelivery: "DRAWINGS & DELIVERY",
  erectionScopeClient: "ERECTION SCOPES - SCOPE OF CLIENT",
  erectionScopeCompany: "ERECTION SCOPES - SCOPE OF COMPANY",
  commercialPrice: "COMMERCIAL PRICE & PAYMENT",
  paymentTerms: "PAYMENT TERMS",
  commercialTerms: "COMMERCIAL TERMS & CONDITIONS",
};

const BLOCK_INDEX_TITLES: Record<AccordionBlockType, string> = {
  scopeBrief: "Scope of Supply - Brief Details",
  scopeBasic: "Scope of Supply - Basic Building Description",
  scopeAdditions: "Standard Building Additions",
  steelWork: "Steel Work Finish",
  designLoads: "Design Loads",
  applicableCodes: "Applicable Codes",
  materialSpecs: "Material Specifications",
  drawingsDelivery: "Drawings & Delivery",
  erectionScopeClient: "Erection Scopes - Scope of Client",
  erectionScopeCompany: "Erection Scopes - Scope of Company",
  commercialPrice: "Commercial Price & Payment",
  paymentTerms: "Payment Terms",
  commercialTerms: "Commercial Terms & Conditions",
};

const getDefaultAccordionBlocks = (isSupply: boolean): AccordionBlockInstance[] => {
  const types = isSupply ? SUPPLY_ACCORDION_BLOCK_TYPES : NON_SUPPLY_ACCORDION_BLOCK_TYPES;
  return types.map((type, index) => ({
    id: `${type}-${index + 1}`,
    type,
    heading: BLOCK_LABELS[type],
  }));
};

export default function QuotationPage() {
  const { projectId, quotationId } = useParams<{ projectId: string; quotationId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useUser();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [quotationData, setQuotationData] = useState({
    quotationNumber: "",
    revision: "R-001",
    enquiryNumber: "",
    subject: "Supply & erection of Steel Structures for PEB Shed",
    contactName: "Hareram R Sharma",
    contactMobile: "8390491843",
    contactEmail: "Hareram.sharma@reviranexgen.com",
    buildingDescription: "PEB Shed",
    buildingArea: "",
    frameType: "RF/MF",
    length: "",
    width: "",
    clearHeight: "",
    roofSlope: "1:10",
    paymentTerms: "",
    notes: "",
    proposalTitle: "Techno-Commercial Offer",
    toLabel: "To",
    msLabel: "M/s",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    ...DEFAULT_LINE_ITEMS,
  ]);

  const [contentSections, setContentSections] = useState<QuotationContentSections>(defaultSupplyFabricationContent);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<number | null>(null);
  const [editingPaymentTermHeading, setEditingPaymentTermHeading] = useState<string | null>(null);
  const [editingPaymentTermItem, setEditingPaymentTermItem] = useState<{ sectionId: string; termIndex: number } | null>(null);
  const [expandedPaymentTermSections, setExpandedPaymentTermSections] = useState<Record<string, boolean>>({});
  const [editingCommercialTerm, setEditingCommercialTerm] = useState<number | null>(null);
  const [editingBankDetail, setEditingBankDetail] = useState<number | null>(null);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [newQuotationDialogOpen, setNewQuotationDialogOpen] = useState(false);
  const [newQuotationType, setNewQuotationType] = useState<QuotationTypeOption>("Supply and Fabrication");
  const [isCreatingNewQuotation, setIsCreatingNewQuotation] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
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
  const [editingAccordionBlockId, setEditingAccordionBlockId] = useState<string | null>(null);
  const [accordionBlocks, setAccordionBlocks] = useState<AccordionBlockInstance[]>([]);
  const [expandedBlockIds, setExpandedBlockIds] = useState<Record<string, boolean>>({});

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/revira/api/projects", projectId],
    queryFn: async () => {
      const res = await fetch(`/revira/api/projects/${projectId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
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

  const { data: existingQuotation } = useQuery<Quotation>({
    queryKey: ["/revira/api/projects", projectId, "quotation", quotationId || "latest"],
    queryFn: async () => {
      if (quotationId) {
        const res = await fetch(`/revira/api/quotations/${quotationId}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch quotation");
        return res.json();
      }
      const res = await fetch(`/revira/api/projects/${projectId}/quotation`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch quotation");
      }
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: existingItems } = useQuery<QuotationItem[]>({
    queryKey: ["/revira/api/quotations", existingQuotation?.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/revira/api/quotations/${existingQuotation?.id}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
    enabled: !!existingQuotation?.id,
  });

  const { data: quotationVersions } = useQuery<Quotation[]>({
    queryKey: ["/revira/api/projects", projectId, "quotation-versions"],
    queryFn: async () => {
      const res = await fetch(`/revira/api/projects/${projectId}/quotation-versions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch versions");
      return res.json();
    },
    enabled: !!projectId,
  });

  const getAllowedBlockTypes = useCallback((): AccordionBlockType[] => {
    return project?.quotationType === "Supply and Fabrication"
      ? SUPPLY_ACCORDION_BLOCK_TYPES
      : NON_SUPPLY_ACCORDION_BLOCK_TYPES;
  }, [project?.quotationType]);

  const normalizeAccordionBlocks = useCallback((blocks: unknown): AccordionBlockInstance[] => {
    const allowed = new Set(getAllowedBlockTypes());
    if (!Array.isArray(blocks)) {
      return getDefaultAccordionBlocks(project?.quotationType === "Supply and Fabrication");
    }
    const normalized = blocks
      .filter((b): b is { id: string; type: AccordionBlockType; heading?: string } => Boolean(
        b &&
        typeof b === "object" &&
        "id" in b &&
        "type" in b &&
        typeof (b as AccordionBlockInstance).id === "string" &&
        typeof (b as AccordionBlockInstance).type === "string"
      ))
      .filter((b) => allowed.has(b.type))
      .map((b) => ({
        id: b.id,
        type: b.type,
        heading: typeof b.heading === "string" && b.heading.trim().length > 0 ? b.heading : BLOCK_LABELS[b.type],
      }));

    // Ensure Payment Terms block is present for all quotation types.
    if (!normalized.some((b) => b.type === "paymentTerms") && allowed.has("paymentTerms")) {
      const paymentTermsBlock: AccordionBlockInstance = {
        id: `paymentTerms-${Date.now()}`,
        type: "paymentTerms",
        heading: BLOCK_LABELS.paymentTerms,
      };
      const commercialPriceIndex = normalized.findIndex((b) => b.type === "commercialPrice");
      if (commercialPriceIndex >= 0) {
        normalized.splice(commercialPriceIndex + 1, 0, paymentTermsBlock);
      } else {
        normalized.push(paymentTermsBlock);
      }
    }

    return normalized.map((block) => {
      if (block.type !== "commercialPrice") return block;
      const normalizedHeading = block.heading.trim().toUpperCase();
      if (
        normalizedHeading === "COMMERCIAL PRICE" ||
        normalizedHeading === "COMMERCIAL PRICE & PAYMENT TERMS"
      ) {
        return { ...block, heading: "COMMERCIAL PRICE & PAYMENT" };
      }
      return block;
    });
  }, [getAllowedBlockTypes, project?.quotationType]);

  useEffect(() => {
    // Only set defaults for NEW quotations (when no existing quotation is loaded)
    if (project && client && !existingQuotation) {
      const prefix = project.quotationType === "Supply and Fabrication" ? "RNS-Peb" :
                     project.quotationType === "Structural Fabrication" ? "RNS-SF" : "RNS-JW";
      const date = new Date();
      const monthYear = date.toLocaleString('en-US', { month: 'short', year: 'numeric' }).toUpperCase().replace(' ', '-');
      
      // Set default subject based on quotation type
      const defaultSubject = project.quotationType === "Supply and Fabrication" 
        ? "Supply & erection of Steel Structures for PEB Shed"
        : project.quotationType === "Structural Fabrication"
        ? "Structural Fabrication - Steel Structures"
        : "Job Work - Steel Structures";
      
      setQuotationData(prev => ({
        ...prev,
        quotationNumber: `RNS/${monthYear}/${client.name}/RNS-${String(project.id).padStart(3, '0')}`,
        enquiryNumber: `${prefix}-RNS-${String(project.id).padStart(3, '0')}`,
        subject: defaultSubject,
      }));
      setAccordionBlocks(getDefaultAccordionBlocks(project.quotationType === "Supply and Fabrication"));
    }
  }, [project, client, existingQuotation]);

  useEffect(() => {
    if (existingQuotation) {
      let parsedContentSections: Partial<QuotationContentSections> | null = null;
      if (existingQuotation.contentSections) {
        try {
          parsedContentSections = JSON.parse(existingQuotation.contentSections);
          const legacyPaymentTerms = Array.isArray((parsedContentSections as any)?.paymentTerms)
            ? (parsedContentSections as any).paymentTerms.filter((t: unknown): t is string => typeof t === "string")
            : [];
          setContentSections(prev => ({
            ...prev,
            ...parsedContentSections,
            paymentTermSections: normalizePaymentTermSections((parsedContentSections as any)?.paymentTermSections, legacyPaymentTerms),
            uploadDrawings: normalizeDrawingUploads((parsedContentSections as any)?.uploadDrawings),
          }));
          setAccordionBlocks(normalizeAccordionBlocks(parsedContentSections?.accordionBlocks));
        } catch (e) {
          console.error("Failed to parse content sections:", e);
          setAccordionBlocks(getDefaultAccordionBlocks(project?.quotationType === "Supply and Fabrication"));
        }
      } else {
        setAccordionBlocks(getDefaultAccordionBlocks(project?.quotationType === "Supply and Fabrication"));
      }

      setQuotationData({
        quotationNumber: existingQuotation.quotationNumber,
        revision: existingQuotation.revision,
        enquiryNumber: existingQuotation.enquiryNumber,
        subject: existingQuotation.subject,
        contactName: existingQuotation.contactName,
        contactMobile: existingQuotation.contactMobile,
        contactEmail: existingQuotation.contactEmail,
        buildingDescription: existingQuotation.buildingDescription || "",
        buildingArea: existingQuotation.buildingArea || "",
        frameType: existingQuotation.frameType || "",
        length: existingQuotation.length || "",
        width: existingQuotation.width || "",
        clearHeight: existingQuotation.clearHeight || "",
        roofSlope: existingQuotation.roofSlope || "",
        paymentTerms: existingQuotation.paymentTerms || "",
        notes: existingQuotation.notes || "",
        proposalTitle: parsedContentSections?.proposalTitle || "Techno-Commercial Offer",
        toLabel: parsedContentSections?.toLabel || "To",
        msLabel: parsedContentSections?.msLabel || "M/s",
      });
    }
  }, [existingQuotation, normalizeAccordionBlocks, project?.quotationType]);

  useEffect(() => {
    if (existingItems && existingItems.length > 0) {
      setLineItems(existingItems.map(item => ({
        id: item.id,
        serialNo: item.serialNo,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
        remarks: item.remarks || "",
      })));
    }
  }, [existingItems]);

  useEffect(() => {
    setExpandedBlockIds((prev) => {
      const next: Record<string, boolean> = {};
      accordionBlocks.forEach((block) => {
        next[block.id] = prev[block.id] ?? true;
      });
      return next;
    });
  }, [accordionBlocks]);

  useEffect(() => {
    const sections = normalizePaymentTermSections(contentSections.paymentTermSections, contentSections.paymentTerms);
    setExpandedPaymentTermSections((prev) => {
      const next: Record<string, boolean> = {};
      sections.forEach((section) => {
        next[section.id] = prev[section.id] ?? true;
      });
      return next;
    });
  }, [contentSections.paymentTermSections, contentSections.paymentTerms]);

  const createQuotationMutation = useMutation({
    mutationFn: async () => {
      const quotationRes = await apiRequest("POST", "/revira/api/quotations", {
        projectId: Number(projectId),
        ...quotationData,
        contentSections: JSON.stringify({
          ...contentSections,
          proposalTitle: quotationData.proposalTitle,
          toLabel: quotationData.toLabel,
          msLabel: quotationData.msLabel,
          accordionBlocks,
        }),
      });
      const quotation = await quotationRes.json();
      
      for (const item of lineItems) {
        if (item.description.trim()) {
          await apiRequest("POST", `/revira/api/quotations/${quotation.id}/items`, {
            serialNo: item.serialNo,
            description: item.description,
            unit: item.unit,
            quantity: String(item.quantity),
            rate: String(item.rate),
            amount: String(item.amount),
            remarks: item.remarks,
          });
        }
      }
      
      return quotation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation", "latest"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation", data.id] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation-versions"] });
      // Navigate to the new quotation to update the URL and refetch
      setLocation(`/revira/projects/${projectId}/quotation/${data.id}`);
      toast({
        title: "Quotation saved",
        description: "The quotation has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create quotation",
        variant: "destructive",
      });
    },
  });

  const updateQuotationMutation = useMutation({
    mutationFn: async () => {
      if (!existingQuotation) return;
      
      await apiRequest("PUT", `/revira/api/quotations/${existingQuotation.id}`, {
        ...quotationData,
        contentSections: JSON.stringify({
          ...contentSections,
          proposalTitle: quotationData.proposalTitle,
          toLabel: quotationData.toLabel,
          msLabel: quotationData.msLabel,
          accordionBlocks,
        }),
      });
      
      if (existingItems) {
        for (const item of existingItems) {
          await apiRequest("DELETE", `/revira/api/quotation-items/${item.id}`);
        }
      }
      
      for (const item of lineItems) {
        if (item.description.trim()) {
          await apiRequest("POST", `/revira/api/quotations/${existingQuotation.id}/items`, {
            serialNo: item.serialNo,
            description: item.description,
            unit: item.unit,
            quantity: String(item.quantity),
            rate: String(item.rate),
            amount: String(item.amount),
            remarks: item.remarks,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation", quotationId || "latest"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/quotations", existingQuotation?.id, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation-versions"] });
      toast({
        title: "Quotation updated",
        description: "The quotation has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quotation",
        variant: "destructive",
      });
    },
  });

  const duplicateQuotationMutation = useMutation({
    mutationFn: async () => {
      if (!existingQuotation) throw new Error("No quotation to duplicate");
      const res = await apiRequest("POST", `/revira/api/quotations/${existingQuotation.id}/duplicate`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation-versions"] });
      toast({
        title: "Quotation duplicated",
        description: `Created new version: ${data.revision}`,
      });
      setLocation(`/revira/projects/${projectId}/quotation/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to duplicate quotation",
        variant: "destructive",
      });
    },
  });

  const createNewQuotationFromType = async () => {
    if (!project || !client) return;
    setIsCreatingNewQuotation(true);
    try {
      await apiRequest("PUT", `/revira/api/projects/${project.id}`, {
        quotationType: newQuotationType,
      });

      const isSupply = newQuotationType === "Supply and Fabrication";
      const prefix =
        newQuotationType === "Supply and Fabrication"
          ? "RNS-Peb"
          : newQuotationType === "Structural Fabrication"
            ? "RNS-SF"
            : "RNS-JW";
      const defaultSubject =
        newQuotationType === "Supply and Fabrication"
          ? "Supply & erection of Steel Structures for PEB Shed"
          : newQuotationType === "Structural Fabrication"
            ? "Structural Fabrication - Steel Structures"
            : "Job Work - Steel Structures";
      const date = new Date();
      const monthYear = date
        .toLocaleString("en-US", { month: "short", year: "numeric" })
        .toUpperCase()
        .replace(" ", "-");

      const nextQuotationData = {
        quotationNumber: `RNS/${monthYear}/${client.name}/RNS-${String(project.id).padStart(3, "0")}`,
        revision: "R-001",
        enquiryNumber: `${prefix}-RNS-${String(project.id).padStart(3, "0")}`,
        subject: defaultSubject,
        contactName: quotationData.contactName,
        contactMobile: quotationData.contactMobile,
        contactEmail: quotationData.contactEmail,
        buildingDescription: quotationData.buildingDescription,
        buildingArea: quotationData.buildingArea,
        frameType: quotationData.frameType,
        length: quotationData.length,
        width: quotationData.width,
        clearHeight: quotationData.clearHeight,
        roofSlope: quotationData.roofSlope,
        paymentTerms: quotationData.paymentTerms,
        notes: quotationData.notes,
        proposalTitle: "Techno-Commercial Offer",
        toLabel: "To",
        msLabel: "M/s",
      };

      const nextContentSections: QuotationContentSections = {
        ...JSON.parse(JSON.stringify(defaultSupplyFabricationContent)),
        proposalTitle: nextQuotationData.proposalTitle,
        toLabel: nextQuotationData.toLabel,
        msLabel: nextQuotationData.msLabel,
      };
      const nextAccordionBlocks = getDefaultAccordionBlocks(isSupply);

      const quotationRes = await apiRequest("POST", "/revira/api/quotations", {
        projectId: Number(projectId),
        ...nextQuotationData,
        contentSections: JSON.stringify({
          ...nextContentSections,
          accordionBlocks: nextAccordionBlocks,
        }),
      });
      const createdQuotation = await quotationRes.json();

      for (const item of DEFAULT_LINE_ITEMS) {
        await apiRequest("POST", `/revira/api/quotations/${createdQuotation.id}/items`, {
          serialNo: item.serialNo,
          description: item.description,
          unit: item.unit,
          quantity: String(item.quantity),
          rate: String(item.rate),
          amount: String(item.amount),
          remarks: item.remarks,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation", "latest"] });
      queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation-versions"] });
      setNewQuotationDialogOpen(false);
      setLocation(`/revira/projects/${projectId}/quotation/${createdQuotation.id}`);
      toast({
        title: "New quotation created",
        description: `${newQuotationType} quotation is ready for edit/export.`,
      });
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.message || "Failed to create new quotation.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingNewQuotation(false);
    }
  };

  const handleSave = () => {
    if (existingQuotation) {
      updateQuotationMutation.mutate();
    } else {
      createQuotationMutation.mutate();
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { serialNo: lineItems.length + 1, description: "", unit: "Rs/MT", quantity: 0, rate: 0, amount: 0, remarks: "" }
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      const newItems = lineItems.filter((_, i) => i !== index).map((item, i) => ({
        ...item,
        serialNo: i + 1
      }));
      setLineItems(newItems);
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...lineItems];
    if (field === 'quantity' || field === 'rate' || field === 'amount') {
      newItems[index] = { ...newItems[index], [field]: Number(value) || 0 };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    if (field === 'quantity' || field === 'rate') {
      const qty = newItems[index].quantity;
      const rate = newItems[index].rate;
      newItems[index].amount = qty * rate;
    }
    
    setLineItems(newItems);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('₹', '₹ ');
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }).replace(/\//g, '-');
  };

  const updateIntroSection = (id: string, content: string) => {
    setContentSections(prev => ({
      ...prev,
      introSections: prev.introSections.map(s => s.id === id ? { ...s, content } : s)
    }));
  };

  const addIntroSection = () => {
    const newId = `intro${Date.now()}`;
    setContentSections(prev => ({
      ...prev,
      introSections: [...prev.introSections, { id: newId, type: 'paragraph', content: 'New paragraph...' }]
    }));
  };

  const removeIntroSection = (id: string) => {
    setContentSections(prev => ({
      ...prev,
      introSections: prev.introSections.filter(s => s.id !== id)
    }));
  };

  const addNote = () => {
    setContentSections(prev => ({
      ...prev,
      notes: [...prev.notes, 'New note...']
    }));
    setEditingNote(contentSections.notes.length);
  };

  const updateNote = (index: number, content: string) => {
    setContentSections(prev => ({
      ...prev,
      notes: prev.notes.map((n, i) => i === index ? content : n)
    }));
  };

  const removeNote = (index: number) => {
    setContentSections(prev => ({
      ...prev,
      notes: prev.notes.filter((_, i) => i !== index)
    }));
  };

  const addPaymentTermSection = () => {
    setContentSections(prev => ({
      ...prev,
      paymentTermSections: [...normalizePaymentTermSections(prev.paymentTermSections), createPaymentTermSection("New Heading", ["New payment term..."])],
    }));
  };

  const updatePaymentTermSectionHeading = (sectionId: string, heading: string) => {
    setContentSections(prev => ({
      ...prev,
      paymentTermSections: normalizePaymentTermSections(prev.paymentTermSections).map((section) =>
        section.id === sectionId ? { ...section, heading } : section
      ),
    }))
  };

  const removePaymentTermSection = (sectionId: string) => {
    setContentSections(prev => ({
      ...prev,
      paymentTermSections: (() => {
        const next = normalizePaymentTermSections(prev.paymentTermSections).filter((section) => section.id !== sectionId);
        return next.length > 0 ? next : [createPaymentTermSection("New Heading", ["New payment term..."])];
      })(),
    }));
  };

  const addPaymentTerm = (sectionId: string) => {
    setContentSections(prev => ({
      ...prev,
      paymentTermSections: normalizePaymentTermSections(prev.paymentTermSections).map((section) =>
        section.id === sectionId
          ? { ...section, terms: [...section.terms, "New payment term..."] }
          : section
      ),
    }));
  };

  const updatePaymentTerm = (sectionId: string, termIndex: number, content: string) => {
    setContentSections(prev => ({
      ...prev,
      paymentTermSections: normalizePaymentTermSections(prev.paymentTermSections).map((section) =>
        section.id === sectionId
          ? {
              ...section,
              terms: section.terms.map((term, index) => (index === termIndex ? content : term)),
            }
          : section
      ),
    }));
  };

  const removePaymentTerm = (sectionId: string, termIndex: number) => {
    setContentSections(prev => ({
      ...prev,
      paymentTermSections: normalizePaymentTermSections(prev.paymentTermSections).map((section) =>
        section.id === sectionId
          ? { ...section, terms: section.terms.filter((_, index) => index !== termIndex) }
          : section
      ),
    }));
  };

  const addDrawingsDeliveryItem = () => {
    setContentSections(prev => ({
      ...prev,
      drawingsDelivery: [...prev.drawingsDelivery, 'New drawings/delivery item...']
    }));
  };

  const updateDrawingsDeliveryItem = (index: number, content: string) => {
    setContentSections(prev => ({
      ...prev,
      drawingsDelivery: prev.drawingsDelivery.map((t, i) => i === index ? content : t)
    }));
  };

  const removeDrawingsDeliveryItem = (index: number) => {
    setContentSections(prev => ({
      ...prev,
      drawingsDelivery: prev.drawingsDelivery.filter((_, i) => i !== index)
    }));
  };

  const addErectionClientItem = () => {
    setContentSections(prev => ({
      ...prev,
      erectionScopeClient: [...prev.erectionScopeClient, 'New client scope item...']
    }));
  };

  const updateErectionClientItem = (index: number, content: string) => {
    setContentSections(prev => ({
      ...prev,
      erectionScopeClient: prev.erectionScopeClient.map((t, i) => i === index ? content : t)
    }));
  };

  const removeErectionClientItem = (index: number) => {
    setContentSections(prev => ({
      ...prev,
      erectionScopeClient: prev.erectionScopeClient.filter((_, i) => i !== index)
    }));
  };

  const addErectionCompanyItem = () => {
    setContentSections(prev => ({
      ...prev,
      erectionScopeCompany: [...prev.erectionScopeCompany, 'New company scope item...']
    }));
  };

  const updateErectionCompanyItem = (index: number, content: string) => {
    setContentSections(prev => ({
      ...prev,
      erectionScopeCompany: prev.erectionScopeCompany.map((t, i) => i === index ? content : t)
    }));
  };

  const removeErectionCompanyItem = (index: number) => {
    setContentSections(prev => ({
      ...prev,
      erectionScopeCompany: prev.erectionScopeCompany.filter((_, i) => i !== index)
    }));
  };

  const addApplicableCode = () => {
    setContentSections(prev => ({
      ...prev,
      applicableCodes: [...prev.applicableCodes, 'New applicable code...']
    }));
  };

  const updateApplicableCode = (index: number, content: string) => {
    setContentSections(prev => ({
      ...prev,
      applicableCodes: prev.applicableCodes.map((c, i) => i === index ? content : c)
    }));
  };

  const removeApplicableCode = (index: number) => {
    setContentSections(prev => ({
      ...prev,
      applicableCodes: prev.applicableCodes.filter((_, i) => i !== index)
    }));
  };

  const addCommercialTerm = () => {
    const newSlNo = contentSections.commercialTerms.length + 1;
    setContentSections(prev => ({
      ...prev,
      commercialTerms: [...prev.commercialTerms, { slNo: newSlNo, description: 'New Term', conditions: 'Enter conditions...' }]
    }));
    setEditingCommercialTerm(contentSections.commercialTerms.length);
  };

  const updateCommercialTerm = (index: number, field: 'description' | 'conditions', value: string) => {
    setContentSections(prev => ({
      ...prev,
      commercialTerms: prev.commercialTerms.map((term, i) => 
        i === index ? { ...term, [field]: value } : term
      )
    }));
  };

  const removeCommercialTerm = (index: number) => {
    setContentSections(prev => ({
      ...prev,
      commercialTerms: prev.commercialTerms.filter((_, i) => i !== index).map((term, i) => ({ ...term, slNo: i + 1 }))
    }));
  };

  const addBankDetail = () => {
    setContentSections(prev => ({
      ...prev,
      bankDetails: [...prev.bankDetails, { particular: 'New Field', value: 'Enter value...' }]
    }));
    setEditingBankDetail(contentSections.bankDetails.length);
  };

  const updateBankDetail = (index: number, field: 'particular' | 'value', value: string) => {
    setContentSections(prev => ({
      ...prev,
      bankDetails: prev.bankDetails.map((detail, i) => 
        i === index ? { ...detail, [field]: value } : detail
      )
    }));
  };

  const removeBankDetail = (index: number) => {
    setContentSections(prev => ({
      ...prev,
      bankDetails: prev.bankDetails.filter((_, i) => i !== index)
    }));
  };

  const updateClosingSection = (id: string, content: string) => {
    setContentSections(prev => ({
      ...prev,
      closingParagraphs: prev.closingParagraphs.map(s => s.id === id ? { ...s, content } : s)
    }));
  };

  const handleDrawingUploadChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isImage && !isPdf) {
      toast({
        title: "Unsupported file type",
        description: "Please upload an image or a PDF file.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      setContentSections((prev) => ({
        ...prev,
        uploadDrawings: ensureDrawingUploads(prev.uploadDrawings).map((item) =>
          item.id === id
            ? {
                ...item,
                fileName: file.name,
                mimeType: isPdf ? "application/pdf" : file.type || "image/png",
                dataUrl: value,
              }
            : item
        ),
      }));
    };
    reader.readAsDataURL(file);
  };

  const addDrawingUploadField = () => {
    setContentSections((prev) => ({
      ...prev,
      uploadDrawings: [...ensureDrawingUploads(prev.uploadDrawings), createEmptyDrawingUpload()],
    }));
  };

  const removeDrawingUploadField = (id: string) => {
    setContentSections((prev) => {
      const next = ensureDrawingUploads(prev.uploadDrawings).filter((item) => item.id !== id);
      return {
        ...prev,
        uploadDrawings: next.length > 0 ? next : [createEmptyDrawingUpload()],
      };
    });
  };

  const updateScopeRow = useCallback((section: string, index: number, field: 'description' | 'details', value: string) => {
    setContentSections(prev => ({
      ...prev,
      [section]: (prev[section as keyof QuotationContentSections] as ScopeTableRow[]).map((row, i) => 
        i === index ? { ...row, [field]: value } : row
      )
    }));
  }, []);

  const addScopeRow = useCallback((section: string) => {
    setContentSections(prev => {
      const currentRows = prev[section as keyof QuotationContentSections] as ScopeTableRow[];
      return {
        ...prev,
        [section]: [...currentRows, { slNo: currentRows.length + 1, description: '', details: '' }]
      };
    });
  }, []);

  const removeScopeRow = useCallback((section: string, index: number) => {
    setContentSections(prev => {
      const currentRows = prev[section as keyof QuotationContentSections] as ScopeTableRow[];
      if (currentRows.length > 1) {
        return {
          ...prev,
          [section]: currentRows.filter((_, i) => i !== index).map((row, i) => ({ ...row, slNo: i + 1 }))
        };
      }
      return prev;
    });
  }, []);

  const isBlockExpanded = useCallback((id: string) => expandedBlockIds[id] ?? true, [expandedBlockIds]);

  const toggleBlockExpanded = useCallback((id: string) => {
    setExpandedBlockIds((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  const setBlockExpanded = useCallback((id: string, expanded: boolean) => {
    setExpandedBlockIds((prev) => ({ ...prev, [id]: expanded }));
  }, []);

  const moveAccordionBlock = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setAccordionBlocks((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const removeAccordionBlock = useCallback((id: string) => {
    setAccordionBlocks((prev) => prev.filter((block) => block.id !== id));
    setExpandedBlockIds((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const duplicateAccordionBlock = useCallback((id: string) => {
    let duplicatedId: string | null = null;
    setAccordionBlocks((prev) => {
      const index = prev.findIndex((block) => block.id === id);
      if (index === -1) return prev;
      const source = prev[index];
      const duplicate: AccordionBlockInstance = {
        id: `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: source.type,
        heading: source.heading,
      };
      duplicatedId = duplicate.id;
      const next = [...prev];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
    if (duplicatedId) {
      setExpandedBlockIds((prev) => ({
        ...prev,
        [duplicatedId as string]: true,
      }));
    }
  }, []);

  const updateAccordionBlockHeading = useCallback((id: string, heading: string) => {
    setAccordionBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, heading } : block))
    );
  }, []);

  const getBlockInstances = useCallback(
    (type: AccordionBlockType) => accordionBlocks.filter((block) => block.type === type),
    [accordionBlocks]
  );

  const getBlockOrder = useCallback(
    (id: string) => accordionBlocks.findIndex((block) => block.id === id),
    [accordionBlocks]
  );

  const getBlockHeaderProps = useCallback((block: AccordionBlockInstance) => {
    const index = getBlockOrder(block.id);
    const isEditingHeading = editingAccordionBlockId === block.id;
    return {
      isEditingHeading,
      onStartEditHeading: () => setEditingAccordionBlockId(block.id),
      onHeadingChange: (value: string) => updateAccordionBlockHeading(block.id, value),
      onHeadingBlur: () => {
        const target = accordionBlocks.find((b) => b.id === block.id);
        if (target && !target.heading.trim()) {
          updateAccordionBlockHeading(block.id, BLOCK_LABELS[block.type]);
        }
        setEditingAccordionBlockId(null);
      },
      onMoveUp: index > 0 ? () => moveAccordionBlock(index, index - 1) : undefined,
      onMoveDown: index >= 0 && index < accordionBlocks.length - 1 ? () => moveAccordionBlock(index, index + 1) : undefined,
      onDuplicate: () => duplicateAccordionBlock(block.id),
      onDelete: () => removeAccordionBlock(block.id),
      canMoveUp: index > 0,
      canMoveDown: index >= 0 && index < accordionBlocks.length - 1,
    };
  }, [
    accordionBlocks,
    duplicateAccordionBlock,
    editingAccordionBlockId,
    getBlockOrder,
    moveAccordionBlock,
    removeAccordionBlock,
    updateAccordionBlockHeading,
  ]);

  const handleExportPDF = async (
    options?: { save?: boolean; silent?: boolean; returnDataUri?: boolean }
  ): Promise<{ filename: string; dataUri?: string } | null> => {
    const save = options?.save ?? true;
    const silent = options?.silent ?? false;
    const returnDataUri = options?.returnDataUri ?? false;
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const headerHeight = 35;
      const footerHeight = 30;
      const pxToMm = (px: number) => px * 0.2646;
      const stampSize = pxToMm(80);
      const stampRight = pxToMm(50);
      const stampBottom = pxToMm(80);
      
      let currentY = headerHeight + 10;
      let currentPage = 1;
      
      const loadImage = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
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
        console.warn('Failed to load branding images:', e);
      }
      
      const addHeaderFooterStamp = (pageNum: number) => {
        if (headerImg) {
          pdf.addImage(headerImg, 'PNG', 0, 0, pageWidth, headerHeight);
        }
        if (footerImg) {
          pdf.addImage(footerImg, 'PNG', 0, pageHeight - footerHeight, pageWidth, footerHeight);
        }
        if (stampImg) {
          pdf.addImage(stampImg, 'PNG', pageWidth - stampRight - stampSize, pageHeight - stampBottom - stampSize, stampSize, stampSize);
        }
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
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
      
      const addTitle = (text: string, fontSize: number = 14, color: string = '#1e3a5f', showRedBlock: boolean = true) => {
        currentY += 10;
        checkNewPage(15);
        if (showRedBlock && fontSize >= 12) {
          pdf.setFillColor('#d92134');
          pdf.rect(margin, currentY - 4, 4, 5, 'F');
          pdf.setFontSize(fontSize);
          pdf.setTextColor(color);
          pdf.setFont('helvetica', 'bold');
          pdf.text(text, margin + 7, currentY);
        } else {
          pdf.setFontSize(fontSize);
          pdf.setTextColor(color);
          pdf.setFont('helvetica', 'bold');
          pdf.text(text, margin, currentY);
        }
        currentY += 5.5;
      };
      
      const addText = (text: string, fontSize: number = 10, indent: number = 0) => {
        pdf.setFontSize(fontSize);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        //const lines = pdf.splitTextToSize(text, contentWidth - indent);
        const lines = pdf.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
          checkNewPage(6);
          pdf.text(line, margin + indent, currentY);
          currentY += 5;
        });
      };
      
      const addTable = (headers: string[], rows: string[][], colWidths: number[]) => {
        currentY += 3;
        const baseRowHeight = 8;
        const padding = 2;
        const headerBg = '#fff5f5';
        const borderColor = '#eeb7b7';

        // --- Render Header ---
        checkNewPage(baseRowHeight + 5);
        pdf.setFillColor(headerBg);
        pdf.rect(margin, currentY - 5, contentWidth, baseRowHeight, 'F');
        pdf.setDrawColor(borderColor);
        pdf.setLineWidth(0.2);
        pdf.rect(margin, currentY - 5, contentWidth, baseRowHeight, 'S');

        let x = margin;
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        
        headers.forEach((header, i) => {
          pdf.line(x, currentY - 5, x, currentY - 5 + baseRowHeight);
          pdf.text(header, x + padding, currentY);
          x += colWidths[i];
        });
        pdf.line(x, currentY - 5, x, currentY - 5 + baseRowHeight);
        currentY += baseRowHeight;

        // --- Render Rows ---
        pdf.setFont('helvetica', 'normal');
        rows.forEach((row, rowIdx) => {
          // 1. Calculate how many lines each cell needs
          const preparedCells = row.map((cell, i) => {
            return pdf.splitTextToSize(cell, colWidths[i] - (padding * 2));
          });

          // 2. Determine row height based on the max number of lines
          const maxLines = Math.max(...preparedCells.map(lines => lines.length));
          const dynamicRowHeight = Math.max(baseRowHeight, (maxLines * 4) + padding);

          // 3. Page break check
          if (checkNewPage(dynamicRowHeight)) {
            // Re-draw header on new page if you wish, or just continue
          }

          // 4. Draw Row Background and Border
          if (rowIdx % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
            pdf.rect(margin, currentY - 5, contentWidth, dynamicRowHeight, 'F');
          }
          pdf.setDrawColor(borderColor);
          pdf.rect(margin, currentY - 5, contentWidth, dynamicRowHeight, 'S');

          // 5. Draw Cell Content and Vertical Lines
          let cellX = margin;
          preparedCells.forEach((lines, i) => {
            pdf.line(cellX, currentY - 5, cellX, currentY - 5 + dynamicRowHeight);
            
            // Render every line of the cell text
            lines.forEach((line: string, lineIdx: number) => {
              pdf.text(line, cellX + padding, (currentY - 1) + (lineIdx * 4));
            });
            
            cellX += colWidths[i];
          });
          pdf.line(cellX, currentY - 5, cellX, currentY - 5 + dynamicRowHeight);

          currentY += dynamicRowHeight;
        });
        currentY += 1.5;
      };

      const getPdfJsLib = async () => {
        const fromWindow = (window as any).pdfjsLib;
        if (fromWindow) {
          return fromWindow;
        }
        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector<HTMLScriptElement>('script[data-pdfjs="true"]');
          if (existingScript) {
            existingScript.addEventListener("load", () => resolve(), { once: true });
            existingScript.addEventListener("error", () => reject(new Error("Failed to load PDF renderer.")), { once: true });
            return;
          }
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.async = true;
          script.dataset.pdfjs = "true";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load PDF renderer."));
          document.head.appendChild(script);
        });
        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) {
          throw new Error("PDF renderer is unavailable.");
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        return pdfjsLib;
      };

      const renderPdfPagesAsImages = async (dataUrl: string): Promise<string[]> => {
        const pdfjsLib = await getPdfJsLib();
        const data = await (await fetch(dataUrl)).arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        const pages: string[] = [];
        const maxPages = Math.min(pdfDoc.numPages, 30);
        for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
          const page = await pdfDoc.getPage(pageNo);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          await page.render({ canvasContext: ctx as any, viewport } as any).promise;
          pages.push(canvas.toDataURL("image/jpeg", 0.9));
        }
        return pages;
      };

      const addAttachmentImagePage = (imageDataUrl: string, label: string) => {
        pdf.addPage();
        currentPage++;
        addHeaderFooterStamp(currentPage);
        currentY = headerHeight + 10;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(10);
        pdf.setTextColor(30, 58, 95);
        const labelLines = pdf.splitTextToSize(label, contentWidth);
        labelLines.forEach((line: string) => {
          pdf.text(line, margin, currentY);
          currentY += 5;
        });
        currentY += 1;

        const imgProps = pdf.getImageProperties(imageDataUrl);
        const availableWidth = contentWidth;
        const availableHeight = pageHeight - footerHeight - currentY - 8;
        const widthRatio = availableWidth / imgProps.width;
        const heightRatio = availableHeight / imgProps.height;
        const ratio = Math.min(widthRatio, heightRatio);
        const drawW = imgProps.width * ratio;
        const drawH = imgProps.height * ratio;
        const drawX = margin + (availableWidth - drawW) / 2;

        const imgFormat = imageDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
        pdf.addImage(imageDataUrl, imgFormat, drawX, currentY, drawW, drawH);
      };
      addHeaderFooterStamp(1);
      
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Ref.: ${quotationData.quotationNumber}`, margin, currentY);
      pdf.text(`Date: ${new Date().toLocaleDateString('en-IN')}, Revision: ${quotationData.revision}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 8;
      
      pdf.text(`Enquiry no.: ${quotationData.enquiryNumber}`, margin, currentY);
      currentY += 8;
      
      pdf.text(`Project Location: ${project?.location || '-'}`, margin, currentY);
      currentY += 15;
      
      pdf.setFontSize(18);
      pdf.setTextColor('#da2032');
      pdf.setFont('helvetica', 'bold');
      pdf.text(quotationData.proposalTitle || 'Techno-Commercial Offer', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;
      
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text(quotationData.toLabel || 'To', margin, currentY);
      currentY += 6;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${quotationData.msLabel || 'M/s'} ${client?.name || '-'}`, margin, currentY);
      currentY += 6;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${client?.location || ''}`, margin, currentY);
      currentY += 12;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Subject: ${quotationData.subject}`, margin, currentY);
      currentY += 12;
      
      pdf.setFont('helvetica', 'normal');
      contentSections.introSections.forEach((section) => {
        addText(section.content, 10, 0);
      });
      
      currentY += 7;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Regards,', margin, currentY);
      currentY += 6;
      pdf.setFont('helvetica', 'bold');
      pdf.text(quotationData.contactName, margin, currentY);
      currentY += 5;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Mo: ${quotationData.contactMobile}`, margin, currentY);
      currentY += 5;
      pdf.text(`Email: ${quotationData.contactEmail}`, margin, currentY);
      currentY += 5.5;
      
      pdf.addPage();
      currentPage++;
      addHeaderFooterStamp(currentPage);
      currentY = headerHeight + 10;
      const indexPageNum = currentPage;
      
      pdf.setFontSize(16);
      pdf.setTextColor('#1e3a5f');
      pdf.setFont('helvetica', 'bold');
      pdf.text('INDEX', pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;
      
      const indexStartY = currentY;
      const indexData: Array<{ title: string; page: number }> = [];
      
      currentY += 80;
      
      pdf.addPage();
      currentPage++;
      addHeaderFooterStamp(currentPage);
      currentY = headerHeight + 10;
      
      accordionBlocks.forEach((block, idx) => {
        const blockTitle = (block.heading && block.heading.trim().length > 0)
          ? block.heading
          : (BLOCK_LABELS[block.type] || `Section ${idx + 1}`);
        const baseIndexTitle = blockTitle;
        const duplicateCount = accordionBlocks.slice(0, idx).filter((b) => b.heading === block.heading).length;
        const indexTitle = duplicateCount > 0 ? `${baseIndexTitle} (${duplicateCount + 1})` : baseIndexTitle;
        indexData.push({ title: indexTitle, page: currentPage });

        switch (block.type) {
          case "scopeBrief":
            checkNewPage(50);
            addTitle(blockTitle, 14, '#1e3a5f');
            addTable(
              ['Sl. No.', 'Description', 'Details'],
              contentSections.scopeBriefDetails.map(row => [row.slNo.toString(), row.description, row.details]),
              [25, 90, 65]
            );
            break;
          case "scopeBasic":
            checkNewPage(50);
            addTitle(blockTitle, 14, '#1e3a5f');
            addTable(
              ['Sl. No.', 'Description', 'Details'],
              contentSections.scopeBasicBuilding.map(row => [row.slNo.toString(), row.description, row.details]),
              [25, 90, 65]
            );
            break;
          case "scopeAdditions":
            checkNewPage(50);
            addTitle(blockTitle, 14, '#1e3a5f');
            addTable(
              ['Sr. No.', 'Description', 'Details'],
              contentSections.scopeBuildingAdditions.map(row => [row.slNo.toString(), row.description, row.details]),
              [25, 90, 65]
            );
            break;
          case "steelWork":
            checkNewPage(50);
            addTitle(blockTitle, 14, '#1e3a5f');
            addTable(
              ['No.', 'Description', 'Details'],
              contentSections.steelWorkFinish.map(row => [row.slNo.toString(), row.description, row.details]),
              [20, 80, 80]
            );
            break;
          case "designLoads":
            checkNewPage(50);
            addTitle(blockTitle, 14, '#1e3a5f');
            addTable(
              ['Sr. No.', 'Description', 'Details'],
              contentSections.designLoads.map(row => [row.slNo.toString(), row.description, row.details]),
              [25, 90, 65]
            );
            break;
          case "applicableCodes":
            checkNewPage(45);
            addTitle(blockTitle, 14, '#1e3a5f');
            contentSections.applicableCodes.forEach((code) => {
              addText(`• ${code}`, 9, 5);
            });
            break;
          case "materialSpecs":
            checkNewPage(50);
            addTitle(blockTitle, 14, '#1e3a5f');
            addTable(
              ['SI. No.', 'Structural Components', 'Details'],
              contentSections.materialSpecs.map(row => [row.slNo.toString(), row.description, row.details]),
              [25, 90, 65]
            );
            break;
          case "drawingsDelivery":
            checkNewPage(45);
            addTitle(blockTitle, 14, '#1e3a5f');
            contentSections.drawingsDelivery.forEach((item) => {
              addText(`• ${item}`, 9, 5);
            });
            break;
          case "erectionScopeClient":
            checkNewPage(45);
            addTitle(blockTitle, 14, '#1e3a5f');
            contentSections.erectionScopeClient.forEach((item) => {
              addText(`• ${item}`, 9, 5);
            });
            break;
          case "erectionScopeCompany":
            checkNewPage(45);
            addTitle(blockTitle, 14, '#1e3a5f');
            contentSections.erectionScopeCompany.forEach((item) => {
              addText(`• ${item}`, 9, 5);
            });
            break;
          case "commercialPrice":
            checkNewPage(60);
            addTitle(blockTitle, 14, '#1e3a5f');
            const priceHeaders = ['S.N.', 'Description', 'UOM', 'QTY', 'Rate', 'Amount', 'Remarks'];
            const priceRows = lineItems.map(item => [
              item.serialNo.toString(),
              item.description,
              item.unit,
              item.quantity.toString(),
              `Rs.${item.rate.toLocaleString('en-IN')}`,
              `Rs.${item.amount.toLocaleString('en-IN')}`,
              item.remarks || ''
            ]);
            addTable(priceHeaders, priceRows, [15, 55, 20, 20, 25, 30, 15]);

            const commercialTotalAmount = calculateTotal();
            checkNewPage(18);
            const totalBlockWidth = 75;
            const totalBlockHeight = 9;
            const totalBlockX = pageWidth - margin - totalBlockWidth;
            pdf.setFillColor('#fff5f5');
            pdf.setDrawColor('#eeb7b7');
            pdf.setLineWidth(0.2);
            pdf.rect(totalBlockX, currentY - 3, totalBlockWidth, totalBlockHeight, 'FD');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            const formattedCommercialTotal = commercialTotalAmount.toLocaleString('en-IN');
            pdf.text(`Total Amount: ${formattedCommercialTotal}.`, totalBlockX + 3, currentY + 2);
            currentY += totalBlockHeight + 2;
            break;
          case "paymentTerms":
            checkNewPage(50);
            addTitle(blockTitle, 14, '#1e3a5f');
            normalizePaymentTermSections(contentSections.paymentTermSections, contentSections.paymentTerms).forEach((section) => {
              checkNewPage(8);
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(10);
              pdf.setTextColor(0, 0, 0);
              pdf.text(section.heading, margin, currentY);
              currentY += 5;
              section.terms.forEach((term, termIdx) => {
                addText(`${termIdx + 1}. ${term}`, 9, 5);
              });
              currentY += 2;
            });
            addTitle('BANK DETAILS', 11, '#1e3a5f');
            contentSections.bankDetails.forEach((detail) => {
              addText(`${detail.particular}: ${detail.value}`, 9, 0);
            });
            break;
          case "commercialTerms":
            checkNewPage(80);
            addTitle(blockTitle, 14, '#1e3a5f');
            addTable(
              ['SI. No.', 'Description', 'Conditions'],
              contentSections.commercialTerms.map(t => [t.slNo.toString(), t.description, t.conditions]),
              [20, 45, 115]
            );
            break;
          default:
            break;
        }
      });
      
      checkNewPage(30);
      addTitle('Notes:', 11, '#333333');
      contentSections.notes.forEach((note, idx) => {
        addText(`${idx + 1}. ${note}`, 9, 5);
      });
      
      currentY += 7;
      
      checkNewPage(20);
      contentSections.closingParagraphs.forEach((section) => {
        addText(section.content, 10, 0);
      });
      currentY += 3.5;
      
      currentY += 7;
      
      currentY += 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text(contentSections.closingThanks || 'Thanking you', margin, currentY);
      currentY += 6;
      
      pdf.setTextColor('#da2032');
      pdf.text(contentSections.closingCompanyName || 'Revira Nexgen Structures Pvt. Ltd.', margin, currentY);

      const uploadDrawings = ensureDrawingUploads(contentSections.uploadDrawings).filter((item) => item.dataUrl);
      if (uploadDrawings.length > 0) {
        indexData.push({ title: "Upload a Drawing", page: currentPage + 1 });
        for (const upload of uploadDrawings) {
          if (upload.mimeType === "application/pdf") {
            try {
              const pdfPageImages = await renderPdfPagesAsImages(upload.dataUrl);
              if (pdfPageImages.length === 0) {
                throw new Error("No pages rendered");
              }
              for (let pageIdx = 0; pageIdx < pdfPageImages.length; pageIdx++) {
                addAttachmentImagePage(pdfPageImages[pageIdx], `${upload.fileName || "Uploaded PDF"} - Page ${pageIdx + 1}`);
              }
            } catch (pdfAttachmentError) {
              pdf.addPage();
              currentPage++;
              addHeaderFooterStamp(currentPage);
              currentY = headerHeight + 10;
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(11);
              pdf.setTextColor(218, 32, 50);
              pdf.text("Uploaded PDF could not be rendered", margin, currentY);
              currentY += 7;
              pdf.setFont("helvetica", "normal");
              pdf.setFontSize(10);
              pdf.setTextColor(0, 0, 0);
              pdf.text(`File: ${upload.fileName || "Attachment"}`, margin, currentY);
              currentY += 6;
              const message = "PDF pages were skipped because the renderer could not be loaded in this browser/session.";
              pdf.splitTextToSize(message, contentWidth).forEach((line: string) => {
                pdf.text(line, margin, currentY);
                currentY += 5;
              });
              console.warn("Failed to render PDF attachment:", pdfAttachmentError);
            }
          } else if (upload.dataUrl.startsWith("data:image/")) {
            addAttachmentImagePage(upload.dataUrl, upload.fileName || "Uploaded image");
          }
        }
      }
      
      pdf.setPage(indexPageNum);
      const indexTableY = indexStartY;
      const rowHeight = 8;
      
      const indexBorderColor = '#eeb7b7';
      const colWidths = [25, 120, contentWidth - 145];
      
      let x = margin;
      pdf.setFillColor('#fff5f5');
      pdf.rect(margin, indexTableY - 5, contentWidth, rowHeight, 'F');
      
      pdf.setDrawColor(indexBorderColor);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, indexTableY - 5, contentWidth, rowHeight, 'S');
      let cellX = margin;
      colWidths.forEach((w) => {
        pdf.line(cellX, indexTableY - 5, cellX, indexTableY - 5 + rowHeight);
        cellX += w;
      });
      pdf.line(cellX, indexTableY - 5, cellX, indexTableY - 5 + rowHeight);
      
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sl. No.', x + 2, indexTableY);
      x += 25;
      pdf.text('Subject', x + 2, indexTableY);
      x += 120;
      pdf.text('Page No.', x + 2, indexTableY);
      
      let tableY = indexTableY + rowHeight;
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      indexData.forEach((item, idx) => {
        x = margin;
        if (idx % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, tableY - 5, contentWidth, rowHeight, 'F');
        }
        
        pdf.setDrawColor(indexBorderColor);
        pdf.rect(margin, tableY - 5, contentWidth, rowHeight, 'S');
        cellX = margin;
        colWidths.forEach((w) => {
          pdf.line(cellX, tableY - 5, cellX, tableY - 5 + rowHeight);
          cellX += w;
        });
        pdf.line(cellX, tableY - 5, cellX, tableY - 5 + rowHeight);
        
        pdf.text((idx + 1).toString(), x + 2, tableY);
        x += 25;
        pdf.text(item.title, x + 2, tableY);
        x += 120;
        pdf.text(item.page?.toString() || '-', x + 2, tableY);
        tableY += rowHeight;
      });
      
      // Generate PDF filename: RNS_DDMMYYYY_CompanyShortName_TemplatePrefix-ProjectID_R-XXX
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${day}${month}${year}`;
      
      // Get company short name (first letter of each word)
      const companyShortName = client?.name 
        ? client.name.split(/\s+/).map(word => word.charAt(0).toUpperCase()).join('')
        : 'COMPANY';
      
      // Get template prefix based on quotation type
      const templatePrefix = project?.quotationType === "Supply and Fabrication" ? "Peb" :
                            project?.quotationType === "Structural Fabrication" ? "SF" : "JW";
      
      // Get project ID padded to 3 digits
      const projectIdStr = String(project?.id || 1).padStart(3, '0');
      
      const filename = `RNS_${dateStr}_${companyShortName}_${templatePrefix}-${projectIdStr}_${quotationData.revision}.pdf`;
      const dataUri = returnDataUri ? (pdf.output("datauristring", { filename }) as string) : undefined;
      if (save) {
        pdf.save(filename);
      }

      if (!silent) {
        toast({
          title: save ? "PDF exported" : "PDF generated",
          description: save ? "The quotation has been exported as PDF." : "The quotation PDF is ready.",
        });
      }
      return { filename, dataUri };
    } catch (error) {
      console.error("PDF export error:", error);
      if (!silent) {
        toast({
          title: "Export failed",
          description: "Failed to export PDF. Please try again.",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const buildShareText = () => {
    const quoteNo = quotationData.quotationNumber || "-";
    const revision = quotationData.revision || "-";
    const clientName = client?.name || "Client";
    return `Quotation ${quoteNo} (${revision}) for ${clientName} is ready. Please find the exported PDF attached.`;
  };

  const WHATSAPP_SENDER_NUMBER = "9968422442";

  const openSendEmailDialog = () => {
    if (!existingQuotation?.id) {
      toast({
        title: "Save required",
        description: "Please save quotation first, then send via email.",
        variant: "destructive",
      });
      return;
    }
    setEmailForm({
      to: client?.emailAddress || "",
      subject: `Quotation ${quotationData.quotationNumber || ""} ${quotationData.revision || ""}`.trim(),
      message: `${buildShareText()}\n\nProject: ${project?.projectName || "-"}\nClient: ${client?.name || "-"}\nDate: ${new Date().toLocaleDateString("en-GB")}`,
    });
    setEmailDialogOpen(true);
  };

  const submitSendEmail = async () => {
    if (!existingQuotation?.id) {
      toast({
        title: "Save required",
        description: "Please save quotation first, then send via email.",
        variant: "destructive",
      });
      return;
    }

    const emails = emailForm.to
      .split(",")
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
    if (!emailForm.subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter email subject.",
        variant: "destructive",
      });
      return;
    }
    if (!emailForm.message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter message body.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingEmail(true);
    const generated = await handleExportPDF({ save: false, silent: true, returnDataUri: true });
    if (!generated?.dataUri) {
      setIsSendingEmail(false);
      toast({
        title: "PDF failed",
        description: "Unable to generate quotation PDF for email.",
        variant: "destructive",
      });
      return;
    }

    const base64 = generated.dataUri.split(",")[1] || "";

    try {
      await apiRequest("POST", `/revira/api/quotations/${existingQuotation.id}/send-email`, {
        to: emails,
        subject: emailForm.subject.trim(),
        message: emailForm.message.trim(),
        fileName: generated.filename,
        pdfBase64: base64,
      });
      toast({
        title: "Email sent",
        description: `Quotation emailed to ${emails.join(", ")}.`,
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
    if (!existingQuotation?.id) {
      toast({
        title: "Save required",
        description: "Please save quotation first, then send on WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    const rawPhone = (client?.mobileNumber || "").replace(/\D/g, "");
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    setWhatsAppForm({
      mobile: phone,
      message: `${buildShareText()}\nProject: ${project?.projectName || "-"}\nClient: ${client?.name || "-"}\nFrom: ${WHATSAPP_SENDER_NUMBER}`,
    });
    setWhatsappDialogOpen(true);
  };

  const submitSendWhatsApp = async () => {
    const phone = whatsAppForm.mobile.replace(/\D/g, "");
    if (!phone) {
      toast({
        title: "Mobile required",
        description: "Please enter mobile number.",
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
    const generated = await handleExportPDF({ save: false, silent: true, returnDataUri: true });
    if (!generated?.dataUri) {
      setIsSendingWhatsApp(false);
      toast({
        title: "PDF failed",
        description: "Unable to generate quotation PDF for WhatsApp send.",
        variant: "destructive",
      });
      return;
    }

    const base64 = generated.dataUri.split(",")[1] || "";

    try {
      await apiRequest("POST", `/revira/api/quotations/${existingQuotation?.id}/send-whatsapp`, {
        to: phone,
        message: whatsAppForm.message.trim(),
        fileName: generated.filename,
        pdfBase64: base64,
      });
      toast({
        title: "WhatsApp sent",
        description: `Quotation sent to ${phone}.`,
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

  const SectionHeader = ({
    title,
    number,
    expanded,
    onToggle,
    onAdd,
    testId,
    isEditingHeading,
    onStartEditHeading,
    onHeadingChange,
    onHeadingBlur,
    onMoveUp,
    onMoveDown,
    onDuplicate,
    onDelete,
    canMoveUp = true,
    canMoveDown = true,
  }: {
    title: string;
    number: string;
    expanded: boolean;
    onToggle?: () => void;
    onAdd?: () => void;
    testId?: string;
    isEditingHeading?: boolean;
    onStartEditHeading?: () => void;
    onHeadingChange?: (value: string) => void;
    onHeadingBlur?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
  }) => (
    <div 
      className="flex items-center gap-3 bg-[#d92134] text-white px-4 py-3 rounded-lg cursor-pointer"
      onClick={onToggle}
      data-testid={testId || `section-header-${number}`}
    >
      <div className="flex items-center justify-center w-8 h-8 bg-white text-[#d92134] rounded font-bold text-sm">
        {number}
      </div>
      {isEditingHeading ? (
        <Input
          value={title}
          onChange={(e) => onHeadingChange?.(e.target.value)}
          onBlur={onHeadingBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              onHeadingBlur?.();
            }
          }}
          autoFocus
          className="h-8 flex-1 text-slate-900 bg-white"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="font-semibold flex-1">{title}</span>
      )}
      {onStartEditHeading && !isEditingHeading && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onStartEditHeading(); }}
          className="text-white hover:bg-white/20 h-7 w-7"
          title="Edit heading"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
      )}
      {onAdd && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="text-white hover:bg-white/20 h-7"
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      )}
      {onMoveUp && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          className="text-white hover:bg-white/20 h-7 w-7"
          disabled={!canMoveUp}
          title="Move up"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
      )}
      {onMoveDown && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          className="text-white hover:bg-white/20 h-7 w-7"
          disabled={!canMoveDown}
          title="Move down"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      )}
      {onDuplicate && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="text-white hover:bg-white/20 h-7 w-7"
          title="Duplicate block"
        >
          <Copy className="h-4 w-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-white hover:bg-white/20 h-7 w-7"
          title="Delete block"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
      {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
    </div>
  );

  if (projectLoading || clientLoading) {
    return (
      <LayoutShell user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </LayoutShell>
    );
  }

  if (!project || !client) {
    return (
      <LayoutShell user={user}>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold text-slate-700">Project not found</h2>
          <Button onClick={() => setLocation("/revira/projects")} className="mt-4">
            Back to Projects
          </Button>
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
            onClick={() => {
              setNewQuotationType((project?.quotationType as QuotationTypeOption) || "Supply and Fabrication");
              setNewQuotationDialogOpen(true);
            }}
            data-testid="button-new-quotation"
          >
            <FileText className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        </div>

        {/* Action Bar */}
        <div className="bg-[#d92134] rounded-2xl p-3 md:p-4 mb-6 border border-[#c31d2f] shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div
              className="inline-flex items-center gap-3 cursor-pointer hover:opacity-90 bg-white/10 px-3 py-2 rounded-xl w-fit"
              onClick={() => setVersionsDialogOpen(true)}
              data-testid="button-versions-count"
            >
              <span className="text-white font-semibold">Versions</span>
              <div className="flex items-center justify-center px-3 h-8 bg-white text-[#d92134] rounded-lg font-bold shadow-sm">
                {existingQuotation?.revision || quotationData.revision || "R-001"}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-xl p-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-transparent border-white/30 text-white hover:bg-white/20"
                  onClick={() => setVersionsDialogOpen(true)}
                  data-testid="button-view-versions"
                  title="View versions"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {existingQuotation && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => duplicateQuotationMutation.mutate()}
                    disabled={duplicateQuotationMutation.isPending}
                    className="bg-transparent border-white/30 text-white hover:bg-white/20"
                    data-testid="button-duplicate"
                    title="Duplicate quotation"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  onClick={openSendEmailDialog}
                  disabled={isExporting}
                  className="bg-transparent border-white/30 text-white hover:bg-white/20"
                  data-testid="button-send-email"
                  title="Send quotation by email"
                >
                  <Mail className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={openSendWhatsAppDialog}
                  disabled={isExporting}
                  className="bg-transparent border-white/30 text-white hover:bg-white/20"
                  data-testid="button-send-whatsapp"
                  title="Send quotation on WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={() => {
                  void handleExportPDF();
                }}
                disabled={isExporting}
                className="bg-[#22c55e] hover:bg-[#16a34a] text-white min-w-[150px]"
                data-testid="button-export-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>

              <Button
                variant="outline"
                onClick={handleSave}
                disabled={createQuotationMutation.isPending || updateQuotationMutation.isPending}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 min-w-[170px]"
                data-testid="button-save-quotation"
              >
                <Save className="w-4 h-4 mr-2" />
                {createQuotationMutation.isPending || updateQuotationMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>

              {existingQuotation && quotationVersions && quotationVersions.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-red-200"
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete this quotation (${existingQuotation.revision})?`)) {
                      try {
                        await apiRequest("DELETE", `/revira/api/quotations/${existingQuotation.id}`);
                        queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation-versions"] });
                        const remaining = quotationVersions.filter((q) => q.id !== existingQuotation.id);
                        if (remaining.length > 0) {
                          setLocation(`/revira/projects/${projectId}/quotation/${remaining[0].id}`);
                        } else {
                          setLocation(`/revira/projects/${projectId}/quotation`);
                        }
                        toast({ title: "Quotation deleted", description: `${existingQuotation.revision} has been deleted.` });
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to delete quotation.", variant: "destructive" });
                      }
                    }
                  }}
                  data-testid="button-delete-quotation"
                  title="Delete quotation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div ref={printRef} className="space-y-6">
          {/* Block 1: Technical Proposal Metadata */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-slate-50">
              <div className="p-2 bg-[#da2032] rounded">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-[#d92134] uppercase tracking-wide">Technical Proposal Metadata</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Quotation Info Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ref ID</label>
                  <Input
                    value={quotationData.quotationNumber}
                    onChange={(e) => setQuotationData({...quotationData, quotationNumber: e.target.value})}
                    className="mt-1 bg-slate-50 border-slate-200"
                    data-testid="input-quotation-number"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Creation Date</label>
                  <Input
                    value={formatDate()}
                    readOnly
                    className="mt-1 bg-slate-50 border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Enquiry Ref</label>
                  <Input
                    value={quotationData.enquiryNumber}
                    onChange={(e) => setQuotationData({...quotationData, enquiryNumber: e.target.value})}
                    className="mt-1 bg-slate-50 border-slate-200"
                    data-testid="input-enquiry-number"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Project Site (Legacy)</label>
                  <Input
                    value={project.location}
                    readOnly
                    className="mt-1 bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
              
              {/* Proposal Header Title */}
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="text-xs font-medium text-[#da2032] uppercase tracking-wide">Proposal Header Title</label>
                <Input
                  value={quotationData.proposalTitle}
                  onChange={(e) => setQuotationData({...quotationData, proposalTitle: e.target.value})}
                  className="mt-2 text-lg font-bold bg-white border-slate-200"
                  data-testid="input-proposal-title"
                />
              </div>
              
              {/* Client Subject Specification */}
              <div className="bg-slate-50 rounded-lg p-4">
                <label className="text-xs font-medium text-[#da2032] uppercase tracking-wide">Client Subject Specification</label>
                <Input
                  value={quotationData.subject}
                  onChange={(e) => setQuotationData({...quotationData, subject: e.target.value})}
                  className="mt-2 bg-white border-slate-200"
                  data-testid="input-subject"
                />
              </div>
            </div>
          </div>

          {/* Block 2: Main Covering Letter (Recipient Block) */}
          <Card className="shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-slate-50">
              <div className="p-2 bg-[#d92134] rounded">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-[#d92134] uppercase tracking-wide">Main Covering Letter</h2>
            </div>
            
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-500">To Label</label>
                    <Input
                      value={quotationData.toLabel}
                      onChange={(e) => setQuotationData({ ...quotationData, toLabel: e.target.value })}
                      className="mt-1"
                      data-testid="input-to-label"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500">M/s Label</label>
                    <Input
                      value={quotationData.msLabel}
                      onChange={(e) => setQuotationData({ ...quotationData, msLabel: e.target.value })}
                      className="mt-1"
                      data-testid="input-ms-label"
                    />
                  </div>
                </div>
                <p className="font-semibold text-slate-700">{quotationData.toLabel || "To"},</p>
                <p className="font-semibold text-slate-800 mt-1">{(quotationData.msLabel || "M/s") + " " + client.name}</p>
                <p className="text-slate-600 text-slate-700 mt-1">{client.location}</p>
              </div>
              
              <div>
                <span className="font-semibold text-slate-700">Subject: </span>
                <span className="text-slate-600">{quotationData.subject}</span>
              </div>
              
              <div className="text-sm text-slate-700 space-y-2">
                <p>Dear Sir,</p>
                {contentSections.introSections.map((section, index) => (
                  <div key={section.id} className="group relative">
                    {editingSection === section.id ? (
                      <div className="flex gap-2">
                        <Textarea
                          value={section.content}
                          onChange={(e) => updateIntroSection(section.id, e.target.value)}
                          className="flex-1 min-h-[60px]"
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditingSection(null)}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => removeIntroSection(section.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p 
                        className="cursor-pointer hover:bg-slate-50 p-2 rounded border border-transparent hover:border-slate-200"
                        onClick={() => setEditingSection(section.id)}
                      >
                        {section.content}
                        <Edit3 className="inline-block ml-2 h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                      </p>
                    )}
                  </div>
                ))}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={addIntroSection}
                  className="text-[#da2032]"
                  data-testid="button-add-intro"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Paragraph
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Block 3: Master Signatory Authority */}
          <Card className="shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b bg-slate-50">
              <div className="p-2 bg-[#d92134] rounded">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-[#d92134] uppercase tracking-wide">Master Signatory Authority</h2>
            </div>
            
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Full Legal Name</label>
                  <Input
                    value={quotationData.contactName}
                    onChange={(e) => setQuotationData({...quotationData, contactName: e.target.value})}
                    className="mt-1 bg-slate-50 border-slate-200"
                    data-testid="input-contact-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Contact Handset</label>
                  <Input
                    value={quotationData.contactMobile}
                    onChange={(e) => setQuotationData({...quotationData, contactMobile: e.target.value})}
                    className="mt-1 bg-slate-50 border-slate-200"
                    data-testid="input-contact-mobile"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Official Email Address</label>
                  <Input
                    value={quotationData.contactEmail}
                    onChange={(e) => setQuotationData({...quotationData, contactEmail: e.target.value})}
                    className="mt-1 bg-slate-50 border-slate-200"
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
          {/* Scope sections - Only for Supply and Fabrication template */}
          {project?.quotationType === "Supply and Fabrication" && (
            <>
              {/* Block 4: Scope of Supply - Brief Details */}
              {getBlockInstances("scopeBrief").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="01" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <ScopeTable data={contentSections.scopeBriefDetails} section="scopeBriefDetails" onUpdateRow={updateScopeRow} onRemoveRow={removeScopeRow} onAddRow={addScopeRow} />
                )}
              </div>
              ))}

              {/* Block 5: Scope of Supply - Basic Building Description */}
              {getBlockInstances("scopeBasic").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="02" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <ScopeTable data={contentSections.scopeBasicBuilding} section="scopeBasicBuilding" onUpdateRow={updateScopeRow} onRemoveRow={removeScopeRow} onAddRow={addScopeRow} />
                )}
              </div>
              ))}

              {/* Block 6: Standard Building Additions */}
              {getBlockInstances("scopeAdditions").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="03" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <ScopeTable data={contentSections.scopeBuildingAdditions} section="scopeBuildingAdditions" onUpdateRow={updateScopeRow} onRemoveRow={removeScopeRow} onAddRow={addScopeRow} />
                )}
              </div>
              ))}

              {/* Block 7: Steel Work Finish */}
              {getBlockInstances("steelWork").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="04" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <ScopeTable data={contentSections.steelWorkFinish} section="steelWorkFinish" onUpdateRow={updateScopeRow} onRemoveRow={removeScopeRow} onAddRow={addScopeRow} />
                )}
              </div>
              ))}

              {/* Block 8: Design Loads */}
              {getBlockInstances("designLoads").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="05" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <ScopeTable data={contentSections.designLoads} section="designLoads" onUpdateRow={updateScopeRow} onRemoveRow={removeScopeRow} onAddRow={addScopeRow} />
                )}
              </div>
              ))}

                            {/* Block 8.5: Applicable Codes for Design */}
              {getBlockInstances("applicableCodes").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="text-left p-3 w-16 text-slate-600 font-medium">Sr. No.</th>
                          <th className="text-left p-3 text-slate-600 font-medium">Applicable Code</th>
                          <th className="w-12 p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentSections.applicableCodes.map((code, index) => (
                          <tr key={`applicable-code-${index}`} className="border-b hover:bg-slate-50">
                            <td className="p-3 text-center text-slate-600">{index + 1}</td>
                            <td className="p-3">
                              <Textarea
                                value={code}
                                onChange={(e) => updateApplicableCode(index, e.target.value)}
                                className="min-h-[56px] text-sm border-0 bg-transparent focus:bg-white"
                                data-testid={`input-applicable-code-${index}`}
                              />
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeApplicableCode(index)}
                                disabled={contentSections.applicableCodes.length === 1}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                data-testid={`button-remove-applicable-code-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 border-t bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addApplicableCode}
                        className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
                        data-testid="button-add-applicable-code-row"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Row
                      </Button>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}

              {/* Block 9: Material Specifications */}
              {getBlockInstances("materialSpecs").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="06" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <ScopeTable data={contentSections.materialSpecs} section="materialSpecs" onUpdateRow={updateScopeRow} onRemoveRow={removeScopeRow} onAddRow={addScopeRow} />
                )}
              </div>
              ))}

                            {/* Drawings & Delivery Section */}
              {getBlockInstances("drawingsDelivery").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="09" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="text-left p-3 w-16 text-slate-600 font-medium">Sr. No.</th>
                          <th className="text-left p-3 text-slate-600 font-medium">Drawings & Delivery</th>
                          <th className="w-12 p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentSections.drawingsDelivery.map((item, index) => (
                          <tr key={`drawings-delivery-${index}`} className="border-b hover:bg-slate-50">
                            <td className="p-3 text-center text-slate-600">{index + 1}</td>
                            <td className="p-3">
                              <Textarea
                                value={item}
                                onChange={(e) => updateDrawingsDeliveryItem(index, e.target.value)}
                                className="min-h-[56px] text-sm border-0 bg-transparent focus:bg-white"
                                data-testid={`input-drawings-delivery-${index}`}
                              />
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDrawingsDeliveryItem(index)}
                                disabled={contentSections.drawingsDelivery.length === 1}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                data-testid={`button-remove-drawings-delivery-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 border-t bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addDrawingsDeliveryItem}
                        className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
                        data-testid="button-add-drawings-delivery-row"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Row
                      </Button>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}
                            {/* Erection Scopes - Scope of Client */}
              {getBlockInstances("erectionScopeClient").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="10" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="text-left p-3 w-16 text-slate-600 font-medium">Sr. No.</th>
                          <th className="text-left p-3 text-slate-600 font-medium">Scope of Client</th>
                          <th className="w-12 p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentSections.erectionScopeClient.map((item, index) => (
                          <tr key={`erection-client-${index}`} className="border-b hover:bg-slate-50">
                            <td className="p-3 text-center text-slate-600">{index + 1}</td>
                            <td className="p-3">
                              <Textarea
                                value={item}
                                onChange={(e) => updateErectionClientItem(index, e.target.value)}
                                className="min-h-[56px] text-sm border-0 bg-transparent focus:bg-white"
                                data-testid={`input-erection-client-${index}`}
                              />
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeErectionClientItem(index)}
                                disabled={contentSections.erectionScopeClient.length === 1}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                data-testid={`button-remove-erection-client-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 border-t bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addErectionClientItem}
                        className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
                        data-testid="button-add-erection-client-row"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Row
                      </Button>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}
                            {/* Erection Scopes - Scope of Company */}
              {getBlockInstances("erectionScopeCompany").map((blockInstance) => (
              <div key={blockInstance.id} className="space-y-4" style={{ order: getBlockOrder(blockInstance.id) }}>
                <SectionHeader 
                  title={blockInstance.heading}
                  number="11" 
                  expanded={isBlockExpanded(blockInstance.id)}
                  onToggle={() => toggleBlockExpanded(blockInstance.id)}
                  {...getBlockHeaderProps(blockInstance)}
                />
                {isBlockExpanded(blockInstance.id) && (
                  <div className="bg-white rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b">
                          <th className="text-left p-3 w-16 text-slate-600 font-medium">Sr. No.</th>
                          <th className="text-left p-3 text-slate-600 font-medium">Scope of Company</th>
                          <th className="w-12 p-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {contentSections.erectionScopeCompany.map((item, index) => (
                          <tr key={`erection-company-${index}`} className="border-b hover:bg-slate-50">
                            <td className="p-3 text-center text-slate-600">{index + 1}</td>
                            <td className="p-3">
                              <Textarea
                                value={item}
                                onChange={(e) => updateErectionCompanyItem(index, e.target.value)}
                                className="min-h-[56px] text-sm border-0 bg-transparent focus:bg-white"
                                data-testid={`input-erection-company-${index}`}
                              />
                            </td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeErectionCompanyItem(index)}
                                disabled={contentSections.erectionScopeCompany.length === 1}
                                className="h-8 w-8 text-red-500 hover:text-red-700"
                                data-testid={`button-remove-erection-company-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 border-t bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addErectionCompanyItem}
                        className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
                        data-testid="button-add-erection-company-row"
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Row
                      </Button>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </>
          )}

          {/* Commercial Price & Payment Terms */}
          {getBlockInstances("commercialPrice").map((blockInstance) => (
          <Accordion
            key={blockInstance.id}
            type="single"
            collapsible
            value={isBlockExpanded(blockInstance.id) ? `commercial-price-${blockInstance.id}` : ""}
            onValueChange={(value) => setBlockExpanded(blockInstance.id, value === `commercial-price-${blockInstance.id}`)}
            style={{ order: getBlockOrder(blockInstance.id) }}
          >
            <AccordionItem value={`commercial-price-${blockInstance.id}`} className="border-0">
              <AccordionTrigger className="p-0 hover:no-underline [&>svg]:hidden text-left">
                <div className="w-full text-left">
                  <SectionHeader 
                    title={blockInstance.heading}
                    number={project?.quotationType === "Supply and Fabrication" ? "12" : "01"} 
                    expanded={isBlockExpanded(blockInstance.id)}
                    onToggle={() => toggleBlockExpanded(blockInstance.id)}
                    {...getBlockHeaderProps(blockInstance)}
                  />
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 pt-4">
                <div className="space-y-4">
                  <div className="bg-white rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="text-left p-3 w-16 text-slate-600 font-medium">S.N.</th>
                    <th className="text-left p-3 text-slate-600 font-medium">Description</th>
                    <th className="text-left p-3 w-24 text-slate-600 font-medium">Unit</th>
                    <th className="text-right p-3 w-24 text-slate-600 font-medium">Quantity</th>
                    <th className="text-right p-3 w-24 text-slate-600 font-medium">Rate</th>
                    <th className="text-right p-3 w-32 text-slate-600 font-medium">Amount</th>
                    <th className="text-left p-3 w-32 text-slate-600 font-medium">Remarks</th>
                    <th className="w-12 p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-slate-50">
                      <td className="p-3 text-center text-slate-600">{item.serialNo}</td>
                      <td className="p-3">
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          className="min-h-[60px] text-sm border-0 bg-transparent focus:bg-white"
                          data-testid={`input-item-desc-${index}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.unit}
                          onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                          className="h-8 text-sm border-0 bg-transparent focus:bg-white"
                          data-testid={`input-item-unit-${index}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                          className="h-8 text-sm text-right border-0 bg-transparent focus:bg-white"
                          data-testid={`input-item-qty-${index}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateLineItem(index, 'rate', e.target.value)}
                          className="h-8 min-w-[90px] text-sm text-right border-0 bg-transparent focus:bg-white"
                          data-testid={`input-item-rate-${index}`}
                        />
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="p-3">
                        <Input
                          value={item.remarks}
                          onChange={(e) => updateLineItem(index, 'remarks', e.target.value)}
                          className="h-8 text-sm border-0 bg-transparent focus:bg-white"
                          data-testid={`input-item-remarks-${index}`}
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          disabled={lineItems.length === 1}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={5} className="p-3 text-right">Total:</td>
                    <td className="p-3 text-right">{formatCurrency(calculateTotal())}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
              <div className="p-3 border-t bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200" />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={addLineItem}
                  className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
                  data-testid="button-add-row"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </Button>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>
              </div>
            </div>

            {/* Accordion sections inside Commercial Price */}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          ))}

          {/* Payment Terms Section - All quotation types */}
          {getBlockInstances("paymentTerms").map((blockInstance) => (
            <Accordion
              key={blockInstance.id}
              type="single"
              collapsible
              value={isBlockExpanded(blockInstance.id) ? `payment-terms-${blockInstance.id}` : ""}
              onValueChange={(value) => setBlockExpanded(blockInstance.id, value === `payment-terms-${blockInstance.id}`)}
              style={{ order: getBlockOrder(blockInstance.id) }}
            >
              <AccordionItem value={`payment-terms-${blockInstance.id}`} className="border-0">
                <AccordionTrigger className="p-0 hover:no-underline [&>svg]:hidden text-left">
                  <div className="w-full text-left">
                    <SectionHeader
                      title={blockInstance.heading}
                      number="PT"
                      expanded={isBlockExpanded(blockInstance.id)}
                      onToggle={() => toggleBlockExpanded(blockInstance.id)}
                      {...getBlockHeaderProps(blockInstance)}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 pt-4">
                  <Card className="shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      {normalizePaymentTermSections(contentSections.paymentTermSections, contentSections.paymentTerms).map((section, sectionIndex) => {
                        const isExpanded = expandedPaymentTermSections[section.id] ?? true;
                        return (
                          <div key={section.id} className="rounded-lg border p-4 space-y-3">
                            <div className="group flex items-center gap-2">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() =>
                                  setExpandedPaymentTermSections((prev) => ({
                                    ...prev,
                                    [section.id]: !(prev[section.id] ?? true),
                                  }))
                                }
                                data-testid={`button-toggle-payment-heading-${sectionIndex}`}
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                              </Button>
                              {editingPaymentTermHeading === section.id ? (
                                <>
                                  <Input
                                    value={section.heading}
                                    onChange={(e) => updatePaymentTermSectionHeading(section.id, e.target.value)}
                                    className="h-8 font-semibold flex-1"
                                    placeholder="Heading"
                                    autoFocus
                                    onBlur={() => setEditingPaymentTermHeading(null)}
                                    onKeyDown={(e) => e.key === "Enter" && setEditingPaymentTermHeading(null)}
                                    data-testid={`input-payment-heading-${sectionIndex}`}
                                  />
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => removePaymentTermSection(section.id)}
                                    data-testid={`button-remove-payment-heading-${sectionIndex}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <span
                                    className="cursor-pointer hover:bg-slate-50 flex-1 p-1 rounded font-semibold text-slate-700"
                                    onClick={() => setEditingPaymentTermHeading(section.id)}
                                  >
                                    {section.heading}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={() => setEditingPaymentTermHeading(section.id)}
                                  >
                                    <Edit3 className="h-3 w-3 text-slate-400" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => removePaymentTermSection(section.id)}
                                    data-testid={`button-remove-payment-heading-${sectionIndex}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>

                            {isExpanded && (
                              <>
                                <ul className="space-y-3 text-sm">
                                  {section.terms.map((term, termIndex) => (
                                    <li key={`${section.id}-${termIndex}`} className="flex items-start gap-2 group">
                                      {editingPaymentTermItem?.sectionId === section.id && editingPaymentTermItem?.termIndex === termIndex ? (
                                        <>
                                          <Textarea
                                            value={term}
                                            onChange={(e) => updatePaymentTerm(section.id, termIndex, e.target.value)}
                                            onBlur={() => setEditingPaymentTermItem(null)}
                                            autoFocus
                                            className="flex-1 min-h-[60px]"
                                            data-testid={`input-payment-term-${sectionIndex}-${termIndex}`}
                                          />
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => removePaymentTerm(section.id, termIndex)}
                                            data-testid={`button-remove-payment-term-${sectionIndex}-${termIndex}`}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="w-6 text-slate-400">{termIndex + 1}.</span>
                                          <span
                                            className="cursor-pointer hover:bg-slate-50 flex-1 p-1 rounded text-slate-700"
                                            onClick={() => setEditingPaymentTermItem({ sectionId: section.id, termIndex })}
                                          >
                                            {term}
                                          </span>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                            onClick={() => setEditingPaymentTermItem({ sectionId: section.id, termIndex })}
                                          >
                                            <Edit3 className="h-3 w-3 text-slate-400" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => removePaymentTerm(section.id, termIndex)}
                                            data-testid={`button-remove-payment-term-${sectionIndex}-${termIndex}`}
                                          >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </>
                                      )}
                                    </li>
                                  ))}
                                </ul>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addPaymentTerm(section.id)}
                                  className="text-[#da2032]"
                                  data-testid={`button-add-payment-term-${sectionIndex}`}
                                >
                                  <Plus className="h-4 w-4 mr-1" /> Add Term
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })}

                      <div className="pt-2 border-t space-y-3">
                        <div className="flex items-center gap-3 py-1">
                          <div className="h-px flex-1 bg-slate-200" />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addPaymentTermSection}
                            className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
                            data-testid="button-add-payment-heading-bottom"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add New Heading
                          </Button>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-700">Bank Details:</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={addBankDetail}
                            className="text-[#da2032]"
                            data-testid="button-add-bank-detail"
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add
                          </Button>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 text-slate-600 font-medium w-1/3">Particulars</th>
                              <th className="text-left p-2 text-slate-600 font-medium">Value</th>
                              <th className="text-left p-2 text-slate-600 font-medium w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contentSections.bankDetails.map((detail, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">
                                  {editingBankDetail === index ? (
                                    <Input
                                      value={detail.particular}
                                      onChange={(e) => updateBankDetail(index, 'particular', e.target.value)}
                                      className="text-slate-600"
                                      data-testid={`input-bank-particular-${index}`}
                                    />
                                  ) : (
                                    <span
                                      className="text-slate-600 cursor-pointer hover:text-[#d92134]"
                                      onClick={() => setEditingBankDetail(index)}
                                    >
                                      {detail.particular}:
                                    </span>
                                  )}
                                </td>
                                <td className="p-2">
                                  {editingBankDetail === index ? (
                                    <Input
                                      value={detail.value}
                                      onChange={(e) => updateBankDetail(index, 'value', e.target.value)}
                                      data-testid={`input-bank-value-${index}`}
                                    />
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:text-[#d92134]"
                                      onClick={() => setEditingBankDetail(index)}
                                    >
                                      {detail.value}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2">
                                  <div className="flex gap-1">
                                    {editingBankDetail === index ? (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => setEditingBankDetail(null)}
                                      >
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                    ) : (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => setEditingBankDetail(index)}
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => removeBankDetail(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}

          {/* Commercial Terms & Conditions Section - Only for Supply and Fabrication */}
          {project?.quotationType === "Supply and Fabrication" && getBlockInstances("commercialTerms").map((blockInstance) => (
            <Accordion
              key={blockInstance.id}
              type="single"
              collapsible
              value={isBlockExpanded(blockInstance.id) ? `terms-conditions-${blockInstance.id}` : ""}
              onValueChange={(value) => setBlockExpanded(blockInstance.id, value === `terms-conditions-${blockInstance.id}`)}
              style={{ order: getBlockOrder(blockInstance.id) }}
            >
              <AccordionItem value={`terms-conditions-${blockInstance.id}`} className="border-0">
                <AccordionTrigger className="p-0 hover:no-underline [&>svg]:hidden text-left">
                  <div className="w-full text-left">
                    <SectionHeader 
                      title={blockInstance.heading}
                      number="08" 
                      expanded={isBlockExpanded(blockInstance.id)}
                      onToggle={() => toggleBlockExpanded(blockInstance.id)}
                      {...getBlockHeaderProps(blockInstance)}
                    />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 pt-4">
                  <Card className="shadow-sm">
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b">
                              <th className="text-left p-3 w-16 text-slate-600 font-medium">SI. No.</th>
                              <th className="text-left p-3 w-48 text-slate-600 font-medium">Description</th>
                              <th className="text-left p-3 text-slate-600 font-medium">Conditions</th>
                              <th className="text-left p-3 w-20 text-slate-600 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-700">
                            {contentSections.commercialTerms.map((term, index) => (
                              <tr key={index} className={`border-b ${index % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                                <td className="p-3 align-top">{term.slNo}</td>
                                <td className="p-3 align-top">
                                  {editingCommercialTerm === index ? (
                                    <Input
                                      value={term.description}
                                      onChange={(e) => updateCommercialTerm(index, 'description', e.target.value)}
                                      className="font-medium"
                                      data-testid={`input-term-desc-${index}`}
                                    />
                                  ) : (
                                    <span 
                                      className="font-medium cursor-pointer hover:text-[#d92134]"
                                      onClick={() => setEditingCommercialTerm(index)}
                                    >
                                      {term.description}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 align-top">
                                  {editingCommercialTerm === index ? (
                                    <Textarea
                                      value={term.conditions}
                                      onChange={(e) => updateCommercialTerm(index, 'conditions', e.target.value)}
                                      className="min-h-[80px]"
                                      data-testid={`input-term-cond-${index}`}
                                    />
                                  ) : (
                                    <span 
                                      className="cursor-pointer hover:text-[#d92134]"
                                      onClick={() => setEditingCommercialTerm(index)}
                                    >
                                      {term.conditions}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 align-top">
                                  <div className="flex gap-1">
                                    {editingCommercialTerm === index ? (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8"
                                        onClick={() => setEditingCommercialTerm(null)}
                                      >
                                        <Check className="h-4 w-4 text-green-600" />
                                      </Button>
                                    ) : (
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-8 w-8"
                                        onClick={() => setEditingCommercialTerm(index)}
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8"
                                      onClick={() => removeCommercialTerm(index)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-3 border-t bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="h-px flex-1 bg-slate-200" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addCommercialTerm}
                          className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
                          data-testid="button-add-commercial-term-row"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Row
                        </Button>
                          <div className="h-px flex-1 bg-slate-200" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ))}
          </div>

          {/* Notes Section */}
          <Card className="shadow-sm">
            <div className="px-6 py-4 border-b bg-slate-50">
              <h3 className="font-semibold text-slate-700">Notes</h3>
            </div>
            <CardContent className="p-6 space-y-3">
              <ul className="space-y-2 text-sm">
                {contentSections.notes.map((note, index) => (
                  <li key={index} className="group flex items-start gap-2">
                    {editingNote === index ? (
                      <>
                        <Textarea
                          value={note}
                          onChange={(e) => updateNote(index, e.target.value)}
                          className="flex-1 min-h-[40px]"
                          autoFocus
                          onBlur={() => setEditingNote(null)}
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeNote(index)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="w-6 text-slate-400">{index + 1}.</span>
                        <span 
                          className="cursor-pointer hover:bg-slate-50 flex-1 p-1 rounded"
                          onClick={() => setEditingNote(index)}
                        >
                          {note}
                        </span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => setEditingNote(index)}
                        >
                          <Edit3 className="h-3 w-3 text-slate-400" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeNote(index)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-3 pt-2 border-t">
                <div className="h-px flex-1 bg-slate-200" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addNote}
                  className="rounded-full border-dashed border-[#da2032]/50 text-[#da2032] bg-white hover:bg-red-50 px-4"
                  data-testid="button-add-note"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add New Note
                </Button>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
            </CardContent>
          </Card>

          {/* Closing Section */}
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-4">
              {contentSections.closingParagraphs.map((section) => (
                <div key={section.id} className="group relative text-sm text-slate-700">
                  {editingSection === section.id ? (
                    <div className="flex gap-2">
                      <Textarea
                        value={section.content}
                        onChange={(e) => updateClosingSection(section.id, e.target.value)}
                        className="flex-1 min-h-[80px]"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={() => setEditingSection(null)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <p 
                      className="cursor-pointer hover:bg-slate-50 p-2 rounded border border-transparent hover:border-slate-200"
                      onClick={() => setEditingSection(section.id)}
                    >
                      {section.content}
                      <Edit3 className="inline-block ml-2 h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </p>
                  )}
                </div>
              ))}
              
              <div className="pt-4 border-t space-y-2">
                <div className="group">
                  <Input
                    value={contentSections.closingThanks}
                    onChange={(e) => setContentSections(prev => ({ ...prev, closingThanks: e.target.value }))}
                    className="font-semibold text-slate-700 bg-transparent border-transparent hover:border-slate-200 focus:border-slate-300 w-full"
                    data-testid="input-closing-thanks"
                  />
                </div>
                <div className="group">
                  <Input
                    value={contentSections.closingCompanyName}
                    onChange={(e) => setContentSections(prev => ({ ...prev, closingCompanyName: e.target.value }))}
                    className="font-bold text-[#da2032] bg-transparent border-transparent hover:border-slate-200 focus:border-slate-300 w-full"
                    data-testid="input-closing-company"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* End of Document */}
          <Card className="shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-slate-800">Upload a Drawing</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addDrawingUploadField}
                  data-testid="button-add-drawing-upload-field"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add uploader field
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Upload images or PDF files. These will be appended in exported quotation PDF after End of Documents.
              </p>
              <div className="space-y-3">
                {ensureDrawingUploads(contentSections.uploadDrawings).map((upload, index) => (
                  <div key={upload.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleDrawingUploadChange(upload.id, e)}
                        data-testid={`input-drawing-upload-${index}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeDrawingUploadField(upload.id)}
                        data-testid={`button-remove-drawing-upload-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {upload.fileName ? (
                      <p className="text-xs text-slate-600">Selected: {upload.fileName}</p>
                    ) : (
                      <p className="text-xs text-slate-400">No file selected</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center py-6 text-sm text-slate-500">
            <p>!! End of Documents !!</p>
          </div>
        </div>
      </div>

      <Dialog open={versionsDialogOpen} onOpenChange={setVersionsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Quotation Versions</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {quotationVersions?.map((v) => (
              <div 
                key={v.id}
                className={`p-3 border rounded-lg ${existingQuotation?.id === v.id ? 'border-[#d92134] bg-red-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#d92134]">{v.revision}</span>
                    {existingQuotation?.id === v.id && (
                      <span className="text-xs bg-[#d92134] text-white px-2 py-0.5 rounded">Current</span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-600 mt-1 space-y-0.5">
                  <p><span className="text-slate-500">Enquiry Ref:</span> {v.enquiryNumber || '-'}</p>
                  <p><span className="text-slate-500">Created:</span> {new Date(v.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant={existingQuotation?.id === v.id ? "secondary" : "default"}
                    className={existingQuotation?.id === v.id ? "" : "bg-[#d92134] hover:bg-[#b91c2c]"}
                    onClick={() => {
                      setLocation(`/revira/projects/${projectId}/quotation/${v.id}`);
                      setVersionsDialogOpen(false);
                    }}
                    data-testid={`button-edit-version-${v.id}`}
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    {existingQuotation?.id === v.id ? 'Editing' : 'Edit'}
                  </Button>
                  {quotationVersions && quotationVersions.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete ${v.revision}?`)) {
                          try {
                            await apiRequest("DELETE", `/revira/api/quotations/${v.id}`);
                            queryClient.invalidateQueries({ queryKey: ["/revira/api/projects", projectId, "quotation-versions"] });
                            if (existingQuotation?.id === v.id) {
                              const remaining = quotationVersions.filter(q => q.id !== v.id);
                              if (remaining.length > 0) {
                                setLocation(`/revira/projects/${projectId}/quotation/${remaining[0].id}`);
                              } else {
                                setLocation(`/revira/projects/${projectId}/quotation`);
                              }
                            }
                            toast({ title: "Version deleted", description: `${v.revision} has been deleted.` });
                          } catch (error) {
                            toast({ title: "Error", description: "Failed to delete version.", variant: "destructive" });
                          }
                        }
                      }}
                      data-testid={`button-delete-version-${v.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={newQuotationDialogOpen} onOpenChange={setNewQuotationDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Quotation Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2">
              {QUOTATION_TYPE_OPTIONS.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={newQuotationType === type ? "default" : "outline"}
                  className={`justify-start ${newQuotationType === type ? "bg-[#d92134] hover:bg-[#b51c2c]" : ""}`}
                  onClick={() => setNewQuotationType(type)}
                  data-testid={`button-new-quotation-type-${type.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {type}
                </Button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isCreatingNewQuotation}
                onClick={() => setNewQuotationDialogOpen(false)}
                data-testid="button-new-quotation-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isCreatingNewQuotation}
                onClick={() => { void createNewQuotationFromType(); }}
                data-testid="button-new-quotation-create"
              >
                {isCreatingNewQuotation ? "Creating..." : "Create Quotation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Send Quotation by Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Email id</label>
              <Input
                value={emailForm.to}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, to: e.target.value }))}
                placeholder="recipient@example.com"
                data-testid="input-send-email-to"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Subject for email</label>
              <Input
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
                data-testid="input-send-email-subject"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Body message</label>
              <Textarea
                value={emailForm.message}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                className="min-h-[120px]"
                data-testid="input-send-email-message"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEmailDialogOpen(false)}
                disabled={isSendingEmail}
                data-testid="button-send-email-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitSendEmail}
                disabled={isSendingEmail}
                data-testid="button-send-email-submit"
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
            <DialogTitle>Send Quotation on WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-600">Mobile Number</label>
              <Input
                value={whatsAppForm.mobile}
                onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, mobile: e.target.value }))}
                placeholder="919876543210"
                data-testid="input-send-whatsapp-mobile"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Message body</label>
              <Textarea
                value={whatsAppForm.message}
                onChange={(e) => setWhatsAppForm((prev) => ({ ...prev, message: e.target.value }))}
                className="min-h-[120px]"
                data-testid="input-send-whatsapp-message"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setWhatsappDialogOpen(false)}
                disabled={isSendingWhatsApp}
                data-testid="button-send-whatsapp-cancel"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitSendWhatsApp}
                disabled={isSendingWhatsApp}
                data-testid="button-send-whatsapp-submit"
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


