import * as XLSX from "xlsx";

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export function exportToExcel(
  data: any[],
  columns: ExcelColumn[],
  fileName: string
) {
  // Create worksheet data with headers
  const wsData = [
    columns.map((col) => col.header),
    ...data.map((row) => columns.map((col) => row[col.key] ?? "")),
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = columns.map((col) => ({ wch: col.width || 15 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  // Generate file and download
  XLSX.writeFile(wb, `${fileName}-${new Date().toISOString().split("T")[0]}.xlsx`);
}

export function exportMultiSheetExcel(
  sheets: { name: string; data: any[]; columns: ExcelColumn[] }[],
  fileName: string
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const wsData = [
      sheet.columns.map((col) => col.header),
      ...sheet.data.map((row) => sheet.columns.map((col) => row[col.key] ?? "")),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = sheet.columns.map((col) => ({ wch: col.width || 15 }));

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  XLSX.writeFile(wb, `${fileName}-${new Date().toISOString().split("T")[0]}.xlsx`);
}
