// Grille multi-caméras : 1 tuile + 1 lecteur HLS par cam, focus au clic,
// bascule qualité (sous-flux/principal), plein écran, et enregistrement par tuile.
// Extrait de dashboard.js (lignes 1012-1294, 1327-1341).

import { CameraPlayer } from "./CameraPlayer.js";

export class CameraGrid {
  constructor(dash) {
    this.dash = dash;
    this.camsGrid = document.getElementById("camsGrid");
    this.btnCamsQuality = document.getElementById("btnCamsQuality");
    this.btnCamsFullscreen = document.getElementById("btnCamsFullscreen");

    this.players = {}; // camId → { player, video, name, statusEl, tile }
    this.camsList = [];
    this.currentQuality = "sub"; // "sub" (défaut) ou "main"
    this.activeCamId = null;
  }

  getName(camId) {
    return this.players[camId]?.name || camId;
  }

  async load() {
    const dash = this.dash;
    try {
      const r = await dash.api.request("/api/cam/list", { method: "GET" });
      if (r && r.cameras) {
        this.camsList = r.cameras;
        this.renderGrid();
      }
    } catch (e) {
      console.error("Erreur chargement caméras:", e);
      if (this.camsGrid) {
        this.camsGrid.innerHTML = `<div style="grid-column:1/-1;color:#fff;padding:20px;text-align:center;">
          Impossible de charger les caméras : ${e.message}
        </div>`;
      }
    }
  }

  renderGrid() {
    const dash = this.dash;
    if (!this.camsGrid) return;
    this.camsGrid.innerHTML = "";

    if (!this.camsList.length) {
      this.camsGrid.innerHTML = `<div style="grid-column:1/-1;color:#fff;padding:20px;text-align:center;">
        Aucune caméra configurée. Vérifie les variables CAMn_* du .env.
      </div>`;
      return;
    }

    this.camsList.forEach((cam) => {
      const tile = document.createElement("div");
      tile.className = "cam-tile";
      tile.dataset.camId = cam.id;
      tile.innerHTML = `
        <video autoplay playsinline muted></video>
        <div class="cam-tile-label">${cam.name}</div>
        <div class="cam-tile-status" data-status>…</div>
        <div class="cam-tile-actions">
          <button class="btn btn-rec" data-action="rec-start">⏺ Enregistrer</button>
          <button class="btn btn-rec-stop hidden" data-action="rec-stop">⏹ Arrêter</button>
        </div>
      `;
      this.camsGrid.appendChild(tile);

      const video = tile.querySelector("video");
      const statusEl = tile.querySelector("[data-status]");
      const url = this.currentQuality === "main" ? cam.hls_main : cam.hls_sub;

      // RGPD : handler appelé quand le backend renvoie 403 (alarme désarmée).
      video._rgpdHandler = () => {
        statusEl.textContent = "🛡 RGPD";
        statusEl.className = "cam-tile-status rgpd";
        if (!tile.querySelector(".cam-tile-rgpd-overlay")) {
          const overlay = document.createElement("div");
          overlay.className = "cam-tile-rgpd-overlay";
          overlay.innerHTML = `
            <div class="rgpd-icon">🛡</div>
            <div class="rgpd-title">Caméra désactivée</div>
            <div class="rgpd-text">Activation lors de l'armement de l'alarme<br><small>Conformité RGPD — art. 5.1.c</small></div>
          `;
          tile.appendChild(overlay);
        }
      };

      const player = new CameraPlayer(video);
      player.load(url);
      this.players[cam.id] = { player, video, name: cam.name, statusEl, tile };

      // Statut basique : si le video joue → "ok" (et retire l'overlay RGPD)
      video.addEventListener("playing", () => {
        statusEl.textContent = "LIVE";
        statusEl.className = "cam-tile-status ok";
        const overlay = tile.querySelector(".cam-tile-rgpd-overlay");
        if (overlay) overlay.remove();
      });
      video.addEventListener("error", () => {
        if (statusEl.classList.contains("rgpd")) return;
        statusEl.textContent = "ERR";
        statusEl.className = "cam-tile-status error";
      });
      video.addEventListener("stalled", () => {
        if (statusEl.classList.contains("rgpd")) return;
        statusEl.textContent = "…";
        statusEl.className = "cam-tile-status";
      });

      // Clic = focus
      tile.addEventListener("click", (e) => {
        if (e.target.closest("[data-action]")) return;
        this.focusCam(cam.id);
      });

      // Boutons enregistrement par caméra (admin only)
      const btnRecStart = tile.querySelector('[data-action="rec-start"]');
      const btnRecStop = tile.querySelector('[data-action="rec-stop"]');

      if (!dash.isAdmin) {
        btnRecStart.style.display = "none";
        btnRecStop.style.display = "none";
      } else {
        btnRecStart.addEventListener("click", async (e) => {
          e.stopPropagation();
          try {
            btnRecStart.disabled = true;
            const r = await dash.api.request("/api/cam/record/start", {
              method: "POST", json: true, body: JSON.stringify({ cam_id: cam.id }),
            });
            if (!r || !r.ok) throw new Error(r?.error || "Erreur enregistrement");
            btnRecStart.classList.add("hidden");
            btnRecStop.classList.remove("hidden");
            dash.showToast(`Enregistrement démarré sur ${cam.name}`);
          } catch (e) {
            dash.showToast("Erreur : " + (e.message || e));
          } finally {
            btnRecStart.disabled = false;
          }
        });

        btnRecStop.addEventListener("click", async (e) => {
          e.stopPropagation();
          try {
            btnRecStop.disabled = true;
            const r = await dash.api.request("/api/cam/record/stop", {
              method: "POST", json: true, body: JSON.stringify({ cam_id: cam.id }),
            });
            if (!r || !r.ok) throw new Error(r?.error || "Erreur arrêt");
            btnRecStop.classList.add("hidden");
            btnRecStart.classList.remove("hidden");
            dash.showToast(`Enregistrement sauvegardé (${r.duration_seconds}s)`);
          } catch (e) {
            dash.showToast("Erreur : " + (e.message || e));
          } finally {
            btnRecStop.disabled = false;
          }
        });
      }
    });

    // Focus initial sur la première cam
    if (this.camsList.length > 0) {
      this.focusCam(this.camsList[0].id);
    }
  }

