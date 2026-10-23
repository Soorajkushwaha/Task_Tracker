import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  Upload,
} from 'lucide-react';
import { useWorkTrack } from '../context/WorkTrackContext';
import {
  DesiDiyaRecord,
  DESIDIYA_DELIVERY_STATUSES,
  DESIDIYA_DN_RESOLUTIONS,
  DESIDIYA_DN_STATUSES,
  DESIDIYA_INVOICE_STATUSES,
} from '../types/worktrack';
import {
  calculateDesiDiyaDashboardMetrics,
  diffDaysFromIso,
  isGrnComplete,
} from '../utils/desidiyaLogic';
import { DocumentPreviewModal, formatInr } from './DesiDiyaDashboardAndMaster';

// ============================================================================
// MODULE 3: INVOICE TRACKING
// ============================================================================
export const DesiDiyaInvoiceTracking: React.FC = () => {
  const { desidiyaRecords, saveDesiDiyaRecord, setActiveNav } = useWorkTrack();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const filtered = useMemo(() => {
    return desidiyaRecords.filter((r) => {
      if (statusFilter !== 'ALL' && r.invoice_status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.invoice_no.toLowerCase().includes(q) ||
          r.po_number.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.vendor_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [desidiyaRecords, statusFilter, search]);

  const totals = useMemo(() => {
    const totalAmt = filtered.reduce((acc, r) => acc + (Number(r.invoice_amount) || 0), 0);
    const paidAmt = filtered
      .filter((r) => r.invoice_status === 'Paid')
      .reduce((acc, r) => acc + (Number(r.invoice_amount) || 0), 0);
    const pendingAmt = totalAmt - paidAmt;
    const missingDocCount = filtered.filter((r) => !r.invoice_file_path).length;
    return { totalAmt, paidAmt, pendingAmt, missingDocCount };
  }, [filtered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Invoice Tracking &amp; Receivables Ledger
          </h1>
          <p className="text-xs text-slate-500">
            Track invoice submission, payout status, invoice remarks, and attached tax invoice files.
          </p>
        </div>
        <button
          onClick={() => setActiveNav('file-upload-center')}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Invoice Files
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">Total Filtered Value</span>
          <div className="mt-1 font-mono text-xl font-bold">{formatInr(totals.totalAmt)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">Settled / Paid Value</span>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-600">
            {formatInr(totals.paidAmt)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">Outstanding Receivables</span>
          <div className="mt-1 font-mono text-xl font-bold text-amber-600">
            {formatInr(totals.pendingAmt)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs text-slate-500">Missing Invoice PDF/File</span>
          <div className="mt-1 font-mono text-xl font-bold text-red-600">
            {totals.missingDocCount}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Invoice No, PO Number, Location..."
            className="w-full rounded-md border border-slate-300 py-1.5 pr-3 pl-8 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="ALL">All Invoice Statuses</option>
          {DESIDIYA_INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Dispatched</th>
              <th className="px-3 py-2.5">Qty</th>
              <th className="px-3 py-2.5">Invoice Amount</th>
              <th className="px-3 py-2.5">GRN Amount</th>
              <th className="px-3 py-2.5">DN Amount</th>
              <th className="px-3 py-2.5">Invoice Status</th>
              <th className="px-3 py-2.5">Invoice Document</th>
              <th className="px-3 py-2.5">Invoice Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((rec) => (
              <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2 font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {rec.invoice_no}
                </td>
                <td className="px-3 py-2 font-mono">{rec.po_number}</td>
                <td className="px-3 py-2">{rec.location}</td>
                <td className="px-3 py-2 font-mono">{rec.dispatched_date || '—'}</td>
                <td className="px-3 py-2 font-mono">{rec.invoice_quantity}</td>
                <td className="px-3 py-2 font-mono font-semibold">
                  {formatInr(rec.invoice_amount)}
                </td>
                <td className="px-3 py-2 font-mono">{formatInr(rec.grn_amount)}</td>
                <td className="px-3 py-2 font-mono text-red-600">{formatInr(rec.dn_amount)}</td>
                <td className="px-3 py-2">
                  <select
                    value={rec.invoice_status}
                    onChange={async (e) => {
                      const { id, ownerId: _ow, ...rest } = rec;
                      await saveDesiDiyaRecord(
                        { ...rest, invoice_status: e.target.value },
                        id,
                        'Invoice Status Changed',
                        rec.invoice_status,
                        e.target.value
                      );
                    }}
                    className="rounded-xs border border-slate-300 bg-white px-2 py-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                  >
                    {DESIDIYA_INVOICE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  {rec.invoice_file_path ? (
                    <button
                      onClick={() =>
                        setPreviewDoc({
                          url: rec.invoice_file_path,
                          title: `Invoice File — ${rec.invoice_no}`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xs border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                    >
                      <Eye className="h-3 w-3" />
                      Preview Invoice
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-600">Missing File</span>
                  )}
                </td>
                <td className="max-w-xs truncate px-3 py-2 text-slate-500" title={rec.invoice_remark}>
                  {rec.invoice_remark || '—'}
                </td>
              </tr>
            ))}
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
// MODULE 4: PURCHASE ORDER TRACKING
// ============================================================================
export const DesiDiyaPoTracking: React.FC = () => {
  const { desidiyaRecords, saveDesiDiyaRecord, setActiveNav } = useWorkTrack();
  const [search, setSearch] = useState('');
  const [showPreInvoiceModal, setShowPreInvoiceModal] = useState(false);
  const [newPoNo, setNewPoNo] = useState('');
  const [newLocation, setNewLocation] = useState('BLR7 - Bengaluru FC');
  const [newPoType, setNewPoType] = useState('Regular Replenishment');
  const [newExpiry, setNewExpiry] = useState('');
  const [newAppt, setNewAppt] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [newAmt, setNewAmt] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const poSummaries = useMemo(() => {
    const map: Record<
      string,
      {
        po_number: string;
        vendor_name: string;
        location: string;
        po_type: string;
        po_expiry_date: string;
        appointment_date: string;
        invoices: DesiDiyaRecord[];
        totalInvoicedQty: number;
        totalGrnQty: number;
        totalAmount: number;
        po_file_path: string;
      }
    > = {};

    desidiyaRecords.forEach((r) => {
      const po = r.po_number || 'UNASSIGNED-PO';
      if (!map[po]) {
        map[po] = {
          po_number: po,
          vendor_name: r.vendor_name,
          location: r.location,
          po_type: r.po_type,
          po_expiry_date: r.po_expiry_date,
          appointment_date: r.appointment_date,
          invoices: [],
          totalInvoicedQty: 0,
          totalGrnQty: 0,
          totalAmount: 0,
          po_file_path: r.po_file_path,
        };
      }
      map[po].invoices.push(r);
      map[po].totalInvoicedQty += Number(r.invoice_quantity) || 0;
      map[po].totalGrnQty += Number(r.grn_quantity) || 0;
      map[po].totalAmount += Number(r.invoice_amount) || 0;
      if (!map[po].po_file_path && r.po_file_path) {
        map[po].po_file_path = r.po_file_path;
      }
    });

    return Object.values(map).filter((item) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.po_number.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.invoices.some((i) => i.invoice_no.toLowerCase().includes(q))
      );
    });
  }, [desidiyaRecords, search]);

  const handleCreatePreInvoicePo = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPo = newPoNo.trim();
    if (!cleanPo) return;
    await saveDesiDiyaRecord({
      invoice_no: `PO-PENDING-${cleanPo}`,
      po_number: cleanPo,
      vendor_name: 'DesiDiya Lighting Pvt Ltd',
      location: newLocation,
      dispatched_date: '',
      appointment_date: newAppt,
      po_expiry_date: newExpiry,
      invoice_quantity: newQty,
      grn_quantity: 0,
      dn_quantity: 0,
      no_of_box: 0,
      invoice_amount: newAmt,
      grn_amount: 0,
      dn_amount: 0,
      po_type: newPoType,
      tracking_id: '',
      shipment_track_id: '',
      transport_mode: '',
      appointment_count: newAppt ? 1 : 0,
      appointment_history: newAppt ? `${newAppt} (Initial PO Slot)` : '',
      delivery_status: newAppt ? 'Appointment Scheduled' : 'Planned',
      invoice_status: 'Pending',
      dn_status: 'Not Applicable',
      dn_resolution: '',
      dn_closure_date: '',
      delivery_remark: 'Pre-invoice Purchase Order created via PO Tracker.',
      invoice_remark: '',
      general_remark: '',
      assigned_person: 'Sooraj',
      grn_no: '',
      original_appointment_date: newAppt,
      original_po_expiry_date: newExpiry,
      po_expiry_history: '',
      cn_no: '',
      cn_amount: 0,
      cn_status: '',
      invoice_file_path: '',
      po_file_path: '',
      pod_file_path: '',
      grn_file_path: '',
      dn_file_path: '',
      cn_file_path: '',
    });
    setShowPreInvoiceModal(false);
    setNewPoNo('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Purchase Order (PO) Tracking ({poSummaries.length} POs)
          </h1>
          <p className="text-xs text-slate-500">
            Track Purchase Orders from pre-invoice allocation (`PO-PENDING-`) through dispatch, appointment, and GRN completion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreInvoiceModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Pre-Invoice PO (`PO-PENDING-`)
          </button>
          <button
            onClick={() => setActiveNav('po-expiry-alerts')}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            View PO Expiry Alerts →
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative">
          <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PO Number, Fulfilment Centre, or Linked Invoice..."
            className="w-full rounded-md border border-slate-300 py-1.5 pr-3 pl-8 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">PO Type</th>
              <th className="px-3 py-2.5">Location / FC</th>
              <th className="px-3 py-2.5">Linked Invoices</th>
              <th className="px-3 py-2.5">Appointment Date</th>
              <th className="px-3 py-2.5">PO Expiry Date</th>
              <th className="px-3 py-2.5">Invoiced Qty</th>
              <th className="px-3 py-2.5">GRN Qty</th>
              <th className="px-3 py-2.5">Total Value</th>
              <th className="px-3 py-2.5">PO Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {poSummaries.map((po) => (
              <tr key={po.po_number} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                  {po.po_number}
                </td>
                <td className="px-3 py-2.5">{po.po_type || '—'}</td>
                <td className="px-3 py-2.5">{po.location || '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[11px]">
                  {po.invoices.map((i) => i.invoice_no).join(', ')}
                </td>
                <td className="px-3 py-2.5 font-mono">{po.appointment_date || 'Unscheduled'}</td>
                <td className="px-3 py-2.5 font-mono font-medium">
                  {po.po_expiry_date || '—'}
                </td>
                <td className="px-3 py-2.5 font-mono">{po.totalInvoicedQty}</td>
                <td className="px-3 py-2.5 font-mono text-emerald-700 dark:text-emerald-400">
                  {po.totalGrnQty}
                </td>
                <td className="px-3 py-2.5 font-mono font-semibold">
                  {formatInr(po.totalAmount)}
                </td>
                <td className="px-3 py-2.5">
                  {po.po_file_path ? (
                    <button
                      onClick={() =>
                        setPreviewDoc({
                          url: po.po_file_path,
                          title: `PO Document — ${po.po_number}`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xs border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                    >
                      <Eye className="h-3 w-3" />
                      Preview PO
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">Not Uploaded</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPreInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Create Pre-Invoice PO Tracking Entry
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Creates a placeholder record with Invoice ID <code className="font-mono">PO-PENDING-&lt;PO&gt;</code> as in Working2.py.
            </p>
            <form onSubmit={handleCreatePreInvoicePo} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium">PO Number *</label>
                <input
                  required
                  type="text"
                  value={newPoNo}
                  onChange={(e) => setNewPoNo(e.target.value)}
                  placeholder="e.g. 99401823"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">Location / FC</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium">Appointment Date (Optional)</label>
                  <input
                    type="date"
                    value={newAppt}
                    onChange={(e) => setNewAppt(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">PO Expiry Date</label>
                  <input
                    type="date"
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium">Ordered Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">Estimated Value (INR)</label>
                  <input
                    type="number"
                    min={0}
                    value={newAmt}
                    onChange={(e) => setNewAmt(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPreInvoiceModal(false)}
                  className="rounded-md border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                >
                  Save Pre-Invoice PO
                </button>
              </div>
            </form>
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
// MODULE 5: APPOINTMENT TRACKER
// ============================================================================
export const DesiDiyaAppointmentTracker: React.FC = () => {
  const {
    desidiyaRecords,
    todayStr,
    saveDesiDiyaRecord,
    bulkUpdateDesiDiyaAppointments,
  } = useWorkTrack();

  const [tab, setTab] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'MISSING'>('ALL');
  const [bulkPo, setBulkPo] = useState('');
  const [bulkDate, setBulkDate] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [rescheduleRec, setRescheduleRec] = useState<DesiDiyaRecord | null>(null);
  const [newApptDate, setNewApptDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const metrics = useMemo(
    () => calculateDesiDiyaDashboardMetrics(desidiyaRecords, todayStr),
    [desidiyaRecords, todayStr]
  );

  const displayedRecords = useMemo(() => {
    if (tab === 'OVERDUE') return metrics.overdueAppointments;
    if (tab === 'TODAY') return metrics.todaysAppointments;
    if (tab === 'UPCOMING') return metrics.upcomingAppointments;
    if (tab === 'MISSING') return metrics.missingAppointmentDates;
    return desidiyaRecords;
  }, [tab, metrics, desidiyaRecords]);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkPo.trim() || !bulkDate) return;
    await bulkUpdateDesiDiyaAppointments(bulkPo, bulkDate, bulkReason);
    setBulkPo('');
    setBulkDate('');
    setBulkReason('');
  };

  const handleSingleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleRec || !newApptDate) return;
    const { id, ownerId: _ow, ...rest } = rescheduleRec;
    await saveDesiDiyaRecord(
      {
        ...rest,
        appointment_date: newApptDate,
        delivery_remark: rescheduleReason
          ? `${rest.delivery_remark ? rest.delivery_remark + ' | ' : ''}Rescheduled: ${rescheduleReason}`
          : rest.delivery_remark,
      },
      id,
      'Appointment Rescheduled',
      rescheduleRec.appointment_date || 'Missing',
      `${newApptDate} (${rescheduleReason || 'Slot updated'})`
    );
    setRescheduleRec(null);
    setNewApptDate('');
    setRescheduleReason('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Warehouse Appointment Tracker &amp; Reschedule Audit Log
        </h1>
        <p className="text-xs text-slate-500">
          Track FC dock appointments, preserve original appointment dates, increment appointment count, and bulk-update appointments by PO Number.
        </p>
      </div>

      {/* Bulk PO Appointment Update Panel (from Working2.py Record Operations) */}
      <form
        onSubmit={handleBulkSubmit}
        className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/60 dark:bg-blue-950/20"
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-900 uppercase dark:text-blue-300">
          <Calendar className="h-4 w-4" />
          Bulk PO Appointment Reschedule (Updates All Invoices Under PO)
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            required
            type="text"
            value={bulkPo}
            onChange={(e) => setBulkPo(e.target.value)}
            placeholder="Enter PO Number (e.g. 6610293844)"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            required
            type="date"
            value={bulkDate}
            onChange={(e) => setBulkDate(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
          <input
            type="text"
            value={bulkReason}
            onChange={(e) => setBulkReason(e.target.value)}
            placeholder="Reason (e.g. FC dock congestion)"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Apply Bulk Appointment Date
          </button>
        </div>
      </form>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'ALL', label: `All Records (${desidiyaRecords.length})` },
          { id: 'OVERDUE', label: `Overdue Appointments (${metrics.overdueAppointments.length})` },
          { id: 'TODAY', label: `Today's Appointments (${metrics.todaysAppointments.length})` },
          { id: 'UPCOMING', label: `Upcoming 1–3d (${metrics.upcomingAppointments.length})` },
          { id: 'MISSING', label: `Missing Appt Date (${metrics.missingAppointmentDates.length})` },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as any)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              tab === item.id
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Original Appt</th>
              <th className="px-3 py-2.5">Current Appt Date</th>
              <th className="px-3 py-2.5">Appt Count</th>
              <th className="px-3 py-2.5">Appointment History Trail</th>
              <th className="px-3 py-2.5">PO Expiry</th>
              <th className="px-3 py-2.5">Delivery Status</th>
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {displayedRecords.map((rec) => (
              <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">
                  {rec.invoice_no}
                </td>
                <td className="px-3 py-2.5 font-mono">{rec.po_number}</td>
                <td className="px-3 py-2.5">{rec.location}</td>
                <td className="px-3 py-2.5 font-mono text-slate-500">
                  {rec.original_appointment_date || rec.appointment_date || '—'}
                </td>
                <td className="px-3 py-2.5 font-mono font-semibold">
                  {rec.appointment_date || (
                    <span className="text-red-600">Missing Date</span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono">{rec.appointment_count}</td>
                <td className="max-w-xs truncate px-3 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-400" title={rec.appointment_history}>
                  {rec.appointment_history || '—'}
                </td>
                <td className="px-3 py-2.5 font-mono">{rec.po_expiry_date || '—'}</td>
                <td className="px-3 py-2.5">{rec.delivery_status || 'Missing'}</td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => {
                      setRescheduleRec(rec);
                      setNewApptDate(rec.appointment_date || todayStr);
                      setRescheduleReason('');
                    }}
                    className="rounded-xs bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300"
                  >
                    Reschedule Slot
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rescheduleRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Reschedule Appointment — {rescheduleRec.invoice_no}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Previous Date: <span className="font-mono font-semibold">{rescheduleRec.appointment_date || 'None'}</span> | Current Count: <span className="font-mono">{rescheduleRec.appointment_count}</span>
            </p>
            <form onSubmit={handleSingleReschedule} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium">New Appointment Date *</label>
                <input
                  required
                  type="date"
                  value={newApptDate}
                  onChange={(e) => setNewApptDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">Reschedule Reason</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. FC dock slot shifted by buyer"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleRec(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                >
                  Confirm Reschedule
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
// MODULE 6: PO EXPIRY ALERTS
// ============================================================================
export const DesiDiyaPoExpiryAlerts: React.FC = () => {
  const { desidiyaRecords, todayStr, extendDesiDiyaPoExpiry } = useWorkTrack();
  const [extendRec, setExtendRec] = useState<DesiDiyaRecord | null>(null);
  const [newExpDate, setNewExpDate] = useState('');
  const [extReason, setExtReason] = useState('');

  const rowsWithDays = useMemo(() => {
    return desidiyaRecords
      .filter((r) => r.po_expiry_date)
      .map((r) => {
        const diff = diffDaysFromIso(r.po_expiry_date, todayStr);
        const isClosed = ['delivered', 'rto', 'cancelled'].includes(
          r.delivery_status.trim().toLowerCase()
        );
        return { rec: r, diffDays: diff, isClosed };
      })
      .sort((a, b) => (a.diffDays ?? 999) - (b.diffDays ?? 999));
  }, [desidiyaRecords, todayStr]);

  const handleExtendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendRec || !newExpDate) return;
    await extendDesiDiyaPoExpiry(extendRec.id, newExpDate, extReason);
    setExtendRec(null);
    setNewExpDate('');
    setExtReason('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          PO Expiry Alerts &amp; Validity Extension Log
        </h1>
        <p className="text-xs text-slate-500">
          Monitor POs expiring within 3 days (`Working2.py` threshold). PO expiry dates are never extended automatically — only via explicit user action below.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Urgency</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Original Expiry</th>
              <th className="px-3 py-2.5">Current PO Expiry</th>
              <th className="px-3 py-2.5">Days Remaining</th>
              <th className="px-3 py-2.5">Appointment Date</th>
              <th className="px-3 py-2.5">Delivery Status</th>
              <th className="px-3 py-2.5">Extension History</th>
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rowsWithDays.map(({ rec, diffDays, isClosed }) => {
              let badge = 'Safe';
              let tone = 'text-emerald-700 bg-emerald-50 border-emerald-200';
              if (isClosed) {
                badge = 'Completed';
                tone = 'text-slate-600 bg-slate-100 border-slate-200';
              } else if (diffDays !== null && diffDays < 0) {
                badge = 'EXPIRED';
                tone = 'text-red-700 bg-red-50 border-red-300 font-bold';
              } else if (diffDays === 0) {
                badge = 'EXPIRES TODAY';
                tone = 'text-red-700 bg-red-50 border-red-300 font-bold';
              } else if (diffDays !== null && diffDays <= 3) {
                badge = 'CRITICAL (≤3d)';
                tone = 'text-amber-800 bg-amber-50 border-amber-300 font-semibold';
              }

              return (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded-xs border px-2 py-0.5 font-mono text-[10px] ${tone}`}>
                      {badge}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono font-bold">{rec.po_number}</td>
                  <td className="px-3 py-2.5 font-mono text-blue-600">{rec.invoice_no}</td>
                  <td className="px-3 py-2.5">{rec.location}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-500">
                    {rec.original_po_expiry_date || rec.po_expiry_date}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{rec.po_expiry_date}</td>
                  <td className="px-3 py-2.5 font-mono">
                    {diffDays !== null ? `${diffDays} day(s)` : '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{rec.appointment_date || 'Missing'}</td>
                  <td className="px-3 py-2.5">{rec.delivery_status || 'Missing'}</td>
                  <td className="max-w-xs truncate px-3 py-2.5 font-mono text-[11px] text-slate-500">
                    {rec.po_expiry_history || 'No extensions'}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => {
                        setExtendRec(rec);
                        setNewExpDate(rec.po_expiry_date);
                        setExtReason('');
                      }}
                      className="rounded-xs bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Extend Expiry
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {extendRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Extend PO Expiry Date — PO {extendRec.po_number}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Current Expiry: <span className="font-mono font-semibold">{extendRec.po_expiry_date}</span>
            </p>
            <form onSubmit={handleExtendSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium">New Approved PO Expiry Date *</label>
                <input
                  required
                  type="date"
                  value={newExpDate}
                  onChange={(e) => setNewExpDate(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">Approval / Extension Note</label>
                <input
                  type="text"
                  value={extReason}
                  onChange={(e) => setExtReason(e.target.value)}
                  placeholder="e.g. Category buyer email approval #BLR-992"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtendRec(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                >
                  Save Extended Expiry
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
// MODULE 7: SHIPMENT AND COURIER TRACKING
// ============================================================================
export const DesiDiyaShipmentCourierTracking: React.FC = () => {
  const { desidiyaRecords, todayStr, saveDesiDiyaRecord } = useWorkTrack();
  const [carrierFilter, setCarrierFilter] = useState('ALL');
  const [onlyHighAging, setOnlyHighAging] = useState(false);
  const [search, setSearch] = useState('');

  const carriers = useMemo(
    () => Array.from(new Set(desidiyaRecords.map((r) => r.transport_mode).filter(Boolean))).sort(),
    [desidiyaRecords]
  );

  const filtered = useMemo(() => {
    return desidiyaRecords.filter((r) => {
      if (carrierFilter !== 'ALL' && r.transport_mode !== carrierFilter) return false;
      if (onlyHighAging) {
        const diff = diffDaysFromIso(r.dispatched_date, todayStr);
        const closed = ['delivered', 'rto', 'cancelled'].includes(
          r.delivery_status.trim().toLowerCase()
        );
        if (closed || diff === null || diff >= -20) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          r.invoice_no.toLowerCase().includes(q) ||
          r.tracking_id.toLowerCase().includes(q) ||
          r.shipment_track_id.toLowerCase().includes(q) ||
          r.po_number.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [desidiyaRecords, carrierFilter, onlyHighAging, search, todayStr]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Shipment &amp; Courier Tracking
          </h1>
          <p className="text-xs text-slate-500">
            Monitor carrier LRs, Shipment Track IDs, box counts, transit aging (&gt;20 days alert), and delivery remarks.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
          <input
            type="checkbox"
            checked={onlyHighAging}
            onChange={(e) => setOnlyHighAging(e.target.checked)}
          />
          Show Only High-Aging Shipments (&gt;20 Days)
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Tracking ID / LR, Shipment Track ID, Invoice No..."
            className="w-full rounded-md border border-slate-300 py-1.5 pr-3 pl-8 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <select
          value={carrierFilter}
          onChange={(e) => setCarrierFilter(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="ALL">All Transport Modes / Couriers</option>
          {carriers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Transport Mode</th>
              <th className="px-3 py-2.5">Tracking / LR ID</th>
              <th className="px-3 py-2.5">Shipment Track ID</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Dispatched</th>
              <th className="px-3 py-2.5">Transit Age</th>
              <th className="px-3 py-2.5">Boxes</th>
              <th className="px-3 py-2.5">Delivery Status</th>
              <th className="px-3 py-2.5">Delivery Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((rec) => {
              const diff = diffDaysFromIso(rec.dispatched_date, todayStr);
              const ageDays = diff !== null ? Math.abs(diff) : null;
              return (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">
                    {rec.invoice_no}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{rec.po_number}</td>
                  <td className="px-3 py-2.5 font-medium">{rec.transport_mode || '—'}</td>
                  <td className="px-3 py-2.5 font-mono">{rec.tracking_id || '—'}</td>
                  <td className="px-3 py-2.5 font-mono">{rec.shipment_track_id || '—'}</td>
                  <td className="px-3 py-2.5">{rec.location}</td>
                  <td className="px-3 py-2.5 font-mono">{rec.dispatched_date || '—'}</td>
                  <td className="px-3 py-2.5 font-mono">
                    {ageDays !== null ? (
                      <span
                        className={
                          ageDays > 20 && rec.delivery_status !== 'Delivered'
                            ? 'font-bold text-red-600'
                            : ''
                        }
                      >
                        {ageDays}d
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{rec.no_of_box}</td>
                  <td className="px-3 py-2.5">
                    <select
                      value={rec.delivery_status}
                      onChange={async (e) => {
                        const { id, ownerId: _ow, ...rest } = rec;
                        await saveDesiDiyaRecord(
                          { ...rest, delivery_status: e.target.value },
                          id,
                          'Delivery Status Updated',
                          rec.delivery_status,
                          e.target.value
                        );
                      }}
                      className="rounded-xs border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="">Missing</option>
                      {DESIDIYA_DELIVERY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="max-w-xs truncate px-3 py-2.5 text-slate-500" title={rec.delivery_remark}>
                    {rec.delivery_remark || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 8: GRN TRACKING (OR-based GRN completion logic from Working2.py)
// ============================================================================
export const DesiDiyaGrnTracking: React.FC = () => {
  const { desidiyaRecords, saveDesiDiyaRecord, setActiveNav } = useWorkTrack();
  const [filterMode, setFilterMode] = useState<'ALL' | 'PENDING_GRN' | 'COMPLETE_GRN' | 'MISSING_GRN_NO'>('ALL');
  const [editingGrnRec, setEditingGrnRec] = useState<DesiDiyaRecord | null>(null);
  const [grnNo, setGrnNo] = useState('');
  const [grnQty, setGrnQty] = useState(0);
  const [grnAmt, setGrnAmt] = useState(0);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const filtered = useMemo(() => {
    return desidiyaRecords.filter((r) => {
      const complete = isGrnComplete(r);
      if (filterMode === 'PENDING_GRN') {
        return r.delivery_status.toLowerCase() === 'delivered' && !complete;
      }
      if (filterMode === 'COMPLETE_GRN') {
        return complete;
      }
      if (filterMode === 'MISSING_GRN_NO') {
        return Number(r.grn_quantity) > 0 && !r.grn_no.trim();
      }
      return true;
    });
  }, [desidiyaRecords, filterMode]);

  const handleSaveGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGrnRec) return;
    const { id, ownerId: _ow, ...rest } = editingGrnRec;
    await saveDesiDiyaRecord(
      {
        ...rest,
        grn_no: grnNo,
        grn_quantity: grnQty,
        grn_amount: grnAmt,
      },
      id,
      'GRN Details Updated',
      `GRN:${editingGrnRec.grn_no || 'None'} (${editingGrnRec.grn_quantity})`,
      `GRN:${grnNo} (${grnQty})`
    );
    setEditingGrnRec(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Goods Receipt Note (GRN) Tracking
          </h1>
          <p className="text-xs text-slate-500">
            Preserves <code className="font-mono">Working2.py</code> OR-logic: GRN is Complete when <code className="font-mono">grn_quantity &gt; 0 OR grn_no != &apos;&apos; OR grn_amount &gt; 0</code>.
          </p>
        </div>
        <button
          onClick={() => setActiveNav('file-upload-center')}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload GRN Document
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'ALL', label: 'All Shipments' },
          { id: 'PENDING_GRN', label: 'Delivered — Pending GRN' },
          { id: 'COMPLETE_GRN', label: 'GRN Complete' },
          { id: 'MISSING_GRN_NO', label: 'GRN Qty > 0 but Missing GRN No' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilterMode(item.id as any)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              filterMode === item.id
                ? 'bg-blue-600 text-white'
                : 'border border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Delivery Status</th>
              <th className="px-3 py-2.5">GRN Status</th>
              <th className="px-3 py-2.5">GRN Number</th>
              <th className="px-3 py-2.5">Invoice Qty</th>
              <th className="px-3 py-2.5">GRN Qty</th>
              <th className="px-3 py-2.5">GRN Amount</th>
              <th className="px-3 py-2.5">GRN File</th>
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((rec) => {
              const complete = isGrnComplete(rec);
              return (
                <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">
                    {rec.invoice_no}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{rec.po_number}</td>
                  <td className="px-3 py-2.5">{rec.location}</td>
                  <td className="px-3 py-2.5">{rec.delivery_status || 'Missing'}</td>
                  <td className="px-3 py-2.5">
                    {complete ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        GRN Complete
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        Pending GRN
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono">
                    {rec.grn_no || (
                      <span className="text-slate-400">Not Posted</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono">{rec.invoice_quantity}</td>
                  <td className="px-3 py-2.5 font-mono font-semibold">{rec.grn_quantity}</td>
                  <td className="px-3 py-2.5 font-mono">{formatInr(rec.grn_amount)}</td>
                  <td className="px-3 py-2.5">
                    {rec.grn_file_path ? (
                      <button
                        onClick={() =>
                          setPreviewDoc({
                            url: rec.grn_file_path,
                            title: `GRN Document — ${rec.invoice_no}`,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-xs border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                      >
                        <Eye className="h-3 w-3" />
                        Preview GRN
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => {
                        setEditingGrnRec(rec);
                        setGrnNo(rec.grn_no);
                        setGrnQty(rec.grn_quantity || rec.invoice_quantity);
                        setGrnAmt(rec.grn_amount || rec.invoice_amount);
                      }}
                      className="rounded-xs bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Post / Edit GRN
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingGrnRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Update GRN Receipt — {editingGrnRec.invoice_no}
            </h3>
            <form onSubmit={handleSaveGrn} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium">GRN Number</label>
                <input
                  type="text"
                  value={grnNo}
                  onChange={(e) => setGrnNo(e.target.value)}
                  placeholder="e.g. GRN-2026-88901"
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium">GRN Accepted Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={grnQty}
                    onChange={(e) => setGrnQty(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">GRN Amount (INR)</label>
                  <input
                    type="number"
                    min={0}
                    value={grnAmt}
                    onChange={(e) => setGrnAmt(Number(e.target.value) || 0)}
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGrnRec(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                >
                  Save GRN
                </button>
              </div>
            </form>
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
// MODULE 9: DN TRACKING (Discrepancy / Debit Note Management)
// ============================================================================
export const DesiDiyaDnTracking: React.FC = () => {
  const { desidiyaRecords, saveDesiDiyaRecord } = useWorkTrack();
  const [onlyActiveDn, setOnlyActiveDn] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const filtered = useMemo(() => {
    return desidiyaRecords.filter((r) => {
      if (!onlyActiveDn) return true;
      return (
        Number(r.dn_quantity) > 0 ||
        Number(r.dn_amount) > 0 ||
        (r.dn_status && r.dn_status !== 'Not Applicable')
      );
    });
  }, [desidiyaRecords, onlyActiveDn]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Debit Note (DN) &amp; Shortage Discrepancy Tracker
          </h1>
          <p className="text-xs text-slate-500">
            Track short-receipt Debit Notes, DN Status, DN Resolution workflow, DN Closure Date, and attached DN documents.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium">
          <input
            type="checkbox"
            checked={onlyActiveDn}
            onChange={(e) => setOnlyActiveDn(e.target.checked)}
          />
          Show Only Records with DN Activity ({filtered.length})
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Inv Qty</th>
              <th className="px-3 py-2.5">GRN Qty</th>
              <th className="px-3 py-2.5">DN Qty</th>
              <th className="px-3 py-2.5">DN Amount</th>
              <th className="px-3 py-2.5">DN Status</th>
              <th className="px-3 py-2.5">DN Resolution</th>
              <th className="px-3 py-2.5">DN Closure Date</th>
              <th className="px-3 py-2.5">DN Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((rec) => (
              <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">
                  {rec.invoice_no}
                </td>
                <td className="px-3 py-2.5 font-mono">{rec.po_number}</td>
                <td className="px-3 py-2.5">{rec.location}</td>
                <td className="px-3 py-2.5 font-mono">{rec.invoice_quantity}</td>
                <td className="px-3 py-2.5 font-mono">{rec.grn_quantity}</td>
                <td className="px-3 py-2.5 font-mono font-bold text-red-600">
                  {rec.dn_quantity}
                </td>
                <td className="px-3 py-2.5 font-mono font-semibold text-red-600">
                  {formatInr(rec.dn_amount)}
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={rec.dn_status}
                    onChange={async (e) => {
                      const { id, ownerId: _ow, ...rest } = rec;
                      await saveDesiDiyaRecord(
                        { ...rest, dn_status: e.target.value },
                        id,
                        'DN Status Updated',
                        rec.dn_status || 'Missing',
                        e.target.value
                      );
                    }}
                    className="rounded-xs border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">Missing Status</option>
                    {DESIDIYA_DN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={rec.dn_resolution}
                    onChange={async (e) => {
                      const { id, ownerId: _ow, ...rest } = rec;
                      await saveDesiDiyaRecord(
                        { ...rest, dn_resolution: e.target.value },
                        id,
                        'DN Resolution Updated',
                        rec.dn_resolution,
                        e.target.value
                      );
                    }}
                    className="rounded-xs border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    {DESIDIYA_DN_RESOLUTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s || '-- Select Resolution --'}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5 font-mono">{rec.dn_closure_date || '—'}</td>
                <td className="px-3 py-2.5">
                  {rec.dn_file_path ? (
                    <button
                      onClick={() =>
                        setPreviewDoc({
                          url: rec.dn_file_path,
                          title: `DN Document — ${rec.invoice_no}`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xs border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                    >
                      <Eye className="h-3 w-3" />
                      Preview DN
                    </button>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-600">Missing DN File</span>
                  )}
                </td>
              </tr>
            ))}
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
// MODULE 10: CN TRACKING (Credit Note Ledger & Document Links)
// ============================================================================
export const DesiDiyaCnTracking: React.FC = () => {
  const { desidiyaRecords, saveDesiDiyaRecord, setActiveNav } = useWorkTrack();
  const [editCnRec, setEditCnRec] = useState<DesiDiyaRecord | null>(null);
  const [cnNo, setCnNo] = useState('');
  const [cnAmt, setCnAmt] = useState(0);
  const [cnStatus, setCnStatus] = useState('Issued & Adjusted');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const handleSaveCn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCnRec) return;
    const { id, ownerId: _ow, ...rest } = editCnRec;
    await saveDesiDiyaRecord(
      {
        ...rest,
        cn_no: cnNo,
        cn_amount: cnAmt,
        cn_status: cnStatus,
      },
      id,
      'Credit Note Updated',
      editCnRec.cn_no || 'None',
      `${cnNo} (${formatInr(cnAmt)})`
    );
    setEditCnRec(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Credit Note (CN) Tracking &amp; Settlements
          </h1>
          <p className="text-xs text-slate-500">
            Manage Credit Notes issued against DN shortages or transit damage, and preview linked CN files stored in <code className="font-mono">data_lake/cns</code>.
          </p>
        </div>
        <button
          onClick={() => setActiveNav('file-upload-center')}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload CN File
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th className="px-3 py-2.5">Invoice No</th>
              <th className="px-3 py-2.5">PO Number</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Credit Note No</th>
              <th className="px-3 py-2.5">CN Amount</th>
              <th className="px-3 py-2.5">CN Status</th>
              <th className="px-3 py-2.5">DN Qty / Amt</th>
              <th className="px-3 py-2.5">CN Document</th>
              <th className="px-3 py-2.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {desidiyaRecords.map((rec) => (
              <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-3 py-2.5 font-mono font-semibold text-blue-600">
                  {rec.invoice_no}
                </td>
                <td className="px-3 py-2.5 font-mono">{rec.po_number}</td>
                <td className="px-3 py-2.5">{rec.location}</td>
                <td className="px-3 py-2.5 font-mono font-semibold">
                  {rec.cn_no || <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2.5 font-mono">{formatInr(rec.cn_amount)}</td>
                <td className="px-3 py-2.5">{rec.cn_status || '—'}</td>
                <td className="px-3 py-2.5 font-mono">
                  {rec.dn_quantity} units / {formatInr(rec.dn_amount)}
                </td>
                <td className="px-3 py-2.5">
                  {rec.cn_file_path ? (
                    <button
                      onClick={() =>
                        setPreviewDoc({
                          url: rec.cn_file_path,
                          title: `Credit Note — ${rec.cn_no || rec.invoice_no}`,
                        })
                      }
                      className="inline-flex items-center gap-1 rounded-xs border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
                    >
                      <Eye className="h-3 w-3" />
                      Preview CN
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">No CN File</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    onClick={() => {
                      setEditCnRec(rec);
                      setCnNo(rec.cn_no || `CN-2026-${Math.floor(1000 + Math.random() * 9000)}`);
                      setCnAmt(rec.cn_amount || rec.dn_amount || 0);
                      setCnStatus(rec.cn_status || 'Issued & Adjusted');
                    }}
                    className="rounded-xs bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    Record / Edit CN
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editCnRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Issue / Update Credit Note — {editCnRec.invoice_no}
            </h3>
            <form onSubmit={handleSaveCn} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium">Credit Note Number *</label>
                <input
                  required
                  type="text"
                  value={cnNo}
                  onChange={(e) => setCnNo(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">CN Amount (INR)</label>
                <input
                  type="number"
                  min={0}
                  value={cnAmt}
                  onChange={(e) => setCnAmt(Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-medium">CN Status</label>
                <select
                  value={cnStatus}
                  onChange={(e) => setCnStatus(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="Draft">Draft</option>
                  <option value="Issued & Adjusted">Issued &amp; Adjusted</option>
                  <option value="Pending Buyer Acceptance">Pending Buyer Acceptance</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditCnRec(null)}
                  className="rounded-md border border-slate-300 px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700"
                >
                  Save Credit Note
                </button>
              </div>
            </form>
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
