// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.STATE_JSON = JSON.stringify(getInitialState());
  return template.evaluate()
    .setTitle('Golem OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── LOAD ALL STATE ───────────────────────────────────────────────────────────
function getInitialState() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const views = ['Tasks', 'Objectives', 'Goals', 'Reading', 'Notes', 'Links', 'Finances', 'CRM'];
  const state = {};

  views.forEach(view => {
    const sheet = ss.getSheetByName(view);
    if (!sheet) {
      state[view] = [];
      return;
    }
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      state[view] = [];
      return;
    }
    const headers = data.shift(); // remove header row
    state[view] = data.map((row, i) => {
      const obj = { _rowIndex: i + 2 }; // 1-indexed, +1 for removed header
      headers.forEach((h, j) => {
        // Normalise Date objects to ISO strings
        if (row[j] instanceof Date) {
          obj[h] = row[j] ? Utilities.formatDate(row[j], Session.getScriptTimeZone(), 'yyyy-MM-dd') : '';
        } else {
          obj[h] = row[j] !== undefined && row[j] !== null ? String(row[j]) : '';
        }
      });
      return obj;
    });
  });

  return state;
}

// ─── SYNC (ADD or UPDATE) ─────────────────────────────────────────────────────
/**
 * @param {string} view   - Sheet tab name (e.g. "Tasks")
 * @param {number|null} rowIndex - Existing row to update, or null to append
 * @param {Object} payload - Field values keyed by header name
 * @returns {Object} Fresh full state
 */
function syncItem(view, rowIndex, payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(view);

  if (!sheet) throw new Error(`Sheet "${view}" not found.`);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (rowIndex) {
    // UPDATE: overwrite only the editable columns (skip ID in col 1)
    const rowValues = headers.map(h => payload[h] !== undefined ? payload[h] : '');
    // Preserve the existing ID in column 1
    const existingId = sheet.getRange(rowIndex, 1).getValue();
    rowValues[0] = existingId;
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    // INSERT: auto-generate an ID
    const newId = generateId(sheet);
    const rowValues = headers.map((h, i) => {
      if (i === 0) return newId; // ID column
      return payload[h] !== undefined ? payload[h] : '';
    });
    sheet.appendRow(rowValues);
  }

  return getInitialState();
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
/**
 * @param {string} view     - Sheet tab name
 * @param {number} rowIndex - Row number to delete (1-indexed)
 * @returns {Object} Fresh full state
 */
function deleteItem(view, rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(view);
  if (!sheet) throw new Error(`Sheet "${view}" not found.`);
  sheet.deleteRow(rowIndex);
  return getInitialState();
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
/**
 * Generates a simple sequential ID based on the current max in column 1.
 * Falls back to timestamp if parsing fails.
 */
function generateId(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(r => parseInt(r[0]))
    .filter(n => !isNaN(n));
  return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}
