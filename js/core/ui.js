// Helpers UI partagés : échappement HTML, format de date, et notifications
// (toast + ligne d'indice). Extrait de dashboard.js (lignes 126-151).

export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// Notifications : toast éphémère + message d'indice (hintBox).
export class Notifier {
  constructor(toastEl, hintEl) {
    this.toastEl = toastEl;
    this.hintEl = hintEl;
  }

  toast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add("show");
    setTimeout(() => this.toastEl.classList.remove("show"), 2400);
  }

  hint(msg, isError = false) {
    if (!this.hintEl) return;
    this.hintEl.textContent = msg || "";
    this.hintEl.style.color = isError ? "#c0392b" : "rgba(0,0,0,0.72)";
  }
}
