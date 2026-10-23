import React, { useState, useMemo } from 'react';
import {
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
  PO_STATUSES,
  POChangeEntry,
  POStatus,
  PurchaseOrderRecord,
} from '../types/worktrack';
import { calculatePoExpiryIndicator } from '../utils/operationsLogic';
import { exportRowsToCSV, exportRowsToXLSX } from '../utils/exportUtils';

export const PurchaseOrdersView: React.FC = () => {
  const {
    purchaseOrders,
    operations,
    todayStr,
    savePurchaseOrder,
    deletePurchaseOrder,
  } = useWorkTrack();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lens, setLens] = useState<'ALL' | 'EXPIRED' | 'NO_APPT' | 'PENDING_QTY'>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrderRecord | null>(null);
  const [changeModalPO, setChangeModalPO] = useState<PurchaseOrderRecord | null>(null);
  const [historyPO, setHistoryPO] = useState<PurchaseOrderRecord | null>(null);

  // Change Modal fields (Preserves Original & Previous Dates)
  const [changeField, setChangeField] = useState<'Appointment Date' | 'Expiry Date'>('Expiry Date');
  const [changeNewDate, setChangeNewDate] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // Form fields
  const [formPoNum, setFormPoNum] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formCourier, setFormCourier] = useState('Delhivery B2B');
  const [formWarehouse, setFormWarehouse] = useState('Mumbai Bhiwandi FC-02');
  const [formCreateDate, setFormCreateDate] = useState(todayStr);
  const [formApptDate, setFormApptDate] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState(todayStr);
  const [formStatus, setFormStatus] = useState<POStatus>('Open');
  const [formExpQty, setFormExpQty] = useState('500');
  const [formRecQty, setFormRecQty] = useState('0');
  const [formInvoices, setFormInvoices] = useState('');
  const [formLRs, setFormLRs] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const openAddModal = () => {
    setEditingPO(null);
    setFormPoNum(`PO-${88500 + purchaseOrders.length}`);
    setFormVendor('');
    setFormCourier('Delhivery B2B');
    setFormWarehouse('Mumbai Bhiwandi FC-02');
    setFormCreateDate(todayStr);
    setFormApptDate('');
    setFormExpiryDate(todayStr);
    setFormStatus('Open');
    setFormExpQty('480');
    setFormRecQty('0');
    setFormInvoices('');
    setFormLRs('');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (po: PurchaseOrderRecord) => {
    setEditingPO(po);
    setFormPoNum(po.poNumber);
    setFormVendor(po.vendor);
    setFormCourier(po.courier);
    setFormWarehouse(po.warehouse);
    setFormCreateDate(po.poCreationDate);
    setFormApptDate(po.currentAppointmentDate);
    setFormExpiryDate(po.currentExpiryDate);
    setFormStatus(po.poStatus);
    setFormExpQty(String(po.expectedQuantity));
    setFormRecQty(String(po.receivedQuantity));
    setFormInvoices(po.relatedInvoices);
    setFormLRs(po.relatedLRs);
    setFormNotes(po.notes);
    setIsModalOpen(true);
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    const exp = Math.max(0, Number(formExpQty) || 0);
    const rec = Math.max(0, Number(formRecQty) || 0);
    const pending = Math.max(0, exp - rec);

    await savePurchaseOrder(
      {
        poNumber: formPoNum.trim(),
        vendor: formVendor.trim() || 'Supplier',
        courier: formCourier.trim(),
        warehouse: formWarehouse.trim(),
        poCreationDate: formCreateDate,
        // Preserve original historical dates when editing
        originalAppointmentDate: editingPO
          ? editingPO.originalAppointmentDate || formApptDate
          : formApptDate,
        currentAppointmentDate: formApptDate,
        originalExpiryDate: editingPO
          ? editingPO.originalExpiryDate || formExpiryDate
          : formExpiryDate,
        currentExpiryDate: formExpiryDate,
        poStatus: formStatus,
        expectedQuantity: exp,
        receivedQuantity: rec,
        pendingQuantity: pending,
        relatedInvoices: formInvoices.trim(),
        relatedLRs: formLRs.trim(),
        notes: formNotes.trim(),
        changeHistory: editingPO ? editingPO.changeHistory : [],
      },
      editingPO?.id
    );
    setIsModalOpen(false);
  };

  const handleDateExtensionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeModalPO || !changeNewDate || !changeReason.trim()) return;

    const prevValue =
      changeField === 'Appointment Date'
        ? changeModalPO.currentAppointmentDate || 'Unscheduled'
        : changeModalPO.currentExpiryDate;

    const entry: POChangeEntry = {
      id: `poch-${Date.now()}`,
      field: changeField,
      previousValue: prevValue,
      newValue: changeNewDate,
      reason: changeReason.trim(),
      updatedBy: 'simple.sooraj@gmail.com',
      timestamp: `${todayStr} ${new Date().toTimeString().slice(0, 5)}`,
    };

    const { id, ownerId: _ow, ...rest } = changeModalPO;
    await savePurchaseOrder(
      {
        ...rest,
        originalAppointmentDate:
          rest.originalAppointmentDate || rest.currentAppointmentDate || changeNewDate,
        currentAppointmentDate:
          changeField === 'Appointment Date' ? changeNewDate : rest.currentAppointmentDate,
        originalExpiryDate: rest.originalExpiryDate || rest.currentExpiryDate,
        currentExpiryDate:
          changeField === 'Expiry Date' ? changeNewDate : rest.currentExpiryDate,
        changeHistory: [entry, ...(rest.changeHistory || [])],
      },
      id,
      changeField === 'Appointment Date' ? 'PO Appointment Rescheduled' : 'PO Expiry Extended',
      prevValue,
      `${changeNewDate} (${changeReason.trim()})`
    );

    setChangeModalPO(null);
    setChangeReason('');
  };

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const ind = calculatePoExpiryIndicator(po.currentExpiryDate, todayStr);
      if (lens === 'EXPIRED' && ind !== 'Expired' && ind !== 'Expiring Today') return false;
      if (lens === 'NO_APPT' && po.currentAppointmentDate) return false;
      if (lens === 'PENDING_QTY' && po.pendingQuantity <= 0) return false;
      if (statusFilter !== 'ALL' && po.poStatus !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${po.poNumber} ${po.vendor} ${po.courier} ${po.warehouse} ${po.relatedInvoices} ${po.relatedLRs}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [purchaseOrders, lens, statusFilter, searchQuery, todayStr]);

  const handleExport = (fmt: 'csv' | 'xlsx') => {
    const rows = filteredPOs.map((po) => ({
      PONumber: po.poNumber,
      Vendor: po.vendor,
      Courier: po.courier,
      Warehouse: po.warehouse,
      POCreationDate: po.poCreationDate,
      OriginalAppointmentDate: po.originalAppointmentDate,
      CurrentAppointmentDate: po.currentAppointmentDate,
      OriginalExpiryDate: po.originalExpiryDate,
      CurrentExpiryDate: po.currentExpiryDate,
      POStatus: po.poStatus,
      ExpectedQty: po.expectedQuantity,
      ReceivedQty: po.receivedQuantity,
      PendingQty: po.pendingQuantity,
      RelatedInvoices: po.relatedInvoices,
      RelatedLRs: po.relatedLRs,
      Notes: po.notes,
    }));
    if (fmt === 'csv') exportRowsToCSV('worktrack_purchase_orders.csv', rows);
    else exportRowsToXLSX('worktrack_purchase_orders.xlsx', 'PurchaseOrders', rows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Purchase Order Lifecycle & Expiry Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Track original vs current appointment & expiry dates, pending quantities, and linked shipments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center gap-1.5"
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
            <span>New Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {[
            { id: 'ALL', label: 'All POs' },
            { id: 'EXPIRED', label: 'Expired / Expiring Today' },
            { id: 'NO_APPT', label: 'Without Appointment' },
            { id: 'PENDING_QTY', label: 'With Pending Quantity' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLens(item.id as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                lens === item.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PO, vendor, LR, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-56"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All PO Statuses</option>
            {PO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PO Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">PO Number & Vendor</th>
                <th className="py-2.5 px-3 font-semibold">Warehouse & Courier</th>
                <th className="py-2.5 px-3 font-semibold">Appointment (Orig → Curr)</th>
                <th className="py-2.5 px-3 font-semibold">Expiry Date (Orig → Curr)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Exp / Rec / Pend Qty</th>
                <th className="py-2.5 px-3 font-semibold">Status</th>
                <th className="py-2.5 px-3 font-semibold">Linked Shipments / LRs</th>
                <th className="py-2.5 px-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPOs.map((po) => {
                const indicator = calculatePoExpiryIndicator(po.currentExpiryDate, todayStr);
                const linkedOpsCount = operations.filter((o) => o.poNumber === po.poNumber).length;
                return (
                  <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 align-top">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {po.poNumber}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 mt-0.5">{po.vendor}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Created: {po.poCreationDate}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {po.warehouse}
                      </div>
                      <div className="text-slate-500 mt-0.5">{po.courier}</div>
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums">
                      {po.currentAppointmentDate ? (
                        <div>
                          <span className="text-slate-400">
                            {po.originalAppointmentDate || po.currentAppointmentDate}
                          </span>{' '}
                          →{' '}
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {po.currentAppointmentDate}
                          </span>
                        </div>
                      ) : (
                        <span className="font-sans text-red-600 dark:text-red-400 font-semibold">
                          No Appointment
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-mono tabular-nums">
                        <span className="text-slate-400">
                          {po.originalExpiryDate || po.currentExpiryDate}
                        </span>{' '}
                        →{' '}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {po.currentExpiryDate}
                        </span>
                      </div>
                      <div
                        className={`mt-0.5 font-medium ${
                          indicator === 'Expired' || indicator === 'Expiring Today'
                            ? 'text-red-600 dark:text-red-400'
                            : indicator === 'Safe'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {indicator}
                      </div>
                      {po.changeHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setHistoryPO(po)}
                          className="text-[11px] text-blue-800 dark:text-blue-400 hover:underline mt-0.5 flex items-center gap-1"
                        >
                          <History className="w-3 h-3" />
                          <span>{po.changeHistory.length} audit log(s)</span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums">
                      <div className="text-slate-900 dark:text-slate-100 font-semibold">
                        {po.expectedQuantity} / {po.receivedQuantity} /{' '}
                        <span
                          className={
                            po.pendingQuantity > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600'
                          }
                        >
                          {po.pendingQuantity}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {po.poStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-mono text-slate-700 dark:text-slate-300">
                        LRs: {po.relatedLRs || 'None'}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Invoices: {po.relatedInvoices || 'None'} · {linkedOpsCount} linked shipment(s)
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setChangeModalPO(po);
                            setChangeField('Expiry Date');
                            setChangeNewDate(po.currentExpiryDate);
                            setChangeReason('');
                          }}
                          title="Reschedule Appointment or Extend Expiry"
                          className="p-1 text-slate-600 hover:text-blue-700 rounded"
                        >
                          <CalendarClock className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(po)}
                          title="Edit PO"
                          className="p-1 text-slate-600 hover:text-blue-700 rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePurchaseOrder(po.id)}
                          title="Delete PO"
                          className="p-1 text-slate-600 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extend Expiry / Reschedule Appointment Modal */}
      {changeModalPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Extend Expiry / Reschedule — {changeModalPO.poNumber}
              </h3>
              <button type="button" onClick={() => setChangeModalPO(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleDateExtensionSubmit} className="space-y-3">
              <div>
                <label className="block font-medium mb-1">Field to Update</label>
                <select
                  value={changeField}
                  onChange={(e) =>
                    setChangeField(e.target.value as 'Appointment Date' | 'Expiry Date')
                  }
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="Expiry Date">Current Expiry Date (Extension)</option>
                  <option value="Appointment Date">Current Appointment Date (Reschedule)</option>
                </select>
              </div>
              <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800">
                Original date and previous date are preserved in the audit log automatically.
              </div>
              <div>
                <label className="block font-medium mb-1">New Date *</label>
                <input
                  type="date"
                  required
                  value={changeNewDate}
                  onChange={(e) => setChangeNewDate(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Reason for Change *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Record buyer approval reference or dock delay reason..."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangeModalPO(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold rounded bg-blue-900 text-white"
                >
                  Confirm & Preserve History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Change History Modal */}
      {historyPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                PO Audit History — {historyPO.poNumber}
              </h3>
              <button type="button" onClick={() => setHistoryPO(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {historyPO.changeHistory.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800"
                >
                  <div className="flex justify-between font-semibold">
                    <span>{ch.field}</span>
                    <span className="font-mono text-slate-500">{ch.timestamp}</span>
                  </div>
                  <div className="font-mono text-blue-800 dark:text-blue-400 mt-1">
                    {ch.previousValue} → {ch.newValue}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1">Reason: {ch.reason}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Updated by: {ch.updatedBy}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {editingPO ? `Edit ${editingPO.poNumber}` : 'Create Purchase Order'}
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSavePO} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">PO Number *</label>
                  <input
                    type="text"
                    required
                    value={formPoNum}
                    onChange={(e) => setFormPoNum(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Vendor *</label>
                  <input
                    type="text"
                    required
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Warehouse *</label>
                  <input
                    type="text"
                    required
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-medium mb-1">Courier</label>
                  <input
                    type="text"
                    value={formCourier}
                    onChange={(e) => setFormCourier(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">PO Creation Date</label>
                  <input
                    type="date"
                    value={formCreateDate}
                    onChange={(e) => setFormCreateDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Appointment Date</label>
                  <input
                    type="date"
                    value={formApptDate}
                    onChange={(e) => setFormApptDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">PO Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as POStatus)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {PO_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Expected Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formExpQty}
                    onChange={(e) => setFormExpQty(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Received Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={formRecQty}
                    onChange={(e) => setFormRecQty(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Related Invoices</label>
                  <input
                    type="text"
                    value={formInvoices}
                    onChange={(e) => setFormInvoices(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Related LRs</label>
                  <input
                    type="text"
                    value={formLRs}
                    onChange={(e) => setFormLRs(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded bg-blue-900 text-white"
                >
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
