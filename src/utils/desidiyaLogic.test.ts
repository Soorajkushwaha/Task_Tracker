import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDesiDiyaDashboardMetrics,
  computeAppointmentReschedule,
  computePoExpiryExtension,
  filterDesiDiyaRecords,
  isGrnComplete,
} from './desidiyaLogic';
import { DesiDiyaRecord } from '../types/worktrack';

function makeRecord(overrides: Partial<DesiDiyaRecord>): DesiDiyaRecord {
  return {
    id: 'rec-1',
    ownerId: 'user-1',
    invoice_no: 'INV-2026-001',
    po_number: 'PO-2026-001',
    vendor_name: 'DesiDiya Lighting Pvt Ltd',
    location: 'Mumbai Bhiwandi FC',
    dispatched_date: '2026-10-15',
    appointment_date: '2026-10-22',
    po_expiry_date: '2026-10-28',
    invoice_quantity: 100,
    grn_quantity: 100,
    dn_quantity: 0,
    no_of_box: 10,
    invoice_amount: 50000,
    grn_amount: 50000,
    dn_amount: 0,
    po_type: 'Regular',
    tracking_id: 'SAFE10001',
    shipment_track_id: 'SHP-10001',
    transport_mode: 'Safe Express',
    appointment_count: 1,
    appointment_history: '2026-10-22 First appointment',
    delivery_status: 'Delivered',
    invoice_status: 'Approved',
    dn_status: '',
    dn_resolution: '',
    dn_closure_date: '',
    delivery_remark: '',
    invoice_remark: '',
    general_remark: '',
    assigned_person: 'Rahul Kumar',
    grn_no: 'GRN-2026-001',
    original_appointment_date: '2026-10-22',
    original_po_expiry_date: '2026-10-28',
    po_expiry_history: '',
    cn_no: '',
    cn_amount: 0,
    cn_status: '',
    invoice_file_path: '/api/documents/file/invoices/INV-2026-001_Invoice.pdf',
    po_file_path: '/api/documents/file/pos/INV-2026-001_PO.pdf',
    pod_file_path: '/api/documents/file/pods/INV-2026-001_POD.pdf',
    grn_file_path: '/api/documents/file/grns/INV-2026-001_GRN.pdf',
    dn_file_path: '',
    cn_file_path: '',
    ...overrides,
  };
}

test('isGrnComplete matches Working2.py OR condition (grn_quantity > 0 || grn_no || grn_amount > 0)', () => {
  const doneByQty = makeRecord({ grn_quantity: 50, grn_no: '', grn_amount: 0 });
  const doneByNo = makeRecord({ grn_quantity: 0, grn_no: 'GRN-99', grn_amount: 0 });
  const doneByAmt = makeRecord({ grn_quantity: 0, grn_no: '', grn_amount: 1200 });
  const pending = makeRecord({ grn_quantity: 0, grn_no: '', grn_amount: 0 });

  assert.equal(isGrnComplete(doneByQty), true);
  assert.equal(isGrnComplete(doneByNo), true);
  assert.equal(isGrnComplete(doneByAmt), true);
  assert.equal(isGrnComplete(pending), false);
});

