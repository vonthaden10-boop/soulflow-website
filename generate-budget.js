'use strict';
/**
 * generate-budget.js — Von Solutions Budget Tracker
 * Run: node generate-budget.js
 * Output: Von-Solutions-Budget.xlsx
 */

const ExcelJS = require('exceljs');

const wb = new ExcelJS.Workbook();
wb.creator = 'Von Solutions';
wb.created = new Date();

const ws = wb.addWorksheet('Budget Tracker', {
  pageSetup: { fitToPage: true, fitToWidth: 1 },
  properties: { tabColor: { argb: 'FFC9A84C' } },
});

// ── Column widths ──────────────────────────────────────────────
ws.columns = [
  { key: 'A', width: 26 },
  { key: 'B', width: 34 },
  { key: 'C', width: 30 },
  { key: 'D', width: 18 },
  { key: 'E', width: 18 },
];

// ── Style helpers ──────────────────────────────────────────────
const BLACK   = 'FF0A0A0F';
const GOLD    = 'FFC9A84C';
const WHITE   = 'FFF5F0E8';
const DKGRAY  = 'FF1A1A24';
const MDGRAY  = 'FF2A2830';
const LTGRAY  = 'FF3A3840';
const GREENBG = 'FF0D2B1A';
const REDBG   = 'FF2B0D0D';
const GOLDBG  = 'FF2B2510';

function titleStyle(row) {
  row.height = 36;
  row.eachCell({ includeEmpty: true }, cell => {
    cell.font     = { name: 'Arial Black', size: 16, bold: true, color: { argb: GOLD } };
    cell.fill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });
}

function sectionHeader(row, label, bgColor = DKGRAY) {
  row.height = 22;
  const cell = row.getCell(1);
  ws.mergeCells(`A${row.number}:E${row.number}`);
  cell.value = `  ${label}`;
  cell.font  = { name: 'Arial', size: 10, bold: true, color: { argb: GOLD }, italic: false };
  cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.alignment = { vertical: 'middle' };
  // Gold left border accent
  cell.border = { left: { style: 'medium', color: { argb: GOLD } } };
}

function colHeaders(row, labels, bgColor = MDGRAY) {
  row.height = 18;
  labels.forEach((lbl, i) => {
    const cell = row.getCell(i + 1);
    cell.value = lbl;
    cell.font  = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFB0A898' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle', horizontal: i >= 3 ? 'right' : 'left' };
    cell.border = { bottom: { style: 'thin', color: { argb: LTGRAY } } };
  });
}

function dataRow(row, cells, highlight = null) {
  row.height = 18;
  const bg = highlight || BLACK;
  cells.forEach((val, i) => {
    const cell = row.getCell(i + 1);
    cell.value = val;
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    cell.font  = { name: 'Arial', size: 10, color: { argb: val === '' || val == null ? 'FF3A3830' : WHITE } };
    cell.alignment = { vertical: 'middle', horizontal: i >= 3 ? 'right' : 'left' };
    if (typeof val === 'number' || (typeof val === 'object' && val?.formula)) {
      cell.numFmt = '"$"#,##0.00';
    }
    cell.border = { bottom: { style: 'hair', color: { argb: MDGRAY } } };
  });
}

function subtotalRow(row, label, formulaOrVal, bgColor = DKGRAY) {
  row.height = 20;
  ws.mergeCells(`A${row.number}:C${row.number}`);
  const labelCell = row.getCell(1);
  labelCell.value = label;
  labelCell.font  = { name: 'Arial', size: 10, bold: true, color: { argb: GOLD } };
  labelCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  labelCell.alignment = { vertical: 'middle' };

  const valCell = row.getCell(4);
  valCell.value  = formulaOrVal;
  valCell.numFmt = '"$"#,##0.00';
  valCell.font   = { name: 'Arial', size: 11, bold: true, color: { argb: GOLD } };
  valCell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  valCell.alignment = { vertical: 'middle', horizontal: 'right' };
  valCell.border = { top: { style: 'thin', color: { argb: GOLD } }, bottom: { style: 'thin', color: { argb: GOLD } } };

  // Fill E too
  row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
}

