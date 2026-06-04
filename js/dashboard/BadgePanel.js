// Panneau RFID : liste des badges, ajout manuel, détection automatique
// (enrollment), et masquage de la section selon le flag /api/features.
// Extrait de dashboard.js (lignes 40-44, 220-265, 820-902).

import { escapeHtml } from "../core/ui.js";

export class BadgePanel {
  constructor(dash) {
    this.dash = dash;
    this.badges = [];
    this.rfidSection = document.getElementById("rfidSection");
    this.rfidUid = document.getElementById("rfidUid");
    this.rfidOwner = document.getElementById("rfidOwner");
    this.btnAddBadge = document.getElementById("btnAddBadge");
    this.btnEnrollRfid = document.getElementById("btnEnrollRfid");
    this.enrollCountdown = document.getElementById("enrollCountdown");
    this.badgeList = document.getElementById("badgeList");

    this.enrolling = false;
    this.enrollInterval = null;
  }

  // Feature flag RFID — masque la section si RFID_ENABLED=false côté serveur
  applyFeatureFlag() {
    fetch("/api/features")
      .then((r) => r.json())
      .then((f) => { if (!f.rfidEnabled && this.rfidSection) this.rfidSection.style.display = "none"; })
      .catch(() => {});
  }

  setBadges(badges) {
    this.badges = badges;
  }

  render() {
    this.badgeList.innerHTML = "";
    if (!this.badges.length) {
      this.badgeList.innerHTML = `<div class="t-row"><div class="muted">—</div><div class="muted">Aucun badge</div><div class="muted">—</div><div class="t-right muted">—</div></div>`;
      return;
    }
    this.badges.forEach((b, idx) => {
      const row = document.createElement("div");
      row.className = "t-row";
      row.innerHTML = `
        <div>${escapeHtml(b.uid || "")}</div>
        <div>${escapeHtml(b.owner || "")}</div>
        <div><span class="badge ${b.enabled ? "on" : "off"}">${b.enabled ? "Actif" : "Désactivé"}</span></div>
        <div class="t-right">
          <div class="row-actions">
            <button class="btn btn-ghost small-btn" data-toggle="${idx}">${b.enabled ? "Désactiver" : "Activer"}</button>
            <button class="btn btn-danger small-btn" data-remove="${idx}">Supprimer</button>
          </div>
        </div>
      `;
      this.badgeList.appendChild(row);
    });

    this.badgeList.querySelectorAll("button[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-toggle"));
        try {
          await this.dash.api.request(`/rfid/${encodeURIComponent(this.badges[idx].id || this.badges[idx].uid)}`, {
            method: "PATCH", json: true, body: JSON.stringify({ enabled: !this.badges[idx].enabled }),
          });
          this.dash.showToast("Badge mis à jour");
          await this.dash.loadAll();
        } catch (e) { this.dash.setHint(e.message, true); }
      });
    });
    this.badgeList.querySelectorAll("button[data-remove]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-remove"));
        if (!confirm("Supprimer ce badge ?")) return;
        try {
          await this.dash.api.request(`/rfid/${encodeURIComponent(this.badges[idx].id || this.badges[idx].uid)}`, { method: "DELETE" });
          this.dash.showToast("Badge supprimé");
          await this.dash.loadAll();
        } catch (e) { this.dash.setHint(e.message, true); }
      });
    });
  }

  stopEnrollment() {
    this.enrolling = false;
    if (this.enrollInterval) { clearInterval(this.enrollInterval); this.enrollInterval = null; }
    if (this.btnEnrollRfid) {
      this.btnEnrollRfid.textContent = "📡 Détection auto";
      this.btnEnrollRfid.classList.remove("btn-enrolling");
    }
    if (this.enrollCountdown) this.enrollCountdown.classList.add("hidden");
  }

  bind() {
    const dash = this.dash;

    this.btnAddBadge.addEventListener("click", async () => {
      const uid = (this.rfidUid.value || "").trim();
      const owner = (this.rfidOwner.value || "").trim();
      if (!uid) { dash.setHint("Tu dois mettre un UID RFID.", true); return; }
      try {
        await dash.api.request("/rfid", { method: "POST", json: true, body: JSON.stringify({ uid, owner, enabled: true }) });
        this.rfidUid.value = "";
        this.rfidOwner.value = "";
        dash.showToast("Badge ajouté");
        await dash.loadAll();
      } catch (e) { dash.setHint(e.message, true); }
    });

    // ── Détection automatique RFID (enrollment) ──
    if (this.btnEnrollRfid) {
      this.btnEnrollRfid.addEventListener("click", async () => {
        // Si déjà en cours → annuler
        if (this.enrolling) {
          try { await dash.api.request("/rfid/enroll/stop", { method: "POST", json: true, body: "{}" }); } catch {}
          this.stopEnrollment();
          dash.showToast("Détection annulée");
          return;
        }

        // Lancer l'enrollment
        try {
          const r = await dash.api.request("/rfid/enroll/start", { method: "POST", json: true, body: "{}" });
          if (!r || !r.ok) throw new Error(r?.error || "Erreur enrollment");

          this.enrolling = true;
          this.btnEnrollRfid.textContent = "⏹ Annuler détection";
          this.btnEnrollRfid.classList.add("btn-enrolling");
          this.enrollCountdown.classList.remove("hidden");
          dash.showToast("Badgez maintenant…");

          // Polling toutes les secondes
          this.enrollInterval = setInterval(async () => {
            try {
              const s = await dash.api.request("/rfid/enroll/status", { method: "GET" });
              if (!s || !s.ok) return;

              // Badge détecté
              if (s.detected_uid) {
                this.rfidUid.value = s.detected_uid;
                this.stopEnrollment();
                dash.showToast("Badge détecté : " + s.detected_uid);
                this.rfidOwner.focus();
                return;
              }

              // Mettre à jour le décompte
              if (s.remaining_seconds > 0) {
                this.enrollCountdown.textContent = `⏳ ${s.remaining_seconds}s restantes — Présentez un badge`;
              }

              // Expiré
              if (!s.active && !s.detected_uid) {
                this.stopEnrollment();
                dash.showToast("Aucun badge détecté (timeout)");
              }
            } catch {
              this.stopEnrollment();
            }
          }, 1000);
        } catch (e) {
          dash.setHint("Erreur détection auto : " + (e.message || e), true);
          this.stopEnrollment();
        }
      });
    }
  }
}
