export type NavSection =
  // 18 Integrated DesiDiya + WorkTrack Modules
  | 'operations-dashboard'
  | 'master-tracking'
  | 'invoice-tracking'
  | 'po-tracking'
  | 'appointment-tracker'
  | 'po-expiry-alerts'
  | 'shipment-courier-tracking'
  | 'grn-tracking'
  | 'dn-tracking'
  | 'cn-tracking'
  | 'pod-documents'
  | 'file-upload-center'
  | 'file-download-center'
  | 'record-operations'
  | 'exception-queue'
  | 'bulk-csv-sync'
  | 'reports-analytics'
  | 'activity-history'
  // Additional Preserved WorkTrack Productivity Modules
  | 'dashboard'
  | 'tasks'
  | 'operations'
  | 'purchase-orders'
  | 'shipments'
  | 'escalations'
  | 'senior-assignments'
  | 'projects'
  | 'time-tracker'
  | 'calendar'
  | 'reports'
  | 'import-export'
  | 'settings';

export type DocumentCategory = 'Invoice' | 'PO' | 'POD' | 'GRN' | 'DN' | 'CN';

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Invoice',
  'PO',
  'POD',
  'GRN',
  'DN',
  'CN',
];

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  Invoice: 'Invoices (INV)',
  PO: 'Purchase Orders (PO)',
  POD: 'Proofs of Delivery (POD)',
  GRN: 'Goods Received Notes (GRN)',
  DN: 'Delivery / Debit Notes (DN)',
  CN: 'Credit Notes (CN)',
};

export type DesiDiyaDeliveryStatus =
  | ''
  | 'Pending'
  | 'In Transit'
  | 'Delivered'
  | 'Delayed'
  | 'Cancelled'
  | 'RTO'
  | 'RTO Delivered';

export const DESIDIYA_DELIVERY_STATUSES: DesiDiyaDeliveryStatus[] = [
  '',
  'Pending',
  'In Transit',
  'Delivered',
  'Delayed',
  'Cancelled',
  'RTO',
  'RTO Delivered',
];

export type DesiDiyaInvoiceStatus =
  | ''
  | 'Pending'
  | 'Approved'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'
  | 'Disputed';

export const DESIDIYA_INVOICE_STATUSES: DesiDiyaInvoiceStatus[] = [
  '',
  'Pending',
  'Approved',
  'Paid',
  'Overdue',
  'Cancelled',
  'Disputed',
];

export type DesiDiyaTransportMode =
  | ''
  | 'Safe Express'
  | 'Shiprocket'
  | 'Self Vehicle'
  | 'Delhivery B2B'
  | 'BlueDart Surface';

export const DESIDIYA_TRANSPORT_MODES: DesiDiyaTransportMode[] = [
  '',
  'Safe Express',
  'Shiprocket',
  'Self Vehicle',
  'Delhivery B2B',
  'BlueDart Surface',
];

export type DesiDiyaDnStatus = '' | 'Open' | 'In Progress' | 'Closed';
export const DESIDIYA_DN_STATUSES: DesiDiyaDnStatus[] = ['', 'Open', 'In Progress', 'Closed'];

export type DesiDiyaDnResolution =
  | ''
  | 'RTO'
  | 'RTO - Returned to Origin'
  | 'GRN Corrected on Different Invoice'
  | 'Corrected'
  | 'Disposed'
  | 'Pending'
  | 'Other';

export const DESIDIYA_DN_RESOLUTIONS: DesiDiyaDnResolution[] = [
  '',
  'RTO',
  'RTO - Returned to Origin',
  'GRN Corrected on Different Invoice',
  'Corrected',
  'Disposed',
  'Pending',
  'Other',
];

export type DesiDiyaCnStatus = '' | 'Open' | 'Issued' | 'Adjusted' | 'Closed';
export const DESIDIYA_CN_STATUSES: DesiDiyaCnStatus[] = [
  '',
  'Open',
  'Issued',
  'Adjusted',
  'Closed',
];

