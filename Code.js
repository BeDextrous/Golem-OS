const SPREADSHEET_ID = '1--3BAuddcRrXk2BHdQODY5_e0W9xoy3FllT3ezz3Nu0';

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.STATE_JSON = JSON.stringify(getFullState());
  return template.evaluate()
    .setTitle('Golem OS 3.35')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getFullState() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const state = {"Tasks":[], "Objectives":[], "Notes":[], "Link_Inbox":[], "Reading_List":[]};
  for (const tab in state) {
    const sheet = ss.getSheetByName(tab);
    if (!sheet) continue;
    const values = sheet.getDataRange().getValues();
    if (values.length < 1) continue;
    const headers = values.shift();
    state[tab] = values.map((row, idx) => {
      let obj = { _rowIndex: idx + 2, _view: tab }; 
      headers.forEach((h, i) => { if(h) obj[h] = row[i]; });
      return obj;
    });
  }
  return state;
}

function syncAction(action, tabName, rowIndex, dataObject) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(tabName);
  if (action === 'DELETE') {
    sheet.deleteRow(rowIndex);
    return { success: true };
  }
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (action === 'ADD') {
    sheet.appendRow(headers.map(h => dataObject[h] || ""));
  } else if (action === 'UPDATE') {
    headers.forEach((h, i) => {
      if (dataObject[h] !== undefined) {
        let col = headers.indexOf(h) + 1;
        if (col > 0) sheet.getRange(rowIndex, col).setValue(dataObject[h]);
      }
    });
  }
  return { success: true };
}