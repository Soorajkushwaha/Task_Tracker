import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Pause,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useWorkTrack } from '../context/WorkTrackContext';
import {
  ASSIGNMENT_STATUSES,
  AssignmentStatus,
  PRIORITY_LEVELS,
  PriorityLevel,
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  ProjectCategory,
  ProjectStatus,
} from '../types/worktrack';
import { formatDurationMinutes } from '../utils/operationsLogic';
import { exportRowsToCSV, exportRowsToXLSX } from '../utils/exportUtils';

// ============================================================================
// 1. SENIOR ASSIGNMENTS VIEW
// ============================================================================
export const SeniorAssignmentsView: React.FC = () => {
  const { assignments, tasks, todayStr, saveAssignment, deleteAssignment } = useWorkTrack();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assignedBy, setAssignedBy] = useState('Vikram Mehta (VP Operations)');
  const [dueDate, setDueDate] = useState(todayStr);
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [description, setDescription] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await saveAssignment({
      assignmentCode: `ASG-${201 + assignments.length}`,
      title: title.trim(),
      assignedBy: assignedBy.trim(),
      assignedDate: todayStr,
      dueDate,
      priority,
      description: description.trim(),
      status: 'Pending',
      progress: 0,
      comments: '',
      completionDate: '',
      linkedTaskId,
    });
    setTitle('');
    setDescription('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Senior & Manager Assignments
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Personal tracker for executive deliverables, manager mandates, and progress milestones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Record Assignment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map((asg) => {
          const isOverdue = asg.status !== 'Completed' && asg.dueDate < todayStr;
          const linkedTask = tasks.find((t) => t.id === asg.linkedTaskId);
          return (
            <div
              key={asg.id}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs text-slate-500">
                      {asg.assignmentCode} · Assigned by {asg.assignedBy}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {asg.title}
                    </h2>
                  </div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      asg.priority === 'Critical'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {asg.priority}
                  </span>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {asg.description}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>
                    Assigned: <strong className="font-mono">{asg.assignedDate}</strong>
                  </span>
                  <span>·</span>
                  <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                    Due: <strong className="font-mono">{asg.dueDate}</strong>
                    {isOverdue ? ' (Overdue)' : ''}
                  </span>
                  {linkedTask && (
                    <>
                      <span>·</span>
                      <span>
                        Linked Task: <strong className="font-mono">{linkedTask.taskCode}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    Progress:{' '}
                    <strong className="font-mono tabular-nums">{asg.progress}%</strong>
                  </span>
                  <select
                    aria-label={`Status for ${asg.assignmentCode}`}
                    value={asg.status}
                    onChange={async (e) => {
                      const newSt = e.target.value as AssignmentStatus;
                      const { id, ownerId: _ow, ...rest } = asg;
                      await saveAssignment(
                        {
                          ...rest,
                          status: newSt,
                          progress: newSt === 'Completed' ? 100 : rest.progress,
                          completionDate: newSt === 'Completed' ? todayStr : '',
                        },
                        id
                      );
                    }}
                    className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent"
                  >
                    {ASSIGNMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  aria-label={`Progress percentage for ${asg.assignmentCode}`}
                  value={asg.progress}
                  onChange={async (e) => {
                    const val = Number(e.target.value);
                    const { id, ownerId: _ow, ...rest } = asg;
                    await saveAssignment(
                      {
                        ...rest,
                        progress: val,
                        status: val === 100 ? 'Completed' : rest.status,
                        completionDate: val === 100 ? todayStr : '',
                      },
                      id
                    );
                  }}
                  className="w-full accent-blue-900"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{asg.comments}</span>
                  <div className="flex items-center gap-2">
                    {asg.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const { id, ownerId: _ow, ...rest } = asg;
                          await saveAssignment(
                            {
                              ...rest,
                              status: 'Completed',
                              progress: 100,
                              completionDate: todayStr,
                            },
                            id
                          );
                        }}
                        className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-700 text-white hover:bg-emerald-800 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Completed</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteAssignment(asg.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      aria-label={`Delete ${asg.assignmentCode}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold">Record Senior Assignment</h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-medium mb-1">Task / Deliverable Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Assigned By *</label>
                  <input
                    type="text"
                    required
                    value={assignedBy}
                    onChange={(e) => setAssignedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {PRIORITY_LEVELS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Link to Task</label>
                  <select
                    value={linkedTaskId}
                    onChange={(e) => setLinkedTaskId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="">None</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.taskCode} — {t.title.slice(0, 28)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold rounded bg-blue-900 text-white"
                >
                  Save Assignment
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
// 2. PROJECTS VIEW
// ============================================================================
export const ProjectsView: React.FC = () => {
  const { projects, tasks, timeLogs, todayStr, saveProject, deleteProject } = useWorkTrack();
  const [catFilter, setCatFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('Coding Projects');
  const [targetDate, setTargetDate] = useState(todayStr);
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [description, setDescription] = useState('');
  const [milestoneText, setMilestoneText] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const ms = milestoneText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((m, idx) => ({
        id: `ms-${Date.now()}-${idx}`,
        title: m,
        dueDate: targetDate,
        completed: false,
      }));
    await saveProject({
      projectCode: `PRJ-0${projects.length + 1}`,
      name: name.trim(),
      description: description.trim(),
      category,
      startDate: todayStr,
      targetDate,
      status: 'Active',
      priority,
      progress: 0,
      milestones: ms,
      notes: '',
    });
    setName('');
    setDescription('');
    setMilestoneText('');
    setIsModalOpen(false);
  };

  const filtered = projects.filter((p) => catFilter === 'ALL' || p.category === catFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Projects & Milestone Portfolio
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Coding, Data Analytics, Video Creation, Stock Market Research, and Operations initiatives.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-1.5 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg">
        <button
          type="button"
          onClick={() => setCatFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md ${
            catFilter === 'ALL'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All Categories
        </button>
        {PROJECT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCatFilter(c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              catFilter === c
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {filtered.map((prj) => {
          const linkedTasks = tasks.filter((t) => t.projectId === prj.id);
          const loggedMins = timeLogs
            .filter((tl) => tl.projectId === prj.id)
            .reduce((sum, item) => sum + item.durationMinutes, 0);

          return (
            <div
              key={prj.id}
              className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono text-slate-500">
                    {prj.projectCode} · {prj.category}
                  </span>
                  <select
                    aria-label={`Status for ${prj.projectCode}`}
                    value={prj.status}
                    onChange={async (e) => {
                      const { id, ownerId: _ow, ...rest } = prj;
                      await saveProject({ ...rest, status: e.target.value as ProjectStatus }, id);
                    }}
                    className="text-xs rounded border border-slate-200 dark:border-slate-700 bg-transparent px-2 py-0.5"
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {prj.name}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {prj.description}
                </p>

                <div className="mt-3 text-xs text-slate-500 flex items-center gap-2 font-mono tabular-nums">
                  <span>Target: {prj.targetDate}</span>
                  <span>·</span>
                  <span>{linkedTasks.length} tasks</span>
                  <span>·</span>
                  <span>{formatDurationMinutes(loggedMins)} logged</span>
                </div>

                {/* Milestones */}
                <div className="mt-4 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Milestones ({prj.milestones.filter((m) => m.completed).length}/
                    {prj.milestones.length})
                  </div>
                  {prj.milestones.map((ms) => (
                    <label
                      key={ms.id}
                      className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={ms.completed}
                        onChange={async () => {
                          const nextMs = prj.milestones.map((item) =>
                            item.id === ms.id ? { ...item, completed: !item.completed } : item
                          );
                          const pct =
                            nextMs.length > 0
                              ? Math.round(
                                  (nextMs.filter((m) => m.completed).length / nextMs.length) * 100
                                )
                              : prj.progress;
                          const { id, ownerId: _ow, ...rest } = prj;
                          await saveProject({ ...rest, milestones: nextMs, progress: pct }, id);
                        }}
                      />
                      <span className={ms.completed ? 'line-through text-slate-400' : ''}>
                        {ms.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums font-semibold text-blue-900 dark:text-blue-400">
                  {prj.progress}% complete
                </span>
                <button
                  type="button"
                  onClick={() => deleteProject(prj.id)}
                  className="text-slate-400 hover:text-red-600"
                  aria-label={`Delete project ${prj.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold">Create New Project</h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block font-medium mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {PROJECT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Milestones (one per line)</label>
                <textarea
                  rows={3}
                  placeholder="Design schema&#10;Build automation script&#10;Verify output"
                  value={milestoneText}
                  onChange={(e) => setMilestoneText(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold rounded bg-blue-900 text-white"
                >
                  Create Project
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
// 3. TIME TRACKER VIEW
// ============================================================================
export const TimeTrackerView: React.FC = () => {
  const {
    tasks,
    projects,
    timeLogs,
    todayStr,
    activeTimer,
    elapsedTimerSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopAndLogTimer,
    addManualTimeLog,
    deleteTimeLog,
  } = useWorkTrack();

  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [timerNotes, setTimerNotes] = useState('');

  // Manual entry state
  const [manDate, setManDate] = useState(todayStr);
  const [manStart, setManStart] = useState('09:00');
  const [manEnd, setManEnd] = useState('10:30');
  const [manMins, setManMins] = useState('90');
  const [manNotes, setManNotes] = useState('');

  const formatClock = (secs: number) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, '0');
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const dailyMinutes = timeLogs
    .filter((tl) => tl.startTime.startsWith(todayStr))
    .reduce((sum, tl) => sum + tl.durationMinutes, 0);

  const weeklyMinutes = timeLogs.reduce((sum, tl) => sum + tl.durationMinutes, 0);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const taskObj = tasks.find((t) => t.id === selectedTaskId);
    const projObj = projects.find((p) => p.id === selectedProjectId);
    await addManualTimeLog({
      taskId: selectedTaskId,
      taskTitle: taskObj?.title || 'Manual Operations Task',
      projectId: selectedProjectId,
      projectName: projObj?.name || 'General',
      startTime: `${manDate}T${manStart}:00`,
      endTime: `${manDate}T${manEnd}:00`,
      durationMinutes: Math.max(1, Number(manMins) || 30),
      notes: manNotes.trim() || 'Manual time log entry',
    });
    setManNotes('');
  };

  const handleExport = (fmt: 'csv' | 'xlsx') => {
    const rows = timeLogs.map((tl) => ({
      TimeLogID: tl.id,
      TaskTitle: tl.taskTitle,
      ProjectName: tl.projectName,
      StartTime: tl.startTime,
      EndTime: tl.endTime,
      DurationMinutes: tl.durationMinutes,
      Notes: tl.notes,
    }));
    if (fmt === 'csv') exportRowsToCSV('worktrack_time_logs.csv', rows);
    else exportRowsToXLSX('worktrack_time_logs.xlsx', 'TimeLogs', rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Time Tracker & Utilization Ledger
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Persistent task timer (survives page refresh), manual entries, and Estimated vs Actual hours.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Live Stopwatch & Summary Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-500">
                {activeTimer.isRunning
                  ? activeTimer.isPaused
                    ? 'Timer Paused'
                    : 'Active Session Running'
                  : 'Start a New Focus Timer'}
              </span>
              <div className="text-4xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                {formatClock(elapsedTimerSeconds)}
              </div>
              {activeTimer.isRunning && (
                <p className="text-xs text-blue-800 dark:text-blue-400 mt-1">
                  Task: {activeTimer.taskTitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!activeTimer.isRunning ? (
                <button
                  type="button"
                  onClick={() => {
                    const t = tasks.find((x) => x.id === selectedTaskId);
                    const p = projects.find((x) => x.id === selectedProjectId);
                    startTimer(
                      selectedTaskId,
                      t?.title || 'Operations Focus',
                      selectedProjectId,
                      p?.name || 'General',
                      timerNotes
                    );
                  }}
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Timer</span>
                </button>
              ) : (
                <>
                  {activeTimer.isPaused ? (
                    <button
                      type="button"
                      onClick={resumeTimer}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-900 text-white flex items-center gap-1.5"
                    >
                      <Play className="w-4 h-4" />
                      <span>Resume</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseTimer}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white flex items-center gap-1.5"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={stopAndLogTimer}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white flex items-center gap-1.5"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop & Save Log</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Link to Task
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.taskCode} — {t.title.slice(0, 32)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Link to Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.projectCode} — {p.name.slice(0, 28)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                Session Notes
              </label>
              <input
                type="text"
                placeholder="What are you working on?"
                value={timerNotes}
                onChange={(e) => setTimerNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
        </div>

        {/* Summary Totals */}
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Time Utilization Summary
            </h2>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Today ({todayStr})</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                  {formatDurationMinutes(dailyMinutes)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Weekly Total</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                  {formatDurationMinutes(weeklyMinutes)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Total Entries Logged</span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                  {timeLogs.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Entry + Estimated vs Actual Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleManualSubmit}
          className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
        >
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Add Manual Time Entry
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-medium mb-1">Date</label>
              <input
                type="date"
                value={manDate}
                onChange={(e) => setManDate(e.target.value)}
                className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={manStart}
                onChange={(e) => setManStart(e.target.value)}
                className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">End Time</label>
              <input
                type="time"
                value={manEnd}
                onChange={(e) => setManEnd(e.target.value)}
                className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Duration ( mins )</label>
              <input
                type="number"
                min="1"
                value={manMins}
                onChange={(e) => setManMins(e.target.value)}
                className="w-full px-2 py-1.5 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Notes on work completed..."
              value={manNotes}
              onChange={(e) => setManNotes(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
            />
            <button
              type="submit"
              className="px-4 py-1.5 font-semibold rounded bg-blue-900 text-white hover:bg-blue-800 shrink-0"
            >
              Add Entry
            </button>
          </div>
        </form>

        {/* Estimated vs Actual Table */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Estimated vs Actual Hours by Task
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="py-1.5">Task</th>
                  <th className="py-1.5 text-right">Estimated</th>
                  <th className="py-1.5 text-right">Actual</th>
                  <th className="py-1.5 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tasks.slice(0, 5).map((t) => {
                  const diff = Number((t.actualHours - t.estimatedHours).toFixed(1));
                  return (
                    <tr key={t.id}>
                      <td className="py-2 font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                        <span className="font-mono text-slate-500">{t.taskCode}</span> · {t.title}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums">
                        {t.estimatedHours}h
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums">
                        {t.actualHours}h
                      </td>
                      <td
                        className={`py-2 text-right font-mono tabular-nums font-semibold ${
                          diff > 0 ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {diff > 0 ? `+${diff}h` : `${diff}h`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Time Log History Table */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600">
                <th className="py-2.5 px-3 font-semibold">Task & Project</th>
                <th className="py-2.5 px-3 font-semibold">Start Time</th>
                <th className="py-2.5 px-3 font-semibold">End Time</th>
                <th className="py-2.5 px-3 font-semibold text-right">Duration</th>
                <th className="py-2.5 px-3 font-semibold">Notes</th>
                <th className="py-2.5 px-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {timeLogs.map((tl) => (
                <tr key={tl.id}>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {tl.taskTitle}
                    </div>
                    <div className="text-slate-500">{tl.projectName}</div>
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {tl.startTime.replace('T', ' ')}
                  </td>
                  <td className="py-2.5 px-3 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                    {tl.endTime.replace('T', ' ')}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">
                    {formatDurationMinutes(tl.durationMinutes)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{tl.notes}</td>
                  <td className="py-2.5 px-3">
                    <button
                      type="button"
                      onClick={() => deleteTimeLog(tl.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
