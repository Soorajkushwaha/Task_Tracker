import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { useWorkTrack } from '../context/WorkTrackContext';
import {
  DesiDiyaRecord,
  DESIDIYA_DELIVERY_STATUSES,
  DESIDIYA_DN_RESOLUTIONS,
  DESIDIYA_DN_STATUSES,
  DESIDIYA_INVOICE_STATUSES,
  DocumentCategory,
  DOCUMENT_CATEGORIES,
  TrackingDocumentRecord,
} from '../types/worktrack';
import {
  calculateDesiDiyaDashboardMetrics,
  DESIDIYA_COLUMN_DISPLAY_NAMES,
  DESIDIYA_COLUMN_ORDER,
  isGrnComplete,
} from '../utils/desidiyaLogic';
import {
  DocumentPreviewModal,
  EMPTY_DESIDIYA_FORM,
  formatInr,
} from './DesiDiyaDashboardAndMaster';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ============================================================================
// MODULE 11: POD DOCUMENTS
// ============================================================================
export const DesiDiyaPodDocuments: React.FC = () => {
  const { desidiyaRecords, trackingDocuments, uploadTrackingDocument, todayStr } = useWorkTrack();
  const [filterMode, setFilterMode] = useState<'ALL' | 'MISSING_POD' | 'HAS_POD'>('ALL');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [uploadingForRec, setUploadingForRec] = useState<DesiDiyaRecord | null>(null);

  const metrics = useMemo(
    () => calculateDesiDiyaDashboardMetrics(desidiyaRecords, todayStr),
    [desidiyaRecords, todayStr]
  );

  const filtered = useMemo(() => {
    if (filterMode === 'MISSING_POD') return metrics.deliveredWithoutPod;
    if (filterMode === 'HAS_POD') return desidiyaRecords.filter((r) => Boolean(r.pod_file_path));
    return desidiyaRecords;
  }, [desidiyaRecords, filterMode, metrics]);

  const handleQuickPodUpload = async (rec: DesiDiyaRecord, file: File) => {
    setUploadingForRec(rec);
    try {
      const b64 = await fileToBase64(file);
      await uploadTrackingDocument({
        category: 'POD',
        filename: file.name,
        base64Data: b64,
        mimeType: file.type || 'application/octet-stream',
        invoiceNo: rec.invoice_no,
        poNumber: rec.po_number,
        trackingId: rec.tracking_id,
      });
    } finally {
      setUploadingForRec(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Proof of Delivery (POD) Document Vault
          </h1>
          <p className="text-xs text-slate-500">
            Verify stamped POD acknowledgements for delivered shipments and flag delivered consignments missing POD scans.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'ALL', label: `All Records (${desidiyaRecords.length})` },
            {
              id: 'MISSING_POD',
              label: `Delivered Missing POD (${metrics.deliveredWithoutPod.length})`,
            },
            {
              id: 'HAS_POD',
              label: `POD Attached (${desidiyaRecords.filter((r) => r.pod_file_path).length})`,
            },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterMode(btn.id as any)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                filterMode === btn.id
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Carrier / LR</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Delivery Status</th>
              <th className="px-3 py-2.5">POD Status</th>
              <th className="px-3 py-2.5">Quick Upload / Replace POD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((rec) => {
              const podDoc = trackingDocuments.find(
                (d) => d.category === 'POD' && d.invoiceNo === rec.invoice_no
              );
              return (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">
                    {rec.invoice_no}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{rec.po_number}</td>
                  <td className="px-3 py-2.5">
                    {rec.transport_mode} ({rec.tracking_id || 'No LR'})
                  </td>
                  <td className="px-3 py-2.5">{rec.location}</td>
                  <td className="px-3 py-2.5 font-medium">{rec.delivery_status || 'Missing'}</td>
                  <td className="px-3 py-2.5">
                    {rec.pod_file_path ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setPreviewDoc({
                              url: rec.pod_file_path,
                              title: `POD — ${rec.invoice_no}`,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-xs border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                        >
                          <Eye className="h-3 w-3" />
                          Preview POD
                        </button>
                        <a
                          href={`${rec.pod_file_path}?download=1`}
                          download
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                        {podDoc && (
                          <span className="text-[10px] text-slate-400">
                            ({formatBytes(podDoc.sizeBytes)})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-semibold text-red-600">POD Missing</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xs border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Upload className="h-3 w-3 text-blue-600" />
                      {uploadingForRec?.id === rec.id
                        ? 'Uploading...'
                        : rec.pod_file_path
                        ? 'Replace POD'
                        : 'Upload POD'}
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.xlsx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleQuickPodUpload(rec, f);
                        }}
                      />
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {previewDoc && (
        <DocumentPreviewModal
          url={previewDoc.url}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODULE 12: FILE UPLOAD CENTER (All 6 Categories + Auto-Match + Replace Check)
// ============================================================================
export const DesiDiyaFileUploadCenter: React.FC = () => {
  const {
    desidiyaRecords,
    trackingDocuments,
    uploadTrackingDocument,
    notify,
    setActiveNav,
  } = useWorkTrack();

  const [category, setCategory] = useState<DocumentCategory>('Invoice');
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string>(
    desidiyaRecords[0]?.invoice_no || ''
  );
  const [poNumber, setPoNumber] = useState<string>(desidiyaRecords[0]?.po_number || '');
  const [trackingId, setTrackingId] = useState<string>(desidiyaRecords[0]?.tracking_id || '');
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState<boolean>(false);

  const handleInvoiceSelect = (invNo: string) => {
    setSelectedInvoiceNo(invNo);
    const match = desidiyaRecords.find((r) => r.invoice_no === invNo);
    if (match) {
      setPoNumber(match.po_number);
      setTrackingId(match.tracking_id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setQueuedFiles(files);
    // Try auto-matching Invoice Number from filename if user hasn't picked one
    if (files.length === 1) {
      const base = files[0].name.replace(/\.[^.]+$/, '');
      const normalized = base.replace(/-/g, '/');
      const matched = desidiyaRecords.find(
        (r) =>
          r.invoice_no.toLowerCase() === base.toLowerCase() ||
          r.invoice_no.toLowerCase() === normalized.toLowerCase() ||
          (r.po_number && base.includes(r.po_number))
      );
      if (matched) {
        setSelectedInvoiceNo(matched.invoice_no);
        setPoNumber(matched.po_number);
        setTrackingId(matched.tracking_id);
      }
    }
  };

  const existingDuplicate = useMemo(() => {
    if (queuedFiles.length === 0) return undefined;
    return trackingDocuments.find(
      (d) =>
        d.category === category &&
        (d.invoiceNo === selectedInvoiceNo ||
          queuedFiles.some(
            (f) => f.name.toLowerCase() === d.originalFilename.toLowerCase()
          ))
    );
  }, [queuedFiles, trackingDocuments, category, selectedInvoiceNo]);

  const executeUpload = async () => {
    if (queuedFiles.length === 0) {
      notify('Please select at least one file to upload.', 'error');
      return;
    }
    setIsUploading(true);
    try {
      for (const file of queuedFiles) {
        if (file.size > 10 * 1024 * 1024) {
          notify(`File "${file.name}" exceeds 10 MB limit.`, 'error');
          continue;
        }
        const b64 = await fileToBase64(file);
        await uploadTrackingDocument({
          category,
          filename: file.name,
          base64Data: b64,
          mimeType: file.type || 'application/octet-stream',
          invoiceNo: selectedInvoiceNo,
          poNumber,
          trackingId,
          replaceExistingId: existingDuplicate?.id,
        });
      }
      setQueuedFiles([]);
      setConfirmOverwrite(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            File Upload Center (Persistent Data Lake Storage)
          </h1>
          <p className="text-xs text-slate-500">
            Upload Invoice, PO, POD, GRN, DN, and CN documents to <code className="font-mono">data_lake/&lt;category&gt;</code> and automatically link them to Master Tracking records.
          </p>
        </div>
        <button
          onClick={() => setActiveNav('file-download-center')}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          Open File Download Center ({trackingDocuments.length})
        </button>
      </div>

      {/* Category Selector Tabs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6">
        {DOCUMENT_CATEGORIES.map((cat) => {
          const count = trackingDocuments.filter((d) => d.category === cat).length;
          const active = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-lg border p-3 text-left transition ${
                active
                  ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600 dark:bg-blue-950/40'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                  {cat}
                </span>
                <FileText className={`h-4 w-4 ${active ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{count} stored file(s)</p>
            </button>
          );
        })}
      </div>

      {/* Upload Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Upload &amp; Link {category} Document(s)
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Supported formats: PDF, PNG, JPG, JPEG, TXT, CSV, XLSX, XLS (Max 10 MB per file).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium">
              Link to Invoice Number (Auto-updates Master Record)
            </label>
            <select
              value={selectedInvoiceNo}
              onChange={(e) => handleInvoiceSelect(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">-- Unlinked / Match by PO --</option>
              {desidiyaRecords.map((r) => (
                <option key={r.id} value={r.invoice_no}>
                  {r.invoice_no} (PO: {r.po_number} | {r.location})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Related PO Number</label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. 8149203812"
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">Tracking / LR ID</label>
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="e.g. DLV994821004"
              className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 p-6 text-center hover:border-blue-500 dark:border-slate-700 dark:bg-slate-800/30">
            <Upload className="h-7 w-7 text-blue-600" />
            <span className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              Click to select {category} file(s) from your computer
            </span>
            <span className="mt-0.5 text-[11px] text-slate-500">
              Single or multi-file upload supported. Filenames are sanitized automatically.
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {queuedFiles.length > 0 && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Selected Files ({queuedFiles.length}):
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {queuedFiles.map((f, i) => (
                <li key={i} className="flex items-center justify-between font-mono">
                  <span>{f.name}</span>
                  <span>{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>

            {existingDuplicate && !confirmOverwrite ? (
              <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                <p className="font-semibold">
                  Existing {category} document found for {selectedInvoiceNo || existingDuplicate.originalFilename}
                </p>
                <p className="mt-0.5 text-[11px]">
                  Replacing will overwrite the file on disk and append a revision entry to the document history.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmOverwrite(true)}
                    className="rounded-xs bg-amber-600 px-3 py-1 font-semibold text-white hover:bg-amber-700"
                  >
                    Confirm Replace Existing File
                  </button>
                  <button
                    type="button"
                    onClick={() => setQueuedFiles([])}
                    className="rounded-xs border border-slate-300 bg-white px-3 py-1 text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={executeUpload}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isUploading
                    ? 'Uploading to Data Lake...'
                    : `Upload & Link ${queuedFiles.length} ${category} File(s)`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 13: FILE DOWNLOAD CENTER
// ============================================================================
export const DesiDiyaFileDownloadCenter: React.FC = () => {
  const { trackingDocuments, deleteTrackingDocument, setActiveNav } = useWorkTrack();
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredDocs = useMemo(() => {
    return trackingDocuments.filter((d) => {
      if (catFilter !== 'ALL' && d.category !== catFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          d.originalFilename.toLowerCase().includes(q) ||
          d.invoiceNo.toLowerCase().includes(q) ||
          d.poNumber.toLowerCase().includes(q) ||
          d.trackingId.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [trackingDocuments, catFilter, search]);

  const handleBatchDownload = () => {
    const targets = filteredDocs.filter((d) => selectedIds.includes(d.id));
    targets.forEach((docRec, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = `${docRec.storagePath}${docRec.storagePath.includes('?') ? '&' : '?'}download=1`;
        a.download = docRec.originalFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, idx * 250);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            File Download Center ({filteredDocs.length} Documents)
          </h1>
          <p className="text-xs text-slate-500">
            Search, preview, batch-download, or manage persistent Invoice, PO, POD, GRN, DN, and CN files.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDownload}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => setActiveNav('file-upload-center')}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload New Files
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Filename, Invoice No, PO Number, or Tracking ID..."
            className="w-full rounded-md border border-slate-300 py-1.5 pr-3 pl-8 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['ALL', ...DOCUMENT_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                catFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={
                    filteredDocs.length > 0 && selectedIds.length === filteredDocs.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredDocs.map((d) => d.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <th className="px-3 py-2.5">Category</th>
              <th className="px-3 py-2.5">Filename</th>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Tracking ID</th>
              <th className="px-3 py-2.5">Size</th>
              <th className="px-3 py-2.5">Uploaded At</th>
              <th className="px-3 py-2.5">Uploaded By</th>
              <th className="px-3 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredDocs.map((docRec) => (
              <tr key={docRec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(docRec.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, docRec.id]);
                      } else {
                        setSelectedIds(selectedIds.filter((id) => id !== docRec.id));
                      }
                    }}
                  />
                </td>
                <td className="px-3 py-2.5 font-mono font-bold text-blue-600">
                  {docRec.category}
                </td>
                <td className="px-3 py-2.5 font-mono font-medium">{docRec.originalFilename}</td>
                <td className="px-3 py-2.5 font-mono">{docRec.invoiceNo || '—'}</td>
                <td className="px-3 py-2.5 font-mono">{docRec.poNumber || '—'}</td>
                <td className="px-3 py-2.5 font-mono">{docRec.trackingId || '—'}</td>
                <td className="px-3 py-2.5 font-mono">{formatBytes(docRec.sizeBytes)}</td>
                <td className="px-3 py-2.5 font-mono text-[11px]">
                  {docRec.uploadTimestamp.slice(0, 16).replace('T', ' ')}
                </td>
                <td className="px-3 py-2.5">{docRec.uploadedByEmail}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPreviewDoc({
                          url: docRec.storagePath,
                          title: `${docRec.category} — ${docRec.originalFilename}`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xs border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <Eye className="h-3 w-3 text-blue-600" />
                      Preview
                    </button>
                    <a
                      href={`${docRec.storagePath}${
                        docRec.storagePath.includes('?') ? '&' : '?'
                      }download=1`}
                      download={docRec.originalFilename}
                      className="inline-flex items-center gap-1 rounded-xs bg-blue-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </a>
                    <button
                      onClick={() => setConfirmDeleteId(docRec.id)}
                      className="rounded-xs p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Delete Document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Confirm Document Deletion
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              This will remove the file from persistent disk storage and unlink it from any associated Master Tracking record.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteTrackingDocument(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <DocumentPreviewModal
          url={previewDoc.url}
          title={previewDoc.title}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// MODULE 14: RECORD OPERATIONS (Working2.py 5-Tab Record Operations Center)
// ============================================================================
export const DesiDiyaRecordOperations: React.FC = () => {
  const {
    desidiyaRecords,
    saveDesiDiyaRecord,
    deleteDesiDiyaRecord,
    bulkUpdateDesiDiyaAppointments,
    todayStr,
  } = useWorkTrack();

  const [subTab, setSubTab] = useState<'UPDATE' | 'ADD' | 'ADD_PO' | 'BULK_APPT' | 'DELETE'>(
    'UPDATE'
  );
  const [selectedId, setSelectedId] = useState<string>(desidiyaRecords[0]?.id || '');
  const selectedRec = useMemo(
    () => desidiyaRecords.find((r) => r.id === selectedId) || desidiyaRecords[0],
    [desidiyaRecords, selectedId]
  );

  const [editDraft, setEditDraft] = useState<Omit<DesiDiyaRecord, 'id' | 'ownerId'>>(() => {
    if (desidiyaRecords[0]) {
      const { id: _id, ownerId: _ow, ...rest } = desidiyaRecords[0];
      return rest;
    }
    return EMPTY_DESIDIYA_FORM;
  });

  const [newForm, setNewForm] = useState<Omit<DesiDiyaRecord, 'id' | 'ownerId'>>({
    ...EMPTY_DESIDIYA_FORM,
    dispatched_date: todayStr,
  });

  const [poOnlyNumber, setPoOnlyNumber] = useState('');
  const [poOnlyLoc, setPoOnlyLoc] = useState('BLR7 - Bengaluru FC');
  const [poOnlyExp, setPoOnlyExp] = useState('');
  const [poOnlyQty, setPoOnlyQty] = useState(0);

  const [bulkPo, setBulkPo] = useState('');
  const [bulkDate, setBulkDate] = useState('');
  const [bulkReason, setBulkReason] = useState('');

  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  const handleSelectRecordForUpdate = (id: string) => {
    setSelectedId(id);
    const found = desidiyaRecords.find((r) => r.id === id);
    if (found) {
      const { id: _id, ownerId: _ow, ...rest } = found;
      setEditDraft(rest);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Record Operations Center
        </h1>
        <p className="text-xs text-slate-500">
          Dedicated operational forms from <code className="font-mono">Working2.py</code>: Update Record, Add New Record, Add Pre-Invoice PO, Bulk PO Appointment Update, and Safe Delete.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'UPDATE', label: '1. Update Existing Record' },
          { id: 'ADD', label: '2. Add New Invoice Record' },
          { id: 'ADD_PO', label: '3. Add PO (Pre-Invoice)' },
          { id: 'BULK_APPT', label: '4. Bulk PO Appointment Update' },
          { id: 'DELETE', label: '5. Delete Record' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as any)}
            className={`rounded-md px-3.5 py-2 text-xs font-semibold ${
              subTab === t.id
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'UPDATE' && selectedRec && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await saveDesiDiyaRecord(editDraft, selectedRec.id, 'Record Operations Update');
          }}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <label className="mb-1 block text-xs font-bold">Select Record to Update</label>
            <select
              value={selectedRec.id}
              onChange={(e) => handleSelectRecordForUpdate(e.target.value)}
              className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-mono dark:border-slate-700 dark:bg-slate-800"
            >
              {desidiyaRecords.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.invoice_no} — PO: {r.po_number} ({r.location})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-4">
            <div>
              <label className="mb-1 block font-medium">Invoice No</label>
              <input
                type="text"
                value={editDraft.invoice_no}
                onChange={(e) => setEditDraft({ ...editDraft, invoice_no: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">PO Number</label>
              <input
                type="text"
                value={editDraft.po_number}
                onChange={(e) => setEditDraft({ ...editDraft, po_number: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Appointment Date (Auto-Tracks History)</label>
              <input
                type="date"
                value={editDraft.appointment_date}
                onChange={(e) => setEditDraft({ ...editDraft, appointment_date: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">PO Expiry Date</label>
              <input
                type="date"
                value={editDraft.po_expiry_date}
                onChange={(e) => setEditDraft({ ...editDraft, po_expiry_date: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Delivery Status</label>
              <select
                value={editDraft.delivery_status}
                onChange={(e) => setEditDraft({ ...editDraft, delivery_status: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">Missing</option>
                {DESIDIYA_DELIVERY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-medium">GRN Number</label>
              <input
                type="text"
                value={editDraft.grn_no}
                onChange={(e) => setEditDraft({ ...editDraft, grn_no: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">GRN Quantity</label>
              <input
                type="number"
                value={editDraft.grn_quantity}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, grn_quantity: Number(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">DN Quantity</label>
              <input
                type="number"
                value={editDraft.dn_quantity}
                onChange={(e) =>
                  setEditDraft({ ...editDraft, dn_quantity: Number(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Save Record Changes
          </button>
        </form>
      )}

      {subTab === 'ADD' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await saveDesiDiyaRecord(newForm);
            setNewForm({ ...EMPTY_DESIDIYA_FORM, dispatched_date: todayStr });
          }}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="text-sm font-bold">Create New Invoice Tracking Record</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block font-medium">Invoice No *</label>
              <input
                required
                type="text"
                value={newForm.invoice_no}
                onChange={(e) => setNewForm({ ...newForm, invoice_no: e.target.value })}
                placeholder="DD/25-26/4415"
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">PO Number</label>
              <input
                type="text"
                value={newForm.po_number}
                onChange={(e) => setNewForm({ ...newForm, po_number: e.target.value })}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Location / FC</label>
              <input
                type="text"
                value={newForm.location}
                onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
                placeholder="BLR7 - Bengaluru FC"
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Invoice Amount (INR)</label>
              <input
                type="number"
                value={newForm.invoice_amount}
                onChange={(e) =>
                  setNewForm({ ...newForm, invoice_amount: Number(e.target.value) || 0 })
                }
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Create Record
          </button>
        </form>
      )}

      {subTab === 'ADD_PO' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!poOnlyNumber.trim()) return;
            await saveDesiDiyaRecord({
              ...EMPTY_DESIDIYA_FORM,
              invoice_no: `PO-PENDING-${poOnlyNumber.trim()}`,
              po_number: poOnlyNumber.trim(),
              location: poOnlyLoc,
              po_expiry_date: poOnlyExp,
              invoice_quantity: poOnlyQty,
              delivery_status: 'Planned',
            });
            setPoOnlyNumber('');
          }}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="text-sm font-bold">Add Pre-Invoice PO (`PO-PENDING-`)</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block font-medium">PO Number *</label>
              <input
                required
                type="text"
                value={poOnlyNumber}
                onChange={(e) => setPoOnlyNumber(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Location / FC</label>
              <input
                type="text"
                value={poOnlyLoc}
                onChange={(e) => setPoOnlyLoc(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">PO Expiry Date</label>
              <input
                type="date"
                value={poOnlyExp}
                onChange={(e) => setPoOnlyExp(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">PO Quantity</label>
              <input
                type="number"
                value={poOnlyQty}
                onChange={(e) => setPoOnlyQty(Number(e.target.value) || 0)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Create Pre-Invoice PO Entry
          </button>
        </form>
      )}

      {subTab === 'BULK_APPT' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await bulkUpdateDesiDiyaAppointments(bulkPo, bulkDate, bulkReason);
            setBulkPo('');
            setBulkDate('');
            setBulkReason('');
          }}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="text-sm font-bold">Bulk PO Appointment Update</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-medium">PO Number *</label>
              <input
                required
                type="text"
                value={bulkPo}
                onChange={(e) => setBulkPo(e.target.value)}
                placeholder="e.g. 6610293844"
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">New Appointment Date *</label>
              <input
                required
                type="date"
                value={bulkDate}
                onChange={(e) => setBulkDate(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Reason</label>
              <input
                type="text"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
          >
            Update All Matching PO Records
          </button>
        </form>
      )}

      {subTab === 'DELETE' && selectedRec && (
        <div className="space-y-4 rounded-lg border border-red-200 bg-white p-5 text-xs shadow-xs dark:border-red-900/50 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-red-600">Delete Record with Confirmation</h3>
          <select
            value={selectedRec.id}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setDeleteConfirmChecked(false);
            }}
            className="w-full max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 font-mono dark:border-slate-700 dark:bg-slate-800"
          >
            {desidiyaRecords.map((r) => (
              <option key={r.id} value={r.id}>
                {r.invoice_no} — PO: {r.po_number} ({r.location})
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={deleteConfirmChecked}
              onChange={(e) => setDeleteConfirmChecked(e.target.checked)}
            />
            I confirm permanent deletion of {selectedRec.invoice_no}
          </label>

          <button
            disabled={!deleteConfirmChecked}
            onClick={async () => {
              await deleteDesiDiyaRecord(selectedRec.id);
              setDeleteConfirmChecked(false);
            }}
            className="rounded-md bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            Delete Record Permanently
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 15: EXCEPTION QUEUE (Quantity Discrepancy & DN Reconciliation)
// ============================================================================
export const DesiDiyaExceptionQueue: React.FC = () => {
  const { desidiyaRecords, todayStr, resolveDesiDiyaException } = useWorkTrack();
  const [selectedRec, setSelectedRec] = useState<DesiDiyaRecord | null>(null);
  const [grnQty, setGrnQty] = useState(0);
  const [dnQty, setDnQty] = useState(0);
  const [grnNo, setGrnNo] = useState('');
  const [dnStatus, setDnStatus] = useState('Under Review');
  const [dnRes, setDnRes] = useState('Dispute Raised with FC');
  const [dnClosure, setDnClosure] = useState('');
  const [remark, setRemark] = useState('');

  const metrics = useMemo(
    () => calculateDesiDiyaDashboardMetrics(desidiyaRecords, todayStr),
    [desidiyaRecords, todayStr]
  );

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRec) return;
    await resolveDesiDiyaException(selectedRec.id, {
      grn_quantity: grnQty,
      dn_quantity: dnQty,
      grn_no: grnNo,
      dn_status: dnStatus,
      dn_resolution: dnRes,
      dn_closure_date: dnClosure,
      invoice_remark: remark,
    });
    setSelectedRec(null);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Exception Queue &amp; Quantity Discrepancy Reconciliation ({metrics.exceptionQueue.length})
        </h1>
        <p className="text-xs text-slate-500">
          Flags records where <code className="font-mono">invoice_quantity ≠ grn_quantity + dn_quantity</code>, <code className="font-mono">grn_quantity &gt; invoice_quantity</code>, or <code className="font-mono">dn_quantity &gt; 0</code> with open/missing DN resolution.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Invoice Qty</th>
              <th className="px-3 py-2.5">GRN Qty</th>
              <th className="px-3 py-2.5">DN Qty</th>
              <th className="px-3 py-2.5">Unaccounted Variance</th>
              <th className="px-3 py-2.5">DN Status</th>
              <th className="px-3 py-2.5">DN Resolution</th>
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {metrics.exceptionQueue.map((rec) => {
              const variance =
                (Number(rec.invoice_quantity) || 0) -
                ((Number(rec.grn_quantity) || 0) + (Number(rec.dn_quantity) || 0));
              return (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">
                    {rec.invoice_no}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{rec.po_number}</td>
                  <td className="px-3 py-2.5">{rec.location}</td>
                  <td className="px-3 py-2.5 font-mono">{rec.invoice_quantity}</td>
                  <td className="px-3 py-2.5 font-mono">{rec.grn_quantity}</td>
                  <td className="px-3 py-2.5 font-mono text-red-600">{rec.dn_quantity}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-amber-700">
                    {variance === 0 ? '0 (DN Open)' : `${variance > 0 ? '+' : ''}${variance} units`}
                  </td>
                  <td className="px-3 py-2.5">{rec.dn_status || 'Missing'}</td>
                  <td className="px-3 py-2.5">{rec.dn_resolution || 'Unresolved'}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => {
                        setSelectedRec(rec);
                        setGrnQty(rec.grn_quantity);
                        setDnQty(rec.dn_quantity);
                        setGrnNo(rec.grn_no);
                        setDnStatus(rec.dn_status || 'Under Review');
                        setDnRes(rec.dn_resolution || 'Dispute Raised with FC');
                        setDnClosure(rec.dn_closure_date || todayStr);
                        setRemark(rec.invoice_remark);
                      }}
                      className="rounded-xs bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                    >
                      Reconcile Exception
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Reconcile Exception — {selectedRec.invoice_no} (Invoice Qty: {selectedRec.invoice_quantity})
            </h3>
            <form onSubmit={handleResolveSubmit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block font-medium">GRN Quantity</label>
                  <input
                    type="number"
                    value={grnQty}
                    onChange={(e) => setGrnQty(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">DN Quantity</label>
                  <input
                    type="number"
                    value={dnQty}
                    onChange={(e) => setDnQty(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">GRN Number</label>
                  <input
                    type="text"
                    value={grnNo}
                    onChange={(e) => setGrnNo(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block font-medium">DN Status</label>
                  <select
                    value={dnStatus}
                    onChange={(e) => setDnStatus(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {DESIDIYA_DN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium">DN Resolution</label>
                  <select
                    value={dnRes}
                    onChange={(e) => setDnRes(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {DESIDIYA_DN_RESOLUTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s || '-- None --'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium">DN Closure Date</label>
                  <input
                    type="date"
                    value={dnClosure}
                    onChange={(e) => setDnClosure(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium">Reconciliation Remark</label>
                <textarea
                  rows={2}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRec(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                >
                  Save Reconciliation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 16: BULK CSV IMPORT / EXPORT (Working2.py Bulk Sync CSV)
// ============================================================================
const DISPLAY_TO_CANONICAL: Record<string, keyof DesiDiyaRecord> = Object.entries(
  DESIDIYA_COLUMN_DISPLAY_NAMES
).reduce((acc, [canon, disp]) => {
  acc[disp.toLowerCase().trim()] = canon as keyof DesiDiyaRecord;
  acc[canon.toLowerCase().trim()] = canon as keyof DesiDiyaRecord;
  return acc;
}, {} as Record<string, keyof DesiDiyaRecord>);

export const DesiDiyaBulkCsvSync: React.FC = () => {
  const { desidiyaRecords, syncDesiDiyaBulkCsv, importJobs, todayStr } = useWorkTrack();
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<Omit<DesiDiyaRecord, 'id' | 'ownerId'>[]>([]);
  const [syncMode, setSyncMode] = useState<'merge' | 'replace'>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      const mapped: Omit<DesiDiyaRecord, 'id' | 'ownerId'>[] = rawJson
        .map((row) => {
          const item: Record<string, any> = { ...EMPTY_DESIDIYA_FORM };
          Object.entries(row).forEach(([k, v]) => {
            const canon = DISPLAY_TO_CANONICAL[k.toLowerCase().trim()];
            if (canon) {
              const isNum = typeof EMPTY_DESIDIYA_FORM[canon] === 'number';
              item[canon] = isNum ? Number(v) || 0 : String(v ?? '').trim();
            }
          });
          return item as Omit<DesiDiyaRecord, 'id' | 'ownerId'>;
        })
        .filter((r) => Boolean(r.invoice_no));

      setParsedRows(mapped);
    };
    reader.readAsArrayBuffer(file);
  };

  const exportCsv = () => {
    const rows = desidiyaRecords.map((r) => {
      const obj: Record<string, any> = {};
      DESIDIYA_COLUMN_ORDER.forEach((col) => {
        obj[DESIDIYA_COLUMN_DISPLAY_NAMES[col] || col] = r[col];
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DesiDiya_Master_Tracking_${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Bulk CSV / Excel Import &amp; Export Sync
          </h1>
          <p className="text-xs text-slate-500">
            Import <code className="font-mono">Working2.py</code> CSV/Excel sheets with automatic 29-column header mapping, Merge by Invoice Number, or Replace All.
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Download className="h-3.5 w-3.5" />
          Export Full Master CSV ({desidiyaRecords.length} Rows)
        </button>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            Choose CSV or Excel File
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1.5 font-medium">
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'merge'}
                onChange={() => setSyncMode('merge')}
              />
              Merge by Invoice No (Safe Upsert)
            </label>
            <label className="flex items-center gap-1.5 font-medium text-red-600">
              <input
                type="radio"
                name="syncMode"
                checked={syncMode === 'replace'}
                onChange={() => setSyncMode('replace')}
              />
              Replace All Records
            </label>
          </div>
        </div>

        {parsedRows.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:bg-blue-950/60 dark:text-blue-200">
              <span>
                Parsed <strong>{parsedRows.length}</strong> valid rows from{' '}
                <code className="font-mono">{fileName}</code>
              </span>
              {syncMode === 'replace' && !confirmReplace ? (
                <button
                  onClick={() => setConfirmReplace(true)}
                  className="rounded-xs bg-red-600 px-3 py-1 font-semibold text-white"
                >
                  Confirm Destructive Replace
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await syncDesiDiyaBulkCsv(fileName, parsedRows, syncMode);
                    setParsedRows([]);
                    setConfirmReplace(false);
                  }}
                  className="rounded-xs bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-700"
                >
                  Execute {syncMode === 'merge' ? 'Bulk Merge' : 'Full Replace'} Now
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import History */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-xs font-bold uppercase">Recent Sync &amp; Import Jobs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-3 py-2">File Name</th>
                <th className="px-3 py-2">Module</th>
                <th className="px-3 py-2">Total Rows</th>
                <th className="px-3 py-2">Imported / Synced</th>
                <th className="px-3 py-2">Updated / Duplicates</th>
                <th className="px-3 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {importJobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-3 py-2 font-mono font-medium">{job.fileName}</td>
                  <td className="px-3 py-2 font-mono">{job.targetModule}</td>
                  <td className="px-3 py-2 font-mono">{job.totalRows}</td>
                  <td className="px-3 py-2 font-mono text-emerald-600">{job.importedRows}</td>
                  <td className="px-3 py-2 font-mono">{job.duplicateRows}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {job.timestampIso.slice(0, 16).replace('T', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 17: REPORTS AND ANALYTICS
// ============================================================================
export const DesiDiyaReportsAnalytics: React.FC = () => {
  const { desidiyaRecords, tasks, todayStr } = useWorkTrack();

  const metrics = useMemo(
    () => calculateDesiDiyaDashboardMetrics(desidiyaRecords, todayStr),
    [desidiyaRecords, todayStr]
  );

  const carrierBreakdown = useMemo(() => {
    const map: Record<string, { carrier: string; shipments: number; delivered: number; valueLakhs: number }> = {};
    desidiyaRecords.forEach((r) => {
      const c = r.transport_mode || 'Unassigned';
      if (!map[c]) map[c] = { carrier: c, shipments: 0, delivered: 0, valueLakhs: 0 };
      map[c].shipments += 1;
      if (r.delivery_status.toLowerCase() === 'delivered') map[c].delivered += 1;
      map[c].valueLakhs = Number((map[c].valueLakhs + r.invoice_amount / 100000).toFixed(2));
    });
    return Object.values(map);
  }, [desidiyaRecords]);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Integrated DesiDiya &amp; WorkTrack Reports &amp; Analytics
        </h1>
        <p className="text-xs text-slate-500">
          Cross-functional logistics SLA performance, financial reconciliation summary, and productivity metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">Gross Invoiced Value</span>
          <div className="mt-1 font-mono text-xl font-bold">
            {formatInr(metrics.totalInvoiceValue)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">Total GRN Value</span>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-600">
            {formatInr(
              desidiyaRecords.reduce((acc, r) => acc + (Number(r.grn_amount) || 0), 0)
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">Total Disputed DN Value</span>
          <div className="mt-1 font-mono text-xl font-bold text-red-600">
            {formatInr(
              desidiyaRecords.reduce((acc, r) => acc + (Number(r.dn_amount) || 0), 0)
            )}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">Active WorkTrack Tasks</span>
          <div className="mt-1 font-mono text-xl font-bold text-blue-600">
            {tasks.filter((t) => t.status !== 'Completed').length} / {tasks.length}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 text-xs font-bold uppercase">
          Carrier Shipment Volume vs Delivered Count
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={carrierBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="carrier" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="shipments" name="Total Shipments" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivered" name="Delivered" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
