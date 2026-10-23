import {
  DateFilterPreset,
  EscalationRecord,
  ExpiryIndicator,
  OperationRecord,
  PurchaseOrderRecord,
  TaskRecord,
  TimeLogRecord,
} from '../types/worktrack';

export function parseLocalDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function diffDaysUTC(targetDateStr: string, baseDateStr: string): number | null {
  const target = parseLocalDate(targetDateStr);
  const base = parseLocalDate(baseDateStr);
  if (!target || !base) return null;
  const msPerDay = 86400000;
  return Math.round((target.getTime() - base.getTime()) / msPerDay);
}

/**
 * Calculates PO Expiry Indicator strictly from the current date:
 * - Expired (< 0 days)
 * - Expiring Today (0 days)
 * - Expiring Within 3 Days (1..3 days)
 * - Expiring Within 7 Days (4..7 days)
 * - Safe (> 7 days)
 */
export function calculatePoExpiryIndicator(
  expiryDateStr: string,
  currentDateStr: string
): ExpiryIndicator {
  const diff = diffDaysUTC(expiryDateStr, currentDateStr);
  if (diff === null) return 'Safe';
  if (diff < 0) return 'Expired';
  if (diff === 0) return 'Expiring Today';
  if (diff <= 3) return 'Expiring Within 3 Days';
  if (diff <= 7) return 'Expiring Within 7 Days';
  return 'Safe';
}

/**
 * Calculates Escalation Ageing in days automatically.
 * If closed/resolved with closureDate, calculates days between createdDate and closureDate.
 * Otherwise calculates days between createdDate and currentDateStr.
 */
export function calculateEscalationAgeingDays(
  createdDateStr: string,
  closureDateStr: string | undefined,
  currentDateStr: string
): number {
  const endRef = closureDateStr && closureDateStr.trim() ? closureDateStr : currentDateStr;
  const diff = diffDaysUTC(endRef, createdDateStr);
  if (diff === null) return 0;
  return Math.max(0, diff);
}

