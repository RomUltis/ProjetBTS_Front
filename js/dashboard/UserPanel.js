// Panneau Gestion des utilisateurs (admin uniquement).
// Extrait de dashboard.js (lignes 426-506, 942-955).

import { escapeHtml } from "../core/ui.js";

export class UserPanel {
  constructor(dash) {
    this.dash = dash;
    this.users = [];
    this.cardUsers = document.getElementById("cardUsers");
    this.userList = document.getElementById("userList");
    this.btnRefreshUsers = document.getElementById("btnRefreshUsers");
  }

  render() {
    if (!this.userList) return;
    this.userList.innerHTML = "";

    if (!this.users.length) {
      this.userList.innerHTML = `<div class="t-row"><div class="muted" style="grid-column:1/-1">Aucun utilisateur</div></div>`;
      return;
    }

    const currentUserId = Number(localStorage.getItem("userId"));

    this.users.forEach((u) => {
      const row = document.createElement("div");
      row.className = "t-row";
      const isSelf = u.id === currentUserId;
      const isAdminUser = u.role === "admin";

      row.innerHTML = `
        <div>${u.id}</div>
        <div>${escapeHtml(u.username)}${isSelf ? ' <span class="badge on">Vous</span>' : ""}</div>
        <div><span class="badge ${isAdminUser ? "on" : "off"}">${isAdminUser ? "Admin" : "Utilisateur"}</span></div>
        <div class="t-right">
          <div class="row-actions">
            ${isSelf ? '<span class="muted" style="font-size:12px">—</span>' : `
              <button class="btn btn-ghost small-btn" data-role-toggle="${u.id}" data-current="${u.role}">
                ${isAdminUser ? "Rétrograder" : "Promouvoir admin"}
              </button>
              <button class="btn btn-danger small-btn" data-del-user="${u.id}" data-name="${escapeHtml(u.username)}">Supprimer</button>
            `}
          </div>
        </div>
      `;
      this.userList.appendChild(row);
    });

    // Event : promouvoir / rétrograder
    this.userList.querySelectorAll("button[data-role-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = Number(btn.getAttribute("data-role-toggle"));
        const current = btn.getAttribute("data-current");
        const newRole = current === "admin" ? "user" : "admin";
        const userName = this.users.find((u) => u.id === uid)?.username || "";

        if (!confirm(`${newRole === "admin" ? "Promouvoir" : "Rétrograder"} ${userName} en ${newRole} ?`)) return;

        try {
          await this.dash.api.request(`/api/users/${uid}/role`, {
            method: "PATCH", json: true,
            body: JSON.stringify({ role: newRole }),
          });
          this.dash.showToast(`${userName} → ${newRole}`);
          await this.load();
        } catch (e) { this.dash.setHint(e.message, true); }
      });
    });

    // Event : supprimer
    this.userList.querySelectorAll("button[data-del-user]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = Number(btn.getAttribute("data-del-user"));
        const name = btn.getAttribute("data-name");
        if (!confirm(`Supprimer le compte de ${name} ? Cette action est irréversible.`)) return;

        try {
          await this.dash.api.request(`/api/users/${uid}`, { method: "DELETE" });
          this.dash.showToast(`${name} supprimé`);
          await this.load();
        } catch (e) { this.dash.setHint(e.message, true); }
      });
    });
  }

  async load() {
    try {
      const r = await this.dash.api.request("/api/users", { method: "GET" });
      if (r && r.users) {
        this.users = r.users;
        this.render();
      }
    } catch {} // 403 pour les non-admins, on ignore
  }

  bind() {
    if (!this.btnRefreshUsers) return;
    this.btnRefreshUsers.addEventListener("click", async () => {
      try {
        this.btnRefreshUsers.disabled = true;
        await this.load();
        this.dash.showToast("Utilisateurs actualisés");
      } catch (e) {
        this.dash.setHint("Erreur chargement utilisateurs : " + (e.message || e), true);
      } finally {
        this.btnRefreshUsers.disabled = false;
      }
    });
  }
}
