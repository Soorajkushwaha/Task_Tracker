/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  FolderOpen,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  PackageCheck,
  Settings,
  ShieldAlert,
  Table,
  Truck,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { WorkTrackProvider, useWorkTrack } from './context/WorkTrackContext';
import { NavSection } from './types/worktrack';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { OperationsView } from './components/OperationsView';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { EscalationsView } from './components/EscalationsView';
import {
  ProjectsView,
  SeniorAssignmentsView,
  TimeTrackerView,
} from './components/AssignmentsProjectsTimeViews';
import {
  ActivityHistoryView,
  CalendarView,
  ImportExportView,
  ReportsView,
  SettingsView,
} from './components/CalendarReportsImportViews';
import {
  DesiDiyaMasterTracking,
  DesiDiyaOperationsDashboard,
} from './components/DesiDiyaDashboardAndMaster';
import {
  DesiDiyaAppointmentTracker,
  DesiDiyaCnTracking,
  DesiDiyaDnTracking,
  DesiDiyaGrnTracking,
  DesiDiyaInvoiceTracking,
  DesiDiyaPoExpiryAlerts,
  DesiDiyaPoTracking,
  DesiDiyaShipmentCourierTracking,
} from './components/DesiDiyaFocusedTrackers';
import {
  DesiDiyaBulkCsvSync,
  DesiDiyaExceptionQueue,
  DesiDiyaFileDownloadCenter,
  DesiDiyaFileUploadCenter,
  DesiDiyaPodDocuments,
  DesiDiyaRecordOperations,
  DesiDiyaReportsAnalytics,
} from './components/DesiDiyaDocumentsAndOps';

interface NavItemConfig {
  id: NavSection;
  label: string;
  icon: React.ComponentType<any>;
  group: 'desidiya' | 'productivity';
}

const NAV_ITEMS: NavItemConfig[] = [
  // 18 Integrated DesiDiya Tracking & Operations Modules
  { id: 'operations-dashboard', label: 'Operations Dashboard', icon: LayoutDashboard, group: 'desidiya' },
  { id: 'master-tracking', label: 'Master Tracking', icon: Table, group: 'desidiya' },
  { id: 'invoice-tracking', label: 'Invoice Tracking', icon: FileText, group: 'desidiya' },
  { id: 'po-tracking', label: 'Purchase Order Tracking', icon: PackageCheck, group: 'desidiya' },
  { id: 'appointment-tracker', label: 'Appointment Tracker', icon: Calendar, group: 'desidiya' },
  { id: 'po-expiry-alerts', label: 'PO Expiry Alerts', icon: Clock, group: 'desidiya' },
  { id: 'shipment-courier-tracking', label: 'Shipment & Courier Tracking', icon: Truck, group: 'desidiya' },
  { id: 'grn-tracking', label: 'GRN Tracking', icon: CheckCircle2, group: 'desidiya' },
  { id: 'dn-tracking', label: 'DN Tracking', icon: AlertOctagon, group: 'desidiya' },
  { id: 'cn-tracking', label: 'CN Tracking', icon: FileCheck, group: 'desidiya' },
  { id: 'pod-documents', label: 'POD Documents', icon: FolderOpen, group: 'desidiya' },
  { id: 'file-upload-center', label: 'File Upload Center', icon: Upload, group: 'desidiya' },
  { id: 'file-download-center', label: 'File Download Center', icon: Download, group: 'desidiya' },
  { id: 'record-operations', label: 'Record Operations', icon: Edit3, group: 'desidiya' },
  { id: 'exception-queue', label: 'Exception Queue', icon: AlertTriangle, group: 'desidiya' },
  { id: 'bulk-csv-sync', label: 'Bulk CSV Import/Export', icon: FileSpreadsheet, group: 'desidiya' },
  { id: 'reports-analytics', label: 'Reports and Analytics', icon: BarChart3, group: 'desidiya' },
  { id: 'activity-history', label: 'Activity History', icon: Activity, group: 'desidiya' },
  // Existing WorkTrack Personal Productivity & Operations Suite Modules
  { id: 'dashboard', label: 'Productivity Dashboard', icon: Briefcase, group: 'productivity' },
  { id: 'tasks', label: 'My Tasks', icon: CheckSquare, group: 'productivity' },
  { id: 'escalations', label: 'RTV & Warehouse Escalations', icon: ShieldAlert, group: 'productivity' },
  { id: 'senior-assignments', label: 'Senior Assignments', icon: UserCheck, group: 'productivity' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, group: 'productivity' },
  { id: 'time-tracker', label: 'Time Tracker', icon: Clock, group: 'productivity' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, group: 'productivity' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'productivity' },
];

