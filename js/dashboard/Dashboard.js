// Orchestrateur du dashboard : détient l'état central de l'alarme + l'ApiClient
// + le Notifier, instancie les panneaux, et coordonne chargement / polling / rôles.
// Extrait de dashboard.js (lignes 1-12, 89-123, 528-660, 738-751, 1364-1397).

import { ApiClient } from "../core/ApiClient.js";
import { Notifier } from "../core/ui.js";
import { AlarmPanel } from "./AlarmPanel.js";
import { SchedulePanel } from "./SchedulePanel.js";
import { BadgePanel } from "./BadgePanel.js";
import { DiPanel } from "./DiPanel.js";
import { ArmConfigPanel } from "./ArmConfigPanel.js";
import { UserPanel } from "./UserPanel.js";
import { RelayModal } from "./RelayModal.js";
import { CameraGrid } from "./CameraGrid.js";
import { RecordingBanner } from "./RecordingBanner.js";

export class Dashboard {
  constructor() {
    // API sur le même serveur (adjudicator.js sert le front + l'API)
    this.token = localStorage.getItem("token");
    this.role = localStorage.getItem("role") || "user";
    this.isAdmin = this.role === "admin";
    this.api = new ApiClient(this.token, "");

    // Éléments globaux (topbar + KPIs)
    this.el = {
      systemSubtitle: document.getElementById("systemSubtitle"),
      chipState: document.getElementById("chipState"),
      kpiSchedule: document.getElementById("kpiSchedule"),
      kpiBadges: document.getElementById("kpiBadges"),
      btnLogout: document.getElementById("btnLogout"),
      btnRefresh: document.getElementById("btnRefresh"),
    };
    this.notifier = new Notifier(document.getElementById("toast"), document.getElementById("hintBox"));

    // État central (alarme) — partagé entre les panneaux
    this.isArmed = false;
    this.alarmConfig = {
      armed_zones: ["ciel1", "ciel2", "physique"],
      excluded_do: [0],
      siren_duration: 180,
    };
    this.alarmTriggered = false;
    this.alarmInfo = null;
    this.armedBySchedule = false;
    this.diPollingInterval = null;

    // Panneaux
    this.alarmPanel = new AlarmPanel(this);
    this.schedulePanel = new SchedulePanel(this);
    this.badgePanel = new BadgePanel(this);
    this.diPanel = new DiPanel(this);
    this.armConfigPanel = new ArmConfigPanel(this);
    this.userPanel = new UserPanel(this);
    this.relayModal = new RelayModal(this);
    this.cameraGrid = new CameraGrid(this);
    this.recordingBanner = new RecordingBanner(this);
  }

  showToast(msg) { this.notifier.toast(msg); }
  setHint(msg, isError = false) { this.notifier.hint(msg, isError); }

  // ── Chargement de toutes les données ──
  async loadAll() {
    this.setHint("");

    // Status alarme (route avancée, fallback ancienne route)
    try {
      const status = await this.api.request("/api/alarm/status", { method: "GET" });
      if (status) {
        this.isArmed = !!status.armed;
        this.alarmConfig.armed_zones = status.armed_zones || ["ciel1", "ciel2", "physique"];
        this.alarmConfig.excluded_do = status.excluded_do || [0];
        this.alarmConfig.siren_duration = status.siren_duration || 180;
        this.alarmTriggered = !!status.alarm_triggered;
        this.alarmInfo = status.alarm_info || null;
        this.armedBySchedule = !!status.armed_by_schedule;
        this.alarmPanel.syncBeep(status.beep_enabled);
      }
    } catch (e) {
      try {
        const status = await this.api.request("/alarm/status", { method: "GET" });
        if (status) this.isArmed = !!status.armed;
      } catch {}
    }

    // Schedule
    try {
      const sched = await this.api.request("/schedule", { method: "GET" });
      this.schedulePanel.setSlots((sched && sched.slots) ? sched.slots : []);
    } catch {}

    // Badges
    try {
      const r = await this.api.request("/rfid", { method: "GET" });
      this.badgePanel.setBadges((r && r.badges) ? r.badges : []);
    } catch {}

    // DI status
    try {
      const di = await this.api.request("/api/di/status", { method: "GET" });
      if (di && di.inputs) {
        this.diPanel.setInputs(di.inputs);
        if (di.alarm_triggered !== undefined) this.alarmTriggered = di.alarm_triggered;
        if (di.alarm_info) this.alarmInfo = di.alarm_info;
      }
    } catch {}

    this.schedulePanel.render();
    this.badgePanel.render();
    this.diPanel.render();
    this.armConfigPanel.render();
    if (this.isAdmin) await this.userPanel.load();
    this.updateUiState();
  }

