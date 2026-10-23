import * as XLSX from 'xlsx';
import { sanitizeFormulaInjection } from './operationsLogic';

export function exportRowsToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const safe = sanitizeFormulaInjection(row[h]);
          const escaped = String(safe).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerBrowserDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

export function exportRowsToXLSX(filename: string, sheetName: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) return;
  const sanitizedRows = rows.map((row) => {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'number' ? v : sanitizeFormulaInjection(v);
    }
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(sanitizedRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerBrowserDownload(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const IMPORT_TEMPLATES: Record<
  'tasks' | 'operations' | 'purchaseOrders' | 'escalations',
  Record<string, any>[]
> = {
  tasks: [
    {
      taskCode: 'TSK-2001',
      title: 'Verify Bhiwandi Hub PODs',
      category: 'Operations',
      priority: 'High',
      status: 'Not Started',
      dueDate: '2026-10-28',
      assignedBy: 'Vikram Mehta',
      assignedTo: 'Sooraj',
      estimatedHours: 3,
      actualHours: 0,
      notes: 'Sample template row',
    },
  ],
  operations: [
    {
      recordCode: 'OPS-601',
      poNumber: 'PO-90112',
      invoiceNumber: 'INV-2026-1101',
      lrNumber: 'LR-881209',
      courierName: 'Delhivery B2B',
      vehicleNumber: 'MH-04-AB-1234',
      sku: 'SKU-1001',
      productName: 'Almond Oil 500ml',
      quantity: 240,
      warehouse: 'Mumbai Bhiwandi FC-02',
      dispatchDate: '2026-10-21',
      appointmentDate: '2026-10-26',
      poCreationDate: '2026-10-18',
      poExpiryDate: '2026-10-29',
      shipmentStatus: 'In Transit',
      appointmentStatus: 'Scheduled',
      nextFollowUpDate: '2026-10-25',
      remarks: 'Template shipment record',
    },
  ],
  purchaseOrders: [
    {
      poNumber: 'PO-90112',
      vendor: 'NutriVeda Consumer Foods',
      courier: 'Delhivery B2B',
      warehouse: 'Mumbai Bhiwandi FC-02',
      poCreationDate: '2026-10-18',
      originalAppointmentDate: '2026-10-26',
      currentAppointmentDate: '2026-10-26',
      originalExpiryDate: '2026-10-29',
      currentExpiryDate: '2026-10-29',
      poStatus: 'Open',
      expectedQuantity: 240,
      receivedQuantity: 0,
      pendingQuantity: 240,
      relatedInvoices: 'INV-2026-1101',
      relatedLRs: 'LR-881209',
      notes: 'Template PO row',
    },
  ],
  escalations: [
    {
      escalationCode: 'ESC-401',
      relatedPoNumber: 'PO-90112',
      relatedLrNumber: 'LR-881209',
      courierName: 'Delhivery B2B',
      warehouse: 'Mumbai Bhiwandi FC-02',
      escalationType: 'GRN Pending',
      issueDescription: 'Unloaded 48h ago; inward GRN not yet posted in portal.',
      responsibleTeam: 'FC Inward Team',
      assignedPerson: 'Rohan Kulkarni',
      createdDate: '2026-10-22',
      priority: 'High',
      status: 'Open',
      nextFollowUpDate: '2026-10-24',
    },
  ],
};
