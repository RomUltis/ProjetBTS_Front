// Modal de test des relais (DO). open() renvoie false si la modal n'existe pas
// (l'AlarmPanel bascule alors sur un test complet en fallback).
// Extrait de dashboard.js (lignes 662-736).

import { RELAYS } from "../core/constants.js";

export class RelayModal {
  constructor(dash) {
    this.dash = dash;
    this.relayModal = document.getElementById("relayModal");
    this.relayModalClose = document.getElementById("relayModalClose");
    this.relayList = document.getElementById("relayList");
    this.relaySelectAll = document.getElementById("relaySelectAll");
    this.relayUnselectAll = document.getElementById("relayUnselectAll");
    this.relayRunTest = document.getElementById("relayRunTest");
  }

  exists() {
    return !!(this.relayModal && this.relayList && this.relayRunTest && this.relaySelectAll && this.relayUnselectAll && this.relayModalClose);
  }

  open() {
    if (!this.exists()) return false;
    this.relayList.innerHTML = "";
    RELAYS.forEach((r) => {
      const row = document.createElement("div");
      row.className = "relay-item";
      row.innerHTML = `
        <label style="display:flex;gap:10px;align-items:center;justify-content:space-between;width:100%;">
          <span style="display:flex;gap:10px;align-items:center;">
            <input type="checkbox" class="relay-check" data-ch="${r.ch}" checked>
            <span>
              <strong>${r.label}</strong><br>
              <span style="opacity:.75">${r.zoneName}</span>
            </span>
          </span>
          <span class="tag">${r.role}</span>
        </label>
      `;
      this.relayList.appendChild(row);
    });
    this.relayModal.classList.remove("hidden");
    return true;
  }

  close() {
    if (!this.relayModal) return;
    this.relayModal.classList.add("hidden");
  }

  bind() {
    const dash = this.dash;

    if (this.relayModal) {
      this.relayModal.addEventListener("click", (e) => {
        if (e.target === this.relayModal) this.close();
      });
    }
    if (this.relayModalClose) this.relayModalClose.addEventListener("click", () => this.close());

    if (this.relaySelectAll) {
      this.relaySelectAll.addEventListener("click", () => {
        this.relayList?.querySelectorAll(".relay-check").forEach((cb) => (cb.checked = true));
      });
    }
    if (this.relayUnselectAll) {
      this.relayUnselectAll.addEventListener("click", () => {
        this.relayList?.querySelectorAll(".relay-check").forEach((cb) => (cb.checked = false));
      });
    }

    if (this.relayRunTest) {
      this.relayRunTest.addEventListener("click", async () => {
        try {
          const selected = [...this.relayList.querySelectorAll(".relay-check")]
            .filter((cb) => cb.checked)
            .map((cb) => Number(cb.dataset.ch));
          if (!selected.length) { dash.setHint("Tu dois cocher au moins un relais.", true); return; }
          this.relayRunTest.disabled = true;
          dash.setHint("Test en cours (1s par relais)…");
          const j = await dash.api.request("/api/pet/do/test-selected", {
            method: "POST", json: true,
            body: JSON.stringify({ channels: selected, ms: 1000, delay: 1200 }),
          });
          if (!j || !j.ok) throw new Error(j?.error || "Erreur test");
          this.close();
          dash.setHint("Test lancé");
        } catch (e) {
          dash.setHint("Erreur test : " + (e.message || e), true);
        } finally {
          this.relayRunTest.disabled = false;
        }
      });
    }
  }
}