export interface DateRangeBounds {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export function formatDateUTC(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysUTC(dateStr: string, days: number): string {
  const dt = parseLocalDate(dateStr) || new Date();
  const next = new Date(dt.getTime() + days * 86400000);
  return formatDateUTC(next);
}

export function getDateRangeBounds(
  preset: DateFilterPreset,
  referenceDateStr: string,
  customStart?: string,
  customEnd?: string
): DateRangeBounds {
  const ref = parseLocalDate(referenceDateStr) || new Date(Date.UTC(2026, 9, 22));
  const todayStr = formatDateUTC(ref);

  switch (preset) {
    case 'Today':
      return { start: todayStr, end: todayStr };
    case 'Yesterday': {
      const yest = addDaysUTC(todayStr, -1);
      return { start: yest, end: yest };
    }
    case 'This Week': {
      const dayOfWeek = ref.getUTCDay(); // 0 (Sun) - 6 (Sat)
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const start = addDaysUTC(todayStr, mondayOffset);
      const end = addDaysUTC(start, 6);
      return { start, end };
    }
    case 'Last 7 Days': {
      return { start: addDaysUTC(todayStr, -6), end: todayStr };
    }
    case 'This Month': {
      const y = ref.getUTCFullYear();
      const m = ref.getUTCMonth();
      const start = formatDateUTC(new Date(Date.UTC(y, m, 1)));
      const end = formatDateUTC(new Date(Date.UTC(y, m + 1, 0)));
      return { start, end };
    }
    case 'Last 30 Days': {
      return { start: addDaysUTC(todayStr, -29), end: todayStr };
    }
    case 'This Quarter': {
      const y = ref.getUTCFullYear();
      const qStartMonth = Math.floor(ref.getUTCMonth() / 3) * 3;
      const start = formatDateUTC(new Date(Date.UTC(y, qStartMonth, 1)));
      const end = formatDateUTC(new Date(Date.UTC(y, qStartMonth + 3, 0)));
      return { start, end };
    }
    case 'Custom Date Range': {
      const s = customStart && /^\d{4}-\d{2}-\d{2}$/.test(customStart) ? customStart : addDaysUTC(todayStr, -30);
      const e = customEnd && /^\d{4}-\d{2}-\d{2}$/.test(customEnd) ? customEnd : todayStr;
      return s <= e ? { start: s, end: e } : { start: e, end: s };
    }
    case 'All Dates':
    default:
      return { start: '2000-01-01', end: '2099-12-31' };
  }
}

export function isDateInRange(dateStr: string | undefined, bounds: DateRangeBounds): boolean {
  if (!dateStr) return false;
  const clean = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return false;
  return clean >= bounds.start && clean <= bounds.end;
}

/**
 * Protects against CSV / Excel spreadsheet formula injection (CWE-1236).
 * Prefixes cells starting with =, +, -, @, Tab, or CR with a single quote.
 */
export function sanitizeFormulaInjection(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export function formatDurationMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hrs = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export function calculateActiveTimerSeconds(
  isRunning: boolean,
  isPaused: boolean,
  lastResumedAtMs: number,
  accumulatedSeconds: number,
  nowMs: number
): number {
  if (!isRunning) return 0;
  if (isPaused) return Math.max(0, Math.floor(accumulatedSeconds));
  const deltaSec = Math.max(0, Math.floor((nowMs - lastResumedAtMs) / 1000));
  return Math.max(0, Math.floor(accumulatedSeconds) + deltaSec);
}

export interface DashboardMetrics {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  tasksDueToday: number;
  openEscalations: number;
  expiringPurchaseOrders: number;
  pendingDeliveries: number;
  totalTimeLoggedMinutes: number;
  tasksByStatus: { name: string; count: number }[];
  tasksByPriority: { name: string; count: number }[];
  operationsByStatus: { name: string; count: number }[];
  escalationsByCategory: { name: string; count: number }[];
}

export function computeDashboardMetrics(
  tasks: TaskRecord[],
  operations: OperationRecord[],
  purchaseOrders: PurchaseOrderRecord[],
  escalations: EscalationRecord[],
  timeLogs: TimeLogRecord[],
  bounds: DateRangeBounds,
  todayStr: string
): DashboardMetrics {
  // Filter records by the active date range:
  // Tasks: dueDate or createdDate within range
  const filteredTasks = tasks.filter(
    (t) => isDateInRange(t.dueDate, bounds) || isDateInRange(t.createdDate, bounds)
  );
  // Operations: dispatchDate, appointmentDate, or poExpiryDate within range
  const filteredOps = operations.filter(
    (o) =>
      isDateInRange(o.dispatchDate, bounds) ||
      isDateInRange(o.appointmentDate, bounds) ||
      isDateInRange(o.poExpiryDate, bounds)
  );
  // Purchase Orders: currentExpiryDate or poCreationDate within range
  const filteredPOs = purchaseOrders.filter(
    (p) =>
      isDateInRange(p.currentExpiryDate, bounds) ||
      isDateInRange(p.poCreationDate, bounds)
  );
  // Escalations: createdDate within range
  const filteredEsc = escalations.filter((e) => isDateInRange(e.createdDate, bounds));
  // TimeLogs: startTime date within range
  const filteredTime = timeLogs.filter((tl) => isDateInRange(tl.startTime.slice(0, 10), bounds));

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.status === 'Completed').length;
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'In Progress').length;
  const pendingTasks = filteredTasks.filter(
    (t) => t.status !== 'Completed' && t.status !== 'Cancelled'
  ).length;
  const overdueTasks = filteredTasks.filter(
    (t) =>
      t.status !== 'Completed' &&
      t.status !== 'Cancelled' &&
      t.dueDate &&
      t.dueDate < todayStr
  ).length;
  const tasksDueToday = filteredTasks.filter(
    (t) =>
      t.status !== 'Completed' &&
      t.status !== 'Cancelled' &&
      t.dueDate === todayStr
  ).length;

  const openEscalations = filteredEsc.filter(
    (e) => e.status !== 'Closed' && e.status !== 'Resolved'
  ).length;

  const expiringPurchaseOrders = filteredPOs.filter((po) => {
    if (po.poStatus === 'GRN Completed' || po.poStatus === 'Cancelled') return false;
    const ind = calculatePoExpiryIndicator(po.currentExpiryDate, todayStr);
    return ind !== 'Safe';
  }).length;

  const pendingDeliveries = filteredOps.filter(
    (op) =>
      op.shipmentStatus !== 'Delivered' &&
      op.shipmentStatus !== 'Cancelled' &&
      op.shipmentStatus !== 'Returned'
  ).length;

  const totalTimeLoggedMinutes = filteredTime.reduce(
    (acc, item) => acc + (Number(item.durationMinutes) || 0),
    0
  );

  const statusMap = new Map<string, number>();
  for (const t of filteredTasks) {
    statusMap.set(t.status, (statusMap.get(t.status) || 0) + 1);
  }
  const tasksByStatus = Array.from(statusMap.entries()).map(([name, count]) => ({ name, count }));

  const priorityMap = new Map<string, number>();
  for (const t of filteredTasks) {
    priorityMap.set(t.priority, (priorityMap.get(t.priority) || 0) + 1);
  }
  const tasksByPriority = Array.from(priorityMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  const opStatusMap = new Map<string, number>();
  for (const op of filteredOps) {
    opStatusMap.set(op.shipmentStatus, (opStatusMap.get(op.shipmentStatus) || 0) + 1);
  }
  const operationsByStatus = Array.from(opStatusMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  const escCatMap = new Map<string, number>();
  for (const esc of filteredEsc) {
    escCatMap.set(esc.escalationType, (escCatMap.get(esc.escalationType) || 0) + 1);
  }
  const escalationsByCategory = Array.from(escCatMap.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  return {
    totalTasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    overdueTasks,
    tasksDueToday,
    openEscalations,
    expiringPurchaseOrders,
    pendingDeliveries,
    totalTimeLoggedMinutes,
    tasksByStatus,
    tasksByPriority,
    operationsByStatus,
    escalationsByCategory,
  };
}

export interface ImportValidationResult {
  validRows: Record<string, any>[];
  invalidRows: { rowNumber: number; raw: Record<string, any>; errors: string[] }[];
  duplicateRows: { rowNumber: number; key: string; raw: Record<string, any> }[];
}

export function validateImportDataset(
  targetModule: 'tasks' | 'operations' | 'purchaseOrders' | 'escalations',
  rawRows: Record<string, any>[],
  columnMapping: Record<string, string>,
  existingKeys: Set<string>
): ImportValidationResult {
  const validRows: Record<string, any>[] = [];
  const invalidRows: { rowNumber: number; raw: Record<string, any>; errors: string[] }[] = [];
  const duplicateRows: { rowNumber: number; key: string; raw: Record<string, any> }[] = [];
  const seenKeysInFile = new Set<string>();

  rawRows.forEach((raw, idx) => {
    const rowNumber = idx + 2; // 1-indexed header + 1
    const mapped: Record<string, any> = {};
    for (const [appField, fileHeader] of Object.entries(columnMapping)) {
      if (fileHeader && raw[fileHeader] !== undefined) {
        mapped[appField] = typeof raw[fileHeader] === 'string' ? raw[fileHeader].trim() : raw[fileHeader];
      }
    }

    const errors: string[] = [];
    let uniqueKey = '';

    if (targetModule === 'tasks') {
      if (!mapped.title) errors.push('Missing required Task Title');
      if (!mapped.dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(mapped.dueDate))) {
        errors.push('Invalid or missing Due Date (expected YYYY-MM-DD)');
      }
      uniqueKey = String(mapped.taskCode || mapped.title || '').toLowerCase();
    } else if (targetModule === 'operations') {
      if (!mapped.poNumber) errors.push('Missing required PO Number');
      if (!mapped.courierName) errors.push('Missing required Courier Name');
      if (!mapped.warehouse) errors.push('Missing required Warehouse');
      if (!mapped.poExpiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(mapped.poExpiryDate))) {
        errors.push('Invalid or missing PO Expiry Date (expected YYYY-MM-DD)');
      }
      uniqueKey = `${mapped.poNumber || ''}_${mapped.lrNumber || ''}`.toLowerCase();
    } else if (targetModule === 'purchaseOrders') {
      if (!mapped.poNumber) errors.push('Missing required PO Number');
      if (!mapped.vendor) errors.push('Missing required Vendor');
      if (!mapped.warehouse) errors.push('Missing required Warehouse');
      if (!mapped.currentExpiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(mapped.currentExpiryDate))) {
        errors.push('Invalid or missing Current Expiry Date (expected YYYY-MM-DD)');
      }
      uniqueKey = String(mapped.poNumber || '').toLowerCase();
    } else if (targetModule === 'escalations') {
      if (!mapped.escalationType) errors.push('Missing required Escalation Type');
      if (!mapped.issueDescription) errors.push('Missing required Issue Description');
      uniqueKey = String(mapped.escalationCode || `${mapped.relatedPoNumber}_${mapped.escalationType}`).toLowerCase();
    }

    if (errors.length > 0) {
      invalidRows.push({ rowNumber, raw, errors });
      return;
    }

    if (uniqueKey && (existingKeys.has(uniqueKey) || seenKeysInFile.has(uniqueKey))) {
      duplicateRows.push({ rowNumber, key: uniqueKey, raw: mapped });
      return;
    }

    if (uniqueKey) seenKeysInFile.add(uniqueKey);
    validRows.push(mapped);
  });

  return { validRows, invalidRows, duplicateRows };
}
