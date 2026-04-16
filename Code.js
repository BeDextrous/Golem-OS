function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.STATE_JSON = JSON.stringify(getInitialState());
  return template.evaluate()
    .setTitle('Golem OS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getInitialState() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const views = ['Tasks', 'Objectives', 'Goals', 'Reading', 'Notes', 'Links', 'Finances', 'CRM'];
  const state = {};
  views.forEach(view => {
    const sheet = ss.getSheetByName(view);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        const headers = data.shift();
        state[view] = data.map((row, i) => {
          const obj = { _rowIndex: i + 2 };
          headers.forEach((h, j) => obj[h] = row[j]);
          return obj;
        });
      } else { state[view] = []; }
    } else { state[view] = []; }
  });
  return state;
}

function syncItem(view, rowIndex, payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(view);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = headers.map(h => payload[h] || "");
  if (rowIndex) {
    sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  return getInitialState();
}

function deleteItem(view, rowIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(view);
  sheet.deleteRow(rowIndex);
  return getInitialState();
}
