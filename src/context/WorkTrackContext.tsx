import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  getWorkTrackCollection,
  googleProvider,
  handleFirestoreError,
  OperationType,
  WORKTRACK_COLLECTIONS,
} from '../lib/firebase';
import {
  ActiveTimerState,
  ActivityLogRecord,
  DateFilterPreset,
  DesiDiyaRecord,
  DocumentCategory,
  EscalationRecord,
  ImportJobRecord,
  NavSection,
  NotificationPreferenceRecord,
  OperationRecord,
  ProjectRecord,
  PurchaseOrderRecord,
  SeniorAssignmentRecord,
  TaskCategory,
  TaskRecord,
  TaskStatus,
  TimeLogRecord,
  TrackingDocumentRecord,
} from '../types/worktrack';
import {
  DEMO_ACTIVITY_LOGS,
  DEMO_ASSIGNMENTS,
  DEMO_DESIDIYA_RECORDS,
  DEMO_ESCALATIONS,
  DEMO_IMPORT_JOBS,
  DEMO_OPERATIONS,
  DEMO_PROJECTS,
  DEMO_PURCHASE_ORDERS,
  DEMO_TASKS,
  DEMO_TIME_LOGS,
  DEMO_TRACKING_DOCUMENTS,
  REFERENCE_TODAY,
} from '../utils/demoSeedData';
import { calculateActiveTimerSeconds } from '../utils/operationsLogic';
import { computeAppointmentReschedule, computePoExpiryExtension } from '../utils/desidiyaLogic';

const DEFAULT_OWNER_EMAIL = 'simple.sooraj@gmail.com';
const TIMER_STORAGE_KEY = 'worktrack_active_timer_v1';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

const CATEGORY_TO_PATH_FIELD: Record<DocumentCategory, keyof DesiDiyaRecord> = {
  Invoice: 'invoice_file_path',
  PO: 'po_file_path',
  POD: 'pod_file_path',
  GRN: 'grn_file_path',
  DN: 'dn_file_path',
  CN: 'cn_file_path',
};

