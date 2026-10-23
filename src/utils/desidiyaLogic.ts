import { DesiDiyaRecord, DocumentCategory } from '../types/worktrack';

/**
 * Canonical column display names from Working2.py (lines 21-52)
 */
export const DESIDIYA_COLUMN_DISPLAY_NAMES: Record<string, string> = {
  invoice_no: 'Invoice No.',
  po_number: 'PO Number',
  vendor_name: 'Vendor',
  location: 'Location',
  dispatched_date: 'Dispatched Date',
  appointment_date: 'Appointment Date',
  po_expiry_date: 'PO Expiry Date',
  invoice_quantity: 'Invoice Qty',
  grn_quantity: 'GRN Qty',
  dn_quantity: 'DN Qty',
  no_of_box: 'No. of Boxes',
  invoice_amount: 'Invoice Amount (₹)',
  grn_amount: 'GRN Amount (₹)',
  dn_amount: 'DN Amount (₹)',
  po_type: 'PO Type',
  tracking_id: 'Tracking ID',
  transport_mode: 'Transport Mode',
  appointment_count: 'Appt. Count',
  appointment_history: 'Appt. History',
  delivery_status: 'Delivery Status',
  invoice_status: 'Invoice Status',
  dn_status: 'DN Status',
  dn_resolution: 'DN Resolution',
  dn_closure_date: 'DN Closure Date',
  delivery_remark: 'Delivery Remark',
  invoice_remark: 'Invoice Remark',
  general_remark: 'General Remark',
  assigned_person: 'Assigned To',
  grn_no: 'GRN No.',
  shipment_track_id: 'Shipment Track ID',
};

/**
 * Canonical 29-column order from Working2.py (lines 55-66)
 */
export const DESIDIYA_COLUMN_ORDER: (keyof DesiDiyaRecord)[] = [
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
  'no_of_box',
  'invoice_amount',
  'grn_amount',
  'dn_amount',
  'po_type',
  'tracking_id',
  'transport_mode',
  'appointment_count',
  'appointment_history',
  'delivery_status',
  'invoice_status',
  'dn_status',
  'dn_resolution',
  'dn_closure_date',
  'delivery_remark',
  'invoice_remark',
  'general_remark',
  'assigned_person',
  'grn_no',
];

export const DOCUMENT_FIELD_MAP: Record<DocumentCategory, keyof DesiDiyaRecord> = {
  Invoice: 'invoice_file_path',
  PO: 'po_file_path',
  POD: 'pod_file_path',
  GRN: 'grn_file_path',
  DN: 'dn_file_path',
  CN: 'cn_file_path',
};

/**
 * Returns YYYY-MM-DD in India Standard Time (Asia/Kolkata)
 */
export function getIstTodayString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function isBlankOrNullStr(val: unknown): boolean {
  if (val === null || val === undefined) return true;
  const s = String(val).trim();
  return s === '' || s === 'NaT' || s === 'nan' || s === 'None' || s === 'null';
}

