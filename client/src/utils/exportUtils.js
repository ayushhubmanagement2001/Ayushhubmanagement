import * as XLSX from 'xlsx';

/**
 * Download a data array as an Excel (.xlsx) file
 */
export const downloadExcel = (headers, rows, filename) => {
  const worksheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Download a data array as a CSV (.csv) file
 */
export const downloadCSV = (headers, rows, filename) => {
  const csvRows = rows.map((r) =>
    r
      .map((val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',')
  );

  const headerLine = headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(',');
  const csvContent = [headerLine, ...csvRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Download Sample Template containing ONLY column headers (0 data rows)
 */
export const downloadSampleTemplate = (headers, filename, format = 'csv') => {
  if (format === 'xlsx') {
    downloadExcel(headers, [], filename);
  } else {
    downloadCSV(headers, [], filename);
  }
};