  // ── État UI global ──
  updateUiState() {
    this.alarmPanel.syncToggle();

    this.el.chipState.textContent = this.isArmed
      ? (this.alarmTriggered ? "🚨 ALARME EN COURS" : "SURVEILLANCE ACTIVE")
      : "SURVEILLANCE OFF";

    if (this.alarmTriggered) {
      this.el.chipState.style.color = "#e74c3c";
      this.el.chipState.style.fontWeight = "bold";
    } else {
      this.el.chipState.style.color = "";
      this.el.chipState.style.fontWeight = "";
    }

    const slots = this.schedulePanel.slots;
    const slotText = slots.length
      ? slots.map((s) => `${s.start}→${s.end}`).join(" | ")
      : "Aucune";
    this.el.kpiSchedule.textContent = slotText;
    this.el.kpiBadges.textContent = String(this.badgePanel.badges.length);
    this.el.systemSubtitle.textContent = `IP API : ${this.api.apiUrl}`;

    this.alarmPanel.renderBanner();
  }

  // ── Polling DI côté front (refresh toutes les 2s) ──
  startDIPolling() {
    if (this.diPollingInterval) return;
    this.diPollingInterval = setInterval(async () => {
      try {
        const di = await this.api.request("/api/di/status", { method: "GET" });
        if (di && di.inputs) {
          this.diPanel.setInputs(di.inputs);
          if (di.alarm_triggered !== undefined) {
            const wasTriggered = this.alarmTriggered;
            this.alarmTriggered = di.alarm_triggered;
            this.alarmInfo = di.alarm_info || null;
            if (wasTriggered !== this.alarmTriggered) {
              this.alarmPanel.renderBanner();
              this.updateUiState();
            }
          }
          this.diPanel.render();
        }
      } catch {}

      // Vérifier aussi l'état armé/désarmé (changé par badge RFID)
      try {
        const status = await this.api.request("/api/alarm/status", { method: "GET" });
        if (status) {
          const wasArmed = this.isArmed;
          this.isArmed = !!status.armed;
          this.armedBySchedule = !!status.armed_by_schedule;
          if (wasArmed !== this.isArmed) {
            this.alarmPanel.alarmToggle.checked = this.isArmed;
            this.updateUiState();
          }
        }
      } catch {}
    }, 2000);
  }

  stopDIPolling() {
    if (this.diPollingInterval) {
      clearInterval(this.diPollingInterval);
      this.diPollingInterval = null;
    }
  }

  // Masque tout sauf la caméra pour les utilisateurs non-admin.
  _applyViewerRole() {
    document.querySelectorAll(".grid > .card").forEach((card) => {
      const h2 = card.querySelector("h2");
      if (!h2) return;
      const title = h2.textContent.toLowerCase();
      if (!title.includes("caméra") && !title.includes("camera")) {
        card.style.display = "none";
      }
    });
    if (this.alarmPanel.alarmBanner) this.alarmPanel.alarmBanner.style.display = "none";
    if (this.el.systemSubtitle) this.el.systemSubtitle.textContent = "Mode visualisation";
  }

  init() {
    if (!this.token) {
      window.location.href = "index.html#login";
      return;
    }

    // Feature flags — masquent les sections désactivées côté serveur
    this.badgePanel.applyFeatureFlag();
    this.armConfigPanel.applyFeatureFlag();

    // Events globaux
    this.el.btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      this.stopDIPolling();
      window.location.href = "index.html#login";
    });
    this.el.btnRefresh.addEventListener("click", async () => {
      try { await this.loadAll(); this.showToast("Actualisé"); }
      catch (e) { this.setHint(e.message, true); }
    });

    // Bind des panneaux
    this.alarmPanel.bind();
    this.schedulePanel.bind();
    this.badgePanel.bind();
    this.diPanel.bind();
    this.armConfigPanel.bind();
    this.userPanel.bind();
    this.relayModal.bind();
    this.cameraGrid.bind();

    // Rôle non-admin : masquer tout sauf la caméra
    if (!this.isAdmin) this._applyViewerRole();

    // Caméras chargées pour tout le monde (admin + user normal)
    this.cameraGrid.load().catch((e) => console.error("loadCameras:", e));

    if (this.isAdmin) {
      this.loadAll().catch((e) => this.setHint(e.message, true));
      this.startDIPolling();
      // Polling du statut d'enregistrement toutes les 3s (admin only)
      this.recordingBanner.start();
    } else {
      if (this.el.systemSubtitle) this.el.systemSubtitle.textContent = `Connecté — Mode visualisation`;
    }
  }
}
