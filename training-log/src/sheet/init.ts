import type { sheets_v4 } from "googleapis";
import { createTab, listTabTitles, readRow, writeRow } from "../google/sheets.js";
import { MANAGED_TABS, PASSTHROUGH_TABS } from "./schema.js";
import type { Logger } from "../logger.js";

export interface InitReport {
  created: string[];
  ok: string[];
  mismatched: { tab: string; expected: string[]; actual: string[] }[];
}

/** Ensures every tab from the schema exists with the right header row.
 * Never overwrites an existing header that doesn't match — that could be
 * real data or a deliberate customization — it just reports the mismatch
 * so a human can reconcile it. */
export async function initSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  logger: Logger,
): Promise<InitReport> {
  const report: InitReport = { created: [], ok: [], mismatched: [] };
  const existingTabs = new Set(await listTabTitles(sheets, spreadsheetId));

  for (const [tab, headers] of Object.entries(MANAGED_TABS)) {
    if (!existingTabs.has(tab)) {
      await createTab(sheets, spreadsheetId, tab);
      await writeRow(sheets, spreadsheetId, tab, 1, [...headers]);
      report.created.push(tab);
      logger.info("created tab with headers", { tab });
      continue;
    }
    const actual = await readRow(sheets, spreadsheetId, tab, 1);
    if (actual.length === 0) {
      await writeRow(sheets, spreadsheetId, tab, 1, [...headers]);
      report.created.push(tab);
      logger.info("tab existed but had no header row — wrote one", { tab });
      continue;
    }
    const expected = [...headers];
    const matches =
      actual.length === expected.length &&
      actual.every((v, i) => v === expected[i]);
    if (matches) {
      report.ok.push(tab);
    } else {
      report.mismatched.push({ tab, expected, actual });
      logger.warn("tab header does not match expected schema", {
        tab,
        expected,
        actual,
      });
    }
  }

  for (const tab of PASSTHROUGH_TABS) {
    if (!existingTabs.has(tab)) {
      await createTab(sheets, spreadsheetId, tab);
      report.created.push(tab);
      logger.info("created passthrough tab (content left to you)", { tab });
    } else {
      report.ok.push(tab);
    }
  }

  return report;
}
