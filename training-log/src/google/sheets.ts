import type { sheets_v4 } from "googleapis";

export async function listTabTitles(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<string[]> {
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });
  return (res.data.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));
}

export async function createTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
): Promise<void> {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title } } }],
    },
  });
}

export async function readRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
  rowNumber: number,
): Promise<string[]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!${rowNumber}:${rowNumber}`,
  });
  return (res.data.values?.[0] ?? []).map(String);
}

export async function readAllRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
): Promise<string[][]> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}`,
  });
  return (res.data.values ?? []).map((row) => row.map(String));
}

export async function writeRow(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
  rowNumber: number,
  values: string[],
): Promise<void> {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [values] },
  });
}

export async function appendRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tab: string,
  rows: string[][],
): Promise<void> {
  if (rows.length === 0) return;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}
