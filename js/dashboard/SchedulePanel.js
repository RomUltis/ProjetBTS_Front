// Panneau Horaires : plages d'armement automatique.
// Extrait de dashboard.js (lignes 179-217, 806-818).

export class SchedulePanel {
  constructor(dash) {
    this.dash = dash;
    this.slots = [];
    this.slotList = document.getElementById("slotList");
    this.btnAddSlot = document.getElementById("btnAddSlot");
    this.btnSaveSchedule = document.getElementById("btnSaveSchedule");
  }

  setSlots(slots) {
    this.slots = slots;
  }

  render() {
    this.slotList.innerHTML = "";
    if (!this.slots.length) {
      this.slotList.innerHTML = `<p class="muted">Aucune plage configurée. Ajoute-en une.</p>`;
      return;
    }
    this.slots.forEach((slot, idx) => {
      const row = document.createElement("div");
      row.className = "slot";
      row.innerHTML = `
        <div class="input-group">
          <label>Début</label>
          <input type="time" value="${slot.start || "21:00"}" data-idx="${idx}" data-k="start">
        </div>
        <div class="input-group">
          <label>Fin</label>
          <input type="time" value="${slot.end || "07:00"}" data-idx="${idx}" data-k="end">
        </div>
        <div class="slot-actions">
          <button class="btn btn-ghost small-btn" data-del="${idx}">Supprimer</button>
        </div>
      `;
      this.slotList.appendChild(row);
    });
    this.slotList.querySelectorAll("input[type='time']").forEach((inp) => {
      inp.addEventListener("change", () => {
        const idx = Number(inp.getAttribute("data-idx"));
        const k = inp.getAttribute("data-k");
        this.slots[idx][k] = inp.value;
      });
    });
    this.slotList.querySelectorAll("button[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-del"));
        this.slots.splice(idx, 1);
        this.render();
        // Persiste TOUT DE SUITE (sinon la plage réapparaît au rechargement)
        try {
          await this._persist();
          this.dash.showToast("Plage supprimée");
          await this.dash.loadAll();
        } catch (e) {
          this.dash.setHint("Erreur suppression : " + (e.message || e), true);
        }
      });
    });
  }

  // Persiste les plages en base (PUT remplace tout). Le back ignore les plages
  // incomplètes (start/end vide) → nettoie au passage une plage "bloquée".
  async _persist() {
    await this.dash.api.request("/schedule", {
      method: "PUT", json: true, body: JSON.stringify({ slots: this.slots }),
    });
  }

  bind() {
    const dash = this.dash;

    this.btnAddSlot.addEventListener("click", () => {
      this.slots.push({ start: "21:00", end: "07:00" });
      this.render();
      dash.updateUiState();
    });

    this.btnSaveSchedule.addEventListener("click", async () => {
      try {
        await this._persist();
        dash.showToast("Horaires enregistrés");
        await dash.loadAll();
      } catch (e) {
        dash.setHint(e.message, true);
      }
    });
  }
}