export interface DesiDiyaRecord {
  id: string;
  ownerId: string;
  // 29 Canonical Working2.py columns
  invoice_no: string;
  po_number: string;
  vendor_name: string;
  location: string;
  dispatched_date: string;
  appointment_date: string;
  po_expiry_date: string;
  invoice_quantity: number;
  grn_quantity: number;
  dn_quantity: number;
  no_of_box: number;
  invoice_amount: number;
  grn_amount: number;
  dn_amount: number;
  po_type: string;
  tracking_id: string;
  shipment_track_id: string;
  transport_mode: string;
  appointment_count: number;
  appointment_history: string;
  delivery_status: string;
  invoice_status: string;
  dn_status: string;
  dn_resolution: string;
  dn_closure_date: string;
  delivery_remark: string;
  invoice_remark: string;
  general_remark: string;
  assigned_person: string;
  grn_no: string;
  // Preserved original dates & audit extensions
  original_appointment_date: string;
  original_po_expiry_date: string;
  po_expiry_history: string;
  // CN Tracking extensions
  cn_no: string;
  cn_amount: number;
  cn_status: string;
  // 6 Document Storage References (Working2.py COLUMN_MAP)
  invoice_file_path: string;
  po_file_path: string;
  pod_file_path: string;
  grn_file_path: string;
  dn_file_path: string;
  cn_file_path: string;
  updatedAtIso?: string;
}

export interface DocumentHistoryEntry {
  action: 'Uploaded' | 'Replaced' | 'Deleted';
  filename: string;
  timestampIso: string;
  userEmail: string;
}

export interface TrackingDocumentRecord {
  id: string;
  ownerId: string;
  category: DocumentCategory;
  originalFilename: string;
  invoiceNo: string;
  poNumber: string;
  trackingId: string;
  uploadTimestamp: string;
  uploadedByEmail: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  history: DocumentHistoryEntry[];
}

export type TaskCategory =
  | 'Office Work'
  | 'Operations'
  | 'Data Analytics'
  | 'Coding'
  | 'Video Creation'
  | 'Stock Market Research'
  | 'Personal'
  | 'Other';

export const TASK_CATEGORIES: TaskCategory[] = [
  'Office Work',
  'Operations',
  'Data Analytics',
  'Coding',
  'Video Creation',
  'Stock Market Research',
  'Personal',
  'Other',
];

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export const PRIORITY_LEVELS: PriorityLevel[] = ['Critical', 'High', 'Medium', 'Low'];

export type TaskStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Waiting'
  | 'Blocked'
  | 'Completed'
  | 'Cancelled';

export const TASK_STATUSES: TaskStatus[] = [
  'Not Started',
  'In Progress',
  'Waiting',
  'Blocked',
  'Completed',
  'Cancelled',
];

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface TaskRecord {
  id: string;
  ownerId: string;
  taskCode: string;
  title: string;
  description: string;
  category: TaskCategory;
  priority: PriorityLevel;
  status: TaskStatus;
  createdDate: string;
  startDate: string;
  dueDate: string;
  completedDate: string;
  assignedBy: string;
  assignedTo: string;
  estimatedHours: number;
  actualHours: number;
  tags: string[];
  notes: string;
  subtasks: SubtaskItem[];
  comments: TaskComment[];
  projectId?: string;
  updatedAtIso?: string;
}

export type ShipmentStatus =
  | 'Planned'
  | 'Dispatched'
  | 'In Transit'
  | 'At Last-Mile Hub'
  | 'Appointment Pending'
  | 'Appointment Scheduled'
  | 'Vehicle Reported'
  | 'Unloaded'
  | 'Delivered'
  | 'Partially Delivered'
  | 'On Hold'
  | 'Returned'
  | 'Expired'
  | 'Cancelled';

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  'Planned',
  'Dispatched',
  'In Transit',
  'At Last-Mile Hub',
  'Appointment Pending',
  'Appointment Scheduled',
  'Vehicle Reported',
  'Unloaded',
  'Delivered',
  'Partially Delivered',
  'On Hold',
  'Returned',
  'Expired',
  'Cancelled',
];

