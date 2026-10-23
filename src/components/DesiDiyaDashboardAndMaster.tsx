import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Columns,
  Download,
  Edit3,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWorkTrack } from '../context/WorkTrackContext';
import {
  DesiDiyaRecord,
  DESIDIYA_DELIVERY_STATUSES,
  DESIDIYA_DN_RESOLUTIONS,
  DESIDIYA_DN_STATUSES,
  DESIDIYA_INVOICE_STATUSES,
  DocumentCategory,
} from '../types/worktrack';
import {
  calculateDesiDiyaDashboardMetrics,
  DESIDIYA_COLUMN_DISPLAY_NAMES,
  DESIDIYA_COLUMN_ORDER,
  filterDesiDiyaRecords,
  isGrnComplete,
} from '../utils/desidiyaLogic';
import * as XLSX from 'xlsx';

export function formatInr(val: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Number(val) || 0);
}

export const EMPTY_DESIDIYA_FORM: Omit<DesiDiyaRecord, 'id' | 'ownerId'> = {
  invoice_no: '',
  po_number: '',
  vendor_name: 'DesiDiya Lighting Pvt Ltd',
  location: '',
  dispatched_date: '',
  appointment_date: '',
  po_expiry_date: '',
  invoice_quantity: 0,
  grn_quantity: 0,
  dn_quantity: 0,
  no_of_box: 0,
  invoice_amount: 0,
  grn_amount: 0,
  dn_amount: 0,
  po_type: 'Regular Replenishment',
  tracking_id: '',
  shipment_track_id: '',
  transport_mode: 'Delhivery B2B',
  appointment_count: 0,
  appointment_history: '',
  delivery_status: 'Dispatched',
  invoice_status: 'Pending',
  dn_status: 'Not Applicable',
  dn_resolution: '',
  dn_closure_date: '',
  delivery_remark: '',
  invoice_remark: '',
  general_remark: '',
  assigned_person: 'Sooraj',
  grn_no: '',
  original_appointment_date: '',
  original_po_expiry_date: '',
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
};

