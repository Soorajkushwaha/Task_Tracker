import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import {
  CheckSquare,
  Copy,
  Download,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkTrack } from '../context/WorkTrackContext';
import {
  PRIORITY_LEVELS,
  PriorityLevel,
  TASK_CATEGORIES,
  TASK_STATUSES,
  TaskCategory,
  TaskRecord,
  TaskStatus,
} from '../types/worktrack';
import { exportRowsToCSV, exportRowsToXLSX } from '../utils/exportUtils';

export const TasksView: React.FC = () => {
  const {
    tasks,
    projects,
    todayStr,
    globalTaskFilter,
    setGlobalTaskFilter,
    saveTask,
    deleteTask,
    bulkUpdateTasks,
    duplicateTask,
    startTimer,
  } = useWorkTrack();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof TaskRecord>('dueDate');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const pageSize = 15;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<TaskStatus>('In Progress');
  const [bulkCategory, setBulkCategory] = useState<TaskCategory>('Operations');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>({});

  // Modal / Drawer state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [drawerTask, setDrawerTask] = useState<TaskRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCat, setFormCat] = useState<TaskCategory>('Operations');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('High');
  const [formStatus, setFormStatus] = useState<TaskStatus>('Not Started');
  const [formStartDate, setFormStartDate] = useState(todayStr);
  const [formDueDate, setFormDueDate] = useState(todayStr);
  const [formAssignedBy, setFormAssignedBy] = useState('Self');
  const [formAssignedTo, setFormAssignedTo] = useState('Sooraj');
  const [formEstHours, setFormEstHours] = useState('2');
  const [formActHours, setFormActHours] = useState('0');
  const [formTags, setFormTags] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formError, setFormError] = useState('');

  // Subtask & comment inputs inside Drawer
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newCommentText, setNewCommentText] = useState('');

  const openCreateModal = () => {
    setEditingTask(null);
    setFormCode(`TSK-${1050 + tasks.length}`);
    setFormTitle('');
    setFormDesc('');
    setFormCat('Operations');
    setFormPriority('High');
    setFormStatus('Not Started');
    setFormStartDate(todayStr);
    setFormDueDate(todayStr);
    setFormAssignedBy('Self');
    setFormAssignedTo('Sooraj');
    setFormEstHours('2');
    setFormActHours('0');
    setFormTags('');
    setFormNotes('');
    setFormProjectId('');
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (t: TaskRecord) => {
    setEditingTask(t);
    setFormCode(t.taskCode);
    setFormTitle(t.title);
    setFormDesc(t.description);
    setFormCat(t.category);
    setFormPriority(t.priority);
    setFormStatus(t.status);
    setFormStartDate(t.startDate || todayStr);
    setFormDueDate(t.dueDate || todayStr);
    setFormAssignedBy(t.assignedBy || 'Self');
    setFormAssignedTo(t.assignedTo || 'Sooraj');
    setFormEstHours(String(t.estimatedHours));
    setFormActHours(String(t.actualHours));
    setFormTags((t.tags || []).join(', '));
    setFormNotes(t.notes || '');
    setFormProjectId(t.projectId || '');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Task Title is required.');
      return;
    }
    if (!formDueDate) {
      setFormError('Due Date is required.');
      return;
    }
    const tagsList = formTags
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    await saveTask(
      {
        taskCode: formCode.trim() || `TSK-${1050 + tasks.length}`,
        title: formTitle.trim(),
        description: formDesc.trim(),
        category: formCat,
        priority: formPriority,
        status: formStatus,
        createdDate: editingTask ? editingTask.createdDate : todayStr,
        startDate: formStartDate,
        dueDate: formDueDate,
        completedDate:
          formStatus === 'Completed'
            ? editingTask?.completedDate || todayStr
            : '',
        assignedBy: formAssignedBy.trim() || 'Self',
        assignedTo: formAssignedTo.trim() || 'Sooraj',
        estimatedHours: Number(formEstHours) || 0,
        actualHours: Number(formActHours) || 0,
        tags: tagsList,
        notes: formNotes.trim(),
        subtasks: editingTask ? editingTask.subtasks : [],
        comments: editingTask ? editingTask.comments : [],
        projectId: formProjectId,
      },
      editingTask?.id
    );
    setIsFormOpen(false);
  };

  const filteredTasks = useMemo(() => {
    const list = tasks.filter((t) => {
      if (globalTaskFilter === 'PENDING') {
        if (t.status === 'Completed' || t.status === 'Cancelled') return false;
      } else if (globalTaskFilter === 'OVERDUE') {
        if (t.status === 'Completed' || t.status === 'Cancelled' || t.dueDate >= todayStr)
          return false;
      } else if (globalTaskFilter === 'DUE_TODAY') {
        if (t.status === 'Completed' || t.status === 'Cancelled' || t.dueDate !== todayStr)
          return false;
      } else if (globalTaskFilter !== 'ALL') {
        if (t.status !== globalTaskFilter) return false;
      }

      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${t.taskCode} ${t.title} ${t.description} ${t.assignedBy} ${t.assignedTo} ${t.notes} ${(t.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const va = String(a[sortField] ?? '');
      const vb = String(b[sortField] ?? '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [tasks, globalTaskFilter, categoryFilter, priorityFilter, searchQuery, todayStr, sortField, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const paginatedTasks = useMemo(
    () => filteredTasks.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [filteredTasks, pageIndex]
  );

  const toggleSort = (field: keyof TaskRecord) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const handleInlineChange = async (
    task: TaskRecord,
    patch: Partial<TaskRecord>
  ) => {
    const merged: TaskRecord = {
      ...task,
      ...patch,
      completedDate:
        patch.status === 'Completed'
          ? task.completedDate || todayStr
          : patch.status
          ? ''
          : task.completedDate,
    };
    const { id, ownerId: _ow, ...rest } = merged;
    await saveTask(rest, id);
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    const rows = filteredTasks.map((t) => ({
      TaskID: t.taskCode,
      Title: t.title,
      Category: t.category,
      Priority: t.priority,
      Status: t.status,
      CreatedDate: t.createdDate,
      StartDate: t.startDate,
      DueDate: t.dueDate,
      CompletedDate: t.completedDate,
      AssignedBy: t.assignedBy,
      AssignedTo: t.assignedTo,
      EstimatedHours: t.estimatedHours,
      ActualHours: t.actualHours,
      Tags: (t.tags || []).join('; '),
      Notes: t.notes,
    }));
    if (format === 'csv') exportRowsToCSV('worktrack_tasks.csv', rows);
    else exportRowsToXLSX('worktrack_tasks.xlsx', 'Tasks', rows);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            My Tasks Spreadsheet
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Inline spreadsheet editing, bulk status/category updates, subtasks, and time logging.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export XLSX</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filter Bar & Saved Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
          {[
            { id: 'ALL', label: 'All Tasks' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'In Progress', label: 'In Progress' },
            { id: 'OVERDUE', label: 'Overdue' },
            { id: 'DUE_TODAY', label: 'Due Today' },
            { id: 'Completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setGlobalTaskFilter(tab.id);
                setPageIndex(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                globalTaskFilter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search tasks"
              placeholder="Search ID, title, notes, assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 w-56"
            />
          </div>

          <select
            aria-label="Filter by Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Categories</option>
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by Priority"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">All Priorities</option>
            {PRIORITY_LEVELS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnMenu((v) => !v)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
            >
              Columns
            </button>
            {showColumnMenu && (
              <div className="absolute right-0 mt-1 w-44 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg z-20 space-y-1">
                {['category', 'priority', 'status', 'dueDate', 'estimatedHours'].map((colKey) => (
                  <label key={colKey} className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!hiddenColumns[colKey]}
                      onChange={() =>
                        setHiddenColumns((prev) => ({ ...prev, [colKey]: !prev[colKey] }))
                      }
                    />
                    <span className="capitalize">{colKey}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Update Toolbar */}
      {selectedIds.size > 0 && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-blue-950 dark:text-blue-200">
            <CheckSquare className="w-4 h-4" />
            <span>{selectedIds.size} task(s) selected</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Bulk Status Selection"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as TaskStatus)}
              className="px-2.5 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={async () => {
                await bulkUpdateTasks(Array.from(selectedIds), { status: bulkStatus });
                setSelectedIds(new Set());
              }}
              className="px-3 py-1 text-xs font-semibold rounded bg-blue-900 text-white hover:bg-blue-800"
            >
              Apply Status
            </button>

            <select
              aria-label="Bulk Category Selection"
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value as TaskCategory)}
              className="px-2.5 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900"
            >
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={async () => {
                await bulkUpdateTasks(Array.from(selectedIds), { category: bulkCategory });
                setSelectedIds(new Set());
              }}
              className="px-3 py-1 text-xs font-semibold rounded bg-slate-800 text-white hover:bg-slate-700"
            >
              Apply Category
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-400">
                <th className="py-2.5 px-3 font-semibold">
                  <input
                    type="checkbox"
                    aria-label="Select all tasks"
                    checked={filteredTasks.length > 0 && selectedIds.size === filteredTasks.length}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th
                  onClick={() => toggleSort('taskCode')}
                  className="py-2.5 px-3 font-semibold cursor-pointer whitespace-nowrap"
                >
                  Task ID
                </th>
                <th
                  onClick={() => toggleSort('title')}
                  className="py-2.5 px-3 font-semibold cursor-pointer whitespace-nowrap"
                >
                  Task Title
                </th>
                {!hiddenColumns.category && (
                  <th
                    onClick={() => toggleSort('category')}
                    className="py-2.5 px-3 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Category
                  </th>
                )}
                {!hiddenColumns.priority && (
                  <th
                    onClick={() => toggleSort('priority')}
                    className="py-2.5 px-3 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Priority
                  </th>
                )}
                {!hiddenColumns.status && (
                  <th
                    onClick={() => toggleSort('status')}
                    className="py-2.5 px-3 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Status
                  </th>
                )}
                {!hiddenColumns.dueDate && (
                  <th
                    onClick={() => toggleSort('dueDate')}
                    className="py-2.5 px-3 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Due Date
                  </th>
                )}
                {!hiddenColumns.estimatedHours && (
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Est / Actual (h)</th>
                )}
                <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedTasks.map((t) => {
                const isOverdue =
                  t.status !== 'Completed' &&
                  t.status !== 'Cancelled' &&
                  t.dueDate < todayStr;
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 align-middle">
                      <input
                        type="checkbox"
                        aria-label={`Select task ${t.taskCode}`}
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelectRow(t.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {t.taskCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 align-middle">
                      <div className="min-w-[220px]">
                        <button
                          type="button"
                          onClick={() => setDrawerTask(t)}
                          className="text-left font-medium text-slate-900 dark:text-slate-100 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                        >
                          {t.title}
                        </button>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Assigned by {t.assignedBy} · To {t.assignedTo}
                          {t.subtasks.length > 0 &&
                            ` · Subtasks ${t.subtasks.filter((s) => s.completed).length}/${t.subtasks.length}`}
                        </div>
                      </div>
                    </td>
                    {!hiddenColumns.category && (
                      <td className="py-2.5 px-3 align-middle">
                        <select
                          aria-label={`Category for ${t.taskCode}`}
                          value={t.category}
                          onChange={(e) =>
                            handleInlineChange(t, { category: e.target.value as TaskCategory })
                          }
                          className="text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200"
                        >
                          {TASK_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {!hiddenColumns.priority && (
                      <td className="py-2.5 px-3 align-middle">
                        <select
                          aria-label={`Priority for ${t.taskCode}`}
                          value={t.priority}
                          onChange={(e) =>
                            handleInlineChange(t, { priority: e.target.value as PriorityLevel })
                          }
                          className={`text-xs font-medium bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 ${
                            t.priority === 'Critical'
                              ? 'text-red-600 dark:text-red-400'
                              : t.priority === 'High'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {PRIORITY_LEVELS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {!hiddenColumns.status && (
                      <td className="py-2.5 px-3 align-middle">
                        <select
                          aria-label={`Status for ${t.taskCode}`}
                          value={t.status}
                          onChange={(e) =>
                            handleInlineChange(t, { status: e.target.value as TaskStatus })
                          }
                          className={`text-xs font-medium bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 ${
                            t.status === 'Completed'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : t.status === 'Blocked'
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                    {!hiddenColumns.dueDate && (
                      <td className="py-2.5 px-3 align-middle">
                        <input
                          type="date"
                          aria-label={`Due date for ${t.taskCode}`}
                          value={t.dueDate}
                          onChange={(e) => handleInlineChange(t, { dueDate: e.target.value })}
                          className={`text-xs font-mono tabular-nums bg-transparent border border-slate-200 dark:border-slate-700 rounded px-2 py-1 ${
                            isOverdue
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        />
                      </td>
                    )}
                    {!hiddenColumns.estimatedHours && (
                      <td className="py-2.5 px-3 align-middle">
                        <div className="font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {t.estimatedHours}h / {t.actualHours}h
                        </div>
                      </td>
                    )}
                    <td className="py-2.5 px-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDrawerTask(t)}
                          title="Open Details & Subtasks"
                          aria-label={`Details for ${t.taskCode}`}
                          className="p-1 text-slate-500 hover:text-blue-700 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(t)}
                          title="Edit Task"
                          aria-label={`Edit ${t.taskCode}`}
                          className="p-1 text-slate-500 hover:text-blue-700 rounded"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateTask(t)}
                          title="Duplicate Task"
                          aria-label={`Duplicate ${t.taskCode}`}
                          className="p-1 text-slate-500 hover:text-blue-700 rounded"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(t.id)}
                          title="Delete Task"
                          aria-label={`Delete ${t.taskCode}`}
                          className="p-1 text-slate-500 hover:text-red-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-slate-500">
                    No tasks match the current filter criteria. Click "New Task" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div>
            Showing <span className="font-mono tabular-nums">{paginatedTasks.length}</span> of{' '}
            <span className="font-mono tabular-nums">{filteredTasks.length}</span> tasks
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono tabular-nums">
              Page {pageIndex + 1} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              disabled={pageIndex + 1 >= totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Task Modal */}
      {isFormOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 id="task-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingTask ? `Edit Task ${editingTask.taskCode}` : 'Create New Task'}
              </h2>
              <button
                type="button"
                aria-label="Close modal"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Task ID
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g., Audit Q4 Warehouse Appointments"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCat}
                    onChange={(e) => setFormCat(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {PRIORITY_LEVELS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {TASK_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formEstHours}
                    onChange={(e) => setFormEstHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Actual Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formActHours}
                    onChange={(e) => setFormActHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assigned By
                  </label>
                  <input
                    type="text"
                    value={formAssignedBy}
                    onChange={(e) => setFormAssignedBy(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={formAssignedTo}
                    onChange={(e) => setFormAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Linked Project
                  </label>
                  <select
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="">None</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tags (comma-separated, max 10)
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="GRN, Bhiwandi, Urgent"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white"
                >
                  {editingTask ? 'Save Task Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Details Drawer (Subtasks, Comments & Timer Launch) */}
      {drawerTask && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Task Details Drawer"
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-mono text-xs text-slate-500">{drawerTask.taskCode}</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {drawerTask.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {drawerTask.category} · Priority: {drawerTask.priority} · Due: {drawerTask.dueDate}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close drawer"
                  onClick={() => setDrawerTask(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-xs">
                  <span className="text-slate-500">Time Logged:</span>{' '}
                  <span className="font-mono font-semibold">
                    {drawerTask.actualHours}h / {drawerTask.estimatedHours}h est
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    startTimer(
                      drawerTask.id,
                      drawerTask.title,
                      drawerTask.projectId || '',
                      '',
                      `Working on ${drawerTask.taskCode}`
                    );
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-900 text-white hover:bg-blue-800"
                >
                  Start Timer for Task
                </button>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                  Description & Notes
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {drawerTask.description || 'No description provided.'}
                </p>
                {drawerTask.notes && (
                  <p className="text-xs text-slate-500 mt-2">Notes: {drawerTask.notes}</p>
                )}
              </div>

              {/* Subtasks */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Subtasks ({drawerTask.subtasks.filter((s) => s.completed).length}/
                  {drawerTask.subtasks.length})
                </h3>
                <div className="space-y-1.5">
                  {drawerTask.subtasks.map((st) => (
                    <label
                      key={st.id}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={async () => {
                          const updatedSubtasks = drawerTask.subtasks.map((item) =>
                            item.id === st.id ? { ...item, completed: !item.completed } : item
                          );
                          const updated = { ...drawerTask, subtasks: updatedSubtasks };
                          setDrawerTask(updated);
                          await handleInlineChange(drawerTask, { subtasks: updatedSubtasks });
                        }}
                      />
                      <span className={st.completed ? 'line-through text-slate-400' : ''}>
                        {st.title}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add subtask..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newSubtaskTitle.trim()) return;
                      const updatedSubtasks = [
                        ...drawerTask.subtasks,
                        { id: `st-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false },
                      ];
                      const updated = { ...drawerTask, subtasks: updatedSubtasks };
                      setDrawerTask(updated);
                      setNewSubtaskTitle('');
                      await handleInlineChange(drawerTask, { subtasks: updatedSubtasks });
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-slate-900 dark:bg-slate-700 text-white"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Comments & Updates ({drawerTask.comments.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {drawerTask.comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="text-slate-500 font-mono text-[11px]">
                        {c.author} · {c.createdAt}
                      </div>
                      <div className="text-slate-800 dark:text-slate-200 mt-1">{c.text}</div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add comment or progress note..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCommentText.trim()) return;
                      const updatedComments = [
                        ...drawerTask.comments,
                        {
                          id: `cm-${Date.now()}`,
                          author: 'Sooraj',
                          text: newCommentText.trim(),
                          createdAt: `${todayStr} ${new Date().toTimeString().slice(0, 5)}`,
                        },
                      ];
                      const updated = { ...drawerTask, comments: updatedComments };
                      setDrawerTask(updated);
                      setNewCommentText('');
                      await handleInlineChange(drawerTask, { comments: updatedComments });
                    }}
                    className="px-3 py-1.5 text-xs font-medium rounded bg-blue-900 text-white"
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Task Deletion
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to permanently delete this task? This action will be recorded in the Activity History.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteTask(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
