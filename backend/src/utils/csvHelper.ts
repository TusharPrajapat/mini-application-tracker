/**
 * RFC 4180 compliant CSV field escaping helper.
 * Encloses values containing commas, double quotes, or newlines in double quotes,
 * and escapes double quotes by doubling them (" -> "").
 */
export function escapeCSVField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const CSV_HEADERS = [
  "Job Title",
  "Candidate Name",
  "Candidate Email",
  "Phone",
  "Skills",
  "Experience",
  "Stage",
  "Applied Date",
];

export function formatCSVHeaderRow(): string {
  return CSV_HEADERS.join(",") + "\n";
}