export function DocumentPreviewModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (url.endsWith('.txt') || url.endsWith('.csv')) {
      setLoading(true);
      fetch(url)
        .then((r) => r.text())
        .then((txt) => {
          setTextContent(txt);
          setLoading(false);
        })
        .catch(() => {
          setTextContent('Unable to load text preview.');
          setLoading(false);
        });
    } else {
      setTextContent(null);
    }
  }, [url]);

  const isImage = /\.(png|jpg|jpeg|webp)$/i.test(url);
  const isPdf = /\.pdf$/i.test(url);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
              <p className="font-mono text-xs text-slate-500">{url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${url}${url.includes('?') ? '&' : '?'}download=1`}
              download
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Download File
            </a>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-5 dark:bg-slate-950">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading document preview...</div>
          ) : textContent !== null ? (
            <pre className="overflow-x-auto rounded-md border border-slate-200 bg-white p-4 font-mono text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {textContent}
            </pre>
          ) : isImage ? (
            <div className="flex justify-center">
              <img src={url} alt={title} className="max-h-[65vh] rounded-md object-contain" />
            </div>
          ) : isPdf ? (
            <iframe src={url} title={title} className="h-[65vh] w-full rounded-md border border-slate-200" />
          ) : (
            <div className="py-12 text-center">
              <FileCheck className="mx-auto mb-3 h-10 w-10 text-blue-600" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Document stored in persistent Data Lake
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Click &ldquo;Download File&rdquo; above to open in your native viewer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MODULE 1: OPERATIONS DASHBOARD (Working2.py Executive & Alert Control Tower)
// ============================================================================
export const DesiDiyaOperationsDashboard: React.FC = () => {
  const {
    desidiyaRecords,
    todayStr,
    setActiveNav,
    setGlobalDesiDiyaFilter,
  } = useWorkTrack();

  const [dateFilterMode, setDateFilterMode] = useState<string>('All Dates');
  const [dateColumn, setDateColumn] = useState<
    'dispatched_date' | 'appointment_date' | 'po_expiry_date' | 'dn_closure_date'
  >('dispatched_date');
  const [customStart, setCustomStart] = useState<string>('2026-09-01');
  const [customEnd, setCustomEnd] = useState<string>('2026-10-31');
  const [vendorFilter, setVendorFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [deliveryFilter, setDeliveryFilter] = useState<string>('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [dnStatusFilter, setDnStatusFilter] = useState<string>('ALL');
  const [assignedFilter, setAssignedFilter] = useState<string>('ALL');
  const [expandedAlertKey, setExpandedAlertKey] = useState<string | null>('overdueAppointments');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const uniqueLocations = useMemo(
    () => Array.from(new Set(desidiyaRecords.map((r) => r.location).filter(Boolean))).sort(),
    [desidiyaRecords]
  );
  const uniqueVendors = useMemo(
    () => Array.from(new Set(desidiyaRecords.map((r) => r.vendor_name).filter(Boolean))).sort(),
    [desidiyaRecords]
  );
  const uniqueAssignees = useMemo(
    () => Array.from(new Set(desidiyaRecords.map((r) => r.assigned_person).filter(Boolean))).sort(),
    [desidiyaRecords]
  );

  const filteredRecords = useMemo(() => {
    return filterDesiDiyaRecords(desidiyaRecords, {
      dateFilterMode: dateFilterMode as any,
      dateColumn,
      customStartDate: customStart,
      customEndDate: customEnd,
      todayStr,
      vendor: vendorFilter !== 'ALL' ? [vendorFilter] : undefined,
      location: locationFilter !== 'ALL' ? [locationFilter] : undefined,
      deliveryStatus: deliveryFilter !== 'ALL' ? [deliveryFilter] : undefined,
      invoiceStatus: invoiceStatusFilter !== 'ALL' ? [invoiceStatusFilter] : undefined,
      dnStatus: dnStatusFilter !== 'ALL' ? [dnStatusFilter] : undefined,
      assignedPerson: assignedFilter !== 'ALL' ? [assignedFilter] : undefined,
    });
  }, [
    desidiyaRecords,
    dateFilterMode,
    dateColumn,
    customStart,
    customEnd,
    todayStr,
    vendorFilter,
    locationFilter,
    deliveryFilter,
    invoiceStatusFilter,
    dnStatusFilter,
    assignedFilter,
  ]);

  const metrics = useMemo(
    () => calculateDesiDiyaDashboardMetrics(filteredRecords, todayStr),
    [filteredRecords, todayStr]
  );

  const openFilteredMaster = (filterKey: string) => {
    setGlobalDesiDiyaFilter(filterKey);
    setActiveNav('master-tracking');
  };

  // Chart data: Delivery Status Breakdown
  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const st = r.delivery_status.trim() || 'Missing Status';
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredRecords]);

  // Chart data: Location Volume & Value
  const locationChartData = useMemo(() => {
    const map: Record<string, { location: string; invoices: number; amountLakhs: number }> = {};
    filteredRecords.forEach((r) => {
      const loc = r.location || 'Unspecified';
      if (!map[loc]) {
        map[loc] = { location: loc.split(' - ')[0] || loc, invoices: 0, amountLakhs: 0 };
      }
      map[loc].invoices += 1;
      map[loc].amountLakhs = Number((map[loc].amountLakhs + r.invoice_amount / 100000).toFixed(2));
    });
    return Object.values(map).sort((a, b) => b.amountLakhs - a.amountLakhs);
  }, [filteredRecords]);

  const alertCards: Array<{
    key: string;
    label: string;
    count: number;
    subtitle: string;
    tone: 'red' | 'amber' | 'blue' | 'emerald' | 'purple';
    records: DesiDiyaRecord[];
    targetNav?: any;
  }> = [
    {
      key: 'overdueAppointments',
      label: 'Overdue Appointments',
      count: metrics.overdueAppointments.length,
      subtitle: 'Past appointment date, not Delivered/RTO',
      tone: 'red',
      records: metrics.overdueAppointments,
      targetNav: 'appointment-tracker',
    },
    {
      key: 'missingAppointmentDates',
      label: 'Missing Appt Dates',
      count: metrics.missingAppointmentDates.length,
      subtitle: 'No appointment date scheduled',
      tone: 'amber',
      records: metrics.missingAppointmentDates,
      targetNav: 'appointment-tracker',
    },
    {
      key: 'todaysAppointments',
      label: "Today's Appointments",
      count: metrics.todaysAppointments.length,
      subtitle: `Scheduled for ${todayStr} (IST)`,
      tone: 'blue',
      records: metrics.todaysAppointments,
      targetNav: 'appointment-tracker',
    },
    {
      key: 'upcomingAppointments',
      label: 'Upcoming (1–3 Days)',
      count: metrics.upcomingAppointments.length,
      subtitle: 'Appointments in next 72 hours',
      tone: 'purple',
      records: metrics.upcomingAppointments,
      targetNav: 'appointment-tracker',
    },
    {
      key: 'expiringPos3Days',
      label: 'POs Expiring (≤3 Days)',
      count: metrics.expiringPos3Days.length,
      subtitle: 'Active POs approaching expiry window',
      tone: 'red',
      records: metrics.expiringPos3Days,
      targetNav: 'po-expiry-alerts',
    },
    {
      key: 'highAgingShipments',
      label: 'Shipments > 20 Days',
      count: metrics.highAgingShipments.length,
      subtitle: 'High-aging transit / pending delivery',
      tone: 'amber',
      records: metrics.highAgingShipments,
      targetNav: 'shipment-courier-tracking',
    },
    {
      key: 'pendingGrn',
      label: 'Pending GRN',
      count: metrics.pendingGrn.length,
      subtitle: 'Delivered without GRN qty, no, or amount',
      tone: 'red',
      records: metrics.pendingGrn,
      targetNav: 'grn-tracking',
    },
    {
      key: 'grnComplete',
      label: 'GRN Complete',
      count: metrics.grnComplete.length,
      subtitle: 'GRN Qty > 0 OR GRN No OR GRN Amt > 0',
      tone: 'emerald',
      records: metrics.grnComplete,
      targetNav: 'grn-tracking',
    },
  ];

  const selectedAlertObj = alertCards.find((a) => a.key === expandedAlertKey);

  return (
    <div className="space-y-6">
      {/* Top Executive Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs lg:flex-row lg:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
            <span className="font-mono text-xs font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
              DESIDIYA OPERATIONS CONTROL TOWER (IST: {todayStr})
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Operations &amp; Master Shipment Analytics
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Live KPIs, appointment SLA alerts, PO expiry radar, GRN/DN reconciliation, and document completeness checks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setGlobalDesiDiyaFilter('ALL');
              setActiveNav('master-tracking');
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Package className="h-3.5 w-3.5" />
            Open Master Tracking ({desidiyaRecords.length})
          </button>
          <button
            onClick={() => setActiveNav('file-upload-center')}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <FileText className="h-3.5 w-3.5" />
            Upload Documents
          </button>
          <button
            onClick={() => setActiveNav('exception-queue')}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Exception Queue ({metrics.exceptionQueue.length})
          </button>
        </div>
      </div>

      {/* Multi-Filter & Date Filter Bar (preserving Working2.py sidebar filters) */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase dark:text-slate-300">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            Interactive Operations Filters ({filteredRecords.length} of {desidiyaRecords.length} records)
          </div>
          <button
            onClick={() => {
              setDateFilterMode('All Dates');
              setVendorFilter('ALL');
              setLocationFilter('ALL');
              setDeliveryFilter('ALL');
              setInvoiceStatusFilter('ALL');
              setDnStatusFilter('ALL');
              setAssignedFilter('ALL');
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            <RefreshCw className="h-3 w-3" />
            Reset All Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Date Column</label>
            <select
              value={dateColumn}
              onChange={(e) => setDateColumn(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="dispatched_date">Dispatched Date</option>
              <option value="appointment_date">Appointment Date</option>
              <option value="po_expiry_date">PO Expiry Date</option>
              <option value="dn_closure_date">DN Closure Date</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Date Range</label>
            <select
              value={dateFilterMode}
              onChange={(e) => setDateFilterMode(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="All Dates">All Dates</option>
              <option value="Today">Today ({todayStr})</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Month">This Month</option>
              <option value="Custom Range">Custom Range</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Location / FC</label>
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">All Locations</option>
              {uniqueLocations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Delivery Status</label>
            <select
              value={deliveryFilter}
              onChange={(e) => setDeliveryFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">All Delivery Statuses</option>
              {DESIDIYA_DELIVERY_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Invoice Status</label>
            <select
              value={invoiceStatusFilter}
              onChange={(e) => setInvoiceStatusFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">All Invoice Statuses</option>
              {DESIDIYA_INVOICE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">DN Status</label>
            <select
              value={dnStatusFilter}
              onChange={(e) => setDnStatusFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">All DN Statuses</option>
              {DESIDIYA_DN_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-500">Assigned Person</label>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="ALL">All Assignees</option>
              {uniqueAssignees.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {dateFilterMode === 'Custom Range' && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Start:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">End:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => openFilteredMaster('ALL')}
          className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Invoices</span>
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.totalInvoices}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 group-hover:text-blue-600">
            Click to view all records in Master Table →
          </p>
        </button>

        <button
          onClick={() => setActiveNav('invoice-tracking')}
          className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Invoice Value</span>
            <Package className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatInr(metrics.totalInvoiceValue)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 group-hover:text-blue-600">
            Open Invoice Financial Tracker →
          </p>
        </button>

        <button
          onClick={() => openFilteredMaster('DELIVERED')}
          className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Delivered Shipments</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.deliveredCount}
          </div>
          <p className="mt-1 text-[11px] text-slate-500 group-hover:text-blue-600">
            Filter Master by Delivered →
          </p>
        </button>

        <button
          onClick={() => setActiveNav('reports-analytics')}
          className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-blue-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Delivery Rate</span>
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics.deliveryRate}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500 group-hover:text-blue-600">
            View Full Reports &amp; Analytics →
          </p>
        </button>
      </div>

      {/* 8 Operational Alert Cards (Working2.py Alert Grid) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase dark:text-slate-100">
            Actionable Operational Alerts &amp; SLA Monitors
          </h2>
          <span className="text-xs text-slate-500">
            Click any alert card to inspect matching records below
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {alertCards.map((alert) => {
            const isSelected = expandedAlertKey === alert.key;
            const borderTone =
              alert.tone === 'red'
                ? 'border-l-4 border-l-red-600'
                : alert.tone === 'amber'
                ? 'border-l-4 border-l-amber-500'
                : alert.tone === 'emerald'
                ? 'border-l-4 border-l-emerald-600'
                : alert.tone === 'purple'
                ? 'border-l-4 border-l-purple-600'
                : 'border-l-4 border-l-blue-600';

            return (
              <div
                key={alert.key}
                onClick={() => setExpandedAlertKey(isSelected ? null : alert.key)}
                className={`cursor-pointer rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${borderTone} ${
                  isSelected ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {alert.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{alert.subtitle}</p>
                  </div>
                  <span className="font-mono text-xl font-bold text-slate-900 dark:text-slate-100">
                    {alert.count}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] dark:border-slate-800">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFilteredMaster(alert.key);
                    }}
                    className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Filter in Master Table
                  </button>
                  {alert.targetNav && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveNav(alert.targetNav);
                      }}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Open Module →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drill-down table for selected alert card */}
        {selectedAlertObj && (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {selectedAlertObj.label} — {selectedAlertObj.records.length} Matching Record(s)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openFilteredMaster(selectedAlertObj.key)}
                  className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Edit in Master Table →
                </button>
                <button
                  onClick={() => setExpandedAlertKey(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Hide
                </button>
              </div>
            </div>
            {selectedAlertObj.records.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No records currently flagged under {selectedAlertObj.label}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Invoice No</th>
                      <th className="px-3 py-2">PO Number</th>
                      <th className="px-3 py-2">Location</th>
                      <th className="px-3 py-2">Dispatched</th>
                      <th className="px-3 py-2">Appointment</th>
                      <th className="px-3 py-2">PO Expiry</th>
                      <th className="px-3 py-2">Delivery Status</th>
                      <th className="px-3 py-2">GRN Status</th>
                      <th className="px-3 py-2">Assigned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {selectedAlertObj.records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {rec.invoice_no}
                        </td>
                        <td className="px-3 py-2 font-mono">{rec.po_number || '—'}</td>
                        <td className="px-3 py-2">{rec.location || '—'}</td>
                        <td className="px-3 py-2 font-mono">{rec.dispatched_date || '—'}</td>
                        <td className="px-3 py-2 font-mono">{rec.appointment_date || 'Missing'}</td>
                        <td className="px-3 py-2 font-mono">{rec.po_expiry_date || '—'}</td>
                        <td className="px-3 py-2 font-medium">{rec.delivery_status || 'Missing'}</td>
                        <td className="px-3 py-2">
                          {isGrnComplete(rec) ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              Done ({rec.grn_no || rec.grn_quantity})
                            </span>
                          ) : (
                            <span className="text-amber-700 dark:text-amber-400">Pending GRN</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{rec.assigned_person || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Quality Alerts + Document Completeness Alerts + Advanced DQ Checks */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 4 Data Quality Alerts */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase dark:text-slate-100">
              Data Quality Alerts
            </h3>
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Missing Delivery Status</span>
              <button
                onClick={() => openFilteredMaster('missingDeliveryStatus')}
                className="font-mono font-bold text-red-600 hover:underline"
              >
                {metrics.missingDeliveryStatus.length} records →
              </button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Missing GRN No (GRN Qty &gt; 0)</span>
              <button
                onClick={() => openFilteredMaster('missingGrnNo')}
                className="font-mono font-bold text-amber-600 hover:underline"
              >
                {metrics.missingGrnNo.length} records →
              </button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Missing DN Status (DN Qty &gt; 0)</span>
              <button
                onClick={() => openFilteredMaster('missingDnStatus')}
                className="font-mono font-bold text-red-600 hover:underline"
              >
                {metrics.missingDnStatus.length} records →
              </button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Missing Appointment Date</span>
              <button
                onClick={() => openFilteredMaster('missingAppointmentDates')}
                className="font-mono font-bold text-amber-600 hover:underline"
              >
                {metrics.missingAppointmentDates.length} records →
              </button>
            </div>
          </div>
        </div>

        {/* 3 Document Completeness Alerts */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase dark:text-slate-100">
              Document Completeness Alerts
            </h3>
            <FileCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Delivered without POD File</span>
              <button
                onClick={() => setActiveNav('pod-documents')}
                className="font-mono font-bold text-red-600 hover:underline"
              >
                {metrics.deliveredWithoutPod.length} records →
              </button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Missing Invoice Document</span>
              <button
                onClick={() => setActiveNav('file-upload-center')}
                className="font-mono font-bold text-amber-600 hover:underline"
              >
                {metrics.missingInvoiceDoc.length} records →
              </button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>DN Qty &gt; 0 without DN File</span>
              <button
                onClick={() => setActiveNav('dn-tracking')}
                className="font-mono font-bold text-amber-600 hover:underline"
              >
                {metrics.dnWithoutDoc.length} records →
              </button>
            </div>
          </div>
        </div>

        {/* 4 Advanced Data Quality Checks */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase dark:text-slate-100">
              Advanced Reconciliation Checks
            </h3>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>GRN Qty &gt; Invoice Qty</span>
              <button
                onClick={() => setActiveNav('exception-queue')}
                className="font-mono font-bold text-red-600 hover:underline"
              >
                {metrics.grnExceedsInvoiceQty.length} records →
              </button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Invoice Qty ≠ GRN + DN Qty</span>
              <button
                onClick={() => setActiveNav('exception-queue')}
                className="font-mono font-bold text-amber-600 hover:underline"
              >
                {metrics.quantityMismatch.length} records →
              </button>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Negative Qty / Amount</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {metrics.negativeValues.length} records
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
              <span>Missing PO Numbers</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {metrics.missingPoNumber.length} records
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-xs font-bold text-slate-900 uppercase dark:text-slate-100">
            Fulfilment Centre Volume &amp; Value (INR Lakhs)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="location" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="amountLakhs" name="Invoice Value (INR Lakhs)" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="invoices" name="Invoice Count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-xs font-bold text-slate-900 uppercase dark:text-slate-100">
            Delivery Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusChartData.map((_, idx) => {
                    const colors = ['#1d4ed8', '#059669', '#d97706', '#dc2626', '#7c3aed', '#64748b'];
                    return <Cell key={idx} fill={colors[idx % colors.length]} />;
                  })}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
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
// MODULE 2: MASTER TRACKING TABLE (Spreadsheet-style 29+ Column React Table)
// ============================================================================
const CORE_COLUMNS: (keyof DesiDiyaRecord)[] = [
  'invoice_no',
  'po_number',
  'vendor_name',
  'location',
  'dispatched_date',
  'appointment_date',
  'po_expiry_date',
  'invoice_quantity',
  'grn_quantity',
  'dn_quantity',
  'invoice_amount',
  'delivery_status',
  'invoice_status',
  'dn_status',
  'grn_no',
  'assigned_person',
];

export const DesiDiyaMasterTracking: React.FC = () => {
  const {
    desidiyaRecords,
    saveDesiDiyaRecord,
    deleteDesiDiyaRecord,
    globalDesiDiyaFilter,
    setGlobalDesiDiyaFilter,
    todayStr,
  } = useWorkTrack();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [invStatusFilter, setInvStatusFilter] = useState<string>('ALL');
  const [dnFilter, setDnFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [visibleColumns, setVisibleColumns] = useState<(keyof DesiDiyaRecord)[]>(
    DESIDIYA_COLUMN_ORDER
  );
  const [showColumnPicker, setShowColumnPicker] = useState<boolean>(false);
  const [sortCol, setSortCol] = useState<keyof DesiDiyaRecord>('invoice_no');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Inline editing state
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineDraft, setInlineDraft] = useState<DesiDiyaRecord | null>(null);

  // Full Create/Edit Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingRecordId, setEditingRecordId] = useState<string | undefined>(undefined);
  const [formState, setFormState] =
    useState<Omit<DesiDiyaRecord, 'id' | 'ownerId'>>(EMPTY_DESIDIYA_FORM);

  // Delete confirmation modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const metrics = useMemo(
    () => calculateDesiDiyaDashboardMetrics(desidiyaRecords, todayStr),
    [desidiyaRecords, todayStr]
  );

  const uniqueLocations = useMemo(
    () => Array.from(new Set(desidiyaRecords.map((r) => r.location).filter(Boolean))).sort(),
    [desidiyaRecords]
  );

  // Apply alert preset filter if navigated from Operations Dashboard
  const presetFilteredRecords = useMemo(() => {
    if (!globalDesiDiyaFilter || globalDesiDiyaFilter === 'ALL') return desidiyaRecords;
    if (globalDesiDiyaFilter === 'DELIVERED') {
      return desidiyaRecords.filter((r) => r.delivery_status.toLowerCase() === 'delivered');
    }
    const metricBucket = (metrics as any)[globalDesiDiyaFilter];
    if (Array.isArray(metricBucket)) {
      return metricBucket as DesiDiyaRecord[];
    }
    return desidiyaRecords;
  }, [desidiyaRecords, globalDesiDiyaFilter, metrics]);

  const filteredAndSorted = useMemo(() => {
    const filtered = filterDesiDiyaRecords(presetFilteredRecords, {
      searchQuery,
      deliveryStatus: statusFilter !== 'ALL' ? [statusFilter] : undefined,
      invoiceStatus: invStatusFilter !== 'ALL' ? [invStatusFilter] : undefined,
      dnStatus: dnFilter !== 'ALL' ? [dnFilter] : undefined,
      location: locationFilter !== 'ALL' ? [locationFilter] : undefined,
    });

    return [...filtered].sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortAsc ? va - vb : vb - va;
      }
      return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [
    presetFilteredRecords,
    searchQuery,
    statusFilter,
    invStatusFilter,
    dnFilter,
    locationFilter,
    sortCol,
    sortAsc,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const paginatedRows = useMemo(
    () => filteredAndSorted.slice((page - 1) * pageSize, page * pageSize),
    [filteredAndSorted, page]
  );

  const handleSort = (col: keyof DesiDiyaRecord) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const openCreateModal = () => {
    setEditingRecordId(undefined);
    setFormState({
      ...EMPTY_DESIDIYA_FORM,
      dispatched_date: todayStr,
    });
    setModalOpen(true);
  };

  const openEditModal = (rec: DesiDiyaRecord) => {
    setEditingRecordId(rec.id);
    const { id: _id, ownerId: _ow, ...rest } = rec;
    setFormState(rest);
    setModalOpen(true);
  };

  const handleModalSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDesiDiyaRecord(formState, editingRecordId);
    setModalOpen(false);
  };

  const startInlineEdit = (rec: DesiDiyaRecord) => {
    setInlineEditId(rec.id);
    setInlineDraft({ ...rec });
  };

  const saveInlineEdit = async () => {
    if (!inlineDraft || !inlineEditId) return;
    const { id: _id, ownerId: _ow, ...rest } = inlineDraft;
    await saveDesiDiyaRecord(rest, inlineEditId, 'Inline Table Update');
    setInlineEditId(null);
    setInlineDraft(null);
  };

  const exportMasterExcel = () => {
    const rows = filteredAndSorted.map((r) => {
      const obj: Record<string, any> = {};
      DESIDIYA_COLUMN_ORDER.forEach((col) => {
        obj[DESIDIYA_COLUMN_DISPLAY_NAMES[col] || col] = r[col];
      });
      return obj;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master_Tracking');
    XLSX.writeFile(wb, `DesiDiya_Master_Tracking_${todayStr}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Master Tracking Spreadsheet ({filteredAndSorted.length} records)
          </h1>
          <p className="text-xs text-slate-500">
            Full 29-column DesiDiya shipment, invoice, PO, appointment, GRN, DN, CN, and document reference table.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Record
          </button>

          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Columns className="h-3.5 w-3.5" />
              Columns ({visibleColumns.length}/{DESIDIYA_COLUMN_ORDER.length})
            </button>

            {showColumnPicker && (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-xs font-semibold">Select Visible Columns</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setVisibleColumns(DESIDIYA_COLUMN_ORDER)}
                      className="text-[11px] font-medium text-blue-600 hover:underline"
                    >
                      All (29)
                    </button>
                    <button
                      onClick={() => setVisibleColumns(CORE_COLUMNS)}
                      className="text-[11px] font-medium text-slate-600 hover:underline dark:text-slate-400"
                    >
                      Compact (16)
                    </button>
                  </div>
                </div>
                <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
                  {DESIDIYA_COLUMN_ORDER.map((col) => {
                    const checked = visibleColumns.includes(col);
                    return (
                      <label
                        key={col}
                        className="flex cursor-pointer items-center gap-2 rounded-xs px-1.5 py-1 text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setVisibleColumns(visibleColumns.filter((c) => c !== col));
                            } else {
                              setVisibleColumns([...visibleColumns, col]);
                            }
                          }}
                          className="rounded-xs border-slate-300"
                        />
                        <span>{DESIDIYA_COLUMN_DISPLAY_NAMES[col] || col}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={exportMasterExcel}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative min-w-[220px] flex-1">
          <Search className=" absolute top-2 left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search Invoice No, PO Number, Tracking ID, GRN No, Location, Remarks..."
            className="w-full rounded-md border border-slate-300 py-1.5 pr-3 pl-8 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        {globalDesiDiyaFilter !== 'ALL' && (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <span>Alert Filter: {globalDesiDiyaFilter}</span>
            <button onClick={() => setGlobalDesiDiyaFilter('ALL')} className="hover:text-blue-900">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="ALL">All Delivery Statuses</option>
          {DESIDIYA_DELIVERY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={invStatusFilter}
          onChange={(e) => {
            setInvStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="ALL">All Invoice Statuses</option>
          {DESIDIYA_INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={locationFilter}
          onChange={(e) => {
            setLocationFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="ALL">All Locations</option>
          {uniqueLocations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600 uppercase dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
                  Actions
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="cursor-pointer whitespace-nowrap px-3 py-2.5 select-none hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-1">
                      <span>{DESIDIYA_COLUMN_DISPLAY_NAMES[col] || col}</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                ))}
                <th className="whitespace-nowrap px-3 py-2.5">Linked Documents (6)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + 2}
                    className="py-10 text-center text-xs text-slate-500"
                  >
                    No tracking records match the current filters.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((rec) => {
                  const isEditing = inlineEditId === rec.id && inlineDraft;
                  const docRefs: Array<{ cat: DocumentCategory; path: string }> = [
                    { cat: 'Invoice', path: rec.invoice_file_path },
                    { cat: 'PO', path: rec.po_file_path },
                    { cat: 'POD', path: rec.pod_file_path },
                    { cat: 'GRN', path: rec.grn_file_path },
                    { cat: 'DN', path: rec.dn_file_path },
                    { cat: 'CN', path: rec.cn_file_path },
                  ];

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/90 dark:hover:bg-slate-800/40"
                    >
                      {/* Sticky Actions */}
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-2 dark:bg-slate-900">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={saveInlineEdit}
                              className="rounded-xs bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setInlineEditId(null);
                                setInlineDraft(null);
                              }}
                              className="rounded-xs bg-slate-200 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => startInlineEdit(rec)}
                              title="Inline Quick Edit"
                              className="rounded-xs p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(rec)}
                              title="Open Full 29-Field Editor"
                              className="rounded-xs px-1.5 py-0.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                            >
                              Details
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(rec.id)}
                              title="Delete Record"
                              className="rounded-xs p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Dynamic 29 Columns */}
                      {visibleColumns.map((col) => {
                        const val = rec[col];
                        if (isEditing && inlineDraft) {
                          const isNumeric = typeof val === 'number';
                          return (
                            <td key={col} className="px-2 py-1.5">
                              <input
                                type={isNumeric ? 'number' : 'text'}
                                value={String(inlineDraft[col] ?? '')}
                                onChange={(e) =>
                                  setInlineDraft({
                                    ...inlineDraft,
                                    [col]: isNumeric
                                      ? Number(e.target.value) || 0
                                      : e.target.value,
                                  })
                                }
                                className="w-28 rounded-xs border border-blue-400 px-1.5 py-1 text-xs dark:bg-slate-800"
                              />
                            </td>
                          );
                        }

                        if (col === 'invoice_no') {
                          return (
                            <td
                              key={col}
                              className="whitespace-nowrap px-3 py-2 font-mono font-semibold text-blue-600 dark:text-blue-400"
                            >
                              {val || '—'}
                            </td>
                          );
                        }
                        if (
                          col === 'invoice_amount' ||
                          col === 'grn_amount' ||
                          col === 'dn_amount'
                        ) {
                          return (
                            <td key={col} className="whitespace-nowrap px-3 py-2 font-mono">
                              {formatInr(Number(val) || 0)}
                            </td>
                          );
                        }
                        if (col === 'delivery_status') {
                          const st = String(val || '');
                          const color =
                            st === 'Delivered'
                              ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                              : st === 'In Transit' || st === 'Dispatched'
                              ? 'text-blue-700 dark:text-blue-400 font-medium'
                              : !st
                              ? 'text-red-600 font-semibold'
                              : 'text-amber-700 dark:text-amber-400';
                          return (
                            <td key={col} className={`whitespace-nowrap px-3 py-2 ${color}`}>
                              {st || 'Missing'}
                            </td>
                          );
                        }

                        return (
                          <td
                            key={col}
                            className="max-w-[220px] truncate whitespace-nowrap px-3 py-2 text-slate-700 dark:text-slate-300"
                            title={String(val ?? '')}
                          >
                            {val !== '' && val !== null && val !== undefined ? String(val) : '—'}
                          </td>
                        );
                      })}

                      {/* Document Badges */}
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-1">
                          {docRefs.map((d) =>
                            d.path ? (
                              <button
                                key={d.cat}
                                type="button"
                                onClick={() =>
                                  setPreviewDoc({
                                    url: d.path,
                                    title: `${d.cat} Document — ${rec.invoice_no}`,
                                  })
                                }
                                className="inline-flex items-center gap-0.5 rounded-xs border border-emerald-300 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                title={`Preview or Download ${d.cat}`}
                              >
                                <Eye className="h-2.5 w-2.5" />
                                {d.cat}
                              </button>
                            ) : (
                              <span
                                key={d.cat}
                                className="rounded-xs border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 dark:border-slate-800 dark:bg-slate-800/40"
                                title={`${d.cat} not uploaded`}
                              >
                                {d.cat}
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-slate-500">
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length}{' '}
            records
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
            >
              Prev
            </button>
            <span className="font-mono">
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Full 29-Column Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingRecordId
                  ? `Edit Master Record — ${formState.invoice_no}`
                  : 'Create New Master Tracking Record'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleModalSave} className="flex-1 space-y-5 overflow-y-auto p-5 text-xs">
              {/* Section 1: Core Identifiers */}
              <div>
                <h4 className="mb-2.5 font-mono text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                  1. Core Identifiers &amp; Fulfilment Centre
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block font-medium">Invoice No *</label>
                    <input
                      required
                      type="text"
                      value={formState.invoice_no}
                      onChange={(e) => setFormState({ ...formState, invoice_no: e.target.value })}
                      placeholder="DD/25-26/4410 or PO-PENDING-..."
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">PO Number</label>
                    <input
                      type="text"
                      value={formState.po_number}
                      onChange={(e) => setFormState({ ...formState, po_number: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Vendor Name</label>
                    <input
                      type="text"
                      value={formState.vendor_name}
                      onChange={(e) => setFormState({ ...formState, vendor_name: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Location / FC</label>
                    <input
                      type="text"
                      value={formState.location}
                      onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                      placeholder="BLR7 - Bengaluru FC"
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Dates & Appointments */}
              <div>
                <h4 className="mb-2.5 font-mono text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                  2. Key Dates &amp; Appointment History (Never Auto-Extended)
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block font-medium">Dispatched Date</label>
                    <input
                      type="date"
                      value={formState.dispatched_date}
                      onChange={(e) =>
                        setFormState({ ...formState, dispatched_date: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Appointment Date</label>
                    <input
                      type="date"
                      value={formState.appointment_date}
                      onChange={(e) =>
                        setFormState({ ...formState, appointment_date: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">PO Expiry Date</label>
                    <input
                      type="date"
                      value={formState.po_expiry_date}
                      onChange={(e) =>
                        setFormState({ ...formState, po_expiry_date: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Assigned Person</label>
                    <input
                      type="text"
                      value={formState.assigned_person}
                      onChange={(e) =>
                        setFormState({ ...formState, assigned_person: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Quantities & Amounts */}
              <div>
                <h4 className="mb-2.5 font-mono text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                  3. Quantities, Boxes &amp; Financial Amounts
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block font-medium">Invoice Quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.invoice_quantity}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          invoice_quantity: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">GRN Quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.grn_quantity}
                      onChange={(e) =>
                        setFormState({ ...formState, grn_quantity: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">DN Quantity</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.dn_quantity}
                      onChange={(e) =>
                        setFormState({ ...formState, dn_quantity: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">No of Boxes</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.no_of_box}
                      onChange={(e) =>
                        setFormState({ ...formState, no_of_box: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Invoice Amount (INR)</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.invoice_amount}
                      onChange={(e) =>
                        setFormState({ ...formState, invoice_amount: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">GRN Amount (INR)</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.grn_amount}
                      onChange={(e) =>
                        setFormState({ ...formState, grn_amount: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">DN Amount (INR)</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.dn_amount}
                      onChange={(e) =>
                        setFormState({ ...formState, dn_amount: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">GRN Number</label>
                    <input
                      type="text"
                      value={formState.grn_no}
                      onChange={(e) => setFormState({ ...formState, grn_no: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Logistics & Statuses */}
              <div>
                <h4 className="mb-2.5 font-mono text-[11px] font-bold tracking-wider text-blue-600 uppercase">
                  4. Courier Tracking &amp; Status Workflow
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="mb-1 block font-medium">Transport Mode / Carrier</label>
                    <input
                      type="text"
                      value={formState.transport_mode}
                      onChange={(e) =>
                        setFormState({ ...formState, transport_mode: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Tracking / LR ID</label>
                    <input
                      type="text"
                      value={formState.tracking_id}
                      onChange={(e) => setFormState({ ...formState, tracking_id: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Shipment Track ID</label>
                    <input
                      type="text"
                      value={formState.shipment_track_id}
                      onChange={(e) =>
                        setFormState({ ...formState, shipment_track_id: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">PO Type</label>
                    <input
                      type="text"
                      value={formState.po_type}
                      onChange={(e) => setFormState({ ...formState, po_type: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Delivery Status</label>
                    <select
                      value={formState.delivery_status}
                      onChange={(e) =>
                        setFormState({ ...formState, delivery_status: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="">-- Select --</option>
                      {DESIDIYA_DELIVERY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">Invoice Status</label>
                    <select
                      value={formState.invoice_status}
                      onChange={(e) =>
                        setFormState({ ...formState, invoice_status: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {DESIDIYA_INVOICE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">DN Status</label>
                    <select
                      value={formState.dn_status}
                      onChange={(e) => setFormState({ ...formState, dn_status: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="">-- Unset --</option>
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
                      value={formState.dn_resolution}
                      onChange={(e) =>
                        setFormState({ ...formState, dn_resolution: e.target.value })
                      }
                      className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                    >
                      {DESIDIYA_DN_RESOLUTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s || '-- None --'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 5: Remarks */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block font-medium">Delivery Remark</label>
                  <textarea
                    rows={2}
                    value={formState.delivery_remark}
                    onChange={(e) =>
                      setFormState({ ...formState, delivery_remark: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">Invoice Remark</label>
                  <textarea
                    rows={2}
                    value={formState.invoice_remark}
                    onChange={(e) =>
                      setFormState({ ...formState, invoice_remark: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">General Remark</label>
                  <textarea
                    rows={2}
                    value={formState.general_remark}
                    onChange={(e) =>
                      setFormState({ ...formState, general_remark: e.target.value })
                    }
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-md border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {editingRecordId ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Confirm Record Deletion
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete this Master Tracking record? This action
              is logged in Activity History.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteDesiDiyaRecord(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
              >
                Delete Permanently
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
