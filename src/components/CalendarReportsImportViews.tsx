import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  History,
  Lock,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { useWorkTrack } from '../context/WorkTrackContext';
import {
  calculateEscalationAgeingDays,
  calculatePoExpiryIndicator,
  formatDurationMinutes,
  validateImportDataset,
} from '../utils/operationsLogic';
import {
  exportRowsToCSV,
  exportRowsToXLSX,
  IMPORT_TEMPLATES,
} from '../utils/exportUtils';

// ============================================================================
// 1. CALENDAR AND REMINDERS VIEW
// ============================================================================
export const CalendarView: React.FC = () => {
  const {
    tasks,
    operations,
    purchaseOrders,
    escalations,
    projects,
    todayStr,
    setActiveNav,
  } = useWorkTrack();

  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'agenda'>('monthly');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const allEvents = useMemo(() => {
    const events: {
      id: string;
      date: string;
      type: 'Task Due' | 'Appointment' | 'PO Expiry' | 'Follow-up' | 'Milestone';
      title: string;
      sub: string;
      nav: any;
      urgent: boolean;
    }[] = [];

    tasks.forEach((t) => {
      if (t.dueDate && t.status !== 'Completed' && t.status !== 'Cancelled') {
        events.push({
          id: `cal-t-${t.id}`,
          date: t.dueDate,
          type: 'Task Due',
          title: `${t.taskCode}: ${t.title}`,
          sub: `${t.category} · ${t.priority}`,
          nav: 'tasks',
          urgent: t.dueDate <= todayStr || t.priority === 'Critical',
        });
      }
    });

    operations.forEach((op) => {
      if (op.appointmentDate) {
        events.push({
          id: `cal-op-appt-${op.id}`,
          date: op.appointmentDate,
          type: 'Appointment',
          title: `Appt: ${op.poNumber} (${op.warehouse})`,
          sub: `${op.courierName} · ${op.appointmentStatus}`,
          nav: 'operations',
          urgent: op.appointmentDate === todayStr,
        });
      }
      if (op.nextFollowUpDate && op.shipmentStatus !== 'Delivered') {
        events.push({
          id: `cal-op-fu-${op.id}`,
          date: op.nextFollowUpDate,
          type: 'Follow-up',
          title: `Shipment Follow-up: ${op.poNumber}`,
          sub: `LR: ${op.lrNumber} · ${op.shipmentStatus}`,
          nav: 'operations',
          urgent: op.nextFollowUpDate <= todayStr,
        });
      }
    });

    purchaseOrders.forEach((po) => {
      if (po.currentExpiryDate && po.poStatus !== 'GRN Completed') {
        events.push({
          id: `cal-po-${po.id}`,
          date: po.currentExpiryDate,
          type: 'PO Expiry',
          title: `PO Expiry: ${po.poNumber}`,
          sub: `${po.vendor} · ${po.warehouse}`,
          nav: 'purchase-orders',
          urgent: po.currentExpiryDate <= todayStr,
        });
      }
    });

    escalations.forEach((esc) => {
      if (esc.nextFollowUpDate && esc.status !== 'Closed') {
        events.push({
          id: `cal-esc-${esc.id}`,
          date: esc.nextFollowUpDate,
          type: 'Follow-up',
          title: `${esc.escalationCode}: ${esc.escalationType}`,
          sub: `PO: ${esc.relatedPoNumber} · ${esc.assignedPerson}`,
          nav: 'escalations',
          urgent: true,
        });
      }
    });

    projects.forEach((prj) => {
      prj.milestones.forEach((ms) => {
        if (!ms.completed && ms.dueDate) {
          events.push({
            id: `cal-ms-${ms.id}`,
            date: ms.dueDate,
            type: 'Milestone',
            title: `Milestone: ${ms.title}`,
            sub: prj.name,
            nav: 'projects',
            urgent: ms.dueDate <= todayStr,
          });
        }
      });
    });

    return events
      .filter((e) => typeFilter === 'ALL' || e.type === typeFilter)
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [tasks, operations, purchaseOrders, escalations, projects, todayStr, typeFilter]);

  // Days in October 2026 (Oct 1 2026 is Thursday)
  const octoberDays = Array.from({ length: 31 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-10-${String(dayNum).padStart(2, '0')}`;
    return {
      dayNum,
      dateStr,
      events: allEvents.filter((e) => e.date === dateStr),
    };
  });

  const weeklyDays = octoberDays.filter(
    (d) => d.dateStr >= '2026-10-19' && d.dateStr <= '2026-10-25'
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Operational Calendar & In-App Reminders
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Unified schedule for Tasks, Warehouse Appointments, PO Expiries, Follow-ups, and Project Milestones.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {(['monthly', 'weekly', 'agenda'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${
                  viewMode === m
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {m} View
              </button>
            ))}
          </div>
          <select
            aria-label="Filter Calendar Event Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Event Types</option>
            <option value="Task Due">Tasks & Deadlines</option>
            <option value="Appointment">Warehouse Appointments</option>
            <option value="PO Expiry">PO Expiry Dates</option>
            <option value="Follow-up">Follow-ups</option>
            <option value="Milestone">Project Milestones</option>
          </select>
        </div>
      </div>

      {/* In-App Reminders Banner */}
      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Bell className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              In-App Reminder Queue ({allEvents.filter((e) => e.urgent).length} urgent items due or expiring):
            </span>{' '}
            <span className="text-slate-600 dark:text-slate-400">
              Reminders are evaluated in-app from live database records. Click any calendar event below to open the corresponding module.
            </span>
          </div>
        </div>
      </div>

      {viewMode === 'monthly' && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              October 2026
            </h2>
            <span className="text-xs font-mono text-slate-500">Today: {todayStr}</span>
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>
          <div className="grid grid-cols-7 gap-2 mt-2">
            {/* Oct 1, 2026 is Thursday -> 3 empty slots for Mon, Tue, Wed */}
            <div className="h-24 rounded-lg bg-slate-50/50 dark:bg-slate-800/20" />
            <div className="h-24 rounded-lg bg-slate-50/50 dark:bg-slate-800/20" />
            <div className="h-24 rounded-lg bg-slate-50/50 dark:bg-slate-800/20" />
            {octoberDays.map((d) => {
              const isToday = d.dateStr === todayStr;
              return (
                <div
                  key={d.dateStr}
                  className={`min-h-24 p-2 rounded-lg border ${
                    isToday
                      ? 'border-blue-700 bg-blue-50/30 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800'
                  } flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono ${
                        isToday ? 'font-bold text-blue-800 dark:text-blue-400' : 'text-slate-500'
                      }`}
                    >
                      {d.dayNum}
                    </span>
                    {d.events.length > 0 && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {d.events.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 mt-1 overflow-y-auto max-h-16">
                    {d.events.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setActiveNav(ev.nav)}
                        className={`w-full text-left text-[11px] truncate px-1.5 py-0.5 rounded ${
                          ev.urgent
                            ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-medium'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ev.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'weekly' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weeklyDays.map((d) => (
            <div
              key={d.dateStr}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
                {d.dateStr} {d.dateStr === todayStr ? '(Today)' : ''}
              </div>
              <div className="space-y-2">
                {d.events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setActiveNav(ev.nav)}
                    className="w-full text-left p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-700 text-xs"
                  >
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {ev.title}
                    </div>
                    <div className="text-slate-500 mt-0.5">{ev.type}</div>
                  </button>
                ))}
                {d.events.length === 0 && (
                  <p className="text-xs text-slate-400 py-4 text-center">No events</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'agenda' && (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
          {allEvents.map((ev) => (
            <div
              key={ev.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div>
                <div className="text-xs font-mono text-slate-500">
                  {ev.date} · {ev.type}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {ev.title}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{ev.sub}</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveNav(ev.nav)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
              >
                Open Module
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. REPORTS VIEW (12 Operational & Productivity Reports)
// ============================================================================
export const ReportsView: React.FC = () => {
  const {
    tasks,
    operations,
    purchaseOrders,
    escalations,
    timeLogs,
    todayStr,
  } = useWorkTrack();

  const [selectedReport, setSelectedReport] = useState<string>('courier-performance');

  const reportDefinitions = [
    {
      id: 'daily-task-completion',
      title: '01. Daily Task Completion',
      formula: 'Tasks where status == "Completed" grouped by completedDate / dueDate.',
    },
    {
      id: 'weekly-productivity',
      id2: 'weekly',
      title: '02. Weekly Productivity & Hours Variance',
      formula: 'Comparison of Estimated Hours vs Actual Logged Hours across task categories.',
    },
    {
      id: 'overdue-tasks',
      title: '03. Overdue Tasks Audit',
      formula: 'Tasks where status is not Completed/Cancelled and dueDate < Reference Today.',
    },
    {
      id: 'operations-delays',
      title: '04. Operations Delays & Hold Consignments',
      formula: 'Shipments with status On Hold, Expired PO, or Missing Appointment.',
    },
    {
      id: 'courier-performance',
      title: '05. Courier Performance Scorecard',
      formula: 'Grouped by courierName: Total Shipments, Delivered Count, Delayed/Hold Count, Total Quantity.',
    },
    {
      id: 'po-expiry',
      title: '06. PO Expiry Risk Matrix',
      formula: 'Purchase Orders classified by live days-to-expiry (Expired, Today, <=3d, <=7d, Safe).',
    },
    {
      id: 'appointment-rescheduling',
      title: '07. Appointment Rescheduling Audit',
      formula: 'Operations and Purchase Orders where rescheduleHistory / changeHistory length > 0.',
    },
    {
      id: 'pending-grn',
      title: '08. Pending GRN Report',
      formula: 'Escalations with type "GRN Pending" and POs with pendingQuantity > 0.',
    },
    {
      id: 'dn-issues',
      title: '09. Debit Note (DN) Disputes',
      formula: 'Escalations where escalationType == "DN Issue".',
    },
    {
      id: 'rtv-pickups',
      title: '10. RTV Pickup Manifest Report',
      formula: 'Escalations and tasks tagged with RTV / Reverse Logistics.',
    },
    {
      id: 'escalation-ageing',
      title: '11. Escalation Ageing Analysis',
      formula: 'Ageing Days = (ClosureDate or CurrentDate) - CreatedDate in UTC days.',
    },
    {
      id: 'time-utilization',
      title: '12. Time Utilization Ledger',
      formula: 'Sum of durationMinutes grouped by linked Project and Task.',
    },
  ];

  const generatedRows = useMemo(() => {
    switch (selectedReport) {
      case 'daily-task-completion':
        return tasks.map((t) => ({
          TaskCode: t.taskCode,
          Title: t.title,
          Category: t.category,
          Status: t.status,
          DueDate: t.dueDate,
          CompletedDate: t.completedDate || 'Pending',
        }));
      case 'weekly-productivity':
        return tasks.map((t) => ({
          TaskCode: t.taskCode,
          Category: t.category,
          EstimatedHours: t.estimatedHours,
          ActualHours: t.actualHours,
          VarianceHours: Number((t.actualHours - t.estimatedHours).toFixed(2)),
        }));
      case 'overdue-tasks':
        return tasks
          .filter(
            (t) =>
              t.status !== 'Completed' &&
              t.status !== 'Cancelled' &&
              t.dueDate < todayStr
          )
          .map((t) => ({
            TaskCode: t.taskCode,
            Title: t.title,
            Priority: t.priority,
            DueDate: t.dueDate,
            AssignedBy: t.assignedBy,
          }));
      case 'operations-delays':
        return operations
          .filter((o) => o.shipmentStatus !== 'Delivered')
          .map((o) => ({
            RecordID: o.recordCode,
            PONumber: o.poNumber,
            LRNumber: o.lrNumber,
            Courier: o.courierName,
            Warehouse: o.warehouse,
            ShipmentStatus: o.shipmentStatus,
            IssueCategory: o.issueCategory,
          }));
      case 'courier-performance': {
        const map = new Map<
          string,
          { Courier: string; TotalShipments: number; Delivered: number; OnHoldOrDelayed: number; TotalUnits: number }
        >();
        operations.forEach((o) => {
          const cur = map.get(o.courierName) || {
            Courier: o.courierName,
            TotalShipments: 0,
            Delivered: 0,
            OnHoldOrDelayed: 0,
            TotalUnits: 0,
          };
          cur.TotalShipments += 1;
          if (o.shipmentStatus === 'Delivered') cur.Delivered += 1;
          if (o.shipmentStatus === 'On Hold' || !o.appointmentDate) cur.OnHoldOrDelayed += 1;
          cur.TotalUnits += o.quantity;
          map.set(o.courierName, cur);
        });
        return Array.from(map.values());
      }
      case 'po-expiry':
        return purchaseOrders.map((po) => ({
          PONumber: po.poNumber,
          Vendor: po.vendor,
          Warehouse: po.warehouse,
          OriginalExpiry: po.originalExpiryDate,
          CurrentExpiry: po.currentExpiryDate,
          ExpiryIndicator: calculatePoExpiryIndicator(po.currentExpiryDate, todayStr),
          PendingQty: po.pendingQuantity,
        }));
      case 'appointment-rescheduling':
        return purchaseOrders.map((po) => ({
          PONumber: po.poNumber,
          Warehouse: po.warehouse,
          OriginalAppointment: po.originalAppointmentDate || 'None',
          CurrentAppointment: po.currentAppointmentDate || 'None',
          RescheduleCount: po.changeHistory.length,
          LatestReason: po.changeHistory[0]?.reason || 'No changes recorded',
        }));
      case 'pending-grn':
        return purchaseOrders
          .filter((p) => p.pendingQuantity > 0)
          .map((p) => ({
            PONumber: p.poNumber,
            Vendor: p.vendor,
            Warehouse: p.warehouse,
            ExpectedQty: p.expectedQuantity,
            ReceivedQty: p.receivedQuantity,
            PendingQty: p.pendingQuantity,
            Status: p.poStatus,
          }));
      case 'dn-issues':
        return escalations
          .filter((e) => e.escalationType === 'DN Issue')
          .map((e) => ({
            EscalationID: e.escalationCode,
            PONumber: e.relatedPoNumber,
            Warehouse: e.warehouse,
            Issue: e.issueDescription,
            Status: e.status,
            ResolutionNotes: e.resolutionNotes,
          }));
      case 'rtv-pickups':
        return escalations
          .filter((e) => e.escalationType === 'RTV Pickup')
          .map((e) => ({
            EscalationID: e.escalationCode,
            PONumber: e.relatedPoNumber,
            Courier: e.courierName,
            Warehouse: e.warehouse,
            Status: e.status,
            Issue: e.issueDescription,
          }));
      case 'escalation-ageing':
        return escalations.map((e) => ({
          EscalationID: e.escalationCode,
          Type: e.escalationType,
          Priority: e.priority,
          Status: e.status,
          CreatedDate: e.createdDate,
          AgeingDays: calculateEscalationAgeingDays(e.createdDate, e.closureDate, todayStr),
          AssignedPerson: e.assignedPerson,
        }));
      case 'time-utilization':
      default:
        return timeLogs.map((tl) => ({
          TaskTitle: tl.taskTitle,
          ProjectName: tl.projectName,
          Date: tl.startTime.slice(0, 10),
          DurationMinutes: tl.durationMinutes,
          Formatted: formatDurationMinutes(tl.durationMinutes),
          Notes: tl.notes,
        }));
    }
  }, [selectedReport, tasks, operations, purchaseOrders, escalations, timeLogs, todayStr]);

  const activeDef =
    reportDefinitions.find((r) => r.id === selectedReport) || reportDefinitions[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Operational & Productivity Reports
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            12 real-time reports computed directly from persisted records with transparent calculation logic.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportRowsToCSV(`report_${selectedReport}.csv`, generatedRows)}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report CSV</span>
          </button>
          <button
            type="button"
            onClick={() =>
              exportRowsToXLSX(`report_${selectedReport}.xlsx`, 'Report', generatedRows)
            }
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 text-white flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report XLSX</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selector Sidebar */}
        <div className="space-y-1">
          {reportDefinitions.map((rep) => (
            <button
              key={rep.id}
              type="button"
              onClick={() => setSelectedReport(rep.id)}
              className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                selectedReport === rep.id
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {rep.title}
            </button>
          ))}
        </div>

        {/* Report Table & Methodology */}
        <div className="lg:col-span-3 space-y-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {activeDef.title}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              <strong>Metric Calculation Methodology:</strong> {activeDef.formula}
            </p>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              {generatedRows.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600">
                      {Object.keys(generatedRows[0]).map((col) => (
                        <th key={col} className="py-2.5 px-3 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {generatedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        {Object.values(r).map((val, j) => (
                          <td key={j} className="py-2.5 px-3 font-mono tabular-nums">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="py-10 text-center text-xs text-slate-500">
                  No records match this report filter.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. EXCEL AND CSV IMPORT / EXPORT CENTER
// ============================================================================
const MODULE_FIELDS: Record<
  'tasks' | 'operations' | 'purchaseOrders' | 'escalations',
  { key: string; label: string; required?: boolean }[]
> = {
  tasks: [
    { key: 'taskCode', label: 'Task ID' },
    { key: 'title', label: 'Task Title *', required: true },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'dueDate', label: 'Due Date (YYYY-MM-DD) *', required: true },
    { key: 'assignedBy', label: 'Assigned By' },
    { key: 'assignedTo', label: 'Assigned To' },
    { key: 'estimatedHours', label: 'Estimated Hours' },
    { key: 'notes', label: 'Notes' },
  ],
  operations: [
    { key: 'recordCode', label: 'Record ID' },
    { key: 'poNumber', label: 'PO Number *', required: true },
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'lrNumber', label: 'LR Number' },
    { key: 'courierName', label: 'Courier Name *', required: true },
    { key: 'vehicleNumber', label: 'Vehicle Number' },
    { key: 'sku', label: 'SKU' },
    { key: 'productName', label: 'Product Name' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'warehouse', label: 'Warehouse *', required: true },
    { key: 'appointmentDate', label: 'Appointment Date' },
    { key: 'poExpiryDate', label: 'PO Expiry Date (YYYY-MM-DD) *', required: true },
    { key: 'shipmentStatus', label: 'Shipment Status' },
    { key: 'remarks', label: 'Remarks' },
  ],
  purchaseOrders: [
    { key: 'poNumber', label: 'PO Number *', required: true },
    { key: 'vendor', label: 'Vendor *', required: true },
    { key: 'courier', label: 'Courier' },
    { key: 'warehouse', label: 'Warehouse *', required: true },
    { key: 'currentAppointmentDate', label: 'Appointment Date' },
    { key: 'currentExpiryDate', label: 'Current Expiry Date (YYYY-MM-DD) *', required: true },
    { key: 'poStatus', label: 'PO Status' },
    { key: 'expectedQuantity', label: 'Expected Quantity' },
    { key: 'receivedQuantity', label: 'Received Quantity' },
  ],
  escalations: [
    { key: 'escalationCode', label: 'Escalation ID' },
    { key: 'relatedPoNumber', label: 'Related PO Number' },
    { key: 'relatedLrNumber', label: 'Related LR Number' },
    { key: 'courierName', label: 'Courier Name' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'escalationType', label: 'Escalation Type *', required: true },
    { key: 'issueDescription', label: 'Issue Description *', required: true },
    { key: 'priority', label: 'Priority' },
    { key: 'assignedPerson', label: 'Assigned Person' },
  ],
};

export const ImportExportView: React.FC = () => {
  const {
    tasks,
    operations,
    purchaseOrders,
    escalations,
    importJobs,
    recordImportBatch,
    notify,
  } = useWorkTrack();

  const [targetModule, setTargetModule] = useState<
    'tasks' | 'operations' | 'purchaseOrders' | 'escalations'
  >('operations');
  const [fileName, setFileName] = useState('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importCompletedReport, setImportCompletedReport] = useState<{
    imported: number;
    invalid: number;
    duplicates: number;
  } | null>(null);

  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    if (targetModule === 'tasks') {
      tasks.forEach((t) => s.add((t.taskCode || t.title).toLowerCase()));
    } else if (targetModule === 'operations') {
      operations.forEach((o) => s.add(`${o.poNumber}_${o.lrNumber}`.toLowerCase()));
    } else if (targetModule === 'purchaseOrders') {
      purchaseOrders.forEach((p) => s.add(p.poNumber.toLowerCase()));
    } else if (targetModule === 'escalations') {
      escalations.forEach((e) => s.add(e.escalationCode.toLowerCase()));
    }
    return s;
  }, [targetModule, tasks, operations, purchaseOrders, escalations]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify('File exceeds 5MB safety limit.', 'error');
      return;
    }
    setFileName(file.name);
    setImportCompletedReport(null);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheet];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

    if (json.length === 0) {
      notify('Selected file contains no data rows.', 'error');
      return;
    }

    const headers = Object.keys(json[0]);
    setFileHeaders(headers);
    setRawRows(json);

    // Auto-map matching column names
    const autoMap: Record<string, string> = {};
    MODULE_FIELDS[targetModule].forEach((f) => {
      const match = headers.find(
        (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '') === f.key.toLowerCase()
      );
      if (match) autoMap[f.key] = match;
    });
    setColumnMapping(autoMap);
  };

  const loadSamplePreviewRows = () => {
    const sample = [
      ...IMPORT_TEMPLATES[targetModule],
      {
        ...IMPORT_TEMPLATES[targetModule][0],
        poNumber: '',
        title: '',
        dueDate: 'bad-date',
        poExpiryDate: 'bad-date',
      },
    ];
    const headers = Object.keys(sample[0]);
    setFileName(`sample_${targetModule}_batch.xlsx`);
    setFileHeaders(headers);
    setRawRows(sample);
    const autoMap: Record<string, string> = {};
    MODULE_FIELDS[targetModule].forEach((f) => {
      if (headers.includes(f.key)) autoMap[f.key] = f.key;
    });
    setColumnMapping(autoMap);
    setImportCompletedReport(null);
  };

  const validation = useMemo(
    () => validateImportDataset(targetModule, rawRows, columnMapping, existingKeys),
    [targetModule, rawRows, columnMapping, existingKeys]
  );

  const handleConfirmImport = async () => {
    if (validation.validRows.length === 0) {
      notify('No valid rows to import.', 'error');
      return;
    }
    await recordImportBatch(
      fileName || 'manual_import.csv',
      targetModule,
      validation.validRows,
      rawRows.length,
      validation.invalidRows.length,
      validation.duplicateRows.length
    );
    setImportCompletedReport({
      imported: validation.validRows.length,
      invalid: validation.invalidRows.length,
      duplicates: validation.duplicateRows.length,
    });
    setRawRows([]);
  };

  const handleDownloadErrorCSV = () => {
    const errRows = validation.invalidRows.map((ir) => ({
      RowNumber: ir.rowNumber,
      ValidationErrors: ir.errors.join('; '),
      ...ir.raw,
    }));
    exportRowsToCSV(`import_errors_${targetModule}.csv`, errRows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Excel & CSV Import / Export Center
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            10-step validated import pipeline with column mapping, duplicate detection, and formula-injection-safe export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              exportRowsToCSV(
                `template_${targetModule}.csv`,
                IMPORT_TEMPLATES[targetModule]
              )
            }
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV Template</span>
          </button>
          <button
            type="button"
            onClick={() =>
              exportRowsToXLSX(
                `template_${targetModule}.xlsx`,
                'Template',
                IMPORT_TEMPLATES[targetModule]
              )
            }
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download XLSX Template</span>
          </button>
        </div>
      </div>

      {/* Step 1 & 2: Select Target Module & Upload File */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              1. Target Module for Import
            </label>
            <select
              aria-label="Target Module for Import"
              value={targetModule}
              onChange={(e) => {
                setTargetModule(e.target.value as any);
                setRawRows([]);
                setImportCompletedReport(null);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="operations">Operations Tracker (Shipments & Appointments)</option>
              <option value="tasks">Tasks Spreadsheet</option>
              <option value="purchaseOrders">Purchase Orders</option>
              <option value="escalations">GRN / DN / RTV Escalations</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              2. Select CSV or Excel (.xlsx) File
            </label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-900 file:text-white hover:file:bg-blue-800"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={loadSamplePreviewRows}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Load Sample Test File (1 Valid + 1 Invalid Row)</span>
            </button>
          </div>
        </div>

        {/* Step 3-9: Column Mapping, Validation Summary, Error CSV & Import Action */}
        {rawRows.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              3. Map Columns ({fileName})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {MODULE_FIELDS[targetModule].map((field) => (
                <div key={field.key}>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {field.label}
                  </label>
                  <select
                    value={columnMapping[field.key] || ''}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full px-2 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="">-- Unmapped --</option>
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Validation Summary Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  Total Rows: <strong className="font-mono">{rawRows.length}</strong>
                </div>
                <div className="text-emerald-700 dark:text-emerald-400">
                  Valid Rows Ready: <strong className="font-mono">{validation.validRows.length}</strong>
                </div>
                <div className="text-red-600 dark:text-red-400">
                  Invalid Rows: <strong className="font-mono">{validation.invalidRows.length}</strong>
                </div>
                <div className="text-amber-600 dark:text-amber-400">
                  Duplicate Rows Skipped:{' '}
                  <strong className="font-mono">{validation.duplicateRows.length}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {validation.invalidRows.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadErrorCSV}
                    className="px-3 py-1.5 font-medium rounded border border-red-300 text-red-700 dark:text-red-300 hover:bg-red-50"
                  >
                    Download Error CSV
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-4 py-1.5 font-semibold rounded bg-blue-900 text-white hover:bg-blue-800"
                >
                  Import {validation.validRows.length} Valid Row(s)
                </button>
              </div>
            </div>

            {/* Row-Level Validation Errors Preview */}
            {validation.invalidRows.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-red-600 dark:text-red-400">
                  Row-Level Validation Errors (Invalid rows are never silently discarded):
                </div>
                {validation.invalidRows.map((ir) => (
                  <div
                    key={ir.rowNumber}
                    className="p-2 rounded bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 font-mono"
                  >
                    Row #{ir.rowNumber}: {ir.errors.join(' | ')}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {importCompletedReport && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
            <div>
              <strong>Import Report Complete:</strong> Imported{' '}
              <span className="font-mono">{importCompletedReport.imported}</span> valid record(s),
              flagged <span className="font-mono">{importCompletedReport.invalid}</span> invalid
              row(s), and skipped{' '}
              <span className="font-mono">{importCompletedReport.duplicates}</span> duplicate(s).
            </div>
          </div>
        )}
      </div>

      {/* Import History */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Import Job History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2">Timestamp</th>
                <th className="py-2">File Name</th>
                <th className="py-2">Target Module</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">Imported</th>
                <th className="py-2 text-right">Invalid</th>
                <th className="py-2 text-right">Duplicates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {importJobs.map((job) => (
                <tr key={job.id}>
                  <td className="py-2 font-mono text-slate-500">
                    {job.timestampIso.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-2 font-medium">{job.fileName}</td>
                  <td className="py-2 capitalize">{job.targetModule}</td>
                  <td className="py-2 text-right font-mono">{job.totalRows}</td>
                  <td className="py-2 text-right font-mono text-emerald-600 font-semibold">
                    {job.importedRows}
                  </td>
                  <td className="py-2 text-right font-mono text-red-600">{job.invalidRows}</td>
                  <td className="py-2 text-right font-mono text-amber-600">{job.duplicateRows}</td>
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
// 4. ACTIVITY HISTORY VIEW
// ============================================================================
export const ActivityHistoryView: React.FC = () => {
  const { activityLogs } = useWorkTrack();
  const [search, setSearch] = useState('');

  const filtered = activityLogs.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${l.recordType} ${l.recordId} ${l.action} ${l.previousValue} ${l.newValue} ${l.userEmail}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Immutable Activity & Audit History
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Complete audit log of record creations, status transitions, appointment reschedules, and PO expiry extensions.
          </p>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter audit trail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-64"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600">
                <th className="py-2.5 px-3 font-semibold">Timestamp (UTC)</th>
                <th className="py-2.5 px-3 font-semibold">Record Type</th>
                <th className="py-2.5 px-3 font-semibold">Record ID</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
                <th className="py-2.5 px-3 font-semibold">Previous Value</th>
                <th className="py-2.5 px-3 font-semibold">New Value</th>
                <th className="py-2.5 px-3 font-semibold">Authorized User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                    {log.timestampIso.slice(0, 19).replace('T', ' ')}
                  </td>
                  <td className="py-2.5 px-3 font-medium">{log.recordType}</td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {log.recordId}
                  </td>
                  <td className="py-2.5 px-3 text-blue-800 dark:text-blue-400 font-medium">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">
                    {log.previousValue || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-900 dark:text-slate-100">
                    {log.newValue || '—'}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500">{log.userEmail}</td>
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
// 5. SETTINGS & ACCESS CONTROL VIEW
// ============================================================================
export const SettingsView: React.FC = () => {
  const {
    user,
    isDemoMode,
    preferences,
    updatePreferences,
    seedSampleDataToCloud,
  } = useWorkTrack();

  const [newEmail, setNewEmail] = useState('');
  const [warnDays, setWarnDays] = useState(String(preferences.poExpiryWarnDays));
  const [remHours, setRemHours] = useState(String(preferences.taskDueReminderHours));

  const handleAddAllowedEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) return;
    if (preferences.allowedEmails.includes(clean)) return;
    await updatePreferences({
      allowedEmails: [...preferences.allowedEmails, clean],
    });
    setNewEmail('');
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    if (preferences.allowedEmails.length <= 1) return;
    await updatePreferences({
      allowedEmails: preferences.allowedEmails.filter((e) => e !== emailToRemove),
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Workspace Settings, Security & Access Control
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Manage your private Google Sign-In allowlist, theme preferences, and Cloud Firestore dataset.
        </p>
      </div>

      {/* Private Allowlist Management */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-800 dark:text-blue-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Authorized Google Account Allowlist (Private Mode)
          </h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Only Google accounts listed below are permitted to access your WorkTrack workspace. All Firestore collections also enforce strict document-level <code className="font-mono">ownerId == request.auth.uid</code> and verified email security rules.
        </p>

        <div className="space-y-2">
          {preferences.allowedEmails.map((em) => (
            <div
              key={em}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono"
            >
              <span>{em}</span>
              {preferences.allowedEmails.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(em)}
                  className="text-red-600 hover:underline font-sans"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAddAllowedEmail} className="flex gap-2 pt-2 text-xs">
          <input
            type="email"
            placeholder="Add authorized Google email..."
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
          />
          <button
            type="submit"
            className="px-4 py-2 font-semibold rounded-lg bg-blue-900 text-white hover:bg-blue-800"
          >
            Authorize Email
          </button>
        </form>
      </div>

      {/* Theme & Reminder Thresholds */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Display Theme & Reminder Thresholds
        </h2>
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">Interface Theme</div>
            <div className="text-slate-500">Switch between clean Light surface and Dark slate</div>
          </div>
          <button
            type="button"
            onClick={() =>
              updatePreferences({ theme: preferences.theme === 'dark' ? 'light' : 'dark' })
            }
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-2 font-medium"
          >
            {preferences.theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Switch to Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-700" />
                <span>Switch to Dark Mode</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block font-medium mb-1">PO Expiry Warning Window (Days)</label>
            <input
              type="number"
              min="1"
              max="60"
              value={warnDays}
              onChange={(e) => setWarnDays(e.target.value)}
              className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Task Deadline Reminder Window (Hours)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={remHours}
              onChange={(e) => setRemHours(e.target.value)}
              className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              updatePreferences({
                poExpiryWarnDays: Number(warnDays) || 7,
                taskDueReminderHours: Number(remHours) || 24,
              })
            }
            className="px-4 py-2 font-semibold rounded-lg bg-blue-900 text-white"
          >
            Save Thresholds
          </button>
        </div>
      </div>

      {/* Cloud Database Status & Seed Tool */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-800 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Firebase Cloud Firestore & Deployment Guide
            </h2>
          </div>
          {user && !isDemoMode && (
            <button
              type="button"
              onClick={seedSampleDataToCloud}
              className="px-3 py-1.5 font-semibold rounded-lg border border-blue-800 text-blue-900 dark:text-blue-300 hover:bg-blue-50"
            >
              Seed Sample Records to My Cloud Account
            </button>
          )}
        </div>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          WorkTrack uses Firebase Authentication (Google Sign-In) and Cloud Firestore Enterprise (Spark no-billing free tier quota). Your AI Studio subscription covers the coding workspace, while Cloud Run hosting and Firestore operate within Google Cloud / Firebase free-tier limits unless you explicitly upgrade to a paid billing plan.
        </p>
      </div>
    </div>
  );
};
