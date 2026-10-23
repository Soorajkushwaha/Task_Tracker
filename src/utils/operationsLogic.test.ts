import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePoExpiryIndicator,
  calculateEscalationAgeingDays,
  getDateRangeBounds,
  isDateInRange,
  sanitizeFormulaInjection,
  calculateActiveTimerSeconds,
  computeDashboardMetrics,
  validateImportDataset,
} from './operationsLogic';

test('calculatePoExpiryIndicator accurately classifies all 5 expiry states', () => {
  const today = '2026-10-22';
  assert.equal(calculatePoExpiryIndicator('2026-10-20', today), 'Expired');
  assert.equal(calculatePoExpiryIndicator('2026-10-22', today), 'Expiring Today');
  assert.equal(calculatePoExpiryIndicator('2026-10-24', today), 'Expiring Within 3 Days');
  assert.equal(calculatePoExpiryIndicator('2026-10-25', today), 'Expiring Within 3 Days');
  assert.equal(calculatePoExpiryIndicator('2026-10-28', today), 'Expiring Within 7 Days');
  assert.equal(calculatePoExpiryIndicator('2026-11-05', today), 'Safe');
});

test('calculateEscalationAgeingDays computes open and closed ageing accurately', () => {
  const today = '2026-10-22';
  assert.equal(calculateEscalationAgeingDays('2026-10-15', '', today), 7);
  assert.equal(calculateEscalationAgeingDays('2026-10-10', '2026-10-14', today), 4);
});

test('getDateRangeBounds and isDateInRange filter accurately', () => {
  const today = '2026-10-22';
  const last7 = getDateRangeBounds('Last 7 Days', today);
  assert.equal(last7.start, '2026-10-16');
  assert.equal(last7.end, '2026-10-22');
  assert.equal(isDateInRange('2026-10-18', last7), true);
  assert.equal(isDateInRange('2026-10-10', last7), false);
});

test('sanitizeFormulaInjection prevents spreadsheet formula injection', () => {
  assert.equal(sanitizeFormulaInjection('=SUM(A1:A10)'), "'=SUM(A1:A10)");
  assert.equal(sanitizeFormulaInjection('+cmd|"/c calc"!A0'), "'+cmd|\"/c calc\"!A0");
  assert.equal(sanitizeFormulaInjection('-2+3'), "'-2+3");
  assert.equal(sanitizeFormulaInjection('@import'), "'@import");
  assert.equal(sanitizeFormulaInjection('Safe Warehouse Text'), 'Safe Warehouse Text');
});

test('calculateActiveTimerSeconds handles running and paused states across refresh', () => {
  assert.equal(calculateActiveTimerSeconds(true, false, 1000, 120, 16000), 135);
  assert.equal(calculateActiveTimerSeconds(true, true, 1000, 120, 50000), 120);
  assert.equal(calculateActiveTimerSeconds(false, false, 1000, 120, 50000), 0);
});

test('validateImportDataset flags invalid rows and duplicates without dropping errors', () => {
  const raw = [
    { Title: 'Valid Task', Due: '2026-10-25', Code: 'TSK-101' },
    { Title: '', Due: 'invalid-date', Code: 'TSK-102' },
    { Title: 'Duplicate Task', Due: '2026-10-26', Code: 'TSK-101' },
  ];
  const mapping = { title: 'Title', dueDate: 'Due', taskCode: 'Code' };
  const existing = new Set<string>();
  const res = validateImportDataset('tasks', raw, mapping, existing);
  assert.equal(res.validRows.length, 1);
  assert.equal(res.invalidRows.length, 1);
  assert.equal(res.duplicateRows.length, 1);
});

test('computeDashboardMetrics calculates live totals from records', () => {
  const today = '2026-10-22';
  const bounds = getDateRangeBounds('All Dates', today);
  const metrics = computeDashboardMetrics(
    [
      {
        id: '1',
        ownerId: 'u1',
        taskCode: 'TSK-1',
        title: 'Task 1',
        description: '',
        category: 'Operations',
        priority: 'High',
        status: 'In Progress',
        createdDate: '2026-10-20',
        startDate: '2026-10-20',
        dueDate: '2026-10-21',
        completedDate: '',
        assignedBy: 'Self',
        assignedTo: 'Sooraj',
        estimatedHours: 2,
        actualHours: 1,
        tags: [],
        notes: '',
        subtasks: [],
        comments: [],
      },
    ],
    [],
    [],
    [],
    [],
    bounds,
    today
  );
  assert.equal(metrics.totalTasks, 1);
  assert.equal(metrics.overdueTasks, 1);
  assert.equal(metrics.inProgressTasks, 1);
});