function blankRow(n = 1) {
  for (let i = 0; i < n; i++) {
    const r = ws.addRow([]);
    r.height = 8;
    r.eachCell({ includeEmpty: true }, cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } };
    });
  }
}

function netRow(row, label, formula, bgColor, fontColor) {
  row.height = 28;
  ws.mergeCells(`A${row.number}:C${row.number}`);
  const lc = row.getCell(1);
  lc.value = `  ${label}`;
  lc.font  = { name: 'Arial Black', size: 12, bold: true, color: { argb: fontColor } };
  lc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  lc.alignment = { vertical: 'middle' };

  const vc = row.getCell(4);
  vc.value  = formula;
  vc.numFmt = '"$"#,##0.00';
  vc.font   = { name: 'Arial Black', size: 13, bold: true, color: { argb: fontColor } };
  vc.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  vc.alignment = { vertical: 'middle', horizontal: 'right' };
  vc.border = { top: { style: 'medium', color: { argb: fontColor } }, bottom: { style: 'medium', color: { argb: fontColor } } };

  row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
}

// ══════════════════════════════════════════════════════════════
// BUILD THE SHEET
// ══════════════════════════════════════════════════════════════

// ── Title ──────────────────────────────────────────────────────
ws.mergeCells('A1:E1');
const titleRow = ws.getRow(1);
titleStyle(titleRow);
ws.getCell('A1').value = '  VON SOLUTIONS — BUSINESS BUDGET TRACKER';
blankRow();

// ══════════════════════════════════════════════════════════════
// SECTION 1: MONTHLY RECURRING EXPENSES
// ══════════════════════════════════════════════════════════════
sectionHeader(ws.addRow([]), 'MONTHLY RECURRING EXPENSES');
colHeaders(ws.addRow([]), ['Category', 'Tool / Service', 'Plan / Notes', 'Monthly Cost ($)', '']);

const recurringStart = ws.rowCount + 1;

const recurringItems = [
  ['AI Platform',        'Claude Code',               'Pro plan',                        20.00 ],
  ['AI Voice',           'Retell AI',                 'See Variable section below',      ''    ],
  ['Database',           'Supabase',                  'Free / Pro tier',                 ''    ],
  ['Compute',            'Modal',                     'Per usage / serverless',          ''    ],
  ['Email Delivery',     'Resend',                    'Per 1,000 emails',                ''    ],
  ['Code Hosting',       'GitHub',                    'Free / Team',                     ''    ],
  ['Scheduling',         'Calendly',                  'Standard plan',                   ''    ],
  ['Advertising',        'Meta Ads',                  'See Variable section below',      ''    ],
  ['Search / Maps',      'Google (Ads / Places API)', 'Usage-based',                     ''    ],
  ['Lead Scraping',      'Scraper Tools',             'TBD tool or service',             ''    ],
  ['Social Automation',  'Social Media AI',           'Content scheduling & posting',    ''    ],
  ['Content Creation',   'AI Content Tool',           'Copy / image / video generation', ''    ],
  ['Print Marketing',    'Brochures',                 'Monthly print run',               ''    ],
];

recurringItems.forEach(item => dataRow(ws.addRow([]), item));

const recurringEnd = ws.rowCount;
subtotalRow(
  ws.addRow([]),
  'SUBTOTAL — Monthly Recurring',
  { formula: `SUM(D${recurringStart}:D${recurringEnd})` }
);

blankRow();

// ══════════════════════════════════════════════════════════════
// SECTION 2: VARIABLE / USAGE-BASED EXPENSES
// ══════════════════════════════════════════════════════════════
sectionHeader(ws.addRow([]), 'VARIABLE / USAGE-BASED EXPENSES');
colHeaders(ws.addRow([]), ['Item', 'Unit Rate ($)', 'Est. Units / Month', 'Monthly Total ($)', 'Unit']);

const varStart = ws.rowCount + 1;