export function addDaysYmd(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(d.getTime())) return dateStr;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDaysYmd(laterDateStr: string, earlierDateStr: string): number {
  const d1 = new Date(`${laterDateStr}T00:00:00Z`);
  const d2 = new Date(`${earlierDateStr}T00:00:00Z`);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

export function diffDaysFromIso(targetDateStr: string, todayStr: string): number | null {
  if (isBlankOrNullStr(targetDateStr)) return null;
  const d1 = new Date(`${targetDateStr.trim().slice(0, 10)}T00:00:00Z`);
  const d2 = new Date(`${todayStr.trim().slice(0, 10)}T00:00:00Z`);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Checks if GRN is completed according to Working2.py (lines 1000-1007):
 * OR condition: grn_quantity > 0 OR grn_no is filled OR grn_amount > 0
 */
export function isGrnComplete(r: DesiDiyaRecord): boolean {
  const qty = Number(r.grn_quantity) || 0;
  const amt = Number(r.grn_amount) || 0;
  const grnNoFilled = !isBlankOrNullStr(r.grn_no);
  return qty > 0 || grnNoFilled || amt > 0;
}

export interface DesiDiyaFilterCriteria {
  searchInvoice?: string;
  searchPoOrTracking?: string;
  vendor?: string;
  transportMode?: string;
  poType?: string;
  deliveryStatus?: string;
  dispatchedFrom?: string;
  dispatchedTo?: string;
  appointmentDate?: string;
}

/**
 * Applies Working2.py filtering logic (lines 761-777)
 */
export function filterDesiDiyaRecords(
  records: DesiDiyaRecord[],
  criteria: DesiDiyaFilterCriteria
): DesiDiyaRecord[] {
  return records.filter((r) => {
    if (criteria.searchInvoice && criteria.searchInvoice.trim()) {
      const q = criteria.searchInvoice.trim().toLowerCase();
      if (!String(r.invoice_no || '').toLowerCase().includes(q)) return false;
    }
    if (criteria.searchPoOrTracking && criteria.searchPoOrTracking.trim()) {
      const q = criteria.searchPoOrTracking.trim().toLowerCase();
      const hay = `${r.po_number || ''} ${r.tracking_id || ''} ${r.shipment_track_id || ''} ${r.vendor_name || ''} ${r.location || ''} ${r.grn_no || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (criteria.vendor && criteria.vendor !== 'All') {
      if (r.vendor_name !== criteria.vendor) return false;
    }
    if (criteria.transportMode && criteria.transportMode !== 'All') {
      if (r.transport_mode !== criteria.transportMode) return false;
    }
    if (criteria.poType && criteria.poType !== 'All') {
      if (r.po_type !== criteria.poType) return false;
    }
    if (criteria.deliveryStatus && criteria.deliveryStatus !== 'All') {
      if (r.delivery_status !== criteria.deliveryStatus) return false;
    }
    if (criteria.dispatchedFrom && !isBlankOrNullStr(r.dispatched_date)) {
      if (r.dispatched_date < criteria.dispatchedFrom) return false;
    } else if (criteria.dispatchedFrom && isBlankOrNullStr(r.dispatched_date)) {
      return false;
    }
    if (criteria.dispatchedTo && !isBlankOrNullStr(r.dispatched_date)) {
      if (r.dispatched_date > criteria.dispatchedTo) return false;
    } else if (criteria.dispatchedTo && isBlankOrNullStr(r.dispatched_date)) {
      return false;
    }
    if (criteria.appointmentDate) {
      if (r.appointment_date !== criteria.appointmentDate) return false;
    }
    return true;
  });
}

export interface DesiDiyaDashboardMetrics {
  totalInvoices: number;
  totalInvoiceValue: number;
  deliveredInvoices: number;
  deliveryRatePct: number;
  overdueAppointments: DesiDiyaRecord[];
  missingAppointmentDates: DesiDiyaRecord[];
  todaysAppointments: DesiDiyaRecord[];
  upcomingAppointments: DesiDiyaRecord[];
  posExpiringIn3Days: DesiDiyaRecord[];
  expiredPOs: DesiDiyaRecord[];
  highAgingShipments: DesiDiyaRecord[];
  pendingGrnRecords: DesiDiyaRecord[];
  pendingGrnValue: number;
  grnDoneCount: number;
  grnPendingCount: number;
  // Data Quality Alerts (Row 1: A-D)
  missingDeliveryStatus: DesiDiyaRecord[];
  missingGrnNo: DesiDiyaRecord[];
  missingDnStatus: DesiDiyaRecord[];
  missingTrackingId: DesiDiyaRecord[];
  // Document Completeness Alerts (Row 2: B1-B3)
  missingInvoiceDoc: DesiDiyaRecord[];
  missingDnDoc: DesiDiyaRecord[];
  missingPodDoc: DesiDiyaRecord[];
  // Advanced DQ Checks (Row 3: C1-C4)
  grnExceedsInvoiceQty: DesiDiyaRecord[];
  missingVendorName: DesiDiyaRecord[];
  unassignedActiveShipments: DesiDiyaRecord[];
  zeroOrMissingInvoiceAmount: DesiDiyaRecord[];
  // KPI summary count (Working2.py lines 809-821: missing delivery_status + undelivered missing tracking_id)
  dqIssuesKpiCount: number;
  // Exception Queue (Working2.py lines 2422 & 2475)
  openQuantityExceptions: DesiDiyaRecord[];
  closedQuantityExceptions: DesiDiyaRecord[];
  topPendingAtRiskInvoices: DesiDiyaRecord[];
}

/**
 * Exact implementation of all Working2.py KPI, Alert, Appointment, GRN, Data Quality, and Exception calculations
 */
export function calculateDesiDiyaDashboardMetrics(
  records: DesiDiyaRecord[],
  todayStr: string
): DesiDiyaDashboardMetrics {
  const totalInvoices = records.length;
  const totalInvoiceValue = records.reduce(
    (sum, r) => sum + (Number(r.invoice_amount) || 0),
    0
  );
  const deliveredInvoices = records.filter(
    (r) => String(r.delivery_status || '').trim() === 'Delivered'
  ).length;
  const deliveryRatePct =
    totalInvoices > 0 ? Math.round((deliveredInvoices / totalInvoices) * 1000) / 10 : 0;

  const tomorrowStr = addDaysYmd(todayStr, 1);
  const threeDaysLaterStr = addDaysYmd(todayStr, 3);
  const twentyDaysAgoStr = addDaysYmd(todayStr, -20);

  const rtoAndCancelledExcl = ['Delivered', 'RTO', 'RTO Delivered', 'Cancelled'];
  const highAgingExcl = ['Delivered', 'RTO', 'RTO Delivered'];
  const docAndAmtExcl = ['Cancelled', 'RTO', 'RTO Delivered'];
  const activeShipmentStatuses = ['Pending', 'In Transit', 'Delayed'];

  // Overdue Appointments: appointment_date < today && delivery_status != "Delivered"
  const overdueAppointments = records.filter(
    (r) =>
      !isBlankOrNullStr(r.appointment_date) &&
      r.appointment_date < todayStr &&
      String(r.delivery_status || '').trim() !== 'Delivered'
  );

  // Missing Appointment Dates: delivery_status not in ["Delivered", "RTO", "RTO Delivered", "Cancelled"] && appointment_date is blank
  const missingAppointmentDates = records.filter(
    (r) =>
      !rtoAndCancelledExcl.includes(String(r.delivery_status || '').trim()) &&
      isBlankOrNullStr(r.appointment_date)
  );

  // Today's Appointments: appointment_date == today && delivery_status != "Delivered"
  const todaysAppointments = records.filter(
    (r) =>
      !isBlankOrNullStr(r.appointment_date) &&
      r.appointment_date === todayStr &&
      String(r.delivery_status || '').trim() !== 'Delivered'
  );

  // Upcoming Appointments (Next 1-3 Days): tomorrow <= appointment_date <= today+3 && delivery_status != "Delivered"
  const upcomingAppointments = records.filter(
    (r) =>
      !isBlankOrNullStr(r.appointment_date) &&
      r.appointment_date >= tomorrowStr &&
      r.appointment_date <= threeDaysLaterStr &&
      String(r.delivery_status || '').trim() !== 'Delivered'
  );

  // POs Expiring in 3 Days: today <= po_expiry_date <= today+3 && delivery_status != "Delivered"
  const posExpiringIn3Days = records.filter(
    (r) =>
      !isBlankOrNullStr(r.po_expiry_date) &&
      r.po_expiry_date >= todayStr &&
      r.po_expiry_date <= threeDaysLaterStr &&
      String(r.delivery_status || '').trim() !== 'Delivered'
  );

  // Expired POs: po_expiry_date < today && undelivered
  const expiredPOs = records.filter(
    (r) =>
      !isBlankOrNullStr(r.po_expiry_date) &&
      r.po_expiry_date < todayStr &&
      !rtoAndCancelledExcl.includes(String(r.delivery_status || '').trim())
  );

  // High-Aging Shipments (>20 days): dispatched_date < today-20 && delivery_status not in ["Delivered", "RTO", "RTO Delivered"]
  const highAgingShipments = records.filter(
    (r) =>
      !isBlankOrNullStr(r.dispatched_date) &&
      r.dispatched_date < twentyDaysAgoStr &&
      !highAgingExcl.includes(String(r.delivery_status || '').trim())
  );

  // Pending GRN & GRN Completion Status
  const deliveredList = records.filter(
    (r) => String(r.delivery_status || '').trim() === 'Delivered'
  );
  const pendingGrnRecords = deliveredList.filter((r) => !isGrnComplete(r));
  const pendingGrnValue = pendingGrnRecords.reduce(
    (sum, r) => sum + (Number(r.invoice_amount) || 0),
    0
  );
  const grnDoneCount = deliveredList.length - pendingGrnRecords.length;
  const grnPendingCount = pendingGrnRecords.length;

  // (A) Missing Delivery Status
  const missingDeliveryStatus = records.filter((r) => isBlankOrNullStr(r.delivery_status));

  // (B) Missing GRN No.: (delivery_status == "Delivered" OR grn_quantity > 0) AND grn_no is blank
  const missingGrnNo = records.filter((r) => {
    const isDel = String(r.delivery_status || '').trim() === 'Delivered';
    const hasGrnQty = (Number(r.grn_quantity) || 0) > 0;
    return (isDel || hasGrnQty) && isBlankOrNullStr(r.grn_no);
  });

  // (C) Missing DN Status: dn_quantity > 0 AND dn_status is blank
  const missingDnStatus = records.filter(
    (r) => (Number(r.dn_quantity) || 0) > 0 && isBlankOrNullStr(r.dn_status)
  );

  // (D) Missing Tracking ID: delivery_status != "Delivered" AND tracking_id is blank
  const missingTrackingId = records.filter(
    (r) =>
      String(r.delivery_status || '').trim() !== 'Delivered' &&
      isBlankOrNullStr(r.tracking_id)
  );

  // KPI DQ count from Working2.py lines 809-821
  const dqIssuesKpiCount = missingDeliveryStatus.length + missingTrackingId.length;

  // (B1) Missing Invoice Document
  const missingInvoiceDoc = records.filter(
    (r) =>
      !docAndAmtExcl.includes(String(r.delivery_status || '').trim()) &&
      isBlankOrNullStr(r.invoice_file_path)
  );

  // (B2) Missing DN Document (when DN Qty > 0)
  const missingDnDoc = records.filter(
    (r) => (Number(r.dn_quantity) || 0) > 0 && isBlankOrNullStr(r.dn_file_path)
  );

  // (B3) Missing POD Document (for Delivered records)
  const missingPodDoc = records.filter(
    (r) =>
      String(r.delivery_status || '').trim() === 'Delivered' &&
      isBlankOrNullStr(r.pod_file_path)
  );

  // (C1) GRN Qty > Invoice Qty (when invoice_quantity > 0)
  const grnExceedsInvoiceQty = records.filter((r) => {
    const iq = Number(r.invoice_quantity) || 0;
    const gq = Number(r.grn_quantity) || 0;
    return gq > iq && iq > 0;
  });

  // (C2) Missing Vendor Name
  const missingVendorName = records.filter((r) => isBlankOrNullStr(r.vendor_name));

  // (C3) Unassigned Active Shipments
  const unassignedActiveShipments = records.filter(
    (r) =>
      activeShipmentStatuses.includes(String(r.delivery_status || '').trim()) &&
      isBlankOrNullStr(r.assigned_person)
  );

  // (C4) Zero / Missing Invoice Amount
  const zeroOrMissingInvoiceAmount = records.filter((r) => {
    const amt = Number(r.invoice_amount) || 0;
    return (
      !docAndAmtExcl.includes(String(r.delivery_status || '').trim()) && amt <= 0
    );
  });

  // Exception Queue (Working2.py line 2422): (invoice_quantity != grn_quantity) & (dn_status != "Closed")
  const openQuantityExceptions = records.filter((r) => {
    const iq = Number(r.invoice_quantity) || 0;
    const gq = Number(r.grn_quantity) || 0;
    return iq !== gq && String(r.dn_status || '').trim() !== 'Closed';
  });

  const closedQuantityExceptions = records.filter((r) => {
    const iq = Number(r.invoice_quantity) || 0;
    const gq = Number(r.grn_quantity) || 0;
    return iq !== gq && String(r.dn_status || '').trim() === 'Closed';
  });

  const topPendingAtRiskInvoices = records.filter((r) =>
    ['Pending', 'Delayed', 'In Transit'].includes(String(r.delivery_status || '').trim())
  );

  const grnComplete = deliveredList.filter((r) => isGrnComplete(r));
  const quantityMismatch = records.filter((r) => {
    const iq = Number(r.invoice_quantity) || 0;
    const gq = Number(r.grn_quantity) || 0;
    const dq = Number(r.dn_quantity) || 0;
    return iq > 0 && gq + dq > 0 && iq !== gq + dq;
  });
  const negativeValues = records.filter(
    (r) =>
      Number(r.invoice_quantity) < 0 ||
      Number(r.grn_quantity) < 0 ||
      Number(r.dn_quantity) < 0 ||
      Number(r.invoice_amount) < 0
  );
  const missingPoNumber = records.filter((r) => isBlankOrNullStr(r.po_number));

  return {
    totalInvoices,
    totalInvoiceValue,
    deliveredInvoices,
    deliveredCount: deliveredInvoices,
    deliveryRatePct,
    deliveryRate: deliveryRatePct,
    overdueAppointments,
    missingAppointmentDates,
    todaysAppointments,
    upcomingAppointments,
    posExpiringIn3Days,
    expiringPos3Days: posExpiringIn3Days,
    expiredPOs,
    highAgingShipments,
    pendingGrnRecords,
    pendingGrn: pendingGrnRecords,
    grnComplete,
    pendingGrnValue,
    grnDoneCount,
    grnPendingCount,
    missingDeliveryStatus,
    missingGrnNo,
    missingDnStatus,
    missingTrackingId,
    missingInvoiceDoc,
    missingDnDoc,
    dnWithoutDoc: missingDnDoc,
    missingPodDoc,
    deliveredWithoutPod: missingPodDoc,
    grnExceedsInvoiceQty,
    quantityMismatch,
    negativeValues,
    missingPoNumber,
    missingVendorName,
    unassignedActiveShipments,
    zeroOrMissingInvoiceAmount,
    dqIssuesKpiCount,
    openQuantityExceptions,
    exceptionQueue: openQuantityExceptions,
    closedQuantityExceptions,
    topPendingAtRiskInvoices,
  };
}

/**
 * Appointment reschedule computation matching Working2.py (lines 2277-2290):
 * - Preserves original_appointment_date
 * - If previous appointment_date existed and differs from newDate, increments appointment_count and prepends "Missed: <oldDate>"
 * - Never invents a date
 */
export function computeAppointmentReschedule(
  record: Pick<
    DesiDiyaRecord,
    'appointment_date' | 'original_appointment_date' | 'appointment_count' | 'appointment_history'
  >,
  newAppointmentDate: string,
  reason = ''
): {
  appointment_date: string;
  original_appointment_date: string;
  appointment_count: number;
  appointment_history: string;
} {
  const cleanNew = newAppointmentDate.trim();
  const prevDate = (record.appointment_date || '').trim();
  const origDate = (record.original_appointment_date || prevDate || cleanNew).trim();
  const curCount = Math.max(1, Number(record.appointment_count) || 1);
  const curHist = (record.appointment_history || '').trim();

  if (prevDate && cleanNew && prevDate !== cleanNew) {
    const newCount = curCount + 1;
    const reasonSuffix = reason.trim() ? ` (${reason.trim()})` : '';
    const entry = `Missed: ${prevDate} -> Revised: ${cleanNew}${reasonSuffix}`;
    const newHistory = curHist ? `${entry} | ${curHist}` : entry;
    return {
      appointment_date: cleanNew,
      original_appointment_date: origDate,
      appointment_count: newCount,
      appointment_history: newHistory,
    };
  }

  return {
    appointment_date: cleanNew,
    original_appointment_date: origDate,
    appointment_count: curCount,
    appointment_history: curHist || (cleanNew ? `${cleanNew} First appointment` : ''),
  };
}

/**
 * PO Expiry extension computation:
 * - Preserves original_po_expiry_date
 * - Appends extension entry with reason
 * - Never automatically extends without explicit user input
 */
export function computePoExpiryExtension(
  record: Pick<
    DesiDiyaRecord,
    'po_expiry_date' | 'original_po_expiry_date' | 'po_expiry_history'
  >,
  newExpiryDate: string,
  reason: string
): {
  po_expiry_date: string;
  original_po_expiry_date: string;
  po_expiry_history: string;
} {
  const cleanNew = newExpiryDate.trim();
  const prevExpiry = (record.po_expiry_date || '').trim();
  const origExpiry = (record.original_po_expiry_date || prevExpiry || cleanNew).trim();
  const curHist = (record.po_expiry_history || '').trim();

  if (prevExpiry && cleanNew && prevExpiry !== cleanNew) {
    const entry = `Extended: ${prevExpiry} -> ${cleanNew} (${reason.trim() || 'Buyer extension'})`;
    return {
      po_expiry_date: cleanNew,
      original_po_expiry_date: origExpiry,
      po_expiry_history: curHist ? `${entry} | ${curHist}` : entry,
    };
  }

  return {
    po_expiry_date: cleanNew,
    original_po_expiry_date: origExpiry,
    po_expiry_history: curHist,
  };
}
