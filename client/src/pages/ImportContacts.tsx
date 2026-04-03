// ReviewLink — CSV Client Import
// Drag-drop CSV upload → column mapper → preview table → confirm import → saved contacts

import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Download,
  X,
  Users,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
type RawRow = Record<string, string>;
type MappedRow = { name: string; email: string; phone?: string; notes?: string };
type ColumnKey = "name" | "email" | "phone" | "notes" | "skip";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  name: "Full Name",
  email: "Email",
  phone: "Phone (optional)",
  notes: "Notes (optional)",
  skip: "— Skip this column —",
};

// ── CSV parser (no external dep) ──────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: RawRow[] } {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(nonEmpty[0]);
  const rows: RawRow[] = [];
  for (let i = 1; i < nonEmpty.length; i++) {
    const vals = parseRow(nonEmpty[i]);
    const row: RawRow = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}

// ── Auto-detect column mapping ─────────────────────────────────────────────────
function autoDetect(headers: string[]): Record<string, ColumnKey> {
  const mapping: Record<string, ColumnKey> = {};
  const used = new Set<ColumnKey>();

  const matchers: [ColumnKey, RegExp][] = [
    ["name", /^(full.?name|name|customer.?name|client.?name|contact.?name)$/i],
    ["email", /^(email|e.?mail|email.?address)$/i],
    ["phone", /^(phone|mobile|cell|telephone|tel)$/i],
    ["notes", /^(notes|note|comment|comments|description)$/i],
  ];

  for (const h of headers) {
    let matched: ColumnKey = "skip";
    for (const [key, re] of matchers) {
      if (!used.has(key) && re.test(h)) {
        matched = key;
        used.add(key);
        break;
      }
    }
    mapping[h] = matched;
  }
  return mapping;
}

