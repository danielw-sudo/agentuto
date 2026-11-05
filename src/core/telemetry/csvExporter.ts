import { TelemetryPoint } from '../types/simulation';

export interface CSVExportOptions {
  experimentTitle: string;
  parameters: Record<string, number | string>;
  notes?: string;
  /** Unit of each channel, from the instrument's manifest; time is in seconds unless it says otherwise. Without it the file makes no claim about units. */
  units?: Record<string, string>;
  /** The instrument's one-sentence note, if it runs in scaled or reduced units. */
  unitsNote?: string;
}

/**
 * Formats a telemetry buffer into an RFC-4180 compliant CSV string
 * with scientific metadata headers.
 */
export function formatTelemetryToCSV(
  data: readonly TelemetryPoint[],
  options: CSVExportOptions
): string {
  if (data.length === 0) {
    return '# Agentuto Telemetry Export: No data points recorded\n';
  }

  const lines: string[] = [];

  // Metadata headers
  lines.push(`# Agentuto Telemetry Export`);
  lines.push(`# Experiment: ${options.experimentTitle}`);
  lines.push(`# Timestamp: ${new Date().toISOString()}`);

  const paramEntries = Object.entries(options.parameters)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');
  lines.push(`# Active Parameters: ${paramEntries}`);

  // Units of the columns in this file, from the instrument's manifest
  const { units } = options;
  if (units) {
    const named: Record<string, string> = { t: 's', ...units };
    const declared = Object.keys(data[0]).filter((col) => named[col] !== undefined);
    lines.push(`# Units: ${declared.map((col) => `${col}(${named[col]})`).join(', ')}`);
  }
  if (options.unitsNote) {
    lines.push(`# Units note: ${options.unitsNote}`);
  }

  if (options.notes) {
    lines.push(`# Notes: ${options.notes}`);
  }

  // Column Headers
  const columns = Object.keys(data[0]);
  lines.push(columns.join(','));

  // Data rows
  for (const point of data) {
    const row = columns.map((col) => {
      const val = point[col];
      if (typeof val === 'number') {
        // Format to 6 significant digits if floating point, avoiding exponential noise
        return Number.isInteger(val) ? val.toString() : val.toPrecision(6);
      }
      return String(val ?? '');
    });
    lines.push(row.join(','));
  }

  return lines.join('\r\n') + '\r\n';
}

/**
 * Initiates an in-browser file download of the CSV data.
 */
export function triggerCSVDownload(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
