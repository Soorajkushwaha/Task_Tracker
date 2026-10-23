import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Download,
  Edit3,
  History,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkTrack } from '../context/WorkTrackContext';
import {
  OperationRecord,
  RescheduleEntry,
  SHIPMENT_STATUSES,
  ShipmentStatus,
} from '../types/worktrack';
import { calculatePoExpiryIndicator } from '../utils/operationsLogic';
import { exportRowsToCSV, exportRowsToXLSX } from '../utils/exportUtils';

interface OperationsViewProps {
  mode?: 'operations' | 'shipments';
}

export const OperationsView: React.FC<OperationsViewProps> = ({ mode = 'operations' }) => {
  const {
    operations,
    todayStr,
    globalOpsFilter,
    setGlobalOpsFilter,
    saveOperation,
    deleteOperation,
  } = useWorkTrack();

  const [searchQuery, setSearchQuery] = useState('');
  const [courierFilter, setCourierFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [diagnosticLens, setDiagnosticLens] = useState<string>(globalOpsFilter || 'ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<OperationRecord | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<OperationRecord | null>(null);
  const [historyDrawerOp, setHistoryDrawerOp] = useState<OperationRecord | null>(null);

  // Reschedule / Manual Expiry Extension Modal state
  const [reschedField, setReschedField] = useState<'Appointment Date' | 'PO Expiry Date'>(
    'Appointment Date'
  );
  const [reschedNewDate, setReschedNewDate] = useState('');
  const [reschedReason, setReschedReason] = useState('');

  // Form state
  const [formRecordCode, setFormRecordCode] = useState('');
  const [formPoNumber, setFormPoNumber] = useState('');
  const [formInvoice, setFormInvoice] = useState('');
  const [formLr, setFormLr] = useState('');
  const [formCourier, setFormCourier] = useState('Delhivery B2B');
  const [formVehicle, setFormVehicle] = useState('');
  const [formDriverName, setFormDriverName] = useState('');
  const [formDriverContact, setFormDriverContact] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formProduct, setFormProduct] = useState('');
  const [formQty, setFormQty] = useState('100');
  const [formWarehouse, setFormWarehouse] = useState('Mumbai Bhiwandi FC-02');
  const [formDispatchDate, setFormDispatchDate] = useState(todayStr);
  const [formReportingDate, setFormReportingDate] = useState('');
  const [formApptDate, setFormApptDate] = useState('');
  const [formPoCreateDate, setFormPoCreateDate] = useState(todayStr);
  const [formPoExpiryDate, setFormPoExpiryDate] = useState(todayStr);
  const [formDeliveryDate, setFormDeliveryDate] = useState('');
  const [formShipmentStatus, setFormShipmentStatus] = useState<ShipmentStatus>('In Transit');
  const [formApptStatus, setFormApptStatus] = useState('Slot Confirmed');
  const [formIssueCat, setFormIssueCat] = useState('None');
  const [formIssueDesc, setFormIssueDesc] = useState('');
  const [formFollowUpDate, setFormFollowUpDate] = useState(todayStr);
  const [formRemarks, setFormRemarks] = useState('');

  const couriers = useMemo(
    () => Array.from(new Set(operations.map((o) => o.courierName).filter(Boolean))),
    [operations]
  );
  const warehouses = useMemo(
    () => Array.from(new Set(operations.map((o) => o.warehouse).filter(Boolean))),
    [operations]
  );

  const openAddModal = () => {
    setEditingOp(null);
    setFormRecordCode(`OPS-${501 + operations.length}`);
    setFormPoNumber('');
    setFormInvoice('');
    setFormLr('');
    setFormCourier('Delhivery B2B');
    setFormVehicle('');
    setFormDriverName('');
    setFormDriverContact('');
    setFormSku('');
    setFormProduct('');
    setFormQty('240');
    setFormWarehouse('Mumbai Bhiwandi FC-02');
    setFormDispatchDate(todayStr);
    setFormReportingDate('');
    setFormApptDate(todayStr);
    setFormPoCreateDate(todayStr);
    setFormPoExpiryDate(todayStr);
    setFormDeliveryDate('');
    setFormShipmentStatus('In Transit');
    setFormApptStatus('Scheduled');
    setFormIssueCat('None');
    setFormIssueDesc('');
    setFormFollowUpDate(todayStr);
    setFormRemarks('');
    setIsModalOpen(true);
  };

  const openEditModal = (op: OperationRecord) => {
    setEditingOp(op);
    setFormRecordCode(op.recordCode);
    setFormPoNumber(op.poNumber);
    setFormInvoice(op.invoiceNumber);
    setFormLr(op.lrNumber);
    setFormCourier(op.courierName);
    setFormVehicle(op.vehicleNumber);
    setFormDriverName(op.driverName);
    setFormDriverContact(op.driverContact);
    setFormSku(op.sku);
    setFormProduct(op.productName);
    setFormQty(String(op.quantity));
    setFormWarehouse(op.warehouse);
    setFormDispatchDate(op.dispatchDate);
    setFormReportingDate(op.reportingDate);
    setFormApptDate(op.appointmentDate);
    setFormPoCreateDate(op.poCreationDate);
    setFormPoExpiryDate(op.poExpiryDate);
    setFormDeliveryDate(op.deliveryDate);
    setFormShipmentStatus(op.shipmentStatus);
    setFormApptStatus(op.appointmentStatus);
    setFormIssueCat(op.issueCategory);
    setFormIssueDesc(op.issueDescription);
    setFormFollowUpDate(op.nextFollowUpDate);
    setFormRemarks(op.remarks);
    setIsModalOpen(true);
  };

  const handleSaveOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPoNumber.trim()) return;

    await saveOperation(
      {
        recordCode: formRecordCode.trim() || `OPS-${501 + operations.length}`,
        poNumber: formPoNumber.trim(),
        invoiceNumber: formInvoice.trim(),
        lrNumber: formLr.trim(),
        courierName: formCourier.trim(),
        vehicleNumber: formVehicle.trim(),
        driverName: formDriverName.trim(),
        driverContact: formDriverContact.trim(),
        sku: formSku.trim(),
        productName: formProduct.trim(),
        quantity: Number(formQty) || 0,
        warehouse: formWarehouse.trim(),
        dispatchDate: formDispatchDate,
        reportingDate: formReportingDate,
        appointmentDate: formApptDate,
        poCreationDate: formPoCreateDate,
        poExpiryDate: formPoExpiryDate,
        deliveryDate: formDeliveryDate,
        shipmentStatus: formShipmentStatus,
        appointmentStatus: formApptStatus.trim(),
        issueCategory: formIssueCat.trim(),
        issueDescription: formIssueDesc.trim(),
        nextFollowUpDate: formFollowUpDate,
        lastUpdatedDate: todayStr,
        remarks: formRemarks.trim(),
        rescheduleHistory: editingOp ? editingOp.rescheduleHistory : [],
      },
      editingOp?.id
    );
    setIsModalOpen(false);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !reschedNewDate || !reschedReason.trim()) return;

    const previousDate =
      reschedField === 'Appointment Date'
        ? rescheduleTarget.appointmentDate || 'Unscheduled'
        : rescheduleTarget.poExpiryDate;

    const newEntry: RescheduleEntry = {
      id: `rh-${Date.now()}`,
      previousDate,
      newDate: reschedNewDate,
      fieldChanged: reschedField,
      reason: reschedReason.trim(),
      updatedBy: 'simple.sooraj@gmail.com',
      timestamp: `${todayStr} ${new Date().toTimeString().slice(0, 5)}`,
    };

    const { id, ownerId: _ow, ...rest } = rescheduleTarget;
    await saveOperation(
      {
        ...rest,
        appointmentDate:
          reschedField === 'Appointment Date' ? reschedNewDate : rest.appointmentDate,
        poExpiryDate: reschedField === 'PO Expiry Date' ? reschedNewDate : rest.poExpiryDate,
        lastUpdatedDate: todayStr,
        rescheduleHistory: [newEntry, ...(rest.rescheduleHistory || [])],
      },
      id,
      reschedField === 'Appointment Date' ? 'Appointment Rescheduled' : 'PO Expiry Date Extended',
      previousDate,
      `${reschedNewDate} (Reason: ${reschedReason.trim()})`
    );
    setRescheduleTarget(null);
    setReschedReason('');
  };

  const filteredOps = useMemo(() => {
    return operations.filter((op) => {
      const expiryInd = calculatePoExpiryIndicator(op.poExpiryDate, todayStr);
      const isPending =
        op.shipmentStatus !== 'Delivered' &&
        op.shipmentStatus !== 'Cancelled' &&
        op.shipmentStatus !== 'Returned';

      if (diagnosticLens === 'DELAYED') {
        if (!isPending || (op.shipmentStatus !== 'On Hold' && expiryInd !== 'Expired'))
          return false;
      } else if (diagnosticLens === 'MISSING_APPT') {
        if (!isPending || op.appointmentDate) return false;
      } else if (diagnosticLens === 'OVERDUE_FOLLOWUP') {
        if (!isPending || !op.nextFollowUpDate || op.nextFollowUpDate > todayStr) return false;
      } else if (diagnosticLens === 'APPROACHING_EXPIRY') {
        if (!isPending || expiryInd === 'Safe') return false;
      } else if (diagnosticLens === 'PENDING_DELIVERY') {
        if (!isPending) return false;
      }

      if (courierFilter !== 'ALL' && op.courierName !== courierFilter) return false;
      if (warehouseFilter !== 'ALL' && op.warehouse !== warehouseFilter) return false;
      if (statusFilter !== 'ALL' && op.shipmentStatus !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${op.recordCode} ${op.poNumber} ${op.invoiceNumber} ${op.lrNumber} ${op.vehicleNumber} ${op.sku} ${op.productName} ${op.courierName} ${op.warehouse}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [operations, diagnosticLens, courierFilter, warehouseFilter, statusFilter, searchQuery, todayStr]);

  const handleExport = (fmt: 'csv' | 'xlsx') => {
    const rows = filteredOps.map((op) => ({
      RecordID: op.recordCode,
      PONumber: op.poNumber,
      InvoiceNumber: op.invoiceNumber,
      LRNumber: op.lrNumber,
      Courier: op.courierName,
      VehicleNumber: op.vehicleNumber,
      DriverName: op.driverName,
      DriverContact: op.driverContact,
      SKU: op.sku,
      ProductName: op.productName,
      Quantity: op.quantity,
      Warehouse: op.warehouse,
      DispatchDate: op.dispatchDate,
      AppointmentDate: op.appointmentDate,
      POExpiryDate: op.poExpiryDate,
      ExpiryIndicator: calculatePoExpiryIndicator(op.poExpiryDate, todayStr),
      ShipmentStatus: op.shipmentStatus,
      AppointmentStatus: op.appointmentStatus,
      NextFollowUpDate: op.nextFollowUpDate,
      Remarks: op.remarks,
    }));
    if (fmt === 'csv') exportRowsToCSV('worktrack_operations.csv', rows);
    else exportRowsToXLSX('worktrack_operations.xlsx', 'Operations', rows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {mode === 'shipments'
              ? 'Courier Shipments & Line-Haul Dispatch'
              : 'Operations Tracker — Appointments, POs & Deliveries'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Track courier consignments, warehouse appointment reschedules, and live PO expiry indicators.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export XLSX</span>
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Shipment / Operation</span>
          </button>
        </div>
      </div>

      {/* Diagnostic Lenses */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'PENDING_DELIVERY', label: 'Pending Deliveries' },
            { id: 'APPROACHING_EXPIRY', label: 'Expiring / Expired POs' },
            { id: 'MISSING_APPT', label: 'Missing Appointments' },
            { id: 'DELAYED', label: 'Delayed / On Hold' },
            { id: 'OVERDUE_FOLLOWUP', label: 'Overdue Follow-ups' },
          ].map((lens) => (
            <button
              key={lens.id}
              type="button"
              onClick={() => {
                setDiagnosticLens(lens.id);
                setGlobalOpsFilter(lens.id);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                diagnosticLens === lens.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {lens.label}
            </button>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search by PO, Invoice, LR, Vehicle, SKU"
              placeholder="Search PO, Invoice, LR, Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-60"
            />
          </div>

          <select
            aria-label="Filter by Courier"
            value={courierFilter}
            onChange={(e) => setCourierFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Couriers</option>
            {couriers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Warehouse"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Shipment Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Statuses</option>
            {SHIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Operations Data Grid */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">PO / Invoice / LR</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">Courier & Vehicle</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">SKU & Warehouse</th>
                <th className="py-2.5 px-2 font-semibold whitespace-nowrap text-right">Qty</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">Appointment</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">PO Expiry</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">Shipment Status</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">Follow-up & Remarks</th>
                <th className="py-2.5 px-2.5 font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOps.map((op) => {
                const indicator = calculatePoExpiryIndicator(op.poExpiryDate, todayStr);
                const indicatorColor =
                  indicator === 'Expired' || indicator === 'Expiring Today'
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : indicator === 'Expiring Within 3 Days'
                    ? 'text-amber-600 dark:text-amber-400 font-semibold'
                    : indicator === 'Expiring Within 7 Days'
                    ? 'text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-emerald-700 dark:text-emerald-400';

                return (
                  <tr
                    key={op.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-2.5 align-top">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {op.poNumber}
                      </div>
                      <div className="font-mono text-slate-500 mt-0.5 text-[11px]">
                        {op.lrNumber || 'No LR'} · {op.invoiceNumber || 'No INV'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">{op.recordCode}</div>
                    </td>
                    <td className="py-2.5 px-2.5 align-top max-w-[140px]">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {op.courierName}
                      </div>
                      <div className="font-mono text-slate-500 mt-0.5 text-[11px]">
                        {op.vehicleNumber || 'Vehicle TBD'}
                      </div>
                      {op.driverName && (
                        <div className="text-slate-500 mt-0.5 text-[11px] truncate">
                          {op.driverName}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 align-top max-w-[165px]">
                      <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {op.warehouse}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 truncate mt-0.5 text-[11px]">
                        <span className="font-mono">{op.sku}</span> · {op.productName}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 align-top text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {op.quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2.5 align-top">
                      {op.appointmentDate ? (
                        <div className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          {op.appointmentDate}
                        </div>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Missing</span>
                        </span>
                      )}
                      <div className="text-slate-500 mt-0.5 text-[11px]">{op.appointmentStatus}</div>
                      {op.rescheduleHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setHistoryDrawerOp(op)}
                          className="text-[11px] text-blue-800 dark:text-blue-400 hover:underline mt-0.5 flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />
                          <span>{op.rescheduleHistory.length} change(s)</span>
                        </button>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 align-top">
                      <div className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {op.poExpiryDate}
                      </div>
                      <div className={`mt-0.5 text-[11px] ${indicatorColor}`}>{indicator}</div>
                    </td>
                    <td className="py-2.5 px-2.5 align-top">
                      <select
                        aria-label={`Shipment status for ${op.poNumber}`}
                        value={op.shipmentStatus}
                        onChange={async (e) => {
                          const newSt = e.target.value as ShipmentStatus;
                          const { id, ownerId: _ow, ...rest } = op;
                          await saveOperation(
                            {
                              ...rest,
                              shipmentStatus: newSt,
                              deliveryDate:
                                newSt === 'Delivered' && !rest.deliveryDate
                                  ? todayStr
                                  : rest.deliveryDate,
                            },
                            id,
                            'Shipment Status Changed',
                            op.shipmentStatus,
                            newSt
                          );
                        }}
                        className="text-xs font-medium bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1"
                      >
                        {SHIPMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {op.issueCategory && op.issueCategory !== 'None' && (
                        <div className="text-red-600 dark:text-red-400 mt-1 text-[11px]">
                          {op.issueCategory}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-2.5 align-top max-w-[155px]">
                      <div className="font-mono tabular-nums text-slate-700 dark:text-slate-300 text-[11px]">
                        Next: {op.nextFollowUpDate || 'N/A'}
                      </div>
                      <div className="text-slate-500 line-clamp-2 mt-0.5 text-[11px]">{op.remarks}</div>
                    </td>
                    <td className="py-2.5 px-2.5 align-top">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleTarget(op);
                            setReschedField('Appointment Date');
                            setReschedNewDate(op.appointmentDate || todayStr);
                            setReschedReason('');
                          }}
                          title="Reschedule Appointment or Extend Expiry with Audit Trail"
                          aria-label={`Reschedule ${op.poNumber}`}
                          className="p-1 text-slate-600 hover:text-blue-700 rounded"
                        >
                          <CalendarClock className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(op)}
                          title="Edit Record"
                          aria-label={`Edit ${op.poNumber}`}
                          className="p-1 text-slate-600 hover:text-blue-700 rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteOperation(op.id)}
                          title="Delete Record"
                          aria-label={`Delete ${op.poNumber}`}
                          className="p-1 text-slate-600 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOps.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No operations records match the active filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule Appointment / Extend PO Expiry Modal */}
      {rescheduleTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Record Date Change — {rescheduleTarget.poNumber}
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Date Field to Update
                </label>
                <select
                  value={reschedField}
                  onChange={(e) =>
                    setReschedField(e.target.value as 'Appointment Date' | 'PO Expiry Date')
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Appointment Date">Appointment Date</option>
                  <option value="PO Expiry Date">PO Expiry Date (Manual Extension)</option>
                </select>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Previous {reschedField}:{' '}
                <span className="font-mono font-semibold">
                  {reschedField === 'Appointment Date'
                    ? rescheduleTarget.appointmentDate || 'Unscheduled'
                    : rescheduleTarget.poExpiryDate}
                </span>{' '}
                (Will be preserved in history)
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Date *
                </label>
                <input
                  type="date"
                  required
                  value={reschedNewDate}
                  onChange={(e) => setReschedNewDate(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Change *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g., Warehouse dock full; buyer approved 48h extension"
                  value={reschedReason}
                  onChange={(e) => setReschedReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleTarget(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold rounded bg-blue-900 text-white hover:bg-blue-800"
                >
                  Save & Log Audit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule History Drawer */}
      {historyDrawerOp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Appointment & Expiry Audit Trail — {historyDrawerOp.poNumber}
              </h3>
              <button
                type="button"
                onClick={() => setHistoryDrawerOp(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {historyDrawerOp.rescheduleHistory.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <div className="flex justify-between font-medium text-slate-900 dark:text-slate-100">
                    <span>{h.fieldChanged}</span>
                    <span className="font-mono text-slate-500">{h.timestamp}</span>
                  </div>
                  <div className="font-mono text-blue-800 dark:text-blue-400 mt-1">
                    {h.previousDate} → {h.newDate}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1">Reason: {h.reason}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Updated by: {h.updatedBy}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Operation Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingOp ? `Edit Operation ${editingOp.recordCode}` : 'Add Operations / Shipment Record'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveOperation} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium mb-1">Record ID</label>
                  <input
                    type="text"
                    value={formRecordCode}
                    onChange={(e) => setFormRecordCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">PO Number *</label>
                  <input
                    type="text"
                    required
                    value={formPoNumber}
                    onChange={(e) => setFormPoNumber(e.target.value)}
                    placeholder="PO-88501"
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Invoice Number</label>
                  <input
                    type="text"
                    value={formInvoice}
                    onChange={(e) => setFormInvoice(e.target.value)}
                    placeholder="INV-2026-1050"
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">LR / AWB Number</label>
                  <input
                    type="text"
                    value={formLr}
                    onChange={(e) => setFormLr(e.target.value)}
                    placeholder="LR-990123"
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium mb-1">Courier Name *</label>
                  <input
                    type="text"
                    required
                    value={formCourier}
                    onChange={(e) => setFormCourier(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    value={formVehicle}
                    onChange={(e) => setFormVehicle(e.target.value)}
                    placeholder="MH-04-KU-8821"
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Driver Name</label>
                  <input
                    type="text"
                    value={formDriverName}
                    onChange={(e) => setFormDriverName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Driver Contact</label>
                  <input
                    type="text"
                    value={formDriverContact}
                    onChange={(e) => setFormDriverContact(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium mb-1">SKU / Article</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Product Name</label>
                  <input
                    type="text"
                    value={formProduct}
                    onChange={(e) => setFormProduct(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-medium mb-1">Warehouse / Fulfilment Centre *</label>
                  <input
                    type="text"
                    required
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Shipment Status</label>
                  <select
                    value={formShipmentStatus}
                    onChange={(e) => setFormShipmentStatus(e.target.value as ShipmentStatus)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {SHIPMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Appointment Status</label>
                  <input
                    type="text"
                    value={formApptStatus}
                    onChange={(e) => setFormApptStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block font-medium mb-1">PO Creation</label>
                  <input
                    type="date"
                    value={formPoCreateDate}
                    onChange={(e) => setFormPoCreateDate(e.target.value)}
                    className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    value={formDispatchDate}
                    onChange={(e) => setFormDispatchDate(e.target.value)}
                    className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Appointment Date</label>
                  <input
                    type="date"
                    value={formApptDate}
                    onChange={(e) => setFormApptDate(e.target.value)}
                    className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">PO Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={formPoExpiryDate}
                    onChange={(e) => setFormPoExpiryDate(e.target.value)}
                    className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Next Follow-up</label>
                  <input
                    type="date"
                    value={formFollowUpDate}
                    onChange={(e) => setFormFollowUpDate(e.target.value)}
                    className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Issue Category & Description</label>
                  <input
                    type="text"
                    value={formIssueDesc}
                    onChange={(e) => setFormIssueDesc(e.target.value)}
                    placeholder="Optional delivery or dock issue details"
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Internal Remarks</label>
                  <input
                    type="text"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-lg bg-blue-900 text-white hover:bg-blue-800"
                >
                  {editingOp ? 'Update Record' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
