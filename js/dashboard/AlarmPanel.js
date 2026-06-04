// Panneau Alarme : interrupteur armement, bips, bannière "alarme déclenchée",
// désarmement d'urgence, test sirène (ouvre la modal relais).
// Extrait de dashboard.js (lignes 512-558 partie alarme, 753-804, 995-1010).

import { ZONES } from "../core/constants.js";
import { formatDate } from "../core/ui.js";

export class AlarmPanel {
  constructor(dash) {
    this.dash = dash;
    this.alarmToggle = document.getElementById("alarmToggle");
    this.alarmModeText = document.getElementById("alarmModeText");
    this.beepToggle = document.getElementById("beepToggle");
    this.beepModeText = document.getElementById("beepModeText");
    this.btnTestSiren = document.getElementById("btnTestSiren");
    this.alarmBanner = document.getElementById("alarmBanner");
    this.alarmBannerText = document.getElementById("alarmBannerText");
    this.btnDisarm = document.getElementById("btnDisarm");
  }

  bind() {
    const dash = this.dash;

    this.alarmToggle.addEventListener("change", async () => {
      try {
        const desired = this.alarmToggle.checked;
        await dash.api.request("/api/alarm/arm", {
          method: "POST", json: true,
          body: JSON.stringify({
            armed: desired,
            zones: dash.alarmConfig.armed_zones,
            excluded_do: dash.alarmConfig.excluded_do,
            siren_duration: dash.alarmConfig.siren_duration,
            beep: this.beepToggle.checked,
          }),
        });
        dash.isArmed = desired;
        if (!desired) { dash.alarmTriggered = false; dash.alarmInfo = null; }
        dash.updateUiState();
        dash.showToast(desired ? "Alarme armée" : "Alarme désarmée");
      } catch (e) {
        this.alarmToggle.checked = !this.alarmToggle.checked;
        dash.setHint(e.message, true);
      }
    });

    this.beepToggle.addEventListener("change", async () => {
      this.beepModeText.textContent = this.beepToggle.checked ? "Activés" : "Désactivés";
      try {
        await dash.api.request("/api/alarm/arm", {
          method: "POST", json: true,
          body: JSON.stringify({ beep: this.beepToggle.checked }),
        });
        dash.showToast(this.beepToggle.checked ? "Bips activés" : "Bips désactivés");
      } catch {}
    });

    this.btnTestSiren.addEventListener("click", async () => {
      const opened = dash.relayModal.open();
      if (opened) return;
      try {
        this.btnTestSiren.disabled = true;
        dash.setHint("Modal absent -> test relais complet (fallback)…");
        const j = await dash.api.request("/api/pet/do/test-all", {
          method: "POST", json: true,
          body: JSON.stringify({ ms: 1000, delay: 1200 }),
        });
        if (!j || !j.ok) throw new Error(j?.error || "Erreur test relais");
        dash.setHint("Test lancé (DO0 → DO7)");
      } catch (e) {
        dash.setHint("Erreur test relais : " + (e.message || e), true);
      } finally {
        setTimeout(() => (this.btnTestSiren.disabled = false), 1000);
      }
    });

    if (this.btnDisarm) {
      this.btnDisarm.addEventListener("click", async () => {
        try {
          await dash.api.request("/api/alarm/disarm", { method: "POST", json: true, body: JSON.stringify({}) });
          dash.isArmed = false;
          dash.alarmTriggered = false;
          dash.alarmInfo = null;
          this.alarmToggle.checked = false;
          dash.updateUiState();
          dash.diPanel.render();
          dash.showToast("Alarme désarmée — DO coupés");
        } catch (e) {
          dash.setHint("Erreur désarmement : " + (e.message || e), true);
        }
      });
    }
  }

  // Met à jour le toggle + le texte de mode (appelé par Dashboard.updateUiState).
  syncToggle() {
    this.alarmToggle.checked = !!this.dash.isArmed;
    if (this.dash.isArmed && this.dash.armedBySchedule) {
      this.alarmModeText.textContent = "Armée (auto)";
    } else {
      this.alarmModeText.textContent = this.dash.isArmed ? "Armée" : "Désarmée";
    }
  }

  // Met à jour l'affichage des bips (appelé depuis loadAll).
  syncBeep(beepEnabled) {
    if (beepEnabled !== undefined && this.beepToggle) {
      this.beepToggle.checked = beepEnabled;
      this.beepModeText.textContent = beepEnabled ? "Activés" : "Désactivés";
    }
  }

  renderBanner() {
    if (!this.alarmBanner) return;

    if (this.dash.alarmTriggered && this.dash.alarmInfo) {
      this.alarmBanner.classList.remove("hidden");
      this.alarmBanner.classList.add("alarm-active");
      if (this.alarmBannerText) {
        const info = this.dash.alarmInfo;
        this.alarmBannerText.textContent =
          `🚨 ALARME DÉCLENCHÉE — ${info.diLabel || "DI?"} (${(info.zones || []).map((z) => ZONES[z] || z).join(", ")}) — ${formatDate(info.time)}`;
      }
    } else {
      this.alarmBanner.classList.add("hidden");
      this.alarmBanner.classList.remove("alarm-active");
    }
  }
}
