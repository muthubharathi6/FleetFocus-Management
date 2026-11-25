/**
 * Pure RFC-4180 CSV serializer & browser download utility.
 * Exports strictly real backend rows with zero external dependencies.
 */

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvContent(headers = [], rows = []) {
  const headerLine = headers.map((h) => escapeCsvCell(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(typeof h.getValue === 'function' ? h.getValue(row) : row?.[h.key])).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

export function downloadCsvFile(filename, headers, rows) {
  const content = buildCsvContent(headers, rows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return content;
}

export function getExportDateStamp() {
  return new Date().toISOString().split('T')[0];
}