// Retell AI — formula: unit rate × units
const retellRow = ws.addRow([]);
dataRow(retellRow, ['Retell AI', 0.344, '', '', 'minutes']);
retellRow.getCell(2).numFmt = '"$"#,##0.000';
retellRow.getCell(4).value  = { formula: `B${retellRow.number}*C${retellRow.number}` };
retellRow.getCell(4).numFmt = '"$"#,##0.00';
retellRow.getCell(4).font   = { name: 'Arial', size: 10, color: { argb: WHITE } };
retellRow.getCell(4).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } };
retellRow.getCell(4).alignment = { horizontal: 'right' };

const metaRow = ws.addRow([]);
dataRow(metaRow, ['Meta Ads Budget', '', '', '', 'campaigns']);

const scraperRow = ws.addRow([]);
dataRow(scraperRow, ['Scraper Tool (usage)', '', '', '', 'searches/queries']);

const varEnd = ws.rowCount;
subtotalRow(
  ws.addRow([]),
  'SUBTOTAL — Variable',
  { formula: `SUM(D${varStart}:D${varEnd})` }
);

blankRow();

// ══════════════════════════════════════════════════════════════
// SECTION 3: ONE-TIME / SETUP COSTS
// ══════════════════════════════════════════════════════════════
sectionHeader(ws.addRow([]), 'ONE-TIME / SETUP COSTS');
colHeaders(ws.addRow([]), ['Item', 'Notes', '', 'Amount ($)', '']);

const onetimeStart = ws.rowCount + 1;
dataRow(ws.addRow([]), ['Brochures (initial run)', 'First batch — setup cost', '',  6.44]);
dataRow(ws.addRow([]), ['Domain / Hosting setup', '',                          '',  ''  ]);
dataRow(ws.addRow([]), ['Other setup costs',       '',                          '',  ''  ]);
const onetimeEnd = ws.rowCount;

subtotalRow(
  ws.addRow([]),
  'SUBTOTAL — One-Time',
  { formula: `SUM(D${onetimeStart}:D${onetimeEnd})` }
);

blankRow();

// ══════════════════════════════════════════════════════════════
// SECTION 4: INCOME SOURCES
// ══════════════════════════════════════════════════════════════
sectionHeader(ws.addRow([]), 'INCOME SOURCES', '0D200D');
colHeaders(ws.addRow([]), ['Source', 'Package / Type', '# Clients / Hours', 'Monthly Est. ($)', '']);

const incomeStart = ws.rowCount + 1;

// Agency income rows — D = rate × quantity
const answerRow = ws.addRow([]);
dataRow(answerRow, ['Von Solutions — ANSWER',    '$500/mo per client',    '', '', ''], GOLDBG);
answerRow.getCell(4).value  = { formula: `500*C${answerRow.number}` };
answerRow.getCell(4).numFmt = '"$"#,##0.00';
answerRow.getCell(4).font   = { name: 'Arial', size: 10, color: { argb: WHITE } };
answerRow.getCell(4).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLDBG } };
answerRow.getCell(4).alignment = { horizontal: 'right' };

const answerPlusRow = ws.addRow([]);
dataRow(answerPlusRow, ['Von Solutions — ANSWER+', '$1,200/mo per client',  '', '', ''], GOLDBG);
answerPlusRow.getCell(4).value  = { formula: `1200*C${answerPlusRow.number}` };
answerPlusRow.getCell(4).numFmt = '"$"#,##0.00';
answerPlusRow.getCell(4).font   = { name: 'Arial', size: 10, color: { argb: WHITE } };
answerPlusRow.getCell(4).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLDBG } };
answerPlusRow.getCell(4).alignment = { horizontal: 'right' };

const growRow = ws.addRow([]);
dataRow(growRow, ['Von Solutions — GROW',       '$2,500/mo per client',  '', '', ''], GOLDBG);
growRow.getCell(4).value  = { formula: `2500*C${growRow.number}` };
growRow.getCell(4).numFmt = '"$"#,##0.00';
growRow.getCell(4).font   = { name: 'Arial', size: 10, color: { argb: WHITE } };
growRow.getCell(4).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLDBG } };
growRow.getCell(4).alignment = { horizontal: 'right' };

