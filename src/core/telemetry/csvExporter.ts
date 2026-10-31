import { TelemetryPoint } from '../types/simulation';

export interface CSVExportOptions {
  experimentTitle: string;
  parameters: Record<string, number | string>;
  notes?: string;
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

  // Scientific Units Specification Header for AP/IB Lab Notebooks
  lines.push(`# Units: t(seconds), x/y/z(meters), v/vx/vy/vz(m/s), kinetic_energy/potential_energy/total_energy(Joules or microJoules), B_z(Tesla), E_y(V/m)`);

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
