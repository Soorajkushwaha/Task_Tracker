import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_LAKE_ROOT = path.resolve(process.cwd(), 'data_lake');

const CATEGORY_TO_SUBFOLDER: Record<string, string> = {
  Invoice: 'invoices',
  PO: 'pos',
  POD: 'pods',
  GRN: 'grns',
  DN: 'dns',
  CN: 'cns',
};

const VALID_SUBFOLDERS = new Set(Object.values(CATEGORY_TO_SUBFOLDER));

function ensureDataLakeDirectories() {
  if (!fs.existsSync(DATA_LAKE_ROOT)) {
    fs.mkdirSync(DATA_LAKE_ROOT, { recursive: true });
  }
  for (const subfolder of VALID_SUBFOLDERS) {
    const dir = path.join(DATA_LAKE_ROOT, subfolder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Seed realistic reference files so demo / pre-seeded documents are immediately previewable & downloadable
  const sampleDocs: Array<{ subfolder: string; filename: string; content: string }> = [
    {
      subfolder: 'invoices',
      filename: 'DD-25-26-4401.txt',
      content: [
        '==========================================================',
        'DESIDIYA LIGHTING PVT. LTD. — TAX INVOICE',
        '==========================================================',
        'Invoice No     : DD/25-26/4401',
        'PO Number      : 8149203812',
        'Vendor Name    : DesiDiya Lighting Pvt Ltd',
        'Location / FC  : BLR7 - Bengaluru FC',
        'Dispatch Date  : 2026-04-02',
        'Total Boxes    : 28',
        'Total Quantity : 840 units',
        'Taxable Value  : INR 2,11,864.41',
        'GST (18%)      : INR 38,135.59',
        'Total Amount   : INR 2,50,000.00',
        '==========================================================',
      ].join('\n'),
    },
    {
      subfolder: 'pos',
      filename: 'PO-8149203812.txt',
      content: [
        '==========================================================',
        'PURCHASE ORDER DOCUMENT — 8149203812',
        '==========================================================',
        'PO Number      : 8149203812',
        'Vendor         : DesiDiya Lighting Pvt Ltd',
        'Fulfilment Ctr : BLR7 - Bengaluru FC',
        'PO Type        : Regular Replenishment',
        'PO Expiry Date : 2026-04-28',
        'Ordered Qty    : 840 units',
        'PO Value       : INR 2,50,000.00',
        '==========================================================',
      ].join('\n'),
    },
    {
      subfolder: 'pods',
      filename: 'POD-DD-25-26-4401.txt',
      content: [
        '==========================================================',
        'PROOF OF DELIVERY (POD) — ACKNOWLEDGEMENT',
        '==========================================================',
        'Invoice No     : DD/25-26/4401',
        'PO Number      : 8149203812',
        'Carrier        : Delhivery B2B',
        'LR / Tracking  : DLV994821004',
        'FC Stamp       : BLR7 - Received 28 Boxes in Good Condition',
        'Received Date  : 2026-04-08',
        'Receiver Sign  : Verified at Dock Gate #4',
        '==========================================================',
      ].join('\n'),
    },
    {
      subfolder: 'grns',
      filename: 'GRN-2026-88412.txt',
      content: [
        '==========================================================',
        'GOODS RECEIPT NOTE (GRN) — GRN-2026-88412',
        '==========================================================',
        'GRN Number     : GRN-2026-88412',
        'Invoice No     : DD/25-26/4401',
        'PO Number      : 8149203812',
        'Invoiced Qty   : 840 units',
        'Accepted Qty   : 840 units',
        'GRN Amount     : INR 2,50,000.00',
        'Discrepancy    : 0 units (Full Receipt)',
        '==========================================================',
      ].join('\n'),
    },
    {
      subfolder: 'dns',
      filename: 'DN-DD-25-26-4402.txt',
      content: [
        '==========================================================',
        'DEBIT / DISCREPANCY NOTE — DN-DD-25-26-4402',
        '==========================================================',
        'Invoice No     : DD/25-26/4402',
        'PO Number      : 4500918201',
        'Location       : BOM5 - Bhiwandi FC',
        'Invoiced Qty   : 600 units',
        'GRN Qty        : 560 units',
        'Shortage / DN  : 40 units',
        'DN Amount      : INR 14,800.00',
        'DN Status      : Under Review',
        'Resolution     : Dispute Raised with FC',
        '==========================================================',
      ].join('\n'),
    },
    {
      subfolder: 'cns',
      filename: 'CN-2026-0192.txt',
      content: [
        '==========================================================',
        'CREDIT NOTE — CN-2026-0192',
        '==========================================================',
        'Credit Note No : CN-2026-0192',
        'Reference Inv  : DD/25-26/4406',
        'PO Number      : 7718294011',
        'Location       : DEL4 - Bilaspur FC',
        'Reason         : Transit Damage Settlement (12 units)',
        'CN Amount      : INR 5,400.00',
        'Status         : Issued & Adjusted',
        '==========================================================',
      ].join('\n'),
    },
  ];

  for (const sample of sampleDocs) {
    const filePath = path.join(DATA_LAKE_ROOT, sample.subfolder, sample.filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, sample.content, 'utf8');
    }
  }
}

function sanitizeFilename(input: string): string {
  return input
    .trim()
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, '_');
}

