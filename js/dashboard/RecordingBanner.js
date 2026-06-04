// Bandeau global d'enregistrement : affiche s'il y a au moins un enregistrement
// en cours (toutes cams confondues) et synchronise les boutons des tuiles.
// Extrait de dashboard.js (lignes 1296-1361, 1393-1394).

export class RecordingBanner {
  constructor(dash) {
    this.dash = dash;
    this.recStatus = document.getElementById("recStatus");
    this.recStatusText = document.getElementById("recStatusText");
    this.recTimer = document.getElementById("recTimer");
    this.recTimerInterval = null;
    this._pollInterval = null;
  }

  _formatRecTime(seconds) {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  _show(elapsedSeconds, label) {
    if (!this.recStatus) return;
    this.recStatus.classList.remove("hidden");
    if (this.recStatusText) this.recStatusText.textContent = label || "Enregistrement en cours…";
    if (this.recTimerInterval) { clearInterval(this.recTimerInterval); this.recTimerInterval = null; }
    let elapsed = elapsedSeconds || 0;
    if (this.recTimer) this.recTimer.textContent = this._formatRecTime(elapsed);
    this.recTimerInterval = setInterval(() => {
      elapsed++;
      if (this.recTimer) this.recTimer.textContent = this._formatRecTime(elapsed);
    }, 1000);
  }

  _hide() {
    if (this.recStatus) this.recStatus.classList.add("hidden");
    if (this.recTimerInterval) { clearInterval(this.recTimerInterval); this.recTimerInterval = null; }
  }

  async refresh() {
    try {
      const r = await this.dash.api.request("/api/cam/record/status", { method: "GET" });
      if (!r) return;
      this.dash.cameraGrid.syncRecButtons(r.by_cam || {});

      // Bandeau global : on affiche s'il y a au moins 1 enregistrement
      const camsRecording = Object.entries(r.by_cam || {});
      if (camsRecording.length > 0) {
        const [firstCamId, firstState] = camsRecording[0];
        const camName = this.dash.cameraGrid.getName(firstCamId);
        const extra = camsRecording.length > 1 ? ` (+${camsRecording.length - 1})` : "";
        this._show(firstState.elapsed_seconds, `Enregistrement : ${camName}${extra}`);
      } else {
        this._hide();
      }
    } catch {}
  }

  // Démarre le polling du statut (admin only)
  start() {
    this.refresh();
    this._pollInterval = setInterval(() => this.refresh(), 3000);
  }
}