test('calculateDesiDiyaDashboardMetrics computes KPIs, alerts, and exclusions accurately', () => {
  const today = '2026-10-22';
  const records: DesiDiyaRecord[] = [
    // 1. Delivered with GRN complete
    makeRecord({
      id: '1',
      invoice_no: 'INV-001',
      delivery_status: 'Delivered',
      invoice_amount: 40000,
    }),
    // 2. Delivered with Pending GRN & Missing POD
    makeRecord({
      id: '2',
      invoice_no: 'INV-002',
      delivery_status: 'Delivered',
      invoice_amount: 60000,
      grn_quantity: 0,
      grn_no: '',
      grn_amount: 0,
      pod_file_path: '',
    }),
    // 3. Overdue appointment, expiring PO in 2 days, high-aging (>20d), DN qty > 0 with missing DN status
    makeRecord({
      id: '3',
      invoice_no: 'INV-003',
      delivery_status: 'In Transit',
      dispatched_date: '2026-09-25',
      appointment_date: '2026-10-19',
      po_expiry_date: '2026-10-24',
      invoice_quantity: 100,
      grn_quantity: 80,
      dn_quantity: 20,
      dn_status: '',
      dn_file_path: '',
      invoice_amount: 25000,
    }),
    // 4. Today's appointment & Missing Tracking ID
    makeRecord({
      id: '4',
      invoice_no: 'INV-004',
      delivery_status: 'Pending',
      appointment_date: '2026-10-22',
      tracking_id: '',
      assigned_person: '',
      invoice_amount: 15000,
    }),
    // 5. Missing appointment date & Upcoming PO expiry
    makeRecord({
      id: '5',
      invoice_no: 'INV-005',
      delivery_status: 'Delayed',
      appointment_date: '',
      po_expiry_date: '2026-10-23',
      invoice_amount: 10000,
    }),
    // 6. RTO record without appointment date (should be excluded from missingAppointmentDates & highAging)
    makeRecord({
      id: '6',
      invoice_no: 'INV-006',
      delivery_status: 'RTO',
      dispatched_date: '2026-09-01',
      appointment_date: '',
      invoice_amount: 0,
    }),
  ];

  const m = calculateDesiDiyaDashboardMetrics(records, today);

  assert.equal(m.totalInvoices, 6);
  assert.equal(m.totalInvoiceValue, 150000);
  assert.equal(m.deliveredInvoices, 2);
  assert.equal(m.deliveryRatePct, 33.3);
  assert.equal(m.overdueAppointments.length, 1);
  assert.equal(m.overdueAppointments[0].invoice_no, 'INV-003');
  assert.equal(m.missingAppointmentDates.length, 1);
  assert.equal(m.missingAppointmentDates[0].invoice_no, 'INV-005');
  assert.equal(m.todaysAppointments.length, 1);
  assert.equal(m.todaysAppointments[0].invoice_no, 'INV-004');
  assert.equal(m.posExpiringIn3Days.length, 2); // INV-003 & INV-005
  assert.equal(m.highAgingShipments.length, 1); // INV-003 only; INV-006 is RTO so excluded
  assert.equal(m.pendingGrnRecords.length, 1);
  assert.equal(m.pendingGrnRecords[0].invoice_no, 'INV-002');
  assert.equal(m.grnDoneCount, 1);
  assert.equal(m.grnPendingCount, 1);
  assert.equal(m.missingDnStatus.length, 1);
  assert.equal(m.missingPodDoc.length, 1);
  assert.equal(m.unassignedActiveShipments.length, 1);
  assert.equal(m.openQuantityExceptions.length, 2); // INV-002 (100 vs 0) & INV-003 (100 vs 80)
});

test('computeAppointmentReschedule increments appointment_count and preserves original date', () => {
  const rec = makeRecord({
    appointment_date: '2026-10-20',
    original_appointment_date: '2026-10-20',
    appointment_count: 1,
    appointment_history: '2026-10-20 First appointment',
  });

  const res = computeAppointmentReschedule(rec, '2026-10-25', 'Warehouse slot full');
  assert.equal(res.appointment_date, '2026-10-25');
  assert.equal(res.original_appointment_date, '2026-10-20');
  assert.equal(res.appointment_count, 2);
  assert.ok(res.appointment_history.includes('Missed: 2026-10-20'));
  assert.ok(res.appointment_history.includes('Warehouse slot full'));
});

test('computePoExpiryExtension preserves original_po_expiry_date and records reason', () => {
  const rec = makeRecord({
    po_expiry_date: '2026-10-22',
    original_po_expiry_date: '2026-10-22',
    po_expiry_history: '',
  });

  const res = computePoExpiryExtension(rec, '2026-11-05', 'Buyer approved 14d extension');
  assert.equal(res.po_expiry_date, '2026-11-05');
  assert.equal(res.original_po_expiry_date, '2026-10-22');
  assert.ok(res.po_expiry_history.includes('2026-10-22 -> 2026-11-05'));
});

test('filterDesiDiyaRecords supports partial invoice lookup and multi-column filters', () => {
  const r1 = makeRecord({ invoice_no: 'INV-2026-101', vendor_name: 'Vendor A', po_type: 'Express' });
  const r2 = makeRecord({ invoice_no: 'INV-2026-202', vendor_name: 'Vendor B', po_type: 'Regular' });

  const filtered = filterDesiDiyaRecords([r1, r2], {
    searchInvoice: '202',
    vendor: 'Vendor B',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].invoice_no, 'INV-2026-202');
});