const WorkTrackShell: React.FC = () => {
  const {
    user,
    authReady,
    isAuthorized,
    isDemoMode,
    savingState,
    activeNav,
    setActiveNav,
    activeTimer,
    elapsedTimerSeconds,
    toasts,
    dismissToast,
    loginWithGoogle,
    logoutUser,
    enterDemoMode,
  } = useWorkTrack();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 w-80 text-center">
          <div className="h-5 w-40 mx-auto bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <p className="text-xs text-slate-500">Initializing WorkTrack + DesiDiya Control Tower...</p>
        </div>
      </div>
    );
  }

  // Protected Route Gate: Show Login or Explicit Demo Mode Launcher if not signed in
  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <a
            href="/"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
          >
            WorkTrack + DesiDiya
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
            <span className="whitespace-nowrap shrink-0">Master Shipment Tracking</span>
            <span className="whitespace-nowrap shrink-0">Invoice &amp; PO Control</span>
            <span className="whitespace-nowrap shrink-0">GRN / DN / CN Vault</span>
            <span className="whitespace-nowrap shrink-0">Personal Productivity</span>
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={loginWithGoogle}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In with Google
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full p-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                WorkTrack &amp; DesiDiya Integrated Operations Suite
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                Unified 29-column DesiDiya shipment &amp; invoice tracking, warehouse appointment SLA monitoring, PO expiry alerts, persistent 6-category Document Vault, and personal productivity management.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={loginWithGoogle}
                className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-blue-900 hover:bg-blue-800 text-white flex items-center justify-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Authorized Google Account</span>
              </button>

              <button
                type="button"
                onClick={enterDemoMode}
                className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors"
              >
                Explore Interactive Demo Mode (DesiDiya + WorkTrack Dataset)
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 space-y-1">
              <div>
                Private Access Control: Restricted to authorized Google accounts (<span className="font-mono">simple.sooraj@gmail.com</span>).
              </div>
              <div>
                Demo Mode clearly separates sample records from your persisted Cloud Firestore database.
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Unauthorized Google Account Screen
  if (user && !isAuthorized && !isDemoMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full p-6 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 space-y-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="w-5 h-5" />
            <h1 className="text-lg font-bold">Unauthorized Google Account</h1>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The account <span className="font-mono font-semibold">{user.email}</span> is not on the authorized allowlist for this private WorkTrack instance.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={logoutUser}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Sign Out
            </button>
            <button
              type="button"
              onClick={enterDemoMode}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700"
            >
              View Demo Mode Instead
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeNavObj = NAV_ITEMS.find((n) => n.id === activeNav) || NAV_ITEMS[0];
  const desidiyaItems = NAV_ITEMS.filter((i) => i.group === 'desidiya');
  const productivityItems = NAV_ITEMS.filter((i) => i.group === 'productivity');

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Left Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all shrink-0 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex flex-col min-h-0 flex-1">
          <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
            {!sidebarCollapsed && (
              <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                WorkTrack · DesiDiya
              </span>
            )}
            <button
              type="button"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav
            aria-label="Main Sidebar Navigation"
            className="p-2 space-y-3 overflow-y-auto flex-1"
          >
            <div>
              {!sidebarCollapsed && (
                <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  DesiDiya Tracking (18)
                </div>
              )}
              <div className="space-y-0.5">
                {desidiyaItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveNav(item.id)}
                      title={item.label}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-900 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              {!sidebarCollapsed && (
                <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  WorkTrack Workspace
                </div>
              )}
              <div className="space-y-0.5">
                {productivityItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeNav === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveNav(item.id)}
                      title={item.label}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-900 text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-xs shrink-0">
          {!sidebarCollapsed && (
            <div className="mb-2 truncate font-mono text-[11px] text-slate-500">
              {isDemoMode ? 'DEMO WORKSPACE' : user?.email}
            </div>
          )}
          <button
            type="button"
            onClick={logoutUser}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>{isDemoMode ? 'Exit Demo Mode' : 'Sign Out'}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="w-72 bg-white dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-3 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-sm font-bold">WorkTrack · DesiDiya</span>
                <button
                  type="button"
                  aria-label="Close mobile navigation"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <nav className="mt-2 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveNav(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg ${
                        activeNav === item.id
                          ? 'bg-blue-900 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={logoutUser}
              className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 mt-4"
            >
              <LogOut className="w-4 h-4" />
              <span>{isDemoMode ? 'Exit Demo Mode' : 'Sign Out'}</span>
            </button>
          </div>
          <div
            className="flex-1 bg-slate-950/40"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Zone 1 Breadcrumb/Brand | Zone 2 Quick Links | Zone 3 Primary Action */}
        <header className="h-14 flex items-center justify-between gap-8 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
              WorkTrack / {activeNavObj.label}
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setActiveNav('operations-dashboard')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Ops Dashboard
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('master-tracking')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Master Table
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('file-upload-center')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Upload Center
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('file-download-center')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              Download Center
            </button>
            <button
              type="button"
              onClick={() => setActiveNav('tasks')}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              My Tasks
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {activeTimer.isRunning && (
              <button
                type="button"
                onClick={() => setActiveNav('time-tracker')}
                className="px-3 py-1.5 text-xs font-mono tabular-nums font-semibold rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 whitespace-nowrap shrink-0"
              >
                Timer: {Math.floor(elapsedTimerSeconds / 60)}m {elapsedTimerSeconds % 60}s
              </button>
            )}
            {savingState !== 'idle' && (
              <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                {savingState === 'saving'
                  ? 'Saving...'
                  : savingState === 'saved'
                  ? 'Saved'
                  : 'Save failed'}
              </span>
            )}
            {isDemoMode ? (
              <button
                type="button"
                onClick={loginWithGoogle}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                Sign In with Google
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveNav('record-operations')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
              >
                + Record Ops
              </button>
            )}
          </div>
        </header>

        {/* Explicit Demo Mode Banner */}
        {isDemoMode && (
          <div className="px-6 py-2 bg-slate-900 text-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
            <div>
              <strong>DEMO MODE ACTIVE:</strong> Viewing realistic DesiDiya &amp; WorkTrack sample dataset. Changes stay in session memory; sign in with Google for Cloud Firestore persistence.
            </div>
            <button
              type="button"
              onClick={loginWithGoogle}
              className="underline font-semibold text-blue-300 hover:text-white shrink-0"
            >
              Sign in with Google for Cloud Persistence
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {/* 18 Integrated DesiDiya Modules */}
          {activeNav === 'operations-dashboard' && <DesiDiyaOperationsDashboard />}
          {activeNav === 'master-tracking' && <DesiDiyaMasterTracking />}
          {activeNav === 'invoice-tracking' && <DesiDiyaInvoiceTracking />}
          {activeNav === 'po-tracking' && <DesiDiyaPoTracking />}
          {activeNav === 'appointment-tracker' && <DesiDiyaAppointmentTracker />}
          {activeNav === 'po-expiry-alerts' && <DesiDiyaPoExpiryAlerts />}
          {activeNav === 'shipment-courier-tracking' && <DesiDiyaShipmentCourierTracking />}
          {activeNav === 'grn-tracking' && <DesiDiyaGrnTracking />}
          {activeNav === 'dn-tracking' && <DesiDiyaDnTracking />}
          {activeNav === 'cn-tracking' && <DesiDiyaCnTracking />}
          {activeNav === 'pod-documents' && <DesiDiyaPodDocuments />}
          {activeNav === 'file-upload-center' && <DesiDiyaFileUploadCenter />}
          {activeNav === 'file-download-center' && <DesiDiyaFileDownloadCenter />}
          {activeNav === 'record-operations' && <DesiDiyaRecordOperations />}
          {activeNav === 'exception-queue' && <DesiDiyaExceptionQueue />}
          {activeNav === 'bulk-csv-sync' && <DesiDiyaBulkCsvSync />}
          {activeNav === 'reports-analytics' && <DesiDiyaReportsAnalytics />}
          {activeNav === 'activity-history' && <ActivityHistoryView />}

          {/* Existing WorkTrack Productivity Modules */}
          {activeNav === 'dashboard' && <DashboardView />}
          {activeNav === 'tasks' && <TasksView />}
          {activeNav === 'operations' && <OperationsView mode="operations" />}
          {activeNav === 'purchase-orders' && <PurchaseOrdersView />}
          {activeNav === 'shipments' && <OperationsView mode="shipments" />}
          {activeNav === 'escalations' && <EscalationsView />}
          {activeNav === 'senior-assignments' && <SeniorAssignmentsView />}
          {activeNav === 'projects' && <ProjectsView />}
          {activeNav === 'time-tracker' && <TimeTrackerView />}
          {activeNav === 'calendar' && <CalendarView />}
          {activeNav === 'reports' && <ReportsView />}
          {activeNav === 'import-export' && <ImportExportView />}
          {activeNav === 'settings' && <SettingsView />}
        </main>

        {/* Toast Notifications */}
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center justify-between gap-3 ${
                t.type === 'error'
                  ? 'bg-red-950 text-red-100 border-red-800'
                  : 'bg-slate-900 text-white border-slate-700'
              }`}
            >
              <span>{t.text}</span>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <WorkTrackProvider>
      <WorkTrackShell />
    </WorkTrackProvider>
  );
}
