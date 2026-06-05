// Panneau Configuration d'armement : zones surveillées, exclusions DO, durée sirène.
// Extrait de dashboard.js (lignes 385-420, 959-991).

import { RELAYS, ZONES } from "../core/constants.js";
import { escapeHtml } from "../core/ui.js";

export class ArmConfigPanel {
  constructor(dash) {
    this.dash = dash;
    this.zoneCheckboxes = document.getElementById("zoneCheckboxes");
    this.doExclusionList = document.getElementById("doExclusionList");
    this.sirenDurationInput = document.getElementById("sirenDurationInput");
    this.btnSaveArmConfig = document.getElementById("btnSaveArmConfig");
    this.armConfigSection = document.getElementById("armConfigSection");
  }

  // Feature flag — masque la section si ARM_CONFIG_ENABLED=false côté serveur
  applyFeatureFlag() {
    fetch("/api/features")
      .then((r) => r.json())
      .then((f) => { if (!f.armConfigEnabled && this.armConfigSection) this.armConfigSection.style.display = "none"; })
      .catch(() => {});
  }

  render() {
    const cfg = this.dash.alarmConfig;

    // Zones
    if (this.zoneCheckboxes) {
      this.zoneCheckboxes.innerHTML = "";
      Object.entries(ZONES).forEach(([key, name]) => {
        const checked = cfg.armed_zones.includes(key) ? "checked" : "";
        const div = document.createElement("label");
        div.className = "arm-zone-label";
        div.innerHTML = `
          <input type="checkbox" class="zone-cb" data-zone="${key}" ${checked}>
          <span>${escapeHtml(name)}</span>
        `;
        this.zoneCheckboxes.appendChild(div);
      });
    }

    // Exclusions DO
    if (this.doExclusionList) {
      this.doExclusionList.innerHTML = "";
      RELAYS.forEach((r) => {
        const excluded = cfg.excluded_do.includes(r.ch);
        const div = document.createElement("label");
        div.className = "arm-do-label";
        div.innerHTML = `
          <input type="checkbox" class="do-excl-cb" data-ch="${r.ch}" ${excluded ? "checked" : ""}>
          <span>DO${r.ch} — ${escapeHtml(r.zoneName)} — ${escapeHtml(r.role)} ${excluded ? "(exclu)" : ""}</span>
        `;
        this.doExclusionList.appendChild(div);
      });
    }

    // Durée sirène
    if (this.sirenDurationInput) {
      this.sirenDurationInput.value = cfg.siren_duration || 180;
    }
  }

  bind() {
    const dash = this.dash;
    if (!this.btnSaveArmConfig) return;

    this.btnSaveArmConfig.addEventListener("click", async () => {
      try {
        const zones = [...(this.zoneCheckboxes?.querySelectorAll(".zone-cb:checked") || [])].map((cb) => cb.dataset.zone);
        const excludedDO = [...(this.doExclusionList?.querySelectorAll(".do-excl-cb:checked") || [])].map((cb) => Number(cb.dataset.ch));
        const duration = Number(this.sirenDurationInput?.value) || 180;

        await dash.api.request("/api/alarm/arm", {
          method: "POST", json: true,
          body: JSON.stringify({
            armed: dash.isArmed,
            zones,
            excluded_do: excludedDO,
            siren_duration: Math.min(600, Math.max(1, duration)),
          }),
        });

        dash.alarmConfig.armed_zones = zones;
        dash.alarmConfig.excluded_do = excludedDO;
        dash.alarmConfig.siren_duration = duration;

        this.render();
        dash.diPanel.render();
        dash.updateUiState();
        dash.showToast("Configuration sauvegardée");
      } catch (e) {
        dash.setHint("Erreur sauvegarde config : " + (e.message || e), true);
      }
    });
  }
}
