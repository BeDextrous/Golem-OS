/**
 * GOLEM OS v3.2 — BACKEND
 * Serves the web app and handles all Sheet read/write operations.
 */

const SPREADSHEET_ID = '1--3BAuddcRrXk2BHdQODY5_e0W9xoy3FllT3ezz3Nu0';
const TABS = ['Objectives', 'Tasks', 'Reading List', 'Link_Inbox'];

// ─── SERVE APP ────────────────────────────────────────────
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle('Golem OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ─── LOAD ALL SHEET DATA ──────────────────────────────────
// Called once on app load. Returns all tabs as a keyed object.
function getSheetData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const result = {};

  TABS.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) { result[tabName] = []; return; }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) { result[tabName] = []; return; }

    const headers = data[0];
    result[tabName] = data.slice(1).map((row, i) => {
      const obj = { _rowIndex: i + 2 }; // +2 = 1-based + header row
      headers.forEach((h, j) => { obj[h] = row[j]; });
      return obj;
    });
  });

  return result;
}

// ─── SYNC ACTION ─────────────────────────────────────────
// Handles ADD / UPDATE / DELETE from the frontend.
function syncAction(action, tabName, rowIndex, dataObject) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(tabName);
    if (!sheet) throw new Error('Tab ' + tabName + ' not found.');

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (action === 'UPDATE' && rowIndex > 1) {
      headers.forEach((h, i) => {
        if (dataObject[h] !== undefined) {
          sheet.getRange(rowIndex, i + 1).setValue(dataObject[h]);
        }
      });

    } else if (action === 'DELETE' && rowIndex > 1) {
      sheet.deleteRow(rowIndex);

    } else if (action === 'ADD') {
      const newRow = headers.map(h => dataObject[h] || '');
      sheet.appendRow(newRow);
    }

    return { success: true };
  } catch (e) {
    console.error(e.toString());
    return { success: false, error: e.message };
  }
}