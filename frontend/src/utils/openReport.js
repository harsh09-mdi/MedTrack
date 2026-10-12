import api from "../api/axios";

// Fetches the PDF with the login token and opens it in a new tab.
export async function openReport(id) {
  try {
    const res = await api.get(`/reports/${id}/file`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    alert("This report file is not available right now.");
  }
}