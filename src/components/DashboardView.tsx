import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileWarning,
  Filter,
  ListTodo,
  Package,
  Timer,
  Truck,
} from 'lucide-react';
import { useWorkTrack } from '../context/WorkTrackContext';
import { DATE_FILTER_PRESETS, DateFilterPreset } from '../types/worktrack';
import {
  calculateEscalationAgeingDays,
  calculatePoExpiryIndicator,
  computeDashboardMetrics,
  formatDurationMinutes,
  getDateRangeBounds,
} from '../utils/operationsLogic';

const CHART_COLORS = ['#1e3a8a', '#2563eb', '#0284c7', '#d97706', '#dc2626', '#16a34a', '#64748b'];

export const DashboardView: React.FC = () => {
  const {
    tasks,
    operations,
    purchaseOrders,
    escalations,
    timeLogs,
    activityLogs,
    todayStr,
    datePreset,
    setDatePreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    setActiveNav,
    setGlobalTaskFilter,
    setGlobalOpsFilter,
  } = useWorkTrack();

  const bounds = React.useMemo(
    () => getDateRangeBounds(datePreset, todayStr, customStartDate, customEndDate),
    [datePreset, todayStr, customStartDate, customEndDate]
  );

  const metrics = React.useMemo(
    () =>
      computeDashboardMetrics(
        tasks,
        operations,
        purchaseOrders,
        escalations,
        timeLogs,
        bounds,
        todayStr
      ),
    [tasks, operations, purchaseOrders, escalations, timeLogs, bounds, todayStr]
  );

  // Task completion trend by date
  const completionTrend = React.useMemo(() => {
    const days = ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22'];
    return days.map((d) => ({
      date: d.slice(5),
      created: tasks.filter((t) => t.createdDate === d).length,
      completed: tasks.filter((t) => t.completedDate === d || (t.status === 'Completed' && t.dueDate === d)).length,
    }));
  }, [tasks]);

  // Weekly time utilization by day
  const weeklyTimeData = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const tl of timeLogs) {
      const day = tl.startTime.slice(0, 10);
      map.set(day, (map.get(day) || 0) + Number((tl.durationMinutes / 60).toFixed(1)));
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-7)
      .map(([day, hours]) => ({ day: day.slice(5), hours }));
  }, [timeLogs]);

  const expiringPOsList = React.useMemo(() => {
    return purchaseOrders
      .filter((po) => po.poStatus !== 'GRN Completed' && po.poStatus !== 'Cancelled')
      .map((po) => ({
        ...po,
        indicator: calculatePoExpiryIndicator(po.currentExpiryDate, todayStr),
      }))
      .filter((po) => po.indicator !== 'Safe')
      .sort((a, b) => (a.currentExpiryDate > b.currentExpiryDate ? 1 : -1));
  }, [purchaseOrders, todayStr]);

  const overdueShipmentsList = React.useMemo(() => {
    return operations.filter((op) => {
      const ind = calculatePoExpiryIndicator(op.poExpiryDate, todayStr);
      const isIncomplete =
        op.shipmentStatus !== 'Delivered' &&
        op.shipmentStatus !== 'Cancelled' &&
        op.shipmentStatus !== 'Returned';
      return (
        isIncomplete &&
        (ind === 'Expired' ||
          ind === 'Expiring Today' ||
          !op.appointmentDate ||
          op.shipmentStatus === 'On Hold')
      );
    });
  }, [operations, todayStr]);

  const urgentFollowUps = React.useMemo(() => {
    return escalations
      .filter((e) => e.status !== 'Closed' && e.status !== 'Resolved')
      .map((e) => ({
        ...e,
        ageingDays: calculateEscalationAgeingDays(e.createdDate, e.closureDate, todayStr),
      }))
      .sort((a, b) => b.ageingDays - a.ageingDays);
  }, [escalations, todayStr]);

  const upcomingDeadlines = React.useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'Completed' && t.status !== 'Cancelled')
      .sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
      .slice(0, 5);
  }, [tasks]);

  const summaryCards = [
    {
      label: 'Total Tasks',
      value: metrics.totalTasks,
      sub: 'Filtered by Creation / Due Date',
      icon: ListTodo,
      onClick: () => {
        setGlobalTaskFilter('ALL');
        setActiveNav('tasks');
      },
    },
    {
      label: 'Pending Tasks',
      value: metrics.pendingTasks,
      sub: 'Active uncompleted tasks',
      icon: Clock,
      onClick: () => {
        setGlobalTaskFilter('PENDING');
        setActiveNav('tasks');
      },
    },
    {
      label: 'In Progress',
      value: metrics.inProgressTasks,
      sub: 'Currently being executed',
      icon: Timer,
      onClick: () => {
        setGlobalTaskFilter('In Progress');
        setActiveNav('tasks');
      },
    },
    {
      label: 'Completed Tasks',
      value: metrics.completedTasks,
      sub: 'Closed within period',
      icon: CheckCircle2,
      onClick: () => {
        setGlobalTaskFilter('Completed');
        setActiveNav('tasks');
      },
    },
    {
      label: 'Overdue Tasks',
      value: metrics.overdueTasks,
      sub: `Due before ${todayStr}`,
      icon: AlertTriangle,
      alert: metrics.overdueTasks > 0,
      onClick: () => {
        setGlobalTaskFilter('OVERDUE');
        setActiveNav('tasks');
      },
    },
    {
      label: 'Tasks Due Today',
      value: metrics.tasksDueToday,
      sub: `Due on ${todayStr}`,
      icon: Calendar,
      onClick: () => {
        setGlobalTaskFilter('DUE_TODAY');
        setActiveNav('tasks');
      },
    },
    {
      label: 'Open Escalations',
      value: metrics.openEscalations,
      sub: 'GRN / DN / RTV / PO issues',
      icon: FileWarning,
      alert: metrics.openEscalations > 0,
      onClick: () => setActiveNav('escalations'),
    },
    {
      label: 'Expiring Purchase Orders',
      value: metrics.expiringPurchaseOrders,
      sub: 'Expired or expiring <= 7d',
      icon: Package,
      alert: metrics.expiringPurchaseOrders > 0,
      onClick: () => setActiveNav('purchase-orders'),
    },
    {
      label: 'Pending Deliveries',
      value: metrics.pendingDeliveries,
      sub: 'In-transit or at hub',
      icon: Truck,
      onClick: () => {
        setGlobalOpsFilter('PENDING_DELIVERY');
        setActiveNav('operations');
      },
    },
    {
      label: 'Total Time Logged',
      value: formatDurationMinutes(metrics.totalTimeLoggedMinutes),
      sub: `${metrics.totalTimeLoggedMinutes} total minutes`,
      icon: Timer,
      onClick: () => setActiveNav('time-tracker'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Global Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Operations & Productivity Overview
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Date range active: <span className="font-mono tabular-nums font-medium">{bounds.start}</span> to{' '}
            <span className="font-mono tabular-nums font-medium">{bounds.end}</span> · Reference Date:{' '}
            <span className="font-mono tabular-nums font-medium">{todayStr}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Date Filter:</span>
          </div>
          <select
            aria-label="Global Date Range Filter"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as DateFilterPreset)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-700"
          >
            {DATE_FILTER_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>

          {datePreset === 'Custom Date Range' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Custom Start Date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-500">to</span>
              <input
                type="date"
                aria-label="Custom End Date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>
      </div>

      {/* 10 Clickable Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="group text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-700 dark:hover:border-blue-500 transition-colors flex flex-col justify-between"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {card.label}
                </span>
                <Icon
                  className={`w-4 h-4 ${
                    card.alert
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400'
                  }`}
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span
                  className={`text-2xl font-bold font-mono tabular-nums ${
                    card.alert
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {card.value}
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                {card.sub}
              </p>
            </button>
          );
        })}
      </div>

      {/* Actionable Operational Watchlists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expiring POs & Overdue Shipments */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Expiring POs & Shipment Alerts
              </h2>
              <button
                type="button"
                onClick={() => setActiveNav('operations')}
                className="text-xs font-medium text-blue-800 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Open Tracker
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {expiringPOsList.map((po) => (
                <div key={po.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold font-mono text-slate-900 dark:text-slate-100">
                      {po.poNumber}{' '}
                      <span className="font-sans font-normal text-xs text-slate-500">
                        · {po.warehouse}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Vendor: {po.vendor} · Pending: <span className="font-mono tabular-nums">{po.pendingQuantity}</span> units
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-semibold ${
                        po.indicator === 'Expired' || po.indicator === 'Expiring Today'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {po.indicator}
                    </span>
                    <div className="text-xs font-mono tabular-nums text-slate-500">
                      Exp: {po.currentExpiryDate}
                    </div>
                  </div>
                </div>
              ))}
              {overdueShipmentsList.slice(0, 2).map((op) => (
                <div key={op.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold font-mono text-slate-900 dark:text-slate-100">
                      {op.lrNumber}{' '}
                      <span className="font-sans font-normal text-xs text-slate-500">
                        · {op.courierName}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      {op.shipmentStatus} · {op.appointmentDate ? `Appt: ${op.appointmentDate}` : 'Missing Appointment'}
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-red-600 dark:text-red-400 shrink-0">
                    PO: {op.poNumber}
                  </span>
                </div>
              ))}
              {expiringPOsList.length === 0 && overdueShipmentsList.length === 0 && (
                <p className="py-6 text-xs text-slate-500 text-center">
                  All purchase orders and active shipments are within safe expiry windows.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Urgent Escalation Follow-ups */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Urgent Escalation Follow-ups
              </h2>
              <button
                type="button"
                onClick={() => setActiveNav('escalations')}
                className="text-xs font-medium text-blue-800 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                View Escalations
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {urgentFollowUps.slice(0, 4).map((esc) => (
                <div key={esc.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      <span className="font-mono">{esc.escalationCode}</span> · {esc.escalationType}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {esc.issueDescription}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      PO: <span className="font-mono">{esc.relatedPoNumber || 'N/A'}</span> · Owner: {esc.assignedPerson}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono tabular-nums font-semibold text-red-600 dark:text-red-400">
                      {esc.ageingDays}d ageing
                    </span>
                    <div className="text-xs font-mono tabular-nums text-slate-500">
                      Next: {esc.nextFollowUpDate || 'Today'}
                    </div>
                  </div>
                </div>
              ))}
              {urgentFollowUps.length === 0 && (
                <p className="py-6 text-xs text-slate-500 text-center">
                  No open escalations pending follow-up.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Task Deadlines & Recent Activity */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Upcoming Task Deadlines
              </h2>
              <button
                type="button"
                onClick={() => setActiveNav('tasks')}
                className="text-xs font-medium text-blue-800 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Open Tasks
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {upcomingDeadlines.map((t) => {
                const isOverdue = t.dueDate < todayStr;
                return (
                  <div key={t.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="font-mono">{t.taskCode}</span> · {t.category} · {t.priority}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold ${
                          isOverdue
                            ? 'text-red-600 dark:text-red-400'
                            : t.dueDate === todayStr
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {t.dueDate}
                      </span>
                      <div className="text-xs text-slate-500">{t.status}</div>
                    </div>
                  </div>
                );
              })}
              {upcomingDeadlines.length === 0 && (
                <p className="py-6 text-xs text-slate-500 text-center">
                  No pending task deadlines.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6 Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Task Completion Trend */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                01. Task Creation & Completion Trend
              </h3>
              <p className="text-xs text-slate-500">Daily created vs completed tasks (by createdDate / completedDate)</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="created" name="Created" stroke="#1e3a8a" strokeWidth={2} />
                <Line type="monotone" dataKey="completed" name="Completed" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Operations by Delivery Status */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                02. Operations by Delivery Status
              </h3>
              <p className="text-xs text-slate-500">Consignments grouped by current shipmentStatus</p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.operationsByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Shipments" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Tasks by Status & Priority */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                03. Tasks by Status & Priority Distribution
              </h3>
              <p className="text-xs text-slate-500">Breakdown across active status and priority tiers</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.tasksByStatus}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {metrics.tasksByStatus.map((_, index) => (
                    <Cell key={`cell-st-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.tasksByPriority} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Tasks" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Escalations by Category & Weekly Time Utilization */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                04. Escalations by Category & Weekly Time Logged (Hours)
              </h3>
              <p className="text-xs text-slate-500">GRN/DN/RTV issue distribution and daily logged hours</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.escalationsByCategory}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" name="Escalations" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTimeData}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="hours" name="Logged Hours" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recently Updated Records Strip */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Recently Updated Records & Audit Trail
          </h2>
          <button
            type="button"
            onClick={() => setActiveNav('activity-history')}
            className="text-xs font-medium text-blue-800 dark:text-blue-400 hover:underline"
          >
            View Full History
          </button>
        </div>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                <th className="py-2 pr-4 font-medium">Timestamp</th>
                <th className="py-2 px-4 font-medium">Module</th>
                <th className="py-2 px-4 font-medium">Record</th>
                <th className="py-2 px-4 font-medium">Action</th>
                <th className="py-2 pl-4 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activityLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-500">
                    {log.timestampIso.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">{log.recordType}</td>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                    {log.recordId}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-blue-800 dark:text-blue-400">
                    {log.action}
                  </td>
                  <td className="py-2.5 pl-4 text-slate-600 dark:text-slate-400">
                    {log.previousValue ? `${log.previousValue} → ${log.newValue}` : log.newValue}
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
