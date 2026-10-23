import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Download,
  MessageSquarePlus,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkTrack } from '../context/WorkTrackContext';
import {
  ESCALATION_STATUSES,
  ESCALATION_TYPES,
  EscalationRecord,
  EscalationStatus,
  EscalationType,
  PRIORITY_LEVELS,
  PriorityLevel,
} from '../types/worktrack';
import { calculateEscalationAgeingDays, diffDaysUTC } from '../utils/operationsLogic';
import { exportRowsToCSV, exportRowsToXLSX } from '../utils/exportUtils';

export const EscalationsView: React.FC = () => {
  const { escalations, todayStr, saveEscalation, deleteEscalation } = useWorkTrack();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [onlyStale, setOnlyStale] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resolutionTarget, setResolutionTarget] = useState<EscalationRecord | null>(null);
  const [updateNote, setUpdateNote] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState(todayStr);

  // New Escalation Form
  const [formCode, setFormCode] = useState('');
  const [formPo, setFormPo] = useState('');
  const [formLr, setFormLr] = useState('');
  const [formCourier, setFormCourier] = useState('Delhivery B2B');
  const [formWarehouse, setFormWarehouse] = useState('Mumbai Bhiwandi FC-02');
  const [formType, setFormType] = useState<EscalationType>('GRN Pending');
  const [formDesc, setFormDesc] = useState('');
  const [formTeam, setFormTeam] = useState('FC Inward Audit');
  const [formPerson, setFormPerson] = useState('Rohan Kulkarni');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('High');
  const [formNextFollow, setFormNextFollow] = useState(todayStr);

  const openNewModal = () => {
    setFormCode(`ESC-${305 + escalations.length}`);
    setFormPo('');
    setFormLr('');
    setFormCourier('Delhivery B2B');
    setFormWarehouse('Mumbai Bhiwandi FC-02');
    setFormType('GRN Pending');
    setFormDesc('');
    setFormTeam('FC Inward Audit');
    setFormPerson('Rohan Kulkarni');
    setFormPriority('High');
    setFormNextFollow(todayStr);
    setIsModalOpen(true);
  };

  const handleCreateEscalation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDesc.trim()) return;
    await saveEscalation({
      escalationCode: formCode.trim() || `ESC-${305 + escalations.length}`,
      relatedPoNumber: formPo.trim(),
      relatedLrNumber: formLr.trim(),
      courierName: formCourier.trim(),
      warehouse: formWarehouse.trim(),
      escalationType: formType,
      issueDescription: formDesc.trim(),
      responsibleTeam: formTeam.trim(),
      assignedPerson: formPerson.trim(),
      createdDate: todayStr,
      priority: formPriority,
      status: 'Open',
      lastFollowUpDate: todayStr,
      nextFollowUpDate: formNextFollow,
      resolutionNotes: '',
      closureDate: '',
      history: [
        {
          id: `eh-${Date.now()}`,
          action: 'Escalation Created',
          note: formDesc.trim(),
          updatedBy: 'simple.sooraj@gmail.com',
          timestamp: `${todayStr} ${new Date().toTimeString().slice(0, 5)}`,
        },
      ],
    });
    setIsModalOpen(false);
  };

  const handleAddResolutionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionTarget || !updateNote.trim()) return;
    const { id, ownerId: _ow, ...rest } = resolutionTarget;
    const newHist = [
      {
        id: `eh-${Date.now()}`,
        action: 'Resolution / Follow-up Update',
        note: updateNote.trim(),
        updatedBy: 'simple.sooraj@gmail.com',
        timestamp: `${todayStr} ${new Date().toTimeString().slice(0, 5)}`,
      },
      ...(rest.history || []),
    ];
    await saveEscalation(
      {
        ...rest,
        lastFollowUpDate: todayStr,
        nextFollowUpDate: nextFollowUp,
        resolutionNotes: updateNote.trim(),
        history: newHist,
      },
      id,
      'Escalation Follow-up Added',
      rest.resolutionNotes,
      updateNote.trim()
    );
    setResolutionTarget(null);
    setUpdateNote('');
  };

  const handleCloseOrReopen = async (esc: EscalationRecord, close: boolean) => {
    const { id, ownerId: _ow, ...rest } = esc;
    const newStatus: EscalationStatus = close ? 'Closed' : 'Reopened';
    const newHist = [
      {
        id: `eh-${Date.now()}`,
        action: close ? 'Escalation Closed' : 'Escalation Reopened',
        note: close ? 'Marked resolved & closed' : 'Reopened for further investigation',
        updatedBy: 'simple.sooraj@gmail.com',
        timestamp: `${todayStr} ${new Date().toTimeString().slice(0, 5)}`,
      },
      ...(rest.history || []),
    ];
    await saveEscalation(
      {
        ...rest,
        status: newStatus,
        closureDate: close ? todayStr : '',
        history: newHist,
      },
      id,
      close ? 'Escalation Closed' : 'Escalation Reopened',
      esc.status,
      newStatus
    );
  };

  const filteredEscalations = useMemo(() => {
    return escalations
      .map((e) => {
        const ageingDays = calculateEscalationAgeingDays(e.createdDate, e.closureDate, todayStr);
        const daysSinceFollowUp = diffDaysUTC(todayStr, e.lastFollowUpDate || e.createdDate) || 0;
        return { ...e, ageingDays, daysSinceFollowUp };
      })
      .filter((e) => {
        if (typeFilter !== 'ALL' && e.escalationType !== typeFilter) return false;
        if (priorityFilter !== 'ALL' && e.priority !== priorityFilter) return false;
        if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
        if (
          onlyStale &&
          (e.status === 'Closed' || e.status === 'Resolved' || e.daysSinceFollowUp < 3)
        ) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const hay = `${e.escalationCode} ${e.relatedPoNumber} ${e.relatedLrNumber} ${e.courierName} ${e.warehouse} ${e.issueDescription} ${e.assignedPerson}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
  }, [escalations, typeFilter, priorityFilter, statusFilter, onlyStale, searchQuery, todayStr]);

  const handleExport = (fmt: 'csv' | 'xlsx') => {
    const rows = filteredEscalations.map((e) => ({
      EscalationID: e.escalationCode,
      RelatedPO: e.relatedPoNumber,
      RelatedLR: e.relatedLrNumber,
      Courier: e.courierName,
      Warehouse: e.warehouse,
      Type: e.escalationType,
      Priority: e.priority,
      Status: e.status,
      CreatedDate: e.createdDate,
      AgeingDays: e.ageingDays,
      LastFollowUp: e.lastFollowUpDate,
      NextFollowUp: e.nextFollowUpDate,
      ResponsibleTeam: e.responsibleTeam,
      AssignedPerson: e.assignedPerson,
      IssueDescription: e.issueDescription,
      ResolutionNotes: e.resolutionNotes,
      ClosureDate: e.closureDate,
    }));
    if (fmt === 'csv') exportRowsToCSV('worktrack_escalations.csv', rows);
    else exportRowsToXLSX('worktrack_escalations.xlsx', 'Escalations', rows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            GRN / DN / RTV Escalations & Ageing Tracker
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Track inward GRN delays, Debit Note disputes, RTV pickups, and automatic ageing in days.
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
            onClick={openNewModal}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Escalation</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Escalation ID, PO, LR, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 w-60"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Escalation Types</option>
            {ESCALATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Priorities</option>
            {PRIORITY_LEVELS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Statuses</option>
            {ESCALATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyStale}
            onChange={(e) => setOnlyStale(e.target.checked)}
          />
          <span>Stale Only (&ge; 3 days without update)</span>
        </label>
      </div>

      {/* Escalations Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">ID & Type</th>
                <th className="py-2.5 px-3 font-semibold">PO / LR & Warehouse</th>
                <th className="py-2.5 px-3 font-semibold">Issue & Resolution Notes</th>
                <th className="py-2.5 px-3 font-semibold">Team & Assignee</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ageing</th>
                <th className="py-2.5 px-3 font-semibold">Priority & Status</th>
                <th className="py-2.5 px-3 font-semibold">Follow-up Dates</th>
                <th className="py-2.5 px-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEscalations.map((esc) => {
                const isClosed = esc.status === 'Closed' || esc.status === 'Resolved';
                return (
                  <tr key={esc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 align-top">
                      <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {esc.escalationCode}
                      </div>
                      <div className="font-medium text-blue-800 dark:text-blue-400 mt-0.5">
                        {esc.escalationType}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-mono font-medium text-slate-900 dark:text-slate-100">
                        {esc.relatedPoNumber || 'N/A'} · {esc.relatedLrNumber || 'N/A'}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {esc.warehouse} · {esc.courierName}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top max-w-[280px]">
                      <div className="text-slate-900 dark:text-slate-100">
                        {esc.issueDescription}
                      </div>
                      {esc.resolutionNotes && (
                        <div className="text-emerald-700 dark:text-emerald-400 mt-1">
                          Latest Update: {esc.resolutionNotes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {esc.assignedPerson}
                      </div>
                      <div className="text-slate-500 mt-0.5">{esc.responsibleTeam}</div>
                    </td>
                    <td className="py-3 px-3 align-top text-right font-mono tabular-nums">
                      <span
                        className={`font-bold ${
                          !isClosed && esc.ageingDays >= 5
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {esc.ageingDays} days
                      </span>
                      <div className="text-[11px] text-slate-400">Since {esc.createdDate}</div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div
                        className={`font-semibold ${
                          esc.priority === 'Critical'
                            ? 'text-red-600 dark:text-red-400'
                            : esc.priority === 'High'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {esc.priority}
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 mt-0.5">{esc.status}</div>
                    </td>
                    <td className="py-3 px-3 align-top font-mono tabular-nums">
                      <div>Last: {esc.lastFollowUpDate || 'N/A'}</div>
                      <div className="text-slate-500 mt-0.5">
                        Next: {esc.nextFollowUpDate || 'Closed'}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setResolutionTarget(esc);
                            setUpdateNote(esc.resolutionNotes || '');
                            setNextFollowUp(esc.nextFollowUpDate || todayStr);
                          }}
                          title="Add Resolution / Follow-up Update"
                          className="p-1 text-slate-600 hover:text-blue-700 rounded"
                        >
                          <MessageSquarePlus className="w-4 h-4" />
                        </button>
                        {isClosed ? (
                          <button
                            type="button"
                            onClick={() => handleCloseOrReopen(esc, false)}
                            title="Reopen Escalation"
                            className="p-1 text-amber-600 hover:text-amber-700 rounded"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCloseOrReopen(esc, true)}
                            title="Close Resolved Escalation"
                            className="p-1 text-emerald-600 hover:text-emerald-700 rounded"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteEscalation(esc.id)}
                          title="Delete Escalation"
                          className="p-1 text-slate-500 hover:text-red-600 rounded"
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

      {/* Add Resolution Update Modal */}
      {resolutionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Log Follow-up / Resolution — {resolutionTarget.escalationCode}
              </h3>
              <button type="button" onClick={() => setResolutionTarget(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddResolutionUpdate} className="space-y-3">
              <div>
                <label className="block font-medium mb-1">Resolution / Follow-up Note *</label>
                <textarea
                  rows={3}
                  required
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                  placeholder="Record ticket number, person spoken to, or resolution details..."
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Next Follow-up Date</label>
                <input
                  type="date"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolutionTarget(null)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold rounded bg-blue-900 text-white"
                >
                  Save Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Escalation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Raise New Operational Escalation
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateEscalation} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Escalation ID</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Escalation Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as EscalationType)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {ESCALATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as PriorityLevel)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {PRIORITY_LEVELS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Related PO Number</label>
                  <input
                    type="text"
                    value={formPo}
                    onChange={(e) => setFormPo(e.target.value)}
                    placeholder="PO-88390"
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Related LR Number</label>
                  <input
                    type="text"
                    value={formLr}
                    onChange={(e) => setFormLr(e.target.value)}
                    placeholder="LR-661204"
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Warehouse</label>
                  <input
                    type="text"
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Courier Name</label>
                  <input
                    type="text"
                    value={formCourier}
                    onChange={(e) => setFormCourier(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Responsible Team</label>
                  <input
                    type="text"
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Assigned Person</label>
                  <input
                    type="text"
                    value={formPerson}
                    onChange={(e) => setFormPerson(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Next Follow-up</label>
                  <input
                    type="date"
                    value={formNextFollow}
                    onChange={(e) => setFormNextFollow(e.target.value)}
                    className="w-full px-2.5 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Issue Description *</label>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
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
                  Create Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