interface WorkTrackContextValue {
  user: FirebaseUser | null;
  authReady: boolean;
  isAuthorized: boolean;
  isDemoMode: boolean;
  dataLoading: boolean;
  savingState: 'idle' | 'saving' | 'saved' | 'error';
  todayStr: string;
  activeNav: NavSection;
  setActiveNav: (nav: NavSection) => void;
  globalTaskFilter: string;
  setGlobalTaskFilter: (f: string) => void;
  globalOpsFilter: string;
  setGlobalOpsFilter: (f: string) => void;
  globalDesiDiyaFilter: string;
  setGlobalDesiDiyaFilter: (f: string) => void;
  datePreset: DateFilterPreset;
  setDatePreset: (p: DateFilterPreset) => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
  // Integrated DesiDiya state
  desidiyaRecords: DesiDiyaRecord[];
  trackingDocuments: TrackingDocumentRecord[];
  // WorkTrack state
  tasks: TaskRecord[];
  operations: OperationRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  escalations: EscalationRecord[];
  assignments: SeniorAssignmentRecord[];
  projects: ProjectRecord[];
  timeLogs: TimeLogRecord[];
  activityLogs: ActivityLogRecord[];
  importJobs: ImportJobRecord[];
  preferences: NotificationPreferenceRecord;
  activeTimer: ActiveTimerState;
  elapsedTimerSeconds: number;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  notify: (text: string, type?: 'success' | 'error' | 'info') => void;
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  seedSampleDataToCloud: () => Promise<void>;
  // DesiDiya Master Tracking & Document CRUD
  saveDesiDiyaRecord: (
    rec: Omit<DesiDiyaRecord, 'id' | 'ownerId'>,
    existingId?: string,
    auditAction?: string,
    prevVal?: string,
    newVal?: string
  ) => Promise<void>;
  deleteDesiDiyaRecord: (id: string) => Promise<void>;
  bulkUpdateDesiDiyaAppointments: (
    poNumber: string,
    newAppointmentDate: string,
    reason?: string
  ) => Promise<number>;
  extendDesiDiyaPoExpiry: (
    recordId: string,
    newExpiryDate: string,
    reason?: string
  ) => Promise<void>;
  resolveDesiDiyaException: (
    recordId: string,
    patch: {
      grn_quantity: number;
      dn_quantity: number;
      grn_no: string;
      dn_status: string;
      dn_resolution: string;
      dn_closure_date: string;
      invoice_remark: string;
    }
  ) => Promise<void>;
  uploadTrackingDocument: (params: {
    category: DocumentCategory;
    filename: string;
    base64Data: string;
    mimeType: string;
    invoiceNo: string;
    poNumber: string;
    trackingId: string;
    replaceExistingId?: string;
  }) => Promise<TrackingDocumentRecord | null>;
  deleteTrackingDocument: (docId: string) => Promise<void>;
  syncDesiDiyaBulkCsv: (
    fileName: string,
    parsedRows: Omit<DesiDiyaRecord, 'id' | 'ownerId'>[],
    mode: 'merge' | 'replace'
  ) => Promise<{ inserted: number; updated: number }>;
  // Task CRUD
  saveTask: (task: Omit<TaskRecord, 'id' | 'ownerId'>, existingId?: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  bulkUpdateTasks: (
    ids: string[],
    patch: { status?: TaskStatus; category?: TaskCategory }
  ) => Promise<void>;
  duplicateTask: (task: TaskRecord) => Promise<void>;
  // Operations CRUD
  saveOperation: (
    op: Omit<OperationRecord, 'id' | 'ownerId'>,
    existingId?: string,
    auditAction?: string,
    prevVal?: string,
    newVal?: string
  ) => Promise<void>;
  deleteOperation: (id: string) => Promise<void>;
  // Purchase Order CRUD
  savePurchaseOrder: (
    po: Omit<PurchaseOrderRecord, 'id' | 'ownerId'>,
    existingId?: string,
    auditAction?: string,
    prevVal?: string,
    newVal?: string
  ) => Promise<void>;
  deletePurchaseOrder: (id: string) => Promise<void>;
  // Escalation CRUD
  saveEscalation: (
    esc: Omit<EscalationRecord, 'id' | 'ownerId'>,
    existingId?: string,
    auditAction?: string,
    prevVal?: string,
    newVal?: string
  ) => Promise<void>;
  deleteEscalation: (id: string) => Promise<void>;
  // Senior Assignment CRUD
  saveAssignment: (
    asg: Omit<SeniorAssignmentRecord, 'id' | 'ownerId'>,
    existingId?: string
  ) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  // Project CRUD
  saveProject: (
    proj: Omit<ProjectRecord, 'id' | 'ownerId'>,
    existingId?: string
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  // Time Tracker
  startTimer: (
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string,
    notes?: string
  ) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopAndLogTimer: () => Promise<void>;
  addManualTimeLog: (log: Omit<TimeLogRecord, 'id' | 'ownerId'>) => Promise<void>;
  deleteTimeLog: (id: string) => Promise<void>;
  // Import Job
  recordImportBatch: (
    fileName: string,
    targetModule: 'tasks' | 'operations' | 'purchaseOrders' | 'escalations' | 'invoiceTracking',
    validRows: Record<string, any>[],
    totalRows: number,
    invalidCount: number,
    duplicateCount: number
  ) => Promise<void>;
  // Preferences
  updatePreferences: (patch: Partial<NotificationPreferenceRecord>) => Promise<void>;
}

const WorkTrackContext = createContext<WorkTrackContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const WorkTrackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('demo') === '1') {
        return true;
      }
    }
    return false;
  });

  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeNav, setActiveNav] = useState<NavSection>('operations-dashboard');
  const [globalTaskFilter, setGlobalTaskFilter] = useState<string>('ALL');
  const [globalOpsFilter, setGlobalOpsFilter] = useState<string>('ALL');
  const [globalDesiDiyaFilter, setGlobalDesiDiyaFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('All Dates');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-31');

  const [desidiyaRecords, setDesidiyaRecords] = useState<DesiDiyaRecord[]>(DEMO_DESIDIYA_RECORDS);
  const [trackingDocuments, setTrackingDocuments] = useState<TrackingDocumentRecord[]>(
    DEMO_TRACKING_DOCUMENTS
  );
  const [tasks, setTasks] = useState<TaskRecord[]>(DEMO_TASKS);
  const [operations, setOperations] = useState<OperationRecord[]>(DEMO_OPERATIONS);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>(DEMO_PURCHASE_ORDERS);
  const [escalations, setEscalations] = useState<EscalationRecord[]>(DEMO_ESCALATIONS);
  const [assignments, setAssignments] = useState<SeniorAssignmentRecord[]>(DEMO_ASSIGNMENTS);
  const [projects, setProjects] = useState<ProjectRecord[]>(DEMO_PROJECTS);
  const [timeLogs, setTimeLogs] = useState<TimeLogRecord[]>(DEMO_TIME_LOGS);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>(DEMO_ACTIVITY_LOGS);
  const [importJobs, setImportJobs] = useState<ImportJobRecord[]>(DEMO_IMPORT_JOBS);
  const [preferences, setPreferences] = useState<NotificationPreferenceRecord>({
    id: 'default-prefs',
    ownerId: 'demo-user',
    allowedEmails: [DEFAULT_OWNER_EMAIL],
    poExpiryWarnDays: 3,
    taskDueReminderHours: 24,
    theme: 'light',
  });

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = makeId('toast');
    setToasts((prev) => [...prev.slice(-3), { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Persistent Timer State across refresh
  const [activeTimer, setActiveTimer] = useState<ActiveTimerState>(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore storage errors
    }
    return {
      isRunning: false,
      isPaused: false,
      taskId: '',
      taskTitle: '',
      projectId: '',
      projectName: '',
      notes: '',
      startedAtIso: '',
      lastResumedAtMs: 0,
      accumulatedSeconds: 0,
    };
  });

  const [elapsedTimerSeconds, setElapsedTimerSeconds] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(activeTimer));
    } catch {
      // ignore
    }
  }, [activeTimer]);

  useEffect(() => {
    const updateClock = () => {
      const secs = calculateActiveTimerSeconds(
        activeTimer.isRunning,
        activeTimer.isPaused,
        activeTimer.lastResumedAtMs,
        activeTimer.accumulatedSeconds,
        Date.now()
      );
      setElapsedTimerSeconds(secs);
    };
    updateClock();
    if (!activeTimer.isRunning || activeTimer.isPaused) return;
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  useEffect(() => {
    if (preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.theme]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currUser) => {
      setUser(currUser);
      setAuthReady(true);
      if (currUser) {
        setIsDemoMode(false);
        const emailLower = (currUser.email || '').toLowerCase();
        if (emailLower === DEFAULT_OWNER_EMAIL) {
          try {
            await setDoc(
              doc(db, 'users', currUser.uid),
              {
                uid: currUser.uid,
                email: currUser.email || DEFAULT_OWNER_EMAIL,
                displayName: (currUser.displayName || 'Sooraj').slice(0, 120),
                role: 'owner',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch {
            // ignore initial user profile merge error
          }
        }
      }
    });
    return () => unsub();
  }, []);

  const isAuthorized = React.useMemo(() => {
    if (isDemoMode) return true;
    if (!user || !user.email) return false;
    const emailLower = user.email.toLowerCase();
    const allowed = preferences.allowedEmails.map((e) => e.toLowerCase());
    return allowed.includes(emailLower) || emailLower === DEFAULT_OWNER_EMAIL;
  }, [user, isDemoMode, preferences.allowedEmails]);

  useEffect(() => {
    if (!authReady) return;
    if (isDemoMode) {
      setDesidiyaRecords(DEMO_DESIDIYA_RECORDS);
      setTrackingDocuments(DEMO_TRACKING_DOCUMENTS);
      setTasks(DEMO_TASKS);
      setOperations(DEMO_OPERATIONS);
      setPurchaseOrders(DEMO_PURCHASE_ORDERS);
      setEscalations(DEMO_ESCALATIONS);
      setAssignments(DEMO_ASSIGNMENTS);
      setProjects(DEMO_PROJECTS);
      setTimeLogs(DEMO_TIME_LOGS);
      setActivityLogs(DEMO_ACTIVITY_LOGS);
      setImportJobs(DEMO_IMPORT_JOBS);
      setDataLoading(false);
      return;
    }

    if (!user || !isAuthorized) {
      setDesidiyaRecords([]);
      setTrackingDocuments([]);
      setTasks([]);
      setOperations([]);
      setPurchaseOrders([]);
      setEscalations([]);
      setAssignments([]);
      setProjects([]);
      setTimeLogs([]);
      setActivityLogs([]);
      setImportJobs([]);
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    const uid = user.uid;

    const unsubDesiDiya = onSnapshot(
      query(collection(db, 'invoiceTracking'), where('ownerId', '==', uid)),
      (snap) => {
        const list: DesiDiyaRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            invoice_no: data.invoice_no || '',
            po_number: data.po_number || '',
            vendor_name: data.vendor_name || 'DesiDiya',
            location: data.location || '',
            dispatched_date: data.dispatched_date || '',
            appointment_date: data.appointment_date || '',
            po_expiry_date: data.po_expiry_date || '',
            invoice_quantity: Number(data.invoice_quantity) || 0,
            grn_quantity: Number(data.grn_quantity) || 0,
            dn_quantity: Number(data.dn_quantity) || 0,
            no_of_box: Number(data.no_of_box) || 0,
            invoice_amount: Number(data.invoice_amount) || 0,
            grn_amount: Number(data.grn_amount) || 0,
            dn_amount: Number(data.dn_amount) || 0,
            po_type: data.po_type || '',
            tracking_id: data.tracking_id || '',
            shipment_track_id: data.shipment_track_id || '',
            transport_mode: data.transport_mode || '',
            appointment_count: Number(data.appointment_count) || 0,
            appointment_history: data.appointment_history || '',
            delivery_status: data.delivery_status || '',
            invoice_status: data.invoice_status || 'Pending',
            dn_status: data.dn_status || '',
            dn_resolution: data.dn_resolution || '',
            dn_closure_date: data.dn_closure_date || '',
            delivery_remark: data.delivery_remark || '',
            invoice_remark: data.invoice_remark || '',
            general_remark: data.general_remark || '',
            assigned_person: data.assigned_person || '',
            grn_no: data.grn_no || '',
            original_appointment_date: data.original_appointment_date || '',
            original_po_expiry_date: data.original_po_expiry_date || '',
            po_expiry_history: data.po_expiry_history || '',
            cn_no: data.cn_no || '',
            cn_amount: Number(data.cn_amount) || 0,
            cn_status: data.cn_status || '',
            invoice_file_path: data.invoice_file_path || '',
            po_file_path: data.po_file_path || '',
            pod_file_path: data.pod_file_path || '',
            grn_file_path: data.grn_file_path || '',
            dn_file_path: data.dn_file_path || '',
            cn_file_path: data.cn_file_path || '',
          };
        });
        setDesidiyaRecords(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'invoiceTracking')
    );

    const unsubDocs = onSnapshot(
      query(collection(db, 'trackingDocuments'), where('ownerId', '==', uid)),
      (snap) => {
        const list: TrackingDocumentRecord[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: data.ownerId,
              category: (data.category as DocumentCategory) || 'Invoice',
              originalFilename: data.originalFilename || '',
              invoiceNo: data.invoiceNo || '',
              poNumber: data.poNumber || '',
              trackingId: data.trackingId || '',
              uploadTimestamp: data.uploadTimestamp || '',
              uploadedByEmail: data.uploadedByEmail || '',
              storagePath: data.storagePath || '',
              mimeType: data.mimeType || 'application/octet-stream',
              sizeBytes: Number(data.sizeBytes) || 0,
              historyJson: data.historyJson || '[]',
            };
          })
          .sort((a, b) => (b.uploadTimestamp > a.uploadTimestamp ? 1 : -1));
        setTrackingDocuments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'trackingDocuments')
    );

    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('ownerId', '==', uid)),
      (snap) => {
        const list: TaskRecord[] = snap.docs.map((d) => {
          const data = d.data();
          let subtasks = [];
          let comments = [];
          try {
            subtasks = data.subtasksJson ? JSON.parse(data.subtasksJson) : [];
          } catch {
            subtasks = [];
          }
          try {
            comments = data.commentsJson ? JSON.parse(data.commentsJson) : [];
          } catch {
            comments = [];
          }
          return {
            id: d.id,
            ownerId: data.ownerId,
            taskCode: data.taskCode || 'TSK-000',
            title: data.title || '',
            description: data.description || '',
            category: data.category || 'Operations',
            priority: data.priority || 'Medium',
            status: data.status || 'Not Started',
            createdDate: data.createdDate || REFERENCE_TODAY,
            startDate: data.startDate || '',
            dueDate: data.dueDate || REFERENCE_TODAY,
            completedDate: data.completedDate || '',
            assignedBy: data.assignedBy || 'Self',
            assignedTo: data.assignedTo || 'Sooraj',
            estimatedHours: Number(data.estimatedHours) || 0,
            actualHours: Number(data.actualHours) || 0,
            tags: Array.isArray(data.tags) ? data.tags : [],
            notes: data.notes || '',
            subtasks,
            comments,
            projectId: data.projectId || '',
          };
        });
        setTasks(list);
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
    );

    const unsubOps = onSnapshot(
      query(collection(db, 'operations'), where('ownerId', '==', uid)),
      (snap) => {
        const list: OperationRecord[] = snap.docs.map((d) => {
          const data = d.data();
          let rescheduleHistory = [];
          try {
            rescheduleHistory = data.rescheduleHistoryJson
              ? JSON.parse(data.rescheduleHistoryJson)
              : [];
          } catch {
            rescheduleHistory = [];
          }
          return {
            id: d.id,
            ownerId: data.ownerId,
            recordCode: data.recordCode || 'OPS-000',
            poNumber: data.poNumber || '',
            invoiceNumber: data.invoiceNumber || '',
            lrNumber: data.lrNumber || '',
            courierName: data.courierName || '',
            vehicleNumber: data.vehicleNumber || '',
            driverName: data.driverName || '',
            driverContact: data.driverContact || '',
            sku: data.sku || '',
            productName: data.productName || '',
            quantity: Number(data.quantity) || 0,
            warehouse: data.warehouse || '',
            dispatchDate: data.dispatchDate || '',
            reportingDate: data.reportingDate || '',
            appointmentDate: data.appointmentDate || '',
            poCreationDate: data.poCreationDate || '',
            poExpiryDate: data.poExpiryDate || REFERENCE_TODAY,
            deliveryDate: data.deliveryDate || '',
            shipmentStatus: data.shipmentStatus || 'Planned',
            appointmentStatus: data.appointmentStatus || '',
            issueCategory: data.issueCategory || '',
            issueDescription: data.issueDescription || '',
            nextFollowUpDate: data.nextFollowUpDate || '',
            lastUpdatedDate: data.lastUpdatedDate || REFERENCE_TODAY,
            remarks: data.remarks || '',
            rescheduleHistory,
          };
        });
        setOperations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'operations')
    );

    const unsubPOs = onSnapshot(
      query(collection(db, 'purchaseOrders'), where('ownerId', '==', uid)),
      (snap) => {
        const list: PurchaseOrderRecord[] = snap.docs.map((d) => {
          const data = d.data();
          let changeHistory = [];
          try {
            changeHistory = data.changeHistoryJson ? JSON.parse(data.changeHistoryJson) : [];
          } catch {
            changeHistory = [];
          }
          return {
            id: d.id,
            ownerId: data.ownerId,
            poNumber: data.poNumber || '',
            vendor: data.vendor || '',
            courier: data.courier || '',
            warehouse: data.warehouse || '',
            poCreationDate: data.poCreationDate || '',
            originalAppointmentDate: data.originalAppointmentDate || '',
            currentAppointmentDate: data.currentAppointmentDate || '',
            originalExpiryDate: data.originalExpiryDate || '',
            currentExpiryDate: data.currentExpiryDate || REFERENCE_TODAY,
            poStatus: data.poStatus || 'Open',
            expectedQuantity: Number(data.expectedQuantity) || 0,
            receivedQuantity: Number(data.receivedQuantity) || 0,
            pendingQuantity: Number(data.pendingQuantity) || 0,
            relatedInvoices: data.relatedInvoices || '',
            relatedLRs: data.relatedLRs || '',
            notes: data.notes || '',
            changeHistory,
          };
        });
        setPurchaseOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'purchaseOrders')
    );

    const unsubEsc = onSnapshot(
      query(collection(db, 'escalations'), where('ownerId', '==', uid)),
      (snap) => {
        const list: EscalationRecord[] = snap.docs.map((d) => {
          const data = d.data();
          let history = [];
          try {
            history = data.historyJson ? JSON.parse(data.historyJson) : [];
          } catch {
            history = [];
          }
          return {
            id: d.id,
            ownerId: data.ownerId,
            escalationCode: data.escalationCode || 'ESC-000',
            relatedPoNumber: data.relatedPoNumber || '',
            relatedLrNumber: data.relatedLrNumber || '',
            courierName: data.courierName || '',
            warehouse: data.warehouse || '',
            escalationType: data.escalationType || 'Other',
            issueDescription: data.issueDescription || '',
            responsibleTeam: data.responsibleTeam || '',
            assignedPerson: data.assignedPerson || '',
            createdDate: data.createdDate || REFERENCE_TODAY,
            priority: data.priority || 'Medium',
            status: data.status || 'Open',
            lastFollowUpDate: data.lastFollowUpDate || '',
            nextFollowUpDate: data.nextFollowUpDate || '',
            resolutionNotes: data.resolutionNotes || '',
            closureDate: data.closureDate || '',
            history,
          };
        });
        setEscalations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'escalations')
    );

    const unsubAsg = onSnapshot(
      query(collection(db, 'assignments'), where('ownerId', '==', uid)),
      (snap) => {
        const list: SeniorAssignmentRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            assignmentCode: data.assignmentCode || 'ASG-000',
            title: data.title || '',
            assignedBy: data.assignedBy || '',
            assignedDate: data.assignedDate || REFERENCE_TODAY,
            dueDate: data.dueDate || REFERENCE_TODAY,
            priority: data.priority || 'Medium',
            description: data.description || '',
            status: data.status || 'Pending',
            progress: Number(data.progress) || 0,
            comments: data.comments || '',
            completionDate: data.completionDate || '',
            linkedTaskId: data.linkedTaskId || '',
          };
        });
        setAssignments(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'assignments')
    );

    const unsubProj = onSnapshot(
      query(collection(db, 'projects'), where('ownerId', '==', uid)),
      (snap) => {
        const list: ProjectRecord[] = snap.docs.map((d) => {
          const data = d.data();
          let milestones = [];
          try {
            milestones = data.milestonesJson ? JSON.parse(data.milestonesJson) : [];
          } catch {
            milestones = [];
          }
          return {
            id: d.id,
            ownerId: data.ownerId,
            projectCode: data.projectCode || 'PRJ-00',
            name: data.name || '',
            description: data.description || '',
            category: data.category || 'Other Projects',
            startDate: data.startDate || REFERENCE_TODAY,
            targetDate: data.targetDate || REFERENCE_TODAY,
            status: data.status || 'Active',
            priority: data.priority || 'Medium',
            progress: Number(data.progress) || 0,
            milestones,
            notes: data.notes || '',
          };
        });
        setProjects(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'projects')
    );

    const unsubTime = onSnapshot(
      query(collection(db, 'timeLogs'), where('ownerId', '==', uid)),
      (snap) => {
        const list: TimeLogRecord[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ownerId: data.ownerId,
            taskId: data.taskId || '',
            taskTitle: data.taskTitle || '',
            projectId: data.projectId || '',
            projectName: data.projectName || '',
            startTime: data.startTime || '',
            endTime: data.endTime || '',
            durationMinutes: Number(data.durationMinutes) || 0,
            notes: data.notes || '',
          };
        });
        setTimeLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'timeLogs')
    );

    const unsubAct = onSnapshot(
      query(collection(db, 'activityLogs'), where('ownerId', '==', uid)),
      (snap) => {
        const list: ActivityLogRecord[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: data.ownerId,
              recordType: data.recordType || '',
              recordId: data.recordId || '',
              action: data.action || '',
              previousValue: data.previousValue || '',
              newValue: data.newValue || '',
              userEmail: data.userEmail || '',
              timestampIso: data.timestampIso || '',
            };
          })
          .sort((a, b) => (b.timestampIso > a.timestampIso ? 1 : -1));
        setActivityLogs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'activityLogs')
    );

    const unsubImp = onSnapshot(
      query(collection(db, 'importJobs'), where('ownerId', '==', uid)),
      (snap) => {
        const list: ImportJobRecord[] = snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerId: data.ownerId,
              fileName: data.fileName || '',
              targetModule: data.targetModule || 'tasks',
              totalRows: Number(data.totalRows) || 0,
              importedRows: Number(data.importedRows) || 0,
              invalidRows: Number(data.invalidRows) || 0,
              duplicateRows: Number(data.duplicateRows) || 0,
              timestampIso: data.timestampIso || '',
            };
          })
          .sort((a, b) => (b.timestampIso > a.timestampIso ? 1 : -1));
        setImportJobs(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'importJobs')
    );

    const unsubPref = onSnapshot(
      doc(db, 'notificationPreferences', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPreferences({
            id: snap.id,
            ownerId: data.ownerId,
            allowedEmails: Array.isArray(data.allowedEmails)
              ? data.allowedEmails
              : [DEFAULT_OWNER_EMAIL],
            poExpiryWarnDays: Number(data.poExpiryWarnDays) || 3,
            taskDueReminderHours: Number(data.taskDueReminderHours) || 24,
            theme: data.theme === 'dark' ? 'dark' : 'light',
          });
        }
      },
      () => {
        // ignore
      }
    );

    return () => {
      unsubDesiDiya();
      unsubDocs();
      unsubTasks();
      unsubOps();
      unsubPOs();
      unsubEsc();
      unsubAsg();
      unsubProj();
      unsubTime();
      unsubAct();
      unsubImp();
      unsubPref();
    };
  }, [authReady, isDemoMode, user, isAuthorized]);

  const logActivity = useCallback(
    async (
      recordType: string,
      recordId: string,
      action: string,
      previousValue = '',
      newValue = ''
    ) => {
      const nowIso = new Date().toISOString();
      const email = user?.email || 'demo@worktrack.local';
      if (isDemoMode || !user) {
        const entry: ActivityLogRecord = {
          id: makeId('act'),
          ownerId: 'demo-user',
          recordType,
          recordId,
          action,
          previousValue: previousValue.slice(0, 1000),
          newValue: newValue.slice(0, 1000),
          userEmail: email,
          timestampIso: nowIso,
        };
        setActivityLogs((prev) => [entry, ...prev]);
        return;
      }

      const actId = makeId('act');
      try {
        await setDoc(doc(db, 'activityLogs', actId), {
          ownerId: user.uid,
          recordType: recordType.slice(0, 64),
          recordId: recordId.slice(0, 128),
          action: action.slice(0, 120),
          previousValue: previousValue.slice(0, 1000),
          newValue: newValue.slice(0, 1000),
          userEmail: email.slice(0, 254),
          timestampIso: nowIso,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `activityLogs/${actId}`);
      }
    },
    [isDemoMode, user]
  );

  const markSaving = () => setSavingState('saving');
  const markSaved = () => {
    setSavingState('saved');
    setTimeout(() => setSavingState('idle'), 2000);
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      notify('Signed in with Google successfully.');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Google Sign-In failed', 'error');
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      setIsDemoMode(false);
      notify('Signed out of WorkTrack.', 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Sign-out failed', 'error');
    }
  };

  const enterDemoMode = () => {
    setIsDemoMode(true);
    notify('Entered Interactive Demo Mode. DesiDiya + WorkTrack records loaded.', 'info');
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
  };

  // =========================================================================
  // DESIDIYA MASTER TRACKING CRUD & WORKFLOWS
  // =========================================================================
  const saveDesiDiyaRecord = async (
    rec: Omit<DesiDiyaRecord, 'id' | 'ownerId'>,
    existingId?: string,
    auditAction?: string,
    prevVal?: string,
    newVal?: string
  ) => {
    markSaving();
    const id = existingId || makeId('dd');
    const cleanInvoiceNo = (rec.invoice_no || '').trim();
    if (!cleanInvoiceNo) {
      notify('Invoice Number (or PO-PENDING-{PO}) is required.', 'error');
      setSavingState('idle');
      return;
    }

    // Apply appointment history auto-calculation if existing record changed appointment_date
    const existingRec = existingId ? desidiyaRecords.find((r) => r.id === existingId) : undefined;
    let computedApptCount = Math.max(0, Number(rec.appointment_count) || 0);
    let computedApptHistory = rec.appointment_history || '';
    let computedOrigAppt = rec.original_appointment_date || rec.appointment_date || '';

    if (
      existingRec &&
      rec.appointment_date &&
      rec.appointment_date !== existingRec.appointment_date
    ) {
      const resched = computeAppointmentReschedule(
        existingRec.appointment_date,
        existingRec.appointment_count,
        existingRec.appointment_history,
        rec.appointment_date,
        existingRec.original_appointment_date
      );
      computedApptCount = resched.appointment_count;
      computedApptHistory = resched.appointment_history;
      computedOrigAppt = resched.original_appointment_date;
    } else if (!existingRec && rec.appointment_date && !computedApptHistory) {
      computedApptCount = Math.max(1, computedApptCount);
      computedApptHistory = rec.appointment_date;
      computedOrigAppt = rec.appointment_date;
    }

    const normalized: Omit<DesiDiyaRecord, 'id' | 'ownerId'> = {
      invoice_no: cleanInvoiceNo.slice(0, 64),
      po_number: (rec.po_number || '').trim().slice(0, 64),
      vendor_name: (rec.vendor_name || 'DesiDiya Lighting Pvt Ltd').trim().slice(0, 160),
      location: (rec.location || '').trim().slice(0, 160),
      dispatched_date: (rec.dispatched_date || '').trim().slice(0, 32),
      appointment_date: (rec.appointment_date || '').trim().slice(0, 32),
      po_expiry_date: (rec.po_expiry_date || '').trim().slice(0, 32),
      invoice_quantity: Math.max(0, Number(rec.invoice_quantity) || 0),
      grn_quantity: Math.max(0, Number(rec.grn_quantity) || 0),
      dn_quantity: Math.max(0, Number(rec.dn_quantity) || 0),
      no_of_box: Math.max(0, Number(rec.no_of_box) || 0),
      invoice_amount: Math.max(0, Number(rec.invoice_amount) || 0),
      grn_amount: Math.max(0, Number(rec.grn_amount) || 0),
      dn_amount: Math.max(0, Number(rec.dn_amount) || 0),
      po_type: (rec.po_type || '').trim().slice(0, 64),
      tracking_id: (rec.tracking_id || '').trim().slice(0, 80),
      shipment_track_id: (rec.shipment_track_id || '').trim().slice(0, 80),
      transport_mode: (rec.transport_mode || '').trim().slice(0, 80),
      appointment_count: computedApptCount,
      appointment_history: computedApptHistory.slice(0, 3000),
      delivery_status: (rec.delivery_status || '').trim().slice(0, 40),
      invoice_status: (rec.invoice_status || 'Pending').trim().slice(0, 40),
      dn_status: (rec.dn_status || '').trim().slice(0, 40),
      dn_resolution: (rec.dn_resolution || '').trim().slice(0, 80),
      dn_closure_date: (rec.dn_closure_date || '').trim().slice(0, 32),
      delivery_remark: (rec.delivery_remark || '').trim().slice(0, 2000),
      invoice_remark: (rec.invoice_remark || '').trim().slice(0, 2000),
      general_remark: (rec.general_remark || '').trim().slice(0, 3000),
      assigned_person: (rec.assigned_person || '').trim().slice(0, 120),
      grn_no: (rec.grn_no || '').trim().slice(0, 64),
      original_appointment_date: computedOrigAppt.slice(0, 32),
      original_po_expiry_date: (
        rec.original_po_expiry_date ||
        rec.po_expiry_date ||
        ''
      ).slice(0, 32),
      po_expiry_history: (rec.po_expiry_history || '').slice(0, 3000),
      cn_no: (rec.cn_no || '').trim().slice(0, 64),
      cn_amount: Math.max(0, Number(rec.cn_amount) || 0),
      cn_status: (rec.cn_status || '').trim().slice(0, 40),
      invoice_file_path: (rec.invoice_file_path || '').slice(0, 500),
      po_file_path: (rec.po_file_path || '').slice(0, 500),
      pod_file_path: (rec.pod_file_path || '').slice(0, 500),
      grn_file_path: (rec.grn_file_path || '').slice(0, 500),
      dn_file_path: (rec.dn_file_path || '').slice(0, 500),
      cn_file_path: (rec.cn_file_path || '').slice(0, 500),
    };

    if (isDemoMode || !user) {
      const fullRec: DesiDiyaRecord = { ...normalized, id, ownerId: 'demo-user' };
      setDesidiyaRecords((prev) =>
        existingId ? prev.map((r) => (r.id === existingId ? fullRec : r)) : [fullRec, ...prev]
      );
      await logActivity(
        'InvoiceTracking',
        `${normalized.invoice_no} (PO: ${normalized.po_number || 'N/A'})`,
        auditAction || (existingId ? 'Record Updated' : 'Record Created'),
        prevVal || '',
        newVal ||
          `Delivery: ${normalized.delivery_status || 'Unset'}, Appt: ${
            normalized.appointment_date || 'None'
          }`
      );
      markSaved();
      notify(
        existingId
          ? `Updated record ${normalized.invoice_no}.`
          : `Added tracking record ${normalized.invoice_no}.`
      );
      return;
    }

    const payload = {
      ownerId: user.uid,
      ...normalized,
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingId) {
        const { ownerId: _ow, ...updateFields } = payload;
        await updateDoc(doc(db, 'invoiceTracking', existingId), updateFields);
      } else {
        await setDoc(doc(db, 'invoiceTracking', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await logActivity(
        'InvoiceTracking',
        `${normalized.invoice_no} (PO: ${normalized.po_number || 'N/A'})`,
        auditAction || (existingId ? 'Record Updated' : 'Record Created'),
        prevVal || '',
        newVal || `Delivery: ${normalized.delivery_status || 'Unset'}`
      );
      markSaved();
      notify(
        existingId
          ? `Saved ${normalized.invoice_no} to Cloud Firestore.`
          : `Created ${normalized.invoice_no} in Cloud Firestore.`
      );
    } catch (err) {
      setSavingState('error');
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `invoiceTracking/${id}`
      );
    }
  };

  const deleteDesiDiyaRecord = async (id: string) => {
    const target = desidiyaRecords.find((r) => r.id === id);
    if (isDemoMode || !user) {
      setDesidiyaRecords((prev) => prev.filter((r) => r.id !== id));
      await logActivity(
        'InvoiceTracking',
        target ? `${target.invoice_no} (PO: ${target.po_number})` : id,
        'Record Deleted'
      );
      notify(`Deleted record ${target?.invoice_no || id}.`);
      return;
    }
    try {
      await deleteDoc(doc(db, 'invoiceTracking', id));
      await logActivity(
        'InvoiceTracking',
        target ? `${target.invoice_no} (PO: ${target.po_number})` : id,
        'Record Deleted'
      );
      notify(`Deleted record ${target?.invoice_no || id} from Cloud Firestore.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `invoiceTracking/${id}`);
    }
  };

  const bulkUpdateDesiDiyaAppointments = async (
    poNumber: string,
    newAppointmentDate: string,
    reason?: string
  ): Promise<number> => {
    const cleanPo = poNumber.trim();
    const matches = desidiyaRecords.filter((r) => r.po_number.trim() === cleanPo);
    if (matches.length === 0) {
      notify(`No records found for PO Number ${cleanPo}.`, 'error');
      return 0;
    }

    for (const rec of matches) {
      const resched = computeAppointmentReschedule(rec, newAppointmentDate, reason || '');
      const { id, ownerId: _ow, ...rest } = rec;
      await saveDesiDiyaRecord(
        {
          ...rest,
          appointment_date: resched.appointment_date,
          appointment_count: resched.appointment_count,
          appointment_history: resched.appointment_history,
          original_appointment_date: resched.original_appointment_date,
        },
        id,
        'Bulk PO Appointment Rescheduled',
        rec.appointment_date || 'Unscheduled',
        `${newAppointmentDate}${reason ? ` (${reason})` : ''}`
      );
    }
    notify(`Updated appointment date to ${newAppointmentDate} for ${matches.length} record(s) on PO ${cleanPo}.`);
    return matches.length;
  };

  const extendDesiDiyaPoExpiry = async (
    recordId: string,
    newExpiryDate: string,
    reason?: string
  ) => {
    const rec = desidiyaRecords.find((r) => r.id === recordId);
    if (!rec) return;
    const ext = computePoExpiryExtension(rec, newExpiryDate, reason || 'Buyer extension');
    const { id, ownerId: _ow, ...rest } = rec;
    await saveDesiDiyaRecord(
      {
        ...rest,
        po_expiry_date: ext.po_expiry_date,
        original_po_expiry_date: ext.original_po_expiry_date,
        po_expiry_history: ext.po_expiry_history,
      },
      id,
      'PO Expiry Date Extended',
      rec.po_expiry_date || 'Unset',
      `${newExpiryDate}${reason ? ` (${reason})` : ''}`
    );
  };

  const resolveDesiDiyaException = async (
    recordId: string,
    patch: {
      grn_quantity: number;
      dn_quantity: number;
      grn_no: string;
      dn_status: string;
      dn_resolution: string;
      dn_closure_date: string;
      invoice_remark: string;
    }
  ) => {
    const rec = desidiyaRecords.find((r) => r.id === recordId);
    if (!rec) return;
    const { id, ownerId: _ow, ...rest } = rec;
    await saveDesiDiyaRecord(
      {
        ...rest,
        grn_quantity: patch.grn_quantity,
        dn_quantity: patch.dn_quantity,
        grn_no: patch.grn_no,
        dn_status: patch.dn_status,
        dn_resolution: patch.dn_resolution,
        dn_closure_date: patch.dn_closure_date,
        invoice_remark: patch.invoice_remark,
      },
      id,
      'Exception Queue Reconciled',
      `InvQty:${rec.invoice_quantity} | GRN:${rec.grn_quantity} | DN:${rec.dn_quantity}`,
      `GRN:${patch.grn_quantity} | DN:${patch.dn_quantity} | Status:${patch.dn_status}`
    );
  };

  // =========================================================================
  // PERSISTENT DOCUMENT UPLOAD & DOWNLOAD CENTER
  // =========================================================================
  const uploadTrackingDocument = async (params: {
    category: DocumentCategory;
    filename: string;
    base64Data: string;
    mimeType: string;
    invoiceNo: string;
    poNumber: string;
    trackingId: string;
    replaceExistingId?: string;
  }): Promise<TrackingDocumentRecord | null> => {
    markSaving();
    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: params.category,
          filename: params.filename,
          base64Data: params.base64Data,
          mimeType: params.mimeType,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to upload document to server.');
      }

      const uploaded = (await response.json()) as {
        storagePath: string;
        filename: string;
        sizeBytes: number;
        mimeType: string;
        replacedExisting: boolean;
      };

      const nowIso = new Date().toISOString();
      const uploaderEmail = user?.email || DEFAULT_OWNER_EMAIL;
      const existingDoc = params.replaceExistingId
        ? trackingDocuments.find((d) => d.id === params.replaceExistingId)
        : trackingDocuments.find(
            (d) =>
              d.category === params.category &&
              (d.originalFilename.toLowerCase() === uploaded.filename.toLowerCase() ||
                (params.invoiceNo && d.invoiceNo === params.invoiceNo))
          );

      let historyArr: Array<{ action: string; timestamp: string; user: string }> = [];
      if (existingDoc?.historyJson) {
        try {
          historyArr = JSON.parse(existingDoc.historyJson);
        } catch {
          historyArr = [];
        }
      }
      historyArr.push({
        action: existingDoc ? 'Replaced Document' : 'Uploaded Document',
        timestamp: nowIso.slice(0, 16).replace('T', ' '),
        user: uploaderEmail,
      });

      const docId = existingDoc?.id || makeId('doc');
      const docRecord: TrackingDocumentRecord = {
        id: docId,
        ownerId: user?.uid || 'demo-user',
        category: params.category,
        originalFilename: uploaded.filename.slice(0, 255),
        invoiceNo: (params.invoiceNo || '').trim().slice(0, 64),
        poNumber: (params.poNumber || '').trim().slice(0, 64),
        trackingId: (params.trackingId || '').trim().slice(0, 80),
        uploadTimestamp: nowIso,
        uploadedByEmail: uploaderEmail.slice(0, 254),
        storagePath: uploaded.storagePath.slice(0, 500),
        mimeType: (uploaded.mimeType || 'application/octet-stream').slice(0, 120),
        sizeBytes: uploaded.sizeBytes,
        historyJson: JSON.stringify(historyArr).slice(0, 4000),
      };

      if (isDemoMode || !user) {
        setTrackingDocuments((prev) =>
          existingDoc ? prev.map((d) => (d.id === docId ? docRecord : d)) : [docRecord, ...prev]
        );
      } else {
        const { id: _id, ...firestoreData } = docRecord;
        if (existingDoc) {
          const { ownerId: _ow, ...updateFields } = firestoreData;
          await updateDoc(doc(db, 'trackingDocuments', docId), {
            ...updateFields,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'trackingDocuments', docId), {
            ...firestoreData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      // Automatically link the storagePath to matching invoiceTracking record(s)
      const pathField = CATEGORY_TO_PATH_FIELD[params.category];
      const matchingRecords = desidiyaRecords.filter((r) => {
        if (params.invoiceNo && r.invoice_no.toLowerCase() === params.invoiceNo.trim().toLowerCase()) {
          return true;
        }
        if (
          !params.invoiceNo &&
          params.poNumber &&
          r.po_number.toLowerCase() === params.poNumber.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      });

      for (const match of matchingRecords) {
        const { id: recId, ownerId: _ow, ...rest } = match;
        await saveDesiDiyaRecord(
          {
            ...rest,
            [pathField]: uploaded.storagePath,
          },
          recId,
          `${params.category} Document Linked`,
          String(match[pathField] || 'None'),
          uploaded.filename
        );
      }

      await logActivity(
        'TrackingDocument',
        `${params.category}: ${uploaded.filename}`,
        existingDoc ? 'Document Replaced' : 'Document Uploaded',
        existingDoc?.originalFilename || '',
        `Linked to Inv: ${params.invoiceNo || 'N/A'}, PO: ${params.poNumber || 'N/A'}`
      );

      markSaved();
      notify(`${params.category} file "${uploaded.filename}" uploaded and linked.`);
      return docRecord;
    } catch (err) {
      setSavingState('error');
      notify(err instanceof Error ? err.message : 'Document upload failed.', 'error');
      return null;
    }
  };

  const deleteTrackingDocument = async (docId: string) => {
    const target = trackingDocuments.find((d) => d.id === docId);
    if (!target) return;

    try {
      if (target.storagePath.startsWith('/api/documents/file/')) {
        await fetch(target.storagePath, { method: 'DELETE' }).catch(() => {});
      }

      if (isDemoMode || !user) {
        setTrackingDocuments((prev) => prev.filter((d) => d.id !== docId));
      } else {
        await deleteDoc(doc(db, 'trackingDocuments', docId));
      }

      // Clear reference on linked records
      const pathField = CATEGORY_TO_PATH_FIELD[target.category];
      const linked = desidiyaRecords.filter((r) => r[pathField] === target.storagePath);
      for (const rec of linked) {
        const { id: recId, ownerId: _ow, ...rest } = rec;
        await saveDesiDiyaRecord(
          {
            ...rest,
            [pathField]: '',
          },
          recId,
          `${target.category} Document Unlinked`,
          target.originalFilename,
          'Deleted'
        );
      }

      await logActivity(
        'TrackingDocument',
        `${target.category}: ${target.originalFilename}`,
        'Document Deleted',
        target.storagePath,
        ''
      );
      notify(`Deleted ${target.category} document "${target.originalFilename}".`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to delete document.', 'error');
    }
  };

  // =========================================================================
  // BULK CSV SYNC (MERGE OR REPLACE)
  // =========================================================================
  const syncDesiDiyaBulkCsv = async (
    fileName: string,
    parsedRows: Omit<DesiDiyaRecord, 'id' | 'ownerId'>[],
    mode: 'merge' | 'replace'
  ): Promise<{ inserted: number; updated: number }> => {
    markSaving();
    let inserted = 0;
    let updated = 0;

    if (mode === 'replace') {
      // Delete existing records first
      for (const existing of desidiyaRecords) {
        await deleteDesiDiyaRecord(existing.id);
      }
    }

    for (const row of parsedRows) {
      const existing =
        mode === 'merge'
          ? desidiyaRecords.find(
              (r) => r.invoice_no.trim().toLowerCase() === row.invoice_no.trim().toLowerCase()
            )
          : undefined;

      if (existing) {
        await saveDesiDiyaRecord(
          {
            ...row,
            // Preserve existing document file paths if CSV row leaves them blank
            invoice_file_path: row.invoice_file_path || existing.invoice_file_path,
            po_file_path: row.po_file_path || existing.po_file_path,
            pod_file_path: row.pod_file_path || existing.pod_file_path,
            grn_file_path: row.grn_file_path || existing.grn_file_path,
            dn_file_path: row.dn_file_path || existing.dn_file_path,
            cn_file_path: row.cn_file_path || existing.cn_file_path,
          },
          existing.id,
          'Bulk CSV Merge Update'
        );
        updated += 1;
      } else {
        await saveDesiDiyaRecord(row, undefined, 'Bulk CSV Import');
        inserted += 1;
      }
    }

    const nowIso = new Date().toISOString();
    const jobId = makeId('imp');
    if (isDemoMode || !user) {
      setImportJobs((prev) => [
        {
          id: jobId,
          ownerId: 'demo-user',
          fileName,
          targetModule: 'invoiceTracking',
          totalRows: parsedRows.length,
          importedRows: inserted + updated,
          invalidRows: 0,
          duplicateRows: updated,
          timestampIso: nowIso,
        },
        ...prev,
      ]);
    } else {
      await setDoc(doc(db, 'importJobs', jobId), {
        ownerId: user.uid,
        fileName: fileName.slice(0, 200),
        targetModule: 'invoiceTracking',
        totalRows: parsedRows.length,
        importedRows: inserted + updated,
        invalidRows: 0,
        duplicateRows: updated,
        timestampIso: nowIso,
        createdAt: serverTimestamp(),
      });
    }

    markSaved();
    notify(`Bulk CSV sync complete: ${inserted} inserted, ${updated} updated.`);
    return { inserted, updated };
  };

  // =========================================================================
  // EXISTING WORKTRACK CRUD
  // =========================================================================
  const saveTask = async (
    task: Omit<TaskRecord, 'id' | 'ownerId'>,
    existingId?: string
  ) => {
    markSaving();
    const id = existingId || makeId('tsk');
    if (isDemoMode || !user) {
      const record: TaskRecord = { ...task, id, ownerId: 'demo-user' };
      setTasks((prev) =>
        existingId ? prev.map((t) => (t.id === existingId ? record : t)) : [record, ...prev]
      );
      await logActivity(
        'Task',
        `${task.taskCode} (${task.title})`,
        existingId ? 'Task Updated' : 'Task Created',
        '',
        `Status: ${task.status}, Priority: ${task.priority}`
      );
      markSaved();
      notify(existingId ? 'Task updated.' : 'Task created.');
      return;
    }

    const payload = {
      ownerId: user.uid,
      taskCode: (task.taskCode || 'TSK-100').slice(0, 32),
      title: task.title.trim().slice(0, 200),
      description: (task.description || '').slice(0, 2000),
      category: task.category,
      priority: task.priority,
      status: task.status,
      createdDate: (task.createdDate || REFERENCE_TODAY).slice(0, 32),
      startDate: (task.startDate || '').slice(0, 32),
      dueDate: (task.dueDate || REFERENCE_TODAY).slice(0, 32),
      completedDate: (task.completedDate || '').slice(0, 32),
      assignedBy: (task.assignedBy || 'Self').slice(0, 120),
      assignedTo: (task.assignedTo || 'Sooraj').slice(0, 120),
      estimatedHours: Math.max(0, Number(task.estimatedHours) || 0),
      actualHours: Math.max(0, Number(task.actualHours) || 0),
      tags: (task.tags || []).slice(0, 10).map((t) => String(t).slice(0, 50)),
      notes: (task.notes || '').slice(0, 2000),
      subtasksJson: JSON.stringify(task.subtasks || []).slice(0, 4000),
      commentsJson: JSON.stringify(task.comments || []).slice(0, 4000),
      projectId: (task.projectId || '').slice(0, 128),
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingId) {
        const { createdDate: _cd, ownerId: _ow, ...updateFields } = payload;
        await updateDoc(doc(db, 'tasks', existingId), updateFields);
      } else {
        await setDoc(doc(db, 'tasks', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await logActivity(
        'Task',
        `${task.taskCode} (${task.title})`,
        existingId ? 'Task Updated' : 'Task Created',
        '',
        `Status: ${task.status}`
      );
      markSaved();
      notify(existingId ? 'Task saved to Cloud Firestore.' : 'New task created.');
    } catch (err) {
      setSavingState('error');
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `tasks/${id}`
      );
    }
  };

  const deleteTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (isDemoMode || !user) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      await logActivity('Task', target?.taskCode || id, 'Record Deleted');
      notify('Task deleted.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'tasks', id));
      await logActivity('Task', target?.taskCode || id, 'Record Deleted');
      notify('Task deleted from Cloud Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const bulkUpdateTasks = async (
    ids: string[],
    patch: { status?: TaskStatus; category?: TaskCategory }
  ) => {
    for (const id of ids) {
      const existing = tasks.find((t) => t.id === id);
      if (!existing) continue;
      const updated = {
        ...existing,
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.category ? { category: patch.category } : {}),
        ...(patch.status === 'Completed' && !existing.completedDate
          ? { completedDate: REFERENCE_TODAY }
          : {}),
      };
      await saveTask(updated, id);
    }
    notify(`Updated ${ids.length} tasks.`);
  };

  const duplicateTask = async (task: TaskRecord) => {
    const { id: _id, ownerId: _ow, ...rest } = task;
    await saveTask({
      ...rest,
      taskCode: `${task.taskCode}-COPY`,
      title: `${task.title} (Copy)`,
      status: 'Not Started',
      createdDate: REFERENCE_TODAY,
    });
  };

  const saveOperation = async (
    op: Omit<OperationRecord, 'id' | 'ownerId'>,
    existingId?: string,
    auditAction?: string,
    prevVal?: string,
    newVal?: string
  ) => {
    markSaving();
    const id = existingId || makeId('ops');
    if (isDemoMode || !user) {
      const record: OperationRecord = { ...op, id, ownerId: 'demo-user' };
      setOperations((prev) =>
        existingId ? prev.map((o) => (o.id === existingId ? record : o)) : [record, ...prev]
      );
      await logActivity(
        'OperationRecord',
        `${op.recordCode} (PO: ${op.poNumber})`,
        auditAction || (existingId ? 'Operation Updated' : 'Operation Created'),
        prevVal || '',
        newVal || `Status: ${op.shipmentStatus}, Appt: ${op.appointmentDate || 'Unscheduled'}`
      );
      markSaved();
      notify(existingId ? 'Operation record updated.' : 'Operation record added.');
      return;
    }

    const payload = {
      ownerId: user.uid,
      recordCode: (op.recordCode || 'OPS-100').slice(0, 32),
      poNumber: op.poNumber.trim().slice(0, 64),
      invoiceNumber: (op.invoiceNumber || '').slice(0, 64),
      lrNumber: (op.lrNumber || '').slice(0, 64),
      courierName: (op.courierName || 'Courier').slice(0, 120),
      vehicleNumber: (op.vehicleNumber || '').slice(0, 40),
      driverName: (op.driverName || '').slice(0, 100),
      driverContact: (op.driverContact || '').slice(0, 40),
      sku: (op.sku || '').slice(0, 80),
      productName: (op.productName || '').slice(0, 200),
      quantity: Math.max(0, Number(op.quantity) || 0),
      warehouse: (op.warehouse || 'Warehouse').slice(0, 120),
      dispatchDate: (op.dispatchDate || '').slice(0, 32),
      reportingDate: (op.reportingDate || '').slice(0, 32),
      appointmentDate: (op.appointmentDate || '').slice(0, 32),
      poCreationDate: (op.poCreationDate || '').slice(0, 32),
      poExpiryDate: (op.poExpiryDate || REFERENCE_TODAY).slice(0, 32),
      deliveryDate: (op.deliveryDate || '').slice(0, 32),
      shipmentStatus: op.shipmentStatus,
      appointmentStatus: (op.appointmentStatus || '').slice(0, 60),
      issueCategory: (op.issueCategory || '').slice(0, 80),
      issueDescription: (op.issueDescription || '').slice(0, 1000),
      nextFollowUpDate: (op.nextFollowUpDate || '').slice(0, 32),
      lastUpdatedDate: REFERENCE_TODAY,
      remarks: (op.remarks || '').slice(0, 2000),
      rescheduleHistoryJson: JSON.stringify(op.rescheduleHistory || []).slice(0, 5000),
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingId) {
        const { ownerId: _ow, ...updateFields } = payload;
        await updateDoc(doc(db, 'operations', existingId), updateFields);
      } else {
        await setDoc(doc(db, 'operations', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await logActivity(
        'OperationRecord',
        `${op.recordCode} (${op.poNumber})`,
        auditAction || (existingId ? 'Operation Updated' : 'Operation Created'),
        prevVal || '',
        newVal || `Status: ${op.shipmentStatus}`
      );
      markSaved();
      notify(existingId ? 'Operations record updated.' : 'Operations record created.');
    } catch (err) {
      setSavingState('error');
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `operations/${id}`
      );
    }
  };

  const deleteOperation = async (id: string) => {
    const target = operations.find((o) => o.id === id);
    if (isDemoMode || !user) {
      setOperations((prev) => prev.filter((o) => o.id !== id));
      await logActivity('OperationRecord', target?.recordCode || id, 'Record Deleted');
      notify('Operations record deleted.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'operations', id));
      await logActivity('OperationRecord', target?.recordCode || id, 'Record Deleted');
      notify('Operations record deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `operations/${id}`);
    }
  };

  const savePurchaseOrder = async (
    po: Omit<PurchaseOrderRecord, 'id' | 'ownerId'>,
    existingId?: string,
    auditAction?: string,
    prevVal?: string,
    newVal?: string
  ) => {
    markSaving();
    const id = existingId || makeId('po');
    if (isDemoMode || !user) {
      const record: PurchaseOrderRecord = { ...po, id, ownerId: 'demo-user' };
      setPurchaseOrders((prev) =>
        existingId ? prev.map((p) => (p.id === existingId ? record : p)) : [record, ...prev]
      );
      await logActivity(
        'PurchaseOrder',
        po.poNumber,
        auditAction || (existingId ? 'PO Updated' : 'PO Created'),
        prevVal || '',
        newVal || `Status: ${po.poStatus}, Expiry: ${po.currentExpiryDate}`
      );
      markSaved();
      notify(existingId ? 'Purchase Order updated.' : 'Purchase Order created.');
      return;
    }

    const payload = {
      ownerId: user.uid,
      poNumber: po.poNumber.trim().slice(0, 64),
      vendor: (po.vendor || 'Vendor').slice(0, 120),
      courier: (po.courier || '').slice(0, 120),
      warehouse: (po.warehouse || 'Warehouse').slice(0, 120),
      poCreationDate: (po.poCreationDate || '').slice(0, 32),
      originalAppointmentDate: (po.originalAppointmentDate || '').slice(0, 32),
      currentAppointmentDate: (po.currentAppointmentDate || '').slice(0, 32),
      originalExpiryDate: (po.originalExpiryDate || '').slice(0, 32),
      currentExpiryDate: (po.currentExpiryDate || REFERENCE_TODAY).slice(0, 32),
      poStatus: po.poStatus,
      expectedQuantity: Math.max(0, Number(po.expectedQuantity) || 0),
      receivedQuantity: Math.max(0, Number(po.receivedQuantity) || 0),
      pendingQuantity: Math.max(0, Number(po.pendingQuantity) || 0),
      relatedInvoices: (po.relatedInvoices || '').slice(0, 500),
      relatedLRs: (po.relatedLRs || '').slice(0, 500),
      notes: (po.notes || '').slice(0, 2000),
      changeHistoryJson: JSON.stringify(po.changeHistory || []).slice(0, 5000),
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingId) {
        const { ownerId: _ow, ...updateFields } = payload;
        await updateDoc(doc(db, 'purchaseOrders', existingId), updateFields);
      } else {
        await setDoc(doc(db, 'purchaseOrders', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await logActivity(
        'PurchaseOrder',
        po.poNumber,
        auditAction || (existingId ? 'PO Updated' : 'PO Created'),
        prevVal || '',
        newVal || `Expiry: ${po.currentExpiryDate}`
      );
      markSaved();
      notify(existingId ? 'Purchase Order updated.' : 'Purchase Order created.');
    } catch (err) {
      setSavingState('error');
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `purchaseOrders/${id}`
      );
    }
  };

  const deletePurchaseOrder = async (id: string) => {
    const target = purchaseOrders.find((p) => p.id === id);
    if (isDemoMode || !user) {
      setPurchaseOrders((prev) => prev.filter((p) => p.id !== id));
      await logActivity('PurchaseOrder', target?.poNumber || id, 'Record Deleted');
      notify('Purchase Order deleted.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'purchaseOrders', id));
      await logActivity('PurchaseOrder', target?.poNumber || id, 'Record Deleted');
      notify('Purchase Order deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `purchaseOrders/${id}`);
    }
  };

  const saveEscalation = async (
    esc: Omit<EscalationRecord, 'id' | 'ownerId'>,
    existingId?: string,
    auditAction?: string,
    prevVal?: string,
    newVal?: string
  ) => {
    markSaving();
    const id = existingId || makeId('esc');
    if (isDemoMode || !user) {
      const record: EscalationRecord = { ...esc, id, ownerId: 'demo-user' };
      setEscalations((prev) =>
        existingId ? prev.map((e) => (e.id === existingId ? record : e)) : [record, ...prev]
      );
      await logActivity(
        'Escalation',
        `${esc.escalationCode} (${esc.escalationType})`,
        auditAction || (existingId ? 'Escalation Updated' : 'Escalation Created'),
        prevVal || '',
        newVal || `Status: ${esc.status}`
      );
      markSaved();
      notify(existingId ? 'Escalation updated.' : 'Escalation logged.');
      return;
    }

    const payload = {
      ownerId: user.uid,
      escalationCode: (esc.escalationCode || 'ESC-100').slice(0, 32),
      relatedPoNumber: (esc.relatedPoNumber || '').slice(0, 64),
      relatedLrNumber: (esc.relatedLrNumber || '').slice(0, 64),
      courierName: (esc.courierName || '').slice(0, 120),
      warehouse: (esc.warehouse || '').slice(0, 120),
      escalationType: esc.escalationType,
      issueDescription: esc.issueDescription.trim().slice(0, 2000),
      responsibleTeam: (esc.responsibleTeam || '').slice(0, 120),
      assignedPerson: (esc.assignedPerson || '').slice(0, 120),
      createdDate: (esc.createdDate || REFERENCE_TODAY).slice(0, 32),
      priority: esc.priority,
      status: esc.status,
      lastFollowUpDate: (esc.lastFollowUpDate || '').slice(0, 32),
      nextFollowUpDate: (esc.nextFollowUpDate || '').slice(0, 32),
      resolutionNotes: (esc.resolutionNotes || '').slice(0, 2000),
      closureDate: (esc.closureDate || '').slice(0, 32),
      historyJson: JSON.stringify(esc.history || []).slice(0, 5000),
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingId) {
        const { ownerId: _ow, createdDate: _cd, ...updateFields } = payload;
        await updateDoc(doc(db, 'escalations', existingId), updateFields);
      } else {
        await setDoc(doc(db, 'escalations', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await logActivity(
        'Escalation',
        `${esc.escalationCode} (${esc.escalationType})`,
        auditAction || (existingId ? 'Escalation Updated' : 'Escalation Created'),
        prevVal || '',
        newVal || `Status: ${esc.status}`
      );
      markSaved();
      notify(existingId ? 'Escalation updated.' : 'Escalation created.');
    } catch (err) {
      setSavingState('error');
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `escalations/${id}`
      );
    }
  };

  const deleteEscalation = async (id: string) => {
    const target = escalations.find((e) => e.id === id);
    if (isDemoMode || !user) {
      setEscalations((prev) => prev.filter((e) => e.id !== id));
      await logActivity('Escalation', target?.escalationCode || id, 'Record Deleted');
      notify('Escalation deleted.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'escalations', id));
      await logActivity('Escalation', target?.escalationCode || id, 'Record Deleted');
      notify('Escalation deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `escalations/${id}`);
    }
  };

  const saveAssignment = async (
    asg: Omit<SeniorAssignmentRecord, 'id' | 'ownerId'>,
    existingId?: string
  ) => {
    markSaving();
    const id = existingId || makeId('asg');
    if (isDemoMode || !user) {
      const record: SeniorAssignmentRecord = { ...asg, id, ownerId: 'demo-user' };
      setAssignments((prev) =>
        existingId ? prev.map((a) => (a.id === existingId ? record : a)) : [record, ...prev]
      );
      await logActivity(
        'SeniorAssignment',
        `${asg.assignmentCode} (${asg.title})`,
        existingId ? 'Assignment Updated' : 'Assignment Recorded',
        '',
        `Status: ${asg.status} (${asg.progress}%)`
      );
      markSaved();
      notify(existingId ? 'Assignment updated.' : 'Senior assignment recorded.');
      return;
    }

    const payload = {
      ownerId: user.uid,
      assignmentCode: (asg.assignmentCode || 'ASG-100').slice(0, 32),
      title: asg.title.trim().slice(0, 200),
      assignedBy: (asg.assignedBy || 'Senior Manager').slice(0, 120),
      assignedDate: (asg.assignedDate || REFERENCE_TODAY).slice(0, 32),
      dueDate: (asg.dueDate || REFERENCE_TODAY).slice(0, 32),
      priority: asg.priority,
      description: (asg.description || '').slice(0, 2000),
      status: asg.status,
      progress: Math.min(100, Math.max(0, Number(asg.progress) || 0)),
      comments: (asg.comments || '').slice(0, 2000),
      completionDate: (asg.completionDate || '').slice(0, 32),
      linkedTaskId: (asg.linkedTaskId || '').slice(0, 128),
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingId) {
        const { ownerId: _ow, ...updateFields } = payload;
        await updateDoc(doc(db, 'assignments', existingId), updateFields);
      } else {
        await setDoc(doc(db, 'assignments', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await logActivity(
        'SeniorAssignment',
        asg.assignmentCode,
        existingId ? 'Assignment Updated' : 'Assignment Recorded'
      );
      markSaved();
      notify(existingId ? 'Assignment updated.' : 'Senior assignment recorded.');
    } catch (err) {
      setSavingState('error');
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `assignments/${id}`
      );
    }
  };

  const deleteAssignment = async (id: string) => {
    if (isDemoMode || !user) {
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      notify('Assignment deleted.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'assignments', id));
      notify('Assignment deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `assignments/${id}`);
    }
  };

  const saveProject = async (
    proj: Omit<ProjectRecord, 'id' | 'ownerId'>,
    existingId?: string
  ) => {
    markSaving();
    const id = existingId || makeId('prj');
    if (isDemoMode || !user) {
      const record: ProjectRecord = { ...proj, id, ownerId: 'demo-user' };
      setProjects((prev) =>
        existingId ? prev.map((p) => (p.id === existingId ? record : p)) : [record, ...prev]
      );
      await logActivity(
        'Project',
        `${proj.projectCode} (${proj.name})`,
        existingId ? 'Project Updated' : 'Project Created',
        '',
        `Status: ${proj.status}, Progress: ${proj.progress}%`
      );
      markSaved();
      notify(existingId ? 'Project updated.' : 'Project created.');
      return;
    }

    const payload = {
      ownerId: user.uid,
      projectCode: (proj.projectCode || 'PRJ-10').slice(0, 32),
      name: proj.name.trim().slice(0, 200),
      description: (proj.description || '').slice(0, 2000),
      category: proj.category,
      startDate: (proj.startDate || REFERENCE_TODAY).slice(0, 32),
      targetDate: (proj.targetDate || REFERENCE_TODAY).slice(0, 32),
      status: proj.status,
      priority: proj.priority,
      progress: Math.min(100, Math.max(0, Number(proj.progress) || 0)),
      milestonesJson: JSON.stringify(proj.milestones || []).slice(0, 4000),
      notes: (proj.notes || '').slice(0, 2000),
      updatedAt: serverTimestamp(),
    };

    try {
      if (existingId) {
        const { ownerId: _ow, ...updateFields } = payload;
        await updateDoc(doc(db, 'projects', existingId), updateFields);
      } else {
        await setDoc(doc(db, 'projects', id), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      await logActivity(
        'Project',
        proj.projectCode,
        existingId ? 'Project Updated' : 'Project Created'
      );
      markSaved();
      notify(existingId ? 'Project updated.' : 'Project created.');
    } catch (err) {
      setSavingState('error');
      handleFirestoreError(
        err,
        existingId ? OperationType.UPDATE : OperationType.CREATE,
        `projects/${id}`
      );
    }
  };

  const deleteProject = async (id: string) => {
    if (isDemoMode || !user) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      notify('Project deleted.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'projects', id));
      notify('Project deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
    }
  };

  const startTimer = (
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string,
    notes = ''
  ) => {
    if (activeTimer.isRunning) {
      notify('A timer is already running. Stop or pause it before starting another.', 'error');
      return;
    }
    const nowIso = new Date().toISOString();
    setActiveTimer({
      isRunning: true,
      isPaused: false,
      taskId,
      taskTitle,
      projectId,
      projectName,
      notes,
      startedAtIso: nowIso,
      lastResumedAtMs: Date.now(),
      accumulatedSeconds: 0,
    });
    notify(`Started timer for "${taskTitle || 'Focus Session'}".`);
  };

  const pauseTimer = () => {
    if (!activeTimer.isRunning || activeTimer.isPaused) return;
    const totalSecs = calculateActiveTimerSeconds(
      true,
      false,
      activeTimer.lastResumedAtMs,
      activeTimer.accumulatedSeconds,
      Date.now()
    );
    setActiveTimer((prev) => ({
      ...prev,
      isPaused: true,
      accumulatedSeconds: totalSecs,
    }));
    notify('Timer paused.', 'info');
  };

  const resumeTimer = () => {
    if (!activeTimer.isRunning || !activeTimer.isPaused) return;
    setActiveTimer((prev) => ({
      ...prev,
      isPaused: false,
      lastResumedAtMs: Date.now(),
    }));
    notify('Timer resumed.', 'info');
  };

  const addManualTimeLog = async (log: Omit<TimeLogRecord, 'id' | 'ownerId'>) => {
    markSaving();
    const id = makeId('tl');
    if (isDemoMode || !user) {
      const record: TimeLogRecord = { ...log, id, ownerId: 'demo-user' };
      setTimeLogs((prev) => [record, ...prev]);
      if (log.taskId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === log.taskId
              ? {
                  ...t,
                  actualHours: Number((t.actualHours + log.durationMinutes / 60).toFixed(2)),
                }
              : t
          )
        );
      }
      await logActivity(
        'TimeLog',
        log.taskTitle || 'Manual Entry',
        'Time Logged',
        '',
        `${log.durationMinutes} mins`
      );
      markSaved();
      notify(`Logged ${log.durationMinutes} minutes.`);
      return;
    }

    const payload = {
      ownerId: user.uid,
      taskId: (log.taskId || '').slice(0, 128),
      taskTitle: (log.taskTitle || '').slice(0, 200),
      projectId: (log.projectId || '').slice(0, 128),
      projectName: (log.projectName || '').slice(0, 200),
      startTime: log.startTime.slice(0, 40),
      endTime: log.endTime.slice(0, 40),
      durationMinutes: Math.max(1, Math.round(Number(log.durationMinutes) || 1)),
      notes: (log.notes || '').slice(0, 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'timeLogs', id), payload);
      await logActivity('TimeLog', log.taskTitle || id, 'Time Logged', '', `${log.durationMinutes}m`);
      markSaved();
      notify(`Logged ${log.durationMinutes} minutes.`);
    } catch (err) {
      setSavingState('error');
      handleFirestoreError(err, OperationType.CREATE, `timeLogs/${id}`);
    }
  };

  const stopAndLogTimer = async () => {
    if (!activeTimer.isRunning) return;
    const totalSecs = calculateActiveTimerSeconds(
      activeTimer.isRunning,
      activeTimer.isPaused,
      activeTimer.lastResumedAtMs,
      activeTimer.accumulatedSeconds,
      Date.now()
    );
    const durationMinutes = Math.max(1, Math.round(totalSecs / 60));
    const endIso = new Date().toISOString().slice(0, 19);
    const startIso = (activeTimer.startedAtIso || endIso).slice(0, 19);

    await addManualTimeLog({
      taskId: activeTimer.taskId,
      taskTitle: activeTimer.taskTitle || 'General Operations Session',
      projectId: activeTimer.projectId,
      projectName: activeTimer.projectName,
      startTime: startIso,
      endTime: endIso,
      durationMinutes,
      notes: activeTimer.notes || 'Recorded via live task timer',
    });

    setActiveTimer({
      isRunning: false,
      isPaused: false,
      taskId: '',
      taskTitle: '',
      projectId: '',
      projectName: '',
      notes: '',
      startedAtIso: '',
      lastResumedAtMs: 0,
      accumulatedSeconds: 0,
    });
  };

  const deleteTimeLog = async (id: string) => {
    if (isDemoMode || !user) {
      setTimeLogs((prev) => prev.filter((tl) => tl.id !== id));
      notify('Time log deleted.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'timeLogs', id));
      notify('Time log deleted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `timeLogs/${id}`);
    }
  };

  const recordImportBatch = async (
    fileName: string,
    targetModule: 'tasks' | 'operations' | 'purchaseOrders' | 'escalations' | 'invoiceTracking',
    validRows: Record<string, any>[],
    totalRows: number,
    invalidCount: number,
    duplicateCount: number
  ) => {
    markSaving();
    for (const row of validRows) {
      if (targetModule === 'tasks') {
        await saveTask({
          taskCode: row.taskCode || `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
          title: String(row.title || 'Imported Task'),
          description: String(row.description || ''),
          category: (row.category as TaskCategory) || 'Operations',
          priority: row.priority || 'Medium',
          status: row.status || 'Not Started',
          createdDate: REFERENCE_TODAY,
          startDate: String(row.startDate || REFERENCE_TODAY),
          dueDate: String(row.dueDate || REFERENCE_TODAY),
          completedDate: '',
          assignedBy: String(row.assignedBy || 'Import'),
          assignedTo: String(row.assignedTo || 'Sooraj'),
          estimatedHours: Number(row.estimatedHours) || 1,
          actualHours: Number(row.actualHours) || 0,
          tags: ['Imported'],
          notes: String(row.notes || ''),
          subtasks: [],
          comments: [],
        });
      } else if (targetModule === 'operations') {
        await saveOperation({
          recordCode: row.recordCode || `OPS-${Math.floor(100 + Math.random() * 899)}`,
          poNumber: String(row.poNumber),
          invoiceNumber: String(row.invoiceNumber || ''),
          lrNumber: String(row.lrNumber || ''),
          courierName: String(row.courierName || 'Delhivery B2B'),
          vehicleNumber: String(row.vehicleNumber || ''),
          driverName: String(row.driverName || ''),
          driverContact: String(row.driverContact || ''),
          sku: String(row.sku || ''),
          productName: String(row.productName || ''),
          quantity: Number(row.quantity) || 0,
          warehouse: String(row.warehouse || ''),
          dispatchDate: String(row.dispatchDate || REFERENCE_TODAY),
          reportingDate: String(row.reportingDate || ''),
          appointmentDate: String(row.appointmentDate || ''),
          poCreationDate: String(row.poCreationDate || REFERENCE_TODAY),
          poExpiryDate: String(row.poExpiryDate || REFERENCE_TODAY),
          deliveryDate: String(row.deliveryDate || ''),
          shipmentStatus: row.shipmentStatus || 'In Transit',
          appointmentStatus: String(row.appointmentStatus || 'Pending'),
          issueCategory: String(row.issueCategory || ''),
          issueDescription: String(row.issueDescription || ''),
          nextFollowUpDate: String(row.nextFollowUpDate || REFERENCE_TODAY),
          lastUpdatedDate: REFERENCE_TODAY,
          remarks: String(row.remarks || ''),
          rescheduleHistory: [],
        });
      } else if (targetModule === 'purchaseOrders') {
        const expQty = Number(row.expectedQuantity) || 0;
        const recQty = Number(row.receivedQuantity) || 0;
        await savePurchaseOrder({
          poNumber: String(row.poNumber),
          vendor: String(row.vendor),
          courier: String(row.courier || ''),
          warehouse: String(row.warehouse),
          poCreationDate: String(row.poCreationDate || REFERENCE_TODAY),
          originalAppointmentDate: String(
            row.originalAppointmentDate || row.currentAppointmentDate || ''
          ),
          currentAppointmentDate: String(row.currentAppointmentDate || ''),
          originalExpiryDate: String(row.originalExpiryDate || row.currentExpiryDate),
          currentExpiryDate: String(row.currentExpiryDate),
          poStatus: row.poStatus || 'Open',
          expectedQuantity: expQty,
          receivedQuantity: recQty,
          pendingQuantity: Math.max(0, expQty - recQty),
          relatedInvoices: String(row.relatedInvoices || ''),
          relatedLRs: String(row.relatedLRs || ''),
          notes: String(row.notes || ''),
          changeHistory: [],
        });
      } else if (targetModule === 'escalations') {
        await saveEscalation({
          escalationCode: row.escalationCode || `ESC-${Math.floor(100 + Math.random() * 899)}`,
          relatedPoNumber: String(row.relatedPoNumber || ''),
          relatedLrNumber: String(row.relatedLrNumber || ''),
          courierName: String(row.courierName || ''),
          warehouse: String(row.warehouse || ''),
          escalationType: row.escalationType || 'Other',
          issueDescription: String(row.issueDescription),
          responsibleTeam: String(row.responsibleTeam || 'Operations'),
          assignedPerson: String(row.assignedPerson || 'Sooraj'),
          createdDate: String(row.createdDate || REFERENCE_TODAY),
          priority: row.priority || 'High',
          status: row.status || 'Open',
          lastFollowUpDate: REFERENCE_TODAY,
          nextFollowUpDate: String(row.nextFollowUpDate || REFERENCE_TODAY),
          resolutionNotes: '',
          closureDate: '',
          history: [],
        });
      }
    }

    const nowIso = new Date().toISOString();
    const jobId = makeId('imp');
    if (isDemoMode || !user) {
      setImportJobs((prev) => [
        {
          id: jobId,
          ownerId: 'demo-user',
          fileName,
          targetModule,
          totalRows,
          importedRows: validRows.length,
          invalidRows: invalidCount,
          duplicateRows: duplicateCount,
          timestampIso: nowIso,
        },
        ...prev,
      ]);
      markSaved();
      return;
    }

    try {
      await setDoc(doc(db, 'importJobs', jobId), {
        ownerId: user.uid,
        fileName: fileName.slice(0, 200),
        targetModule,
        totalRows,
        importedRows: validRows.length,
        invalidRows: invalidCount,
        duplicateRows: duplicateCount,
        timestampIso: nowIso,
        createdAt: serverTimestamp(),
      });
      markSaved();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `importJobs/${jobId}`);
    }
  };

  const updatePreferences = async (patch: Partial<NotificationPreferenceRecord>) => {
    const merged: NotificationPreferenceRecord = {
      ...preferences,
      ...patch,
    };
    setPreferences(merged);
    if (isDemoMode || !user) {
      notify('Workspace preferences updated.');
      return;
    }
    try {
      await setDoc(doc(db, 'notificationPreferences', user.uid), {
        ownerId: user.uid,
        allowedEmails: merged.allowedEmails.slice(0, 20),
        poExpiryWarnDays: merged.poExpiryWarnDays,
        taskDueReminderHours: merged.taskDueReminderHours,
        theme: merged.theme,
        updatedAt: serverTimestamp(),
      });
      notify('Preferences saved to Cloud Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notificationPreferences/${user.uid}`);
    }
  };

  const seedSampleDataToCloud = async () => {
    if (!user || isDemoMode) {
      notify('Already viewing sample data in Demo Mode.', 'info');
      return;
    }
    for (const dd of DEMO_DESIDIYA_RECORDS) {
      const { id: _id, ownerId: _ow, ...rest } = dd;
      await saveDesiDiyaRecord(rest);
    }
    for (const t of DEMO_TASKS) {
      const { id: _id, ownerId: _ow, ...rest } = t;
      await saveTask(rest);
    }
    for (const op of DEMO_OPERATIONS) {
      const { id: _id, ownerId: _ow, ...rest } = op;
      await saveOperation(rest);
    }
    for (const po of DEMO_PURCHASE_ORDERS) {
      const { id: _id, ownerId: _ow, ...rest } = po;
      await savePurchaseOrder(rest);
    }
    for (const esc of DEMO_ESCALATIONS) {
      const { id: _id, ownerId: _ow, ...rest } = esc;
      await saveEscalation(rest);
    }
    for (const asg of DEMO_ASSIGNMENTS) {
      const { id: _id, ownerId: _ow, ...rest } = asg;
      await saveAssignment(rest);
    }
    for (const prj of DEMO_PROJECTS) {
      const { id: _id, ownerId: _ow, ...rest } = prj;
      await saveProject(rest);
    }
    notify('DesiDiya + WorkTrack dataset seeded to your private Cloud Firestore account.');
  };

  return (
    <WorkTrackContext.Provider
      value={{
        user,
        authReady,
        isAuthorized,
        isDemoMode,
        dataLoading,
        savingState,
        todayStr: REFERENCE_TODAY,
        activeNav,
        setActiveNav,
        globalTaskFilter,
        setGlobalTaskFilter,
        globalOpsFilter,
        setGlobalOpsFilter,
        globalDesiDiyaFilter,
        setGlobalDesiDiyaFilter,
        datePreset,
        setDatePreset,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        desidiyaRecords,
        trackingDocuments,
        tasks,
        operations,
        purchaseOrders,
        escalations,
        assignments,
        projects,
        timeLogs,
        activityLogs,
        importJobs,
        preferences,
        activeTimer,
        elapsedTimerSeconds,
        toasts,
        dismissToast,
        notify,
        loginWithGoogle,
        logoutUser,
        enterDemoMode,
        exitDemoMode,
        seedSampleDataToCloud,
        saveDesiDiyaRecord,
        deleteDesiDiyaRecord,
        bulkUpdateDesiDiyaAppointments,
        extendDesiDiyaPoExpiry,
        resolveDesiDiyaException,
        uploadTrackingDocument,
        deleteTrackingDocument,
        syncDesiDiyaBulkCsv,
        saveTask,
        deleteTask,
        bulkUpdateTasks,
        duplicateTask,
        saveOperation,
        deleteOperation,
        savePurchaseOrder,
        deletePurchaseOrder,
        saveEscalation,
        deleteEscalation,
        saveAssignment,
        deleteAssignment,
        saveProject,
        deleteProject,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopAndLogTimer,
        addManualTimeLog,
        deleteTimeLog,
        recordImportBatch,
        updatePreferences,
      }}
    >
      {children}
    </WorkTrackContext.Provider>
  );
};