export type ExpiryIndicator =
  | 'Expired'
  | 'Expiring Today'
  | 'Expiring Within 3 Days'
  | 'Expiring Within 7 Days'
  | 'Safe';

export interface RescheduleEntry {
  id: string;
  previousDate: string;
  newDate: string;
  fieldChanged: 'Appointment Date' | 'PO Expiry Date';
  reason: string;
  updatedBy: string;
  timestamp: string;
}

export interface OperationRecord {
  id: string;
  ownerId: string;
  recordCode: string;
  poNumber: string;
  invoiceNumber: string;
  lrNumber: string;
  courierName: string;
  vehicleNumber: string;
  driverName: string;
  driverContact: string;
  sku: string;
  productName: string;
  quantity: number;
  warehouse: string;
  dispatchDate: string;
  reportingDate: string;
  appointmentDate: string;
  poCreationDate: string;
  poExpiryDate: string;
  deliveryDate: string;
  shipmentStatus: ShipmentStatus;
  appointmentStatus: string;
  issueCategory: string;
  issueDescription: string;
  nextFollowUpDate: string;
  lastUpdatedDate: string;
  remarks: string;
  rescheduleHistory: RescheduleEntry[];
}

export type POStatus =
  | 'Open'
  | 'Appointment Scheduled'
  | 'In Transit'
  | 'Partially Received'
  | 'GRN Completed'
  | 'Expired'
  | 'Cancelled';

export const PO_STATUSES: POStatus[] = [
  'Open',
  'Appointment Scheduled',
  'In Transit',
  'Partially Received',
  'GRN Completed',
  'Expired',
  'Cancelled',
];

export interface POChangeEntry {
  id: string;
  field: 'Appointment Date' | 'Expiry Date' | 'Status' | 'Quantity';
  previousValue: string;
  newValue: string;
  reason: string;
  updatedBy: string;
  timestamp: string;
}

export interface PurchaseOrderRecord {
  id: string;
  ownerId: string;
  poNumber: string;
  vendor: string;
  courier: string;
  warehouse: string;
  poCreationDate: string;
  originalAppointmentDate: string;
  currentAppointmentDate: string;
  originalExpiryDate: string;
  currentExpiryDate: string;
  poStatus: POStatus;
  expectedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  relatedInvoices: string;
  relatedLRs: string;
  notes: string;
  changeHistory: POChangeEntry[];
}

export type EscalationType =
  | 'GRN Pending'
  | 'DN Issue'
  | 'RTV Pickup'
  | 'Shipment Rejection'
  | 'Capacity Issue'
  | 'Appointment Issue'
  | 'PO Expiry'
  | 'Invoice Issue'
  | 'Courier Delay'
  | 'Other';

export const ESCALATION_TYPES: EscalationType[] = [
  'GRN Pending',
  'DN Issue',
  'RTV Pickup',
  'Shipment Rejection',
  'Capacity Issue',
  'Appointment Issue',
  'PO Expiry',
  'Invoice Issue',
  'Courier Delay',
  'Other',
];

export type EscalationStatus =
  | 'Open'
  | 'In Progress'
  | 'Awaiting Warehouse'
  | 'Awaiting Vendor'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export const ESCALATION_STATUSES: EscalationStatus[] = [
  'Open',
  'In Progress',
  'Awaiting Warehouse',
  'Awaiting Vendor',
  'Resolved',
  'Closed',
  'Reopened',
];

export interface EscalationHistoryItem {
  id: string;
  action: string;
  note: string;
  updatedBy: string;
  timestamp: string;
}