const bartendRow = ws.addRow([]);
dataRow(bartendRow, ['Bartending',                'Hourly rate × hours',   '', '', ''], GREENBG);
bartendRow.getCell(4).value  = { formula: `B${bartendRow.number}*C${bartendRow.number}` };
bartendRow.getCell(4).numFmt = '"$"#,##0.00';
bartendRow.getCell(4).font   = { name: 'Arial', size: 10, color: { argb: WHITE } };
bartendRow.getCell(4).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREENBG } };
bartendRow.getCell(4).alignment = { horizontal: 'right' };

dataRow(ws.addRow([]), ['Other Income',            '',                      '', ''], GREENBG);

const incomeEnd = ws.rowCount;
subtotalRow(
  ws.addRow([]),
  'SUBTOTAL — Income',
  { formula: `SUM(D${incomeStart}:D${incomeEnd})` },
  '0D2B1A'
);

blankRow(2);

// ══════════════════════════════════════════════════════════════
// SECTION 5: NET SUMMARY
// ══════════════════════════════════════════════════════════════
sectionHeader(ws.addRow([]), 'NET MONTHLY SUMMARY');
blankRow();

// Find the 4 subtotal rows by scanning (simpler: just track their row numbers)
// We'll use direct cell references to the subtotal value cells
// Actually let's just use named formulas referencing subtotal D cells
// We need to find which rows have the subtotals — let's just re-add simple formula rows

const totalExpRow = ws.addRow([]);
netRow(totalExpRow, 'TOTAL MONTHLY EXPENSES', '', REDBG, 'FFFF6B6B');
// We'll set formula after we know row numbers
// At this point all subtotal rows are placed, reference them by section

// Find subtotal rows (every subtotalRow writes to column D)
// Simpler: scan for bold GOLD rows — actually let's just hardcode the formula
// We know the order: recurring subtotal, variable subtotal, one-time subtotal
// Just sum all D column data rows and skip the placeholder — easiest approach:
totalExpRow.getCell(4).value = {
  formula: `D${recurringEnd+1}+D${varEnd+1}+D${onetimeEnd+1}`
};
totalExpRow.getCell(4).numFmt = '"$"#,##0.00';
totalExpRow.getCell(4).font  = { name: 'Arial Black', size: 13, bold: true, color: { argb: 'FFFF6B6B' } };
totalExpRow.getCell(4).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: REDBG } };
totalExpRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };

blankRow();

const totalIncRow = ws.addRow([]);
netRow(totalIncRow, 'TOTAL MONTHLY INCOME', '', GREENBG, 'FF4AE880');
totalIncRow.getCell(4).value  = { formula: `D${incomeEnd+1}` };
totalIncRow.getCell(4).numFmt = '"$"#,##0.00';
totalIncRow.getCell(4).font   = { name: 'Arial Black', size: 13, bold: true, color: { argb: 'FF4AE880' } };
totalIncRow.getCell(4).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREENBG } };
totalIncRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };

blankRow();

const netMonthRow = ws.addRow([]);
netRow(netMonthRow, 'NET MONTHLY PROFIT / LOSS', '', GOLDBG, GOLD);
netMonthRow.getCell(4).value  = { formula: `D${totalIncRow.number}-D${totalExpRow.number}` };
netMonthRow.getCell(4).numFmt = '"$"#,##0.00';
netMonthRow.getCell(4).font   = { name: 'Arial Black', size: 14, bold: true, color: { argb: GOLD } };
netMonthRow.getCell(4).fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLDBG } };
netMonthRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'right' };

blankRow(2);

// ── Footer note ────────────────────────────────────────────────
const noteRow = ws.addRow([]);
ws.mergeCells(`A${noteRow.number}:E${noteRow.number}`);
const nc = noteRow.getCell(1);
nc.value = '  Fill in grey/empty cells. Formulas auto-calculate totals. Retell AI & agency rows multiply rate × quantity.';
nc.font  = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF4A4438' } };
nc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLACK } };

// ── Freeze top row ─────────────────────────────────────────────
ws.views = [{ state: 'frozen', ySplit: 1 }];

// ── Save ───────────────────────────────────────────────────────
const outPath = 'Von-Solutions-Budget.xlsx';
wb.xlsx.writeFile(outPath).then(() => {
  console.log(`✅  Created: ${outPath}`);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
