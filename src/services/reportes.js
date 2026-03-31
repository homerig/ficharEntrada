import { downloadFile } from "./api";

export function downloadExcel(filters, token, onUnauthorized) {
  return downloadFile("/api/reportes/fichadas/excel", {
    token,
    query: filters,
    onUnauthorized,
  });
}