export interface EscalationRecord {
  id: string;
  ownerId: string;
  escalationCode: string;
  relatedPoNumber: string;
  relatedLrNumber: string;
  courierName: string;
  warehouse: string;
  escalationType: EscalationType;
  issueDescription: string;
  responsibleTeam: string;
  assignedPerson: string;
  createdDate: string;
  priority: PriorityLevel;
  status: EscalationStatus;
  lastFollowUpDate: string;
  nextFollowUpDate: string;
  resolutionNotes: string;
  closureDate: string;
  history: EscalationHistoryItem[];
}

export type AssignmentStatus = 'Pending' | 'In Progress' | 'In Review' | 'Completed' | 'On Hold';
export const ASSIGNMENT_STATUSES: AssignmentStatus[] = [
  'Pending',
  'In Progress',
  'In Review',
  'Completed',
  'On Hold',
];

export interface SeniorAssignmentRecord {
  id: string;
  ownerId: string;
  assignmentCode: string;
  title: string;
  assignedBy: string;
  assignedDate: string;
  dueDate: string;
  priority: PriorityLevel;
  description: string;
  status: AssignmentStatus;
  progress: number;
  comments: string;
  completionDate: string;
  linkedTaskId: string;
}

export type ProjectCategory =
  | 'Coding Projects'
  | 'Data Analytics'
  | 'Video Creation'
  | 'Content Creation'
  | 'Stock Market Research'
  | 'Personal Goals'
  | 'Other Projects';

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  'Coding Projects',
  'Data Analytics',
  'Video Creation',
  'Content Creation',
  'Stock Market Research',
  'Personal Goals',
  'Other Projects',
];

export type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';
export const PROJECT_STATUSES: ProjectStatus[] = [
  'Planning',
  'Active',
  'On Hold',
  'Completed',
  'Archived',
];

export interface ProjectMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface ProjectRecord {
  id: string;
  ownerId: string;
  projectCode: string;
  name: string;
  description: string;
  category: ProjectCategory;
  startDate: string;
  targetDate: string;
  status: ProjectStatus;
  priority: PriorityLevel;
  progress: number;
  milestones: ProjectMilestone[];
  notes: string;
}

export interface TimeLogRecord {
  id: string;
  ownerId: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  notes: string;
}

export interface ActiveTimerState {
  isRunning: boolean;
  isPaused: boolean;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  notes: string;
  startedAtIso: string;
  lastResumedAtMs: number;
  accumulatedSeconds: number;
}

export interface ActivityLogRecord {
  id: string;
  ownerId: string;
  recordType: string;
  recordId: string;
  action: string;
  previousValue: string;
  newValue: string;
  userEmail: string;
  timestampIso: string;
}

export interface ImportJobRecord {
  id: string;
  ownerId: string;
  fileName: string;
  targetModule:
    | 'tasks'
    | 'operations'
    | 'purchaseOrders'
    | 'escalations'
    | 'invoiceTracking';
  totalRows: number;
  importedRows: number;
  invalidRows: number;
  duplicateRows: number;
  timestampIso: string;
}

export interface NotificationPreferenceRecord {
  id: string;
  ownerId: string;
  allowedEmails: string[];
  poExpiryWarnDays: number;
  taskDueReminderHours: number;
  theme: 'light' | 'dark';
}

export type DateFilterPreset =
  | 'Today'
  | 'Yesterday'
  | 'This Week'
  | 'Last 7 Days'
  | 'This Month'
  | 'Last 30 Days'
  | 'This Quarter'
  | 'Custom Date Range'
  | 'All Dates';

export const DATE_FILTER_PRESETS: DateFilterPreset[] = [
  'Today',
  'Yesterday',
  'This Week',
  'Last 7 Days',
  'This Month',
  'Last 30 Days',
  'This Quarter',
  'Custom Date Range',
  'All Dates',
];