  focusCam(camId) {
    this.activeCamId = camId;
    if (!this.camsGrid) return;
    this.camsGrid.classList.add("focus-mode");
    this.camsGrid.querySelectorAll(".cam-tile").forEach((t) => {
      t.classList.toggle("active", t.dataset.camId === camId);
    });
  }

  switchQuality(quality) {
    this.currentQuality = quality;
    if (this.btnCamsQuality) {
      this.btnCamsQuality.dataset.quality = quality;
      this.btnCamsQuality.textContent = quality === "main" ? "Qualité : Principal" : "Qualité : Sous-flux";
    }
    // Recharge chaque lecteur avec la nouvelle URL
    this.camsList.forEach((cam) => {
      const p = this.players[cam.id];
      if (!p) return;
      p.player.destroy();
      const url = quality === "main" ? cam.hls_main : cam.hls_sub;
      if (p.video) p.player.load(url);
    });
  }

  // Synchronise l'affichage Stop/Enregistrer des tuiles (appelé par RecordingBanner).
  syncRecButtons(byCam) {
    Object.entries(this.players).forEach(([camId, p]) => {
      if (!p.tile) return;
      const btnStart = p.tile.querySelector('[data-action="rec-start"]');
      const btnStop = p.tile.querySelector('[data-action="rec-stop"]');
      if (!btnStart || !btnStop) return;
      if (byCam && byCam[camId] && byCam[camId].recording) {
        btnStart.classList.add("hidden");
        btnStop.classList.remove("hidden");
      } else {
        btnStart.classList.remove("hidden");
        btnStop.classList.add("hidden");
      }
    });
  }

  bind() {
    if (this.btnCamsQuality) {
      this.btnCamsQuality.addEventListener("click", () => {
        this.switchQuality(this.currentQuality === "main" ? "sub" : "main");
      });
    }

    // Plein écran (API native + fallback "fake-fullscreen" si refusé)
    if (this.btnCamsFullscreen) {
      this.btnCamsFullscreen.addEventListener("click", async () => {
        if (!this.camsGrid) return;
        const inFs = document.fullscreenElement === this.camsGrid || this.camsGrid.classList.contains("fake-fullscreen");
        if (inFs) {
          if (document.fullscreenElement) {
            await document.exitFullscreen().catch(() => {});
          }
          this.camsGrid.classList.remove("fake-fullscreen");
        } else {
          try {
            await this.camsGrid.requestFullscreen();
          } catch {
            this.camsGrid.classList.add("fake-fullscreen");
          }
        }
      });
    }

    // ESC sort du fake-fullscreen
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.camsGrid && this.camsGrid.classList.contains("fake-fullscreen")) {
        this.camsGrid.classList.remove("fake-fullscreen");
      }
    });
  }
}
