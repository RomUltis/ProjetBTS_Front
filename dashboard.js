document.addEventListener("DOMContentLoaded", () => {
  // Reprend ton pattern : API sur :3002 (proxy)
  const API_URL = "http://172.29.16.152:3002"; // adapte si besoin :contentReference[oaicite:4]{index=4}

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html#login";
    return;
  }

  // UI refs
  const systemSubtitle = document.getElementById("systemSubtitle");
  const chipState = document.getElementById("chipState");
  const alarmToggle = document.getElementById("alarmToggle");
  const alarmModeText = document.getElementById("alarmModeText");
  const kpiSchedule = document.getElementById("kpiSchedule");
  const kpiBadges = document.getElementById("kpiBadges");
  const hintBox = document.getElementById("hintBox");

  const btnLogout = document.getElementById("btnLogout");
  const btnRefresh = document.getElementById("btnRefresh");
  const btnTestSiren = document.getElementById("btnTestSiren");

  const slotList = document.getElementById("slotList");
  const btnAddSlot = document.getElementById("btnAddSlot");
  const btnSaveSchedule = document.getElementById("btnSaveSchedule");

  const rfidUid = document.getElementById("rfidUid");
  const rfidOwner = document.getElementById("rfidOwner");
  const btnAddBadge = document.getElementById("btnAddBadge");
  const badgeList = document.getElementById("badgeList");

  const toast = document.getElementById("toast");

  // State
  let scheduleSlots = [];
  let badges = [];
  let isArmed = false;

  // Helpers
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function setHint(msg, isError = false) {
    hintBox.textContent = msg || "";
    hintBox.style.color = isError ? "#c0392b" : "rgba(0,0,0,0.72)";
  }

  async function api(path, options = {}) {
    const headers = options.headers || {};
    headers["Authorization"] = `Bearer ${token}`;
    if (options.json) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });

    // Gestion token expiré
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "index.html#login";
      return null;
    }

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    if (!res.ok) {
      const msg = (data && (data.message || data.error)) || `Erreur HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // Render schedule
  function renderSchedule() {
    slotList.innerHTML = "";

    if (!scheduleSlots.length) {
      slotList.innerHTML = `<p class="muted">Aucune plage configurée. Ajoute-en une.</p>`;
      return;
    }

    scheduleSlots.forEach((slot, idx) => {
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

      slotList.appendChild(row);
    });

    slotList.querySelectorAll("input[type='time']").forEach(inp => {
      inp.addEventListener("change", () => {
        const idx = Number(inp.getAttribute("data-idx"));
        const k = inp.getAttribute("data-k");
        scheduleSlots[idx][k] = inp.value;
      });
    });

    slotList.querySelectorAll("button[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-del"));
        scheduleSlots.splice(idx, 1);
        renderSchedule();
      });
    });
  }

  // Render badges
  function renderBadges() {
    badgeList.innerHTML = "";

    if (!badges.length) {
      badgeList.innerHTML = `<div class="t-row"><div class="muted">—</div><div class="muted">Aucun badge</div><div class="muted">—</div><div class="t-right muted">—</div></div>`;
      return;
    }

    badges.forEach((b, idx) => {
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
      badgeList.appendChild(row);
    });

    badgeList.querySelectorAll("button[data-toggle]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-toggle"));
        try {
          // Endpoint à adapter côté back :
          // PATCH /rfid/:id { enabled: true/false }
          await api(`/rfid/${encodeURIComponent(badges[idx].id || badges[idx].uid)}`, {
            method: "PATCH",
            json: true,
            body: JSON.stringify({ enabled: !badges[idx].enabled })
          });
          showToast("Badge mis à jour");
          await loadAll();
        } catch (e) {
          setHint(e.message, true);
        }
      });
    });

    badgeList.querySelectorAll("button[data-remove]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-remove"));
        if (!confirm("Supprimer ce badge ?")) return;

        try {
          // DELETE /rfid/:id
          await api(`/rfid/${encodeURIComponent(badges[idx].id || badges[idx].uid)}`, {
            method: "DELETE"
          });
          showToast("Badge supprimé");
          await loadAll();
        } catch (e) {
          setHint(e.message, true);
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // UI state
  function updateUiState() {
    alarmToggle.checked = !!isArmed;

    alarmModeText.textContent = isArmed ? "Armée" : "Désarmée";
    chipState.textContent = isArmed ? "SURVEILLANCE ACTIVE" : "SURVEILLANCE OFF";

    const slotText = scheduleSlots.length
      ? scheduleSlots.map(s => `${s.start}→${s.end}`).join(" | ")
      : "Aucune";
    kpiSchedule.textContent = slotText;

    kpiBadges.textContent = String(badges.length);
    systemSubtitle.textContent = `IP API : ${API_URL}`;
  }

  // Loaders (endpoints à adapter à ton back)
  async function loadAll() {
    setHint("");

    // 1) état alarme
    // attendu: { armed: true/false }
    const status = await api("/alarm/status", { method: "GET" });
    if (status) isArmed = !!status.armed;

    // 2) horaires
    // attendu: { slots: [{start:"21:00", end:"07:00"}, ...] }
    const sched = await api("/schedule", { method: "GET" });
    scheduleSlots = (sched && sched.slots) ? sched.slots : [];

    // 3) badges rfid
    // attendu: { badges: [{id, uid, owner, enabled}, ...] }
    const r = await api("/rfid", { method: "GET" });
    badges = (r && r.badges) ? r.badges : [];

    renderSchedule();
    renderBadges();
    updateUiState();
  }

  // Events
  btnLogout.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    window.location.href = "index.html#login";
  });

  btnRefresh.addEventListener("click", async () => {
    try {
      await loadAll();
      showToast("Actualisé");
    } catch (e) {
      setHint(e.message, true);
    }
  });

  alarmToggle.addEventListener("change", async () => {
    try {
      const desired = alarmToggle.checked;

      // POST /alarm/toggle { armed: true/false }
      await api("/alarm/toggle", {
        method: "POST",
        json: true,
        body: JSON.stringify({ armed: desired })
      });

      isArmed = desired;
      updateUiState();
      showToast(desired ? "Alarme armée" : "Alarme désarmée");
    } catch (e) {
      // rollback
      alarmToggle.checked = !alarmToggle.checked;
      setHint(e.message, true);
    }
  });

  btnTestSiren.addEventListener("click", async () => {
    try {
      btnTestSiren.disabled = true;
      btnTestSiren.textContent = "Test en cours…";

      // POST /alarm/test { duration: 5 }
      await api("/alarm/test", {
        method: "POST",
        json: true,
        body: JSON.stringify({ duration: 5 })
      });

      showToast("Test alarme lancé (5s)");
      setTimeout(() => {
        btnTestSiren.disabled = false;
        btnTestSiren.textContent = "Test alarme (5s)";
      }, 5200);
    } catch (e) {
      btnTestSiren.disabled = false;
      btnTestSiren.textContent = "Test alarme (5s)";
      setHint(e.message, true);
    }
  });

  btnAddSlot.addEventListener("click", () => {
    scheduleSlots.push({ start: "21:00", end: "07:00" });
    renderSchedule();
    updateUiState();
  });

  btnSaveSchedule.addEventListener("click", async () => {
    try {
      // PUT /schedule { slots: [...] }
      await api("/schedule", {
        method: "PUT",
        json: true,
        body: JSON.stringify({ slots: scheduleSlots })
      });
      showToast("Horaires enregistrés");
      await loadAll();
    } catch (e) {
      setHint(e.message, true);
    }
  });

  btnAddBadge.addEventListener("click", async () => {
    const uid = (rfidUid.value || "").trim();
    const owner = (rfidOwner.value || "").trim();

    if (!uid) {
      setHint("Tu dois mettre un UID RFID.", true);
      return;
    }

    try {
      // POST /rfid { uid, owner, enabled:true }
      await api("/rfid", {
        method: "POST",
        json: true,
        body: JSON.stringify({ uid, owner, enabled: true })
      });

      rfidUid.value = "";
      rfidOwner.value = "";
      showToast("Badge ajouté");
      await loadAll();
    } catch (e) {
      setHint(e.message, true);
    }
  });

  // Boot
  loadAll().catch(e => setHint(e.message, true));
});
