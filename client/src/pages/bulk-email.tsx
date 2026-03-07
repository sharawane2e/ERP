import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Mail, Send, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { LayoutShell } from "@/components/layout-shell";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const MAX_RECIPIENTS = 100;
const CKEDITOR_SCRIPT_ID = "ckeditor5-classic-script";
const CKEDITOR_SCRIPT_SRC = "https://cdn.ckeditor.com/ckeditor5/41.4.2/classic/ckeditor.js";

declare global {
  interface Window {
    ClassicEditor?: {
      create: (sourceElement: HTMLElement, config?: Record<string, unknown>) => Promise<any>;
    };
  }
}

let ckeditorScriptPromise: Promise<void> | null = null;

const parseEmailList = (raw: string) => {
  const values = raw
    .split(/[,\s;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(values));
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const htmlToPlainText = (html: string) => {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return (temp.textContent || temp.innerText || "").trim();
};

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const parts = result.split(",");
      resolve(parts.length > 1 ? parts[1] : result);
    };
    reader.onerror = () => reject(new Error("Unable to read PDF file."));
    reader.readAsDataURL(file);
  });

const loadCkEditorScript = () => {
  if (window.ClassicEditor) {
    return Promise.resolve();
  }
  if (ckeditorScriptPromise) {
    return ckeditorScriptPromise;
  }

  ckeditorScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(CKEDITOR_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load CKEditor script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = CKEDITOR_SCRIPT_ID;
    script.src = CKEDITOR_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load CKEditor script."));
    document.body.appendChild(script);
  });

  return ckeditorScriptPromise;
};

function CkEditorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const latestOnChangeRef = useRef(onChange);

  useEffect(() => {
    latestOnChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      await loadCkEditorScript();
      if (!active || !containerRef.current || !window.ClassicEditor) {
        return;
      }

      const editor = await window.ClassicEditor.create(containerRef.current, {
        placeholder: "Compose email body with formatting...",
      });
      editorRef.current = editor;
      editor.setData(value || "");
      editor.model.document.on("change:data", () => {
        latestOnChangeRef.current(editor.getData());
      });
    };

    init().catch(() => {
      // handled by outer page as validation on submit
    });

    return () => {
      active = false;
      const editor = editorRef.current;
      editorRef.current = null;
      if (editor) {
        editor.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getData() !== value) {
      editor.setData(value);
    }
  }, [value]);

  return <div ref={containerRef} className="min-h-[220px]" data-testid="ckeditor-bulk-email-message" />;
}

export default function BulkEmailPage() {
  const { data: user } = useUser();
  const { toast } = useToast();

  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("Revira NexGen Brochure");
  const [messageFormat, setMessageFormat] = useState<"text" | "html">("html");
  const [htmlMessage, setHtmlMessage] = useState("");
  const [textMessage, setTextMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);

  const recipients = useMemo(() => parseEmailList(to), [to]);

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!attachment) {
        throw new Error("Please attach brochure PDF before sending.");
      }
      if (attachment.type !== "application/pdf" && !attachment.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Only PDF files are allowed.");
      }

      const validRecipients = parseEmailList(to);
      if (validRecipients.length === 0) {
        throw new Error("Please enter at least one recipient email.");
      }
      if (validRecipients.length > MAX_RECIPIENTS) {
        throw new Error(`Maximum ${MAX_RECIPIENTS} recipient emails are allowed.`);
      }

      const invalid = validRecipients.filter((email) => !isValidEmail(email));
      if (invalid.length > 0) {
        throw new Error(`Invalid email address(es): ${invalid.join(", ")}`);
      }

      if (!subject.trim()) {
        throw new Error("Email subject is required.");
      }
      const outgoingMessage = messageFormat === "html" ? htmlMessage.trim() : textMessage.trim();
      if (!outgoingMessage) {
        throw new Error("Email message body is required.");
      }
      if (messageFormat === "html" && !htmlToPlainText(outgoingMessage)) {
        throw new Error("Please add readable content in HTML message body.");
      }

      const pdfBase64 = await toBase64(attachment);
      const res = await apiRequest("POST", "/api/email/bulk", {
        to: validRecipients,
        subject: subject.trim(),
        message: outgoingMessage,
        messageFormat,
        fileName: attachment.name,
        pdfBase64,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const acceptedList = Array.isArray(data?.accepted) ? data.accepted : [];
      toast({
        title: "Bulk email sent",
        description:
          acceptedList.length > 0
            ? `Accepted recipients: ${acceptedList.join(", ")}`
            : "Email queued successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Send failed",
        description: error.message || "Unable to send bulk email.",
        variant: "destructive",
      });
    },
  });

  return (
    <LayoutShell user={user}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#da2032] text-white shadow-lg">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bulk Email</h1>
            <p className="text-sm text-slate-500">Send brochure PDF to multiple recipients (max 100).</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Email Campaign</CardTitle>
            <CardDescription>
              Enter recipient emails separated by comma, semicolon, space, or new line.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Recipients</label>
              <Textarea
                value={to}
                onChange={(event) => setTo(event.target.value)}
                placeholder="abc@example.com, xyz@example.com"
                rows={5}
                data-testid="textarea-bulk-email-recipients"
              />
              <p className={`text-xs ${recipients.length > MAX_RECIPIENTS ? "text-red-600" : "text-slate-500"}`}>
                {recipients.length}/{MAX_RECIPIENTS} recipients
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Subject</label>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Email subject"
                data-testid="input-bulk-email-subject"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Message Body</label>
              <div className="flex gap-4 pb-1">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="bulk-email-message-format"
                    checked={messageFormat === "html"}
                    onChange={() => setMessageFormat("html")}
                    data-testid="radio-bulk-email-format-html"
                  />
                  HTML (CKEditor)
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="bulk-email-message-format"
                    checked={messageFormat === "text"}
                    onChange={() => setMessageFormat("text")}
                    data-testid="radio-bulk-email-format-text"
                  />
                  Plain Text
                </label>
              </div>

              {messageFormat === "html" ? (
                <CkEditorField value={htmlMessage} onChange={setHtmlMessage} />
              ) : (
                <Textarea
                  value={textMessage}
                  onChange={(event) => setTextMessage(event.target.value)}
                  placeholder="Write plain text message"
                  rows={8}
                  data-testid="textarea-bulk-email-message-text"
                />
              )}
              <p className="text-xs text-slate-500">
                Use CKEditor for formatted HTML content, or switch to plain text mode.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">Attach Brochure (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                data-testid="input-bulk-email-attachment"
              />
              {attachment ? (
                <p className="text-xs text-slate-600 flex items-center gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  {attachment.name}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={() => sendEmailMutation.mutate()}
              disabled={sendEmailMutation.isPending}
              className="bg-[#da2032] hover:bg-[#c41b2b]"
              data-testid="button-send-bulk-email"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendEmailMutation.isPending ? "Sending..." : "Send Bulk Email"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
