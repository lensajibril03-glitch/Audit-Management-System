import * as XLSX from "xlsx";

export function buildExportBuffer(rows: Record<string, unknown>[], format: "csv" | "xlsx") {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "data");

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return Buffer.from(csv, "utf-8");
  }

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function exportHeaders(fileBaseName: string, format: "csv" | "xlsx") {
  const fileName = `${fileBaseName}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const contentType =
    format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename=${fileName}`,
  };
}