async function startServer() {
  ensureDataLakeDirectories();

  const app = express();
  app.use(express.json({ limit: '15mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', dataLakeReady: true });
  });

  // Upload a document to persistent server disk storage
  app.post('/api/documents/upload', (req, res) => {
    try {
      const { category, filename, base64Data, mimeType } = req.body as {
        category?: string;
        filename?: string;
        base64Data?: string;
        mimeType?: string;
      };

      if (!category || !CATEGORY_TO_SUBFOLDER[category]) {
        res.status(400).json({ error: 'Invalid document category. Must be Invoice, PO, POD, GRN, DN, or CN.' });
        return;
      }
      if (!filename || !base64Data) {
        res.status(400).json({ error: 'Missing filename or base64Data.' });
        return;
      }

      const subfolder = CATEGORY_TO_SUBFOLDER[category];
      const safeName = sanitizeFilename(filename);
      if (!safeName) {
        res.status(400).json({ error: 'Invalid filename after sanitization.' });
        return;
      }

      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buffer = Buffer.from(cleanBase64, 'base64');

      if (buffer.byteLength > 10 * 1024 * 1024) {
        res.status(400).json({ error: 'File size exceeds 10 MB maximum limit.' });
        return;
      }

      const targetDir = path.join(DATA_LAKE_ROOT, subfolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetPath = path.join(targetDir, safeName);
      const existed = fs.existsSync(targetPath);
      fs.writeFileSync(targetPath, buffer);

      const storagePath = `/api/documents/file/${subfolder}/${encodeURIComponent(safeName)}`;
      res.json({
        storagePath,
        subfolder,
        filename: safeName,
        sizeBytes: buffer.byteLength,
        mimeType: mimeType || 'application/octet-stream',
        replacedExisting: existed,
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to store uploaded document on server.' });
    }
  });

  // Serve or download a document from persistent disk storage
  app.get('/api/documents/file/:subfolder/:filename', (req, res) => {
    try {
      const { subfolder, filename } = req.params;
      if (!VALID_SUBFOLDERS.has(subfolder)) {
        res.status(400).json({ error: 'Invalid document subfolder.' });
        return;
      }

      const safeName = path.basename(filename);
      const filePath = path.join(DATA_LAKE_ROOT, subfolder, safeName);

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Document file not found on server.' });
        return;
      }

      const ext = path.extname(safeName).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.csv': 'text/csv',
        '.txt': 'text/plain; charset=utf-8',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.xls': 'application/vnd.ms-excel',
      };

      const contentType = mimeMap[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

      if (req.query.download === '1') {
        res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
      }

      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error('File serve error:', err);
      res.status(500).json({ error: 'Failed to read document file.' });
    }
  });

  // Delete a document from persistent disk storage
  app.delete('/api/documents/file/:subfolder/:filename', (req, res) => {
    try {
      const { subfolder, filename } = req.params;
      if (!VALID_SUBFOLDERS.has(subfolder)) {
        res.status(400).json({ error: 'Invalid document subfolder.' });
        return;
      }

      const safeName = path.basename(filename);
      const filePath = path.join(DATA_LAKE_ROOT, subfolder, safeName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({ deleted: true, filename: safeName });
    } catch (err) {
      console.error('File delete error:', err);
      res.status(500).json({ error: 'Failed to delete document file.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WorkTrack + DesiDiya server listening on http://localhost:${PORT}`);
  });
}

startServer();
