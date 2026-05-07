import * as XLSX from "xlsx";
import {
  effectiveTimestamp,
  evaluateEntry,
  methodLabel,
  type VotEntry,
  type VotSite,
} from "./vot-storage";

const today = () => new Date().toISOString().slice(0, 10);

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}
function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function fmtDeg(n: number) {
  const sign = n > 0 ? "+" : n < 0 ? "" : "";
  return `${sign}${n.toFixed(1)}°`;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function boldHeader(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = { font: { bold: true } };
  }
}

export function exportXlsx(entries: VotEntry[], pilotCert?: string, sites: VotSite[] = []) {
  const wb = XLSX.utils.book_new();

  const rows = entries.map((e) => {
    const ts = effectiveTimestamp(e);
    return {
      Date: fmtDate(ts),
      Time: fmtTime(ts),
      Location: e.location,
      Method: methodLabel(e.method),
      "Deviation (°)": e.deviationDeg,
      Result: evaluateEntry(e) ?? "",
      "Signed By": e.signedBy,
      "Certificate No.": e.signedByCert ?? pilotCert ?? "",
      Notes: e.notes ?? "",
      "Time Override": e.timeOverridden ? "Yes" : "No",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  boldHeader(ws);
  ws["!cols"] = [
    { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 8 },
    { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "VOT Log");

  if (sites.length) {
    const siteRows = sites.map((s) => ({
      Location: s.location,
      Method: methodLabel(s.method),
      Frequency: s.frequency,
      "Azimuth (°)": s.azimuth,
      Note: s.note ?? "",
      "Updated At": fmtDate(s.updatedAt),
    }));
    const ws2 = XLSX.utils.json_to_sheet(siteRows);
    boldHeader(ws2);
    ws2["!cols"] = [
      { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, ws2, "Sites");
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `SlingologyVOT-log-${today()}.xlsx`);
}

export function exportTxt(entries: VotEntry[], sites: VotSite[] = []) {
  const divider = "——————————————————————————";
  const blocks = entries.map((e) => {
    const ts = effectiveTimestamp(e);
    const result = evaluateEntry(e);
    return [
      `VOT CHECK — ${fmtDate(ts)} ${fmtTime(ts)}`,
      `Location:  ${e.location}`,
      `Method:    ${methodLabel(e.method) || "—"}`,
      `Deviation: ${fmtDeg(e.deviationDeg)}`,
      `Result:    ${result ?? "—"}`,
      `Signed by: ${e.signedBy}${e.signedByCert ? ` (Cert ${e.signedByCert})` : ""}`,
      `Signed at: ${e.signedAt}`,
      `Notes:     ${e.notes?.trim() || "—"}`,
      divider,
    ].join("\n");
  });
  let text = blocks.join("\n");
  if (sites.length) {
    const siteBlocks = sites.map((s) =>
      [
        `SITE — ${s.location}`,
        `Method:    ${methodLabel(s.method)}`,
        `Frequency: ${s.frequency}`,
        `Azimuth:   ${String(s.azimuth).padStart(3, "0")}°`,
        `Note:      ${s.note?.trim() || "—"}`,
        divider,
      ].join("\n"),
    );
    text += `\n\n=== SITES ===\n${siteBlocks.join("\n")}`;
  }
  download(new Blob([text], { type: "text/plain;charset=utf-8" }), `SlingologyVOT-log-${today()}.txt`);
}

export function exportJson(entries: VotEntry[], sites: VotSite[] = []) {
  const text = JSON.stringify(
    { schema: "SlingologyVOT", version: 2, entries, sites },
    null,
    2,
  );
  download(new Blob([text], { type: "application/json" }), `SlingologyVOT-backup-${today()}.json`);
}

export interface ImportPayload {
  entries: VotEntry[];
  sites: VotSite[];
}

export function parseImportFile(text: string): ImportPayload {
  const data = JSON.parse(text);
  const entriesArr: unknown = Array.isArray(data) ? data : data?.entries;
  if (!Array.isArray(entriesArr)) throw new Error("Invalid backup file: missing entries array");
  const entries = entriesArr.filter((e): e is VotEntry =>
    !!e && typeof e === "object" &&
    typeof (e as VotEntry).id === "string" &&
    typeof (e as VotEntry).location === "string" &&
    typeof (e as VotEntry).deviationDeg === "number"
  );
  const sitesArr: unknown = data?.sites;
  const sites = Array.isArray(sitesArr)
    ? sitesArr.filter((s): s is VotSite =>
        !!s && typeof s === "object" &&
        typeof (s as VotSite).id === "string" &&
        typeof (s as VotSite).location === "string" &&
        typeof (s as VotSite).frequency === "string"
      )
    : [];
  return { entries, sites };
}
