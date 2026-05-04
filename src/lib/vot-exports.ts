import * as XLSX from "xlsx";
import { effectiveTimestamp, evaluateEntry, methodLabel, type VotEntry } from "./vot-storage";

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

export function exportXlsx(entries: VotEntry[], pilotCert?: string) {
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
      "Certificate No.": pilotCert ?? "",
      Notes: e.notes ?? "",
      "Time Override": e.timeOverridden ? "Yes" : "No",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  // Bold header row
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = { font: { bold: true } };
  }
  ws["!cols"] = [
    { wch: 12 }, { wch: 8 }, { wch: 18 }, { wch: 14 },
    { wch: 22 }, { wch: 16 }, { wch: 30 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "VOT Log");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  download(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `SlingologyVOT-log-${today()}.xlsx`);
}

export function exportTxt(entries: VotEntry[]) {
  const divider = "——————————————————————————";
  const blocks = entries.map((e) => {
    const ts = effectiveTimestamp(e);
    return [
      `VOT CHECK — ${fmtDate(ts)} ${fmtTime(ts)}`,
      `Location:  ${e.location}`,
      `Deviation: ${fmtDeg(e.deviationDeg)}`,
      `Signed by: ${e.signedBy}`,
      `Signed at: ${e.signedAt}`,
      `Notes:     ${e.notes?.trim() || "—"}`,
      divider,
    ].join("\n");
  });
  const text = blocks.join("\n");
  download(new Blob([text], { type: "text/plain;charset=utf-8" }), `SlingologyVOT-log-${today()}.txt`);
}

export function exportJson(entries: VotEntry[]) {
  const text = JSON.stringify({ schema: "SlingologyVOT", version: 1, entries }, null, 2);
  download(new Blob([text], { type: "application/json" }), `SlingologyVOT-backup-${today()}.json`);
}

export function parseImportFile(text: string): VotEntry[] {
  const data = JSON.parse(text);
  const arr: unknown = Array.isArray(data) ? data : data?.entries;
  if (!Array.isArray(arr)) throw new Error("Invalid backup file: missing entries array");
  // Light validation
  return arr.filter((e): e is VotEntry =>
    !!e && typeof e === "object" &&
    typeof (e as VotEntry).id === "string" &&
    typeof (e as VotEntry).location === "string" &&
    typeof (e as VotEntry).deviationDeg === "number"
  );
}
