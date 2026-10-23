import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  CollectionReference,
  doc,
  DocumentData,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const WORKTRACK_COLLECTIONS = {
  users: 'users',
  invoiceTracking: 'invoiceTracking',
  trackingDocuments: 'trackingDocuments',
  tasks: 'tasks',
  operations: 'operations',
  purchaseOrders: 'purchaseOrders',
  escalations: 'escalations',
  assignments: 'assignments',
  projects: 'projects',
  timeLogs: 'timeLogs',
  activityLogs: 'activityLogs',
  importJobs: 'importJobs',
  notificationPreferences: 'notificationPreferences',
} as const;

export type WorkTrackCollectionName =
  (typeof WORKTRACK_COLLECTIONS)[keyof typeof WORKTRACK_COLLECTIONS];

export function getWorkTrackCollection<T = DocumentData>(
  name: WorkTrackCollectionName
): CollectionReference<T> {
  return collection(db, name) as CollectionReference<T>;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Run initial connection check on module boot
testFirestoreConnection();
