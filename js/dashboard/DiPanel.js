// Panneau Entrées DI : état temps réel des capteurs (groupé par zone) +
// historique des événements. Le rendu dépend de l'état alarme central (dash).
// Extrait de dashboard.js (lignes 271-379, 906-940).

import { ZONES } from "../core/constants.js";
import { escapeHtml, formatDate } from "../core/ui.js";

export class DiPanel {
  constructor(dash) {
    this.dash = dash;
    this.diInputs = [];
    this.diEvents = [];
    this.diStatusContainer = document.getElementById("diStatusContainer");
    this.diEventList = document.getElementById("diEventList");
    this.btnRefreshDI = document.getElementById("btnRefreshDI");
    this.btnLoadEvents = document.getElementById("btnLoadEvents");
    this.showZoneBadge = true; // badges "Armée/Exclue" — masqués si la config d'armement est désactivée
  }

  setInputs(inputs) { this.diInputs = inputs; }
  setEvents(events) { this.diEvents = events; }

  // Rendu de l'état des entrées (ex-renderDIStatus)
  render() {
    if (!this.diStatusContainer) return;
    this.diStatusContainer.innerHTML = "";

    if (!this.diInputs.length) {
      this.diStatusContainer.innerHTML = `<p class="muted">Aucune donnée DI disponible.</p>`;
      return;
    }

    // Grouper par zone
    const byZone = {};
    this.diInputs.forEach((di) => {
      const zones = di.zone.split(",").map((z) => z.trim());
      zones.forEach((z) => { if (!byZone[z]) byZone[z] = []; byZone[z].push(di); });
    });

    // Portes ouvertes dans les zones armées (bloque l'armement)
    const openDoorsInArmedZones = this.diInputs.filter((di) => {
      if (di.type !== "porte" || !di.value) return false;
      const diZones = di.zone.split(",").map((z) => z.trim());
      return diZones.some((z) => this.dash.alarmConfig.armed_zones.includes(z));
    });

    if (openDoorsInArmedZones.length > 0 && !this.dash.isArmed) {
      const warning = document.createElement("div");
      warning.className = "di-warning";
      warning.innerHTML = `⚠️ <strong>Armement impossible</strong> — porte(s)/fenêtre(s) ouverte(s) : ${openDoorsInArmedZones.map((d) => escapeHtml(d.label)).join(", ")}`;
      this.diStatusContainer.appendChild(warning);
    }

    Object.entries(byZone).forEach(([zoneKey, inputs]) => {
      const zoneName = ZONES[zoneKey] || zoneKey;
      const group = document.createElement("div");
      group.className = "di-zone-group";

      const isZoneArmed = this.dash.alarmConfig.armed_zones.includes(zoneKey);
      const zoneBadge = this.showZoneBadge
        ? `<span class="badge ${isZoneArmed ? 'on' : 'off'}">${isZoneArmed ? 'Armée' : 'Exclue'}</span>`
        : "";

      group.innerHTML = `
        <div class="di-zone-header">
          <span class="di-zone-name">${escapeHtml(zoneName)}</span>
          ${zoneBadge}
        </div>
      `;

      // Dédupliquer (un DI peut apparaître dans 2 zones)
      const seen = new Set();
      inputs.forEach((di) => {
        if (seen.has(di.ch)) return;
        seen.add(di.ch);

        let stateText, stateIcon;
        if (di.type === "porte") {
          stateText = di.value ? "OUVERT" : "FERMÉ";
          stateIcon = di.value ? "🔓" : "🔒";
        } else {
          stateText = di.value ? "DÉTECTÉ" : "OK";
          stateIcon = di.value ? "🔴" : "🟢";
        }

        const card = document.createElement("div");
        card.className = `di-card ${di.value ? "di-triggered" : "di-ok"}`;
        card.innerHTML = `
          <div class="di-card-icon">${di.type === "mouvement" ? "🔴" : "🚪"}</div>
          <div class="di-card-info">
            <div class="di-card-label">${escapeHtml(di.label)}</div>
            <div class="di-card-channel">DI${di.ch}</div>
          </div>
          <div class="di-card-state">
            <span class="di-indicator ${di.value ? "active" : "inactive"}"></span>
            ${stateText}
          </div>
        `;
        group.appendChild(card);
      });

      this.diStatusContainer.appendChild(group);
    });
  }

  // Historique des événements (ex-renderDIEvents)
  renderEvents() {
    if (!this.diEventList) return;
    this.diEventList.innerHTML = "";

    if (!this.diEvents.length) {
      this.diEventList.innerHTML = `<p class="muted">Aucun événement enregistré.</p>`;
      return;
    }

    this.diEvents.slice(0, 50).forEach((ev) => {
      const row = document.createElement("div");
      row.className = `di-event-row ${ev.triggered ? "di-event-alert" : ""}`;
      row.innerHTML = `
        <span class="di-event-time">${formatDate(ev.created_at)}</span>
        <span class="di-event-ch">DI${ev.channel}</span>
        <span class="di-event-label">${escapeHtml(ev.label)}</span>
        <span class="di-event-value ${ev.value ? "high" : "low"}">${ev.value ? "HIGH" : "LOW"}</span>
        ${ev.triggered ? '<span class="di-event-tag alert">ALARME</span>' : '<span class="di-event-tag info">Info</span>'}
      `;
      this.diEventList.appendChild(row);
    });
  }

  bind() {
    const dash = this.dash;

    // Les badges "Armée/Exclue" font partie de la config d'armement : on les
    // masque si ARM_CONFIG_ENABLED=false (même flag que la carte de configuration).
    fetch("/api/features")
      .then((r) => r.json())
      .then((f) => { this.showZoneBadge = f.armConfigEnabled !== false; this.render(); })
      .catch(() => {});

    if (this.btnRefreshDI) {
      this.btnRefreshDI.addEventListener("click", async () => {
        try {
          this.btnRefreshDI.disabled = true;
          const di = await dash.api.request("/api/di/read", { method: "GET" });
          if (di && di.inputs) {
            this.diInputs = di.inputs;
            this.render();
            dash.showToast("DI actualisées");
          }
        } catch (e) {
          dash.setHint("Erreur lecture DI : " + (e.message || e), true);
        } finally {
          this.btnRefreshDI.disabled = false;
        }
      });
    }

    if (this.btnLoadEvents) {
      this.btnLoadEvents.addEventListener("click", async () => {
        try {
          this.btnLoadEvents.disabled = true;
          const ev = await dash.api.request("/api/di/events?limit=50", { method: "GET" });
          if (ev && ev.events) {
            this.diEvents = ev.events;
            this.renderEvents();
            dash.showToast(`${ev.count} événement(s) chargé(s)`);
          }
        } catch (e) {
          dash.setHint("Erreur chargement historique : " + (e.message || e), true);
        } finally {
          this.btnLoadEvents.disabled = false;
        }
      });
    }
  }
}