// ── Template CSV ──────────────────────────────────────────────────────────────
function downloadTemplate() {
  const csv = "first_name,last_name,email,phone,notes\nJane,Smith,jane@example.com,555-1234,Regular customer\nJohn,Doe,john@example.com,,";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reviewlink-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Step indicators ───────────────────────────────────────────────────────────
const STEPS = ["Upload", "Map Columns", "Preview", "Done"];

export default function ImportContactsPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, ColumnKey>>({});
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = trpc.contacts.importCSV.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setStep(3);
      utils.contacts.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // ── File handling ────────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a .csv file.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0) {
        toast.error("The CSV has no data.");
        return;
      }
      setHeaders(h);
      setRawRows(r);
      setMapping(autoDetect(h));
      setStep(1);
    };
    reader.readAsText(file);
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Build mapped rows ────────────────────────────────────────────────────────
  const buildMappedRows = (): MappedRow[] => {
    const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
    const emailCol = Object.entries(mapping).find(([, v]) => v === "email")?.[0];
    const phoneCol = Object.entries(mapping).find(([, v]) => v === "phone")?.[0];
    const notesCol = Object.entries(mapping).find(([, v]) => v === "notes")?.[0];

    if (!emailCol) return [];

    return rawRows
      .map((row) => {
        const email = row[emailCol]?.trim() ?? "";
        const name = nameCol ? (row[nameCol]?.trim() ?? "") : email.split("@")[0];
        if (!email || !email.includes("@")) return null;
        return {
          name: name || email.split("@")[0],
          email,
          phone: phoneCol ? row[phoneCol]?.trim() || undefined : undefined,
          notes: notesCol ? row[notesCol]?.trim() || undefined : undefined,
        } as MappedRow;
      })
      .filter(Boolean) as MappedRow[];
  };

  const goToPreview = () => {
    const rows = buildMappedRows();
    if (rows.length === 0) {
      toast.error("Make sure you've mapped the Email column.");
      return;
    }
    setMappedRows(rows);
    setStep(2);
  };

  const confirmImport = () => {
    importMutation.mutate({ rows: mappedRows });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-28" style={{ background: "oklch(0.975 0.003 100)" }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: "oklch(0.22 0.09 260)" }}>
        <button
          onClick={() => navigate("/contacts")}
          className="flex items-center gap-1.5 mb-4 text-xs font-bold"
          style={{ color: "oklch(0.80 0.18 80)" }}
        >
          <ArrowLeft size={14} /> Back to Contacts
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Upload size={16} style={{ color: "oklch(0.80 0.18 80)" }} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "oklch(0.80 0.18 80)", fontFamily: "'Syne', sans-serif" }}>
            Import
          </span>
        </div>
        <h1 className="text-2xl" style={{ color: "white", fontFamily: "'Syne', sans-serif", fontWeight: 900 }}>
          Import Clients
        </h1>

        {/* Step bar */}
        <div className="flex items-center gap-0 mt-5">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                  style={{
                    background: i <= step ? "oklch(0.80 0.18 80)" : "oklch(0.35 0.06 260)",
                    color: i <= step ? "oklch(0.22 0.09 260)" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {i < step ? <CheckCircle2 size={12} /> : i + 1}
                </div>
                <span className="text-xs mt-1" style={{ color: i <= step ? "oklch(0.80 0.18 80)" : "rgba(255,255,255,0.4)" }}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px mb-4 mx-1" style={{ background: i < step ? "oklch(0.80 0.18 80)" : "oklch(0.35 0.06 260)" }} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">

        {/* ── Step 0: Upload ─────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            {/* Template download */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}>
                  Need a template?
                </p>
                <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 260)" }}>
                  Download our pre-formatted CSV
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black"
                style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
              >
                <Download size={12} /> Template
              </button>
            </div>

            {/* Drop zone */}
            <div
              className="bg-white rounded-2xl shadow-sm flex flex-col items-center justify-center gap-4 cursor-pointer transition-all"
              style={{
                minHeight: "220px",
                border: isDragging ? "2px dashed oklch(0.80 0.18 80)" : "2px dashed oklch(0.85 0.02 260)",
                background: isDragging ? "oklch(0.97 0.01 80)" : "white",
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "oklch(0.96 0.02 260)" }}
              >
                <FileText size={28} style={{ color: "oklch(0.22 0.09 260)" }} />
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}>
                  Drop your CSV here
                </p>
                <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.03 260)" }}>
                  or tap to browse files
                </p>
                <p className="text-xs mt-2" style={{ color: "oklch(0.70 0.02 260)" }}>
                  Supports exports from Square, HoneyBook, Jobber,<br />QuickBooks, Acuity, Mindbody, and any spreadsheet
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
          </div>
        )}

        {/* ── Step 1: Column Mapper ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}>
                  Map Your Columns
                </p>
                <span className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                  {rawRows.length} rows in <strong>{fileName}</strong>
                </span>
              </div>
              <p className="text-xs mb-4" style={{ color: "oklch(0.55 0.03 260)" }}>
                Tell us what each column in your file represents. We've auto-detected where we can.
              </p>

              <div className="flex flex-col gap-3">
                {headers.map((h) => (
                  <div key={h} className="flex items-center justify-between gap-3">
                    <div
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-bold truncate"
                      style={{ background: "oklch(0.96 0.01 260)", color: "oklch(0.35 0.05 260)" }}
                    >
                      {h}
                    </div>
                    <ChevronRight size={14} style={{ color: "oklch(0.70 0.02 260)", flexShrink: 0 }} />
                    <select
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-bold border-0 outline-none"
                      style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                      value={mapping[h] ?? "skip"}
                      onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value as ColumnKey }))}
                    >
                      {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((k) => (
                        <option key={k} value={k}>{COLUMN_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!Object.values(mapping).includes("email") && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "oklch(0.97 0.04 27)" }}>
                  <AlertCircle size={14} style={{ color: "oklch(0.55 0.18 27)" }} />
                  <p className="text-xs font-bold" style={{ color: "oklch(0.45 0.14 27)" }}>
                    You must map at least one column to Email
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-3 rounded-xl text-sm font-black"
                style={{ background: "oklch(0.93 0.01 260)", color: "oklch(0.35 0.05 260)" }}
              >
                Back
              </button>
              <button
                onClick={goToPreview}
                disabled={!Object.values(mapping).includes("email")}
                className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40"
                style={{ background: "oklch(0.80 0.18 80)", color: "oklch(0.22 0.09 260)" }}
              >
                Preview →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Preview ────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}>
                  Review Before Import
                </p>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "oklch(0.96 0.04 145)", color: "oklch(0.45 0.12 145)" }}
                >
                  {mappedRows.length} contacts
                </span>
              </div>

              <div className="flex flex-col gap-0 max-h-72 overflow-y-auto">
                {mappedRows.slice(0, 100).map((row, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2.5"
                    style={{ borderBottom: idx < Math.min(mappedRows.length, 100) - 1 ? "1px solid oklch(0.94 0.01 260)" : "none" }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
                      >
                        {row.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: "oklch(0.22 0.09 260)" }}>{row.name}</p>
                        <p className="text-xs" style={{ color: "oklch(0.60 0.03 260)" }}>{row.email}</p>
                      </div>
                    </div>
                    {row.phone && (
                      <span className="text-xs" style={{ color: "oklch(0.65 0.03 260)" }}>{row.phone}</span>
                    )}
                  </div>
                ))}
                {mappedRows.length > 100 && (
                  <p className="text-xs text-center py-3" style={{ color: "oklch(0.60 0.03 260)" }}>
                    …and {mappedRows.length - 100} more
                  </p>
                )}
              </div>
            </div>

            <div
              className="bg-white rounded-2xl p-3 flex items-center gap-2 shadow-sm"
              style={{ border: "1px solid oklch(0.92 0.02 260)" }}
            >
              <AlertCircle size={14} style={{ color: "oklch(0.55 0.03 260)" }} />
              <p className="text-xs" style={{ color: "oklch(0.55 0.03 260)" }}>
                Duplicate emails already in your contacts will be skipped automatically.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl text-sm font-black"
                style={{ background: "oklch(0.93 0.01 260)", color: "oklch(0.35 0.05 260)" }}
              >
                Back
              </button>
              <button
                onClick={confirmImport}
                disabled={importMutation.isPending}
                className="flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
              >
                {importMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Importing…</>
                ) : (
                  <>Import {mappedRows.length} Contacts</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ──────────────────────────────────────────────────── */}
        {step === 3 && importResult && (
          <div className="flex flex-col items-center gap-4 pt-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.96 0.04 145)" }}
            >
              <CheckCircle2 size={40} style={{ color: "oklch(0.45 0.12 145)" }} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-black" style={{ color: "oklch(0.22 0.09 260)", fontFamily: "'Syne', sans-serif" }}>
                Import Complete!
              </h2>
              <p className="text-sm mt-2" style={{ color: "oklch(0.55 0.03 260)" }}>
                {importResult.imported} contact{importResult.imported !== 1 ? "s" : ""} added
                {importResult.skipped > 0 && `, ${importResult.skipped} duplicate${importResult.skipped !== 1 ? "s" : ""} skipped`}.
              </p>
            </div>

            <div className="w-full flex flex-col gap-3 mt-4">
              <button
                onClick={() => navigate("/contacts")}
                className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2"
                style={{ background: "oklch(0.22 0.09 260)", color: "oklch(0.80 0.18 80)" }}
              >
                <Users size={16} /> View Contacts & Send Requests
              </button>
              <button
                onClick={() => { setStep(0); setFileName(""); setHeaders([]); setRawRows([]); setMappedRows([]); setImportResult(null); }}
                className="w-full py-3 rounded-2xl text-sm font-black"
                style={{ background: "oklch(0.93 0.01 260)", color: "oklch(0.35 0.05 260)" }}
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