export const FIRESTORE_COLLECTIONS = WORKTRACK_COLLECTIONS;
export { getWorkTrackCollection };

export function useWorkTrack() {
  const ctx = useContext(WorkTrackContext);
  if (!ctx) throw new Error('useWorkTrack must be used within a WorkTrackProvider');
  return ctx;
}

export function useTasksCrud() {
  const { tasks, saveTask, deleteTask, bulkUpdateTasks, duplicateTask, dataLoading, savingState } =
    useWorkTrack();
  return { tasks, saveTask, deleteTask, bulkUpdateTasks, duplicateTask, dataLoading, savingState };
}

export function useOperationsCrud() {
  const { operations, saveOperation, deleteOperation, dataLoading, savingState } = useWorkTrack();
  return { operations, saveOperation, deleteOperation, dataLoading, savingState };
}

export function usePurchaseOrdersCrud() {
  const { purchaseOrders, savePurchaseOrder, deletePurchaseOrder, dataLoading, savingState } =
    useWorkTrack();
  return { purchaseOrders, savePurchaseOrder, deletePurchaseOrder, dataLoading, savingState };
}

export function useEscalationsCrud() {
  const { escalations, saveEscalation, deleteEscalation, dataLoading, savingState } =
    useWorkTrack();
  return { escalations, saveEscalation, deleteEscalation, dataLoading, savingState };
}

export function useAssignmentsCrud() {
  const { assignments, saveAssignment, deleteAssignment, dataLoading, savingState } =
    useWorkTrack();
  return { assignments, saveAssignment, deleteAssignment, dataLoading, savingState };
}

export function useProjectsCrud() {
  const { projects, saveProject, deleteProject, dataLoading, savingState } = useWorkTrack();
  return { projects, saveProject, deleteProject, dataLoading, savingState };
}

export function useTimeLogsCrud() {
  const {
    timeLogs,
    activeTimer,
    elapsedTimerSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopAndLogTimer,
    addManualTimeLog,
    deleteTimeLog,
  } = useWorkTrack();
  return {
    timeLogs,
    activeTimer,
    elapsedTimerSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopAndLogTimer,
    addManualTimeLog,
    deleteTimeLog,
  };
}
