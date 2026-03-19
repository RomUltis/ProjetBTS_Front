document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://172.29.19.193:3002";

  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "index.html#login";
    return;
  }

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

  // Caméra
  const camVideo = document.getElementById("camVideo");
  const camStatus = document.getElementById("camStatus");
  const btnCamStart = document.getElementById("btnCamStart");
  const btnCamStop = document.getElementById("btnCamStop");
  const btnCamSub = document.getElementById("btnCamSub");
  const btnCamMain = document.getElementById("btnCamMain");

  // Modal test relais
  const relayModal = document.getElementById("relayModal");
  const relayModalClose = document.getElementById("relayModalClose");
  const relayList = document.getElementById("relayList");
  const relaySelectAll = document.getElementById("relaySelectAll");
  const relayUnselectAll = document.getElementById("relayUnselectAll");
  const relayRunTest = document.getElementById("relayRunTest");

  // ── Entrées DI (NOUVEAU) ──
  const diStatusContainer = document.getElementById("diStatusContainer");
  const diEventList = document.getElementById("diEventList");
  const btnRefreshDI = document.getElementById("btnRefreshDI");
  const btnLoadEvents = document.getElementById("btnLoadEvents");

  // ── Armement avancé (NOUVEAU) ──
  const zoneCheckboxes = document.getElementById("zoneCheckboxes");
  const doExclusionList = document.getElementById("doExclusionList");
  const sirenDurationInput = document.getElementById("sirenDurationInput");
  const btnSaveArmConfig = document.getElementById("btnSaveArmConfig");

  // ── Indicateur alarme déclenchée (NOUVEAU) ──
  const alarmBanner = document.getElementById("alarmBanner");
  const alarmBannerText = document.getElementById("alarmBannerText");
  const btnDisarm = document.getElementById("btnDisarm");

  // ---- State ----
  let scheduleSlots = [];
  let badges = [];
  let isArmed = false;
  let alarmConfig = {
    armed_zones: ["ciel1", "ciel2", "physique"],
    excluded_do: [0],
    siren_duration: 180,
  };
  let diInputs = [];
  let diEvents = [];
  let alarmTriggered = false;
  let alarmInfo = null;
  let diPollingInterval = null;

  // Mapping relais DO (existant)
  const RELAYS = [
    { ch: 0, label: "Relais 0 (pin 3-4)", zone: "ciel1", zoneName: "Labo CIEL 1", role: "Gâche" },
    { ch: 1, label: "Relais 1 (pin 5-6)", zone: "ciel1", zoneName: "Labo CIEL 1", role: "Flash" },
    { ch: 2, label: "Relais 2 (pin 7-8)", zone: "ciel1", zoneName: "Labo CIEL 1", role: "Sirène" },
    { ch: 3, label: "Relais 3 (pin 9-10)", zone: "ciel2", zoneName: "Labo CIEL 2", role: "Flash" },
    { ch: 4, label: "Relais 4 (pin 11-12)", zone: "ciel2", zoneName: "Labo CIEL 2", role: "Sirène" },
    { ch: 7, label: "Relais 7 (pin 5-6)", zone: "physique", zoneName: "Labo Serveur / Physique", role: "Flash" },
    { ch: 6, label: "Relais 6 (pin 3-4)", zone: "physique", zoneName: "Labo Serveur / Physique", role: "Sirène" },
  ];

  const ZONES = {
    ciel1: "Labo CIEL 1",
    ciel2: "Labo CIEL 2",
    physique: "Labo Serveur / Physique",
  };

  // ── Helpers UI ──
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function setHint(msg, isError = false) {
    if (!hintBox) return;
    hintBox.textContent = msg || "";
    hintBox.style.color = isError ? "#c0392b" : "rgba(0,0,0,0.72)";
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(d) {
    const dt = new Date(d);
    return dt.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  // ── API helper ──
  async function api(path, options = {}) {
    const headers = options.headers || {};
    headers["Authorization"] = `Bearer ${token}`;
    if (options.json) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

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

  // ── Schedule render (inchangé) ──
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

  // ── Badges render (inchangé) ──
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
          await api(`/rfid/${encodeURIComponent(badges[idx].id || badges[idx].uid)}`, {
            method: "PATCH", json: true, body: JSON.stringify({ enabled: !badges[idx].enabled })
          });
          showToast("Badge mis à jour");
          await loadAll();
        } catch (e) { setHint(e.message, true); }
      });
    });
    badgeList.querySelectorAll("button[data-remove]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const idx = Number(btn.getAttribute("data-remove"));
        if (!confirm("Supprimer ce badge ?")) return;
        try {
          await api(`/rfid/${encodeURIComponent(badges[idx].id || badges[idx].uid)}`, { method: "DELETE" });
          showToast("Badge supprimé");
          await loadAll();
        } catch (e) { setHint(e.message, true); }
      });
    });
  }

  // ══════════════════════════════════════════════════════════
  //  NOUVEAU : Rendu des entrées DI
  // ══════════════════════════════════════════════════════════

  function renderDIStatus() {
    if (!diStatusContainer) return;
    diStatusContainer.innerHTML = "";

    if (!diInputs.length) {
      diStatusContainer.innerHTML = `<p class="muted">Aucune donnée DI disponible.</p>`;
      return;
    }

    // Grouper par zone
    const byZone = {};
    diInputs.forEach(di => {
      const zones = di.zone.split(",").map(z => z.trim());
      zones.forEach(z => {
        if (!byZone[z]) byZone[z] = [];
        byZone[z].push(di);
      });
    });

    // Vérifier si des portes sont ouvertes dans les zones armées (bloque l'armement)
    const openDoorsInArmedZones = diInputs.filter(di => {
      if (di.type !== "porte" || !di.value) return false;
      const diZones = di.zone.split(",").map(z => z.trim());
      return diZones.some(z => alarmConfig.armed_zones.includes(z));
    });

    if (openDoorsInArmedZones.length > 0 && !isArmed) {
      const warning = document.createElement("div");
      warning.className = "di-warning";
      warning.innerHTML = `⚠️ <strong>Armement impossible</strong> — porte(s)/fenêtre(s) ouverte(s) : ${openDoorsInArmedZones.map(d => escapeHtml(d.label)).join(", ")}`;
      diStatusContainer.appendChild(warning);
    }

    Object.entries(byZone).forEach(([zoneKey, inputs]) => {
      const zoneName = ZONES[zoneKey] || zoneKey;
      const group = document.createElement("div");
      group.className = "di-zone-group";

      const isZoneArmed = alarmConfig.armed_zones.includes(zoneKey);

      group.innerHTML = `
        <div class="di-zone-header">
          <span class="di-zone-name">${escapeHtml(zoneName)}</span>
          <span class="badge ${isZoneArmed ? 'on' : 'off'}">${isZoneArmed ? 'Armée' : 'Exclue'}</span>
        </div>
      `;

      // Dédupliquer (DI5 apparaît dans ciel1 et ciel2)
      const seen = new Set();
      inputs.forEach(di => {
        if (seen.has(di.ch)) return;
        seen.add(di.ch);

        // Textes adaptés selon le type
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

      diStatusContainer.appendChild(group);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  NOUVEAU : Historique événements DI
  // ══════════════════════════════════════════════════════════

  function renderDIEvents() {
    if (!diEventList) return;
    diEventList.innerHTML = "";

    if (!diEvents.length) {
      diEventList.innerHTML = `<p class="muted">Aucun événement enregistré.</p>`;
      return;
    }

    diEvents.slice(0, 50).forEach(ev => {
      const row = document.createElement("div");
      row.className = `di-event-row ${ev.triggered ? "di-event-alert" : ""}`;
      row.innerHTML = `
        <span class="di-event-time">${formatDate(ev.created_at)}</span>
        <span class="di-event-ch">DI${ev.channel}</span>
        <span class="di-event-label">${escapeHtml(ev.label)}</span>
        <span class="di-event-value ${ev.value ? "high" : "low"}">${ev.value ? "HIGH" : "LOW"}</span>
        ${ev.triggered ? '<span class="di-event-tag alert">ALARME</span>' : '<span class="di-event-tag info">Info</span>'}
      `;
      diEventList.appendChild(row);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  NOUVEAU : Config armement par zone
  // ══════════════════════════════════════════════════════════

  function renderArmConfig() {
    // Zones
    if (zoneCheckboxes) {
      zoneCheckboxes.innerHTML = "";
      Object.entries(ZONES).forEach(([key, name]) => {
        const checked = alarmConfig.armed_zones.includes(key) ? "checked" : "";
        const div = document.createElement("label");
        div.className = "arm-zone-label";
        div.innerHTML = `
          <input type="checkbox" class="zone-cb" data-zone="${key}" ${checked}>
          <span>${escapeHtml(name)}</span>
        `;
        zoneCheckboxes.appendChild(div);
      });
    }

    // Exclusions DO
    if (doExclusionList) {
      doExclusionList.innerHTML = "";
      RELAYS.forEach(r => {
        const excluded = alarmConfig.excluded_do.includes(r.ch);
        const div = document.createElement("label");
        div.className = "arm-do-label";
        div.innerHTML = `
          <input type="checkbox" class="do-excl-cb" data-ch="${r.ch}" ${excluded ? "checked" : ""}>
          <span>DO${r.ch} — ${escapeHtml(r.zoneName)} — ${escapeHtml(r.role)} ${excluded ? "(exclu)" : ""}</span>
        `;
        doExclusionList.appendChild(div);
      });
    }

    // Durée sirène
    if (sirenDurationInput) {
      sirenDurationInput.value = alarmConfig.siren_duration || 180;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  NOUVEAU : Bannière alarme déclenchée
  // ══════════════════════════════════════════════════════════

  function renderAlarmBanner() {
    if (!alarmBanner) return;

    if (alarmTriggered && alarmInfo) {
      alarmBanner.classList.remove("hidden");
      alarmBanner.classList.add("alarm-active");
      if (alarmBannerText) {
        alarmBannerText.textContent =
          `🚨 ALARME DÉCLENCHÉE — ${alarmInfo.diLabel || "DI?"} (${(alarmInfo.zones || []).map(z => ZONES[z] || z).join(", ")}) — ${formatDate(alarmInfo.time)}`;
      }
    } else {
      alarmBanner.classList.add("hidden");
      alarmBanner.classList.remove("alarm-active");
    }
  }

  // ── UI State global ──
  function updateUiState() {
    alarmToggle.checked = !!isArmed;
    alarmModeText.textContent = isArmed ? "Armée" : "Désarmée";
    chipState.textContent = isArmed
      ? (alarmTriggered ? "🚨 ALARME EN COURS" : "SURVEILLANCE ACTIVE")
      : "SURVEILLANCE OFF";

    if (alarmTriggered) {
      chipState.style.color = "#e74c3c";
      chipState.style.fontWeight = "bold";
    } else {
      chipState.style.color = "";
      chipState.style.fontWeight = "";
    }

    const slotText = scheduleSlots.length
      ? scheduleSlots.map(s => `${s.start}→${s.end}`).join(" | ")
      : "Aucune";
    kpiSchedule.textContent = slotText;
    kpiBadges.textContent = String(badges.length);
    systemSubtitle.textContent = `IP API : ${API_URL}`;

    renderAlarmBanner();
  }

  // ── Load all data ──
  async function loadAll() {
    setHint("");

    // Status alarme (nouvelle route avancée)
    try {
      const status = await api("/api/alarm/status", { method: "GET" });
      if (status) {
        isArmed = !!status.armed;
        alarmConfig.armed_zones = status.armed_zones || ["ciel1", "ciel2", "physique"];
        alarmConfig.excluded_do = status.excluded_do || [0];
        alarmConfig.siren_duration = status.siren_duration || 180;
        alarmTriggered = !!status.alarm_triggered;
        alarmInfo = status.alarm_info || null;
      }
    } catch (e) {
      // Fallback ancienne route
      try {
        const status = await api("/alarm/status", { method: "GET" });
        if (status) isArmed = !!status.armed;
      } catch {}
    }

    // Schedule
    try {
      const sched = await api("/schedule", { method: "GET" });
      scheduleSlots = (sched && sched.slots) ? sched.slots : [];
    } catch {}

    // Badges
    try {
      const r = await api("/rfid", { method: "GET" });
      badges = (r && r.badges) ? r.badges : [];
    } catch {}

    // DI status
    try {
      const di = await api("/api/di/status", { method: "GET" });
      if (di && di.inputs) {
        diInputs = di.inputs;
        if (di.alarm_triggered !== undefined) alarmTriggered = di.alarm_triggered;
        if (di.alarm_info) alarmInfo = di.alarm_info;
      }
    } catch {}

    renderSchedule();
    renderBadges();
    renderDIStatus();
    renderArmConfig();
    updateUiState();
  }

  // ── Polling DI côté front (refresh toutes les 2s) ──
  function startDIPolling() {
    if (diPollingInterval) return;
    diPollingInterval = setInterval(async () => {
      try {
        const di = await api("/api/di/status", { method: "GET" });
        if (di && di.inputs) {
          diInputs = di.inputs;
          if (di.alarm_triggered !== undefined) {
            const wasTriggered = alarmTriggered;
            alarmTriggered = di.alarm_triggered;
            alarmInfo = di.alarm_info || null;
            // Si changement d'état alarme → refresh complet
            if (wasTriggered !== alarmTriggered) {
              renderAlarmBanner();
              updateUiState();
            }
          }
          renderDIStatus();
        }
      } catch {}
    }, 2000);
  }

  function stopDIPolling() {
    if (diPollingInterval) {
      clearInterval(diPollingInterval);
      diPollingInterval = null;
    }
  }

  // ── Modal Test Relais (existant, inchangé) ──
  function modalExists() {
    return !!(relayModal && relayList && relayRunTest && relaySelectAll && relayUnselectAll && relayModalClose);
  }

  function openRelayModal() {
    if (!modalExists()) return false;
    relayList.innerHTML = "";
    RELAYS.forEach(r => {
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
      relayList.appendChild(row);
    });
    relayModal.classList.remove("hidden");
    return true;
  }

  function closeRelayModal() {
    if (!relayModal) return;
    relayModal.classList.add("hidden");
  }

  if (relayModal) {
    relayModal.addEventListener("click", (e) => {
      if (e.target === relayModal) closeRelayModal();
    });
  }
  if (relayModalClose) relayModalClose.addEventListener("click", closeRelayModal);

  if (relaySelectAll) {
    relaySelectAll.addEventListener("click", () => {
      relayList?.querySelectorAll(".relay-check").forEach(cb => cb.checked = true);
    });
  }
  if (relayUnselectAll) {
    relayUnselectAll.addEventListener("click", () => {
      relayList?.querySelectorAll(".relay-check").forEach(cb => cb.checked = false);
    });
  }

  if (relayRunTest) {
    relayRunTest.addEventListener("click", async () => {
      try {
        const selected = [...relayList.querySelectorAll(".relay-check")]
          .filter(cb => cb.checked)
          .map(cb => Number(cb.dataset.ch));
        if (!selected.length) { setHint("Tu dois cocher au moins un relais.", true); return; }
        relayRunTest.disabled = true;
        setHint("Test en cours (1s par relais)…");
        const j = await api("/api/pet/do/test-selected", {
          method: "POST", json: true,
          body: JSON.stringify({ channels: selected, ms: 1000, delay: 1200 })
        });
        if (!j || !j.ok) throw new Error(j?.error || "Erreur test");
        closeRelayModal();
        setHint("Test lancé");
      } catch (e) {
        setHint("Erreur test : " + (e.message || e), true);
      } finally {
        relayRunTest.disabled = false;
      }
    });
  }

  // ── Events ──

  btnLogout.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    stopDIPolling();
    window.location.href = "index.html#login";
  });

  btnRefresh.addEventListener("click", async () => {
    try { await loadAll(); showToast("Actualisé"); }
    catch (e) { setHint(e.message, true); }
  });

  alarmToggle.addEventListener("change", async () => {
    try {
      const desired = alarmToggle.checked;
      await api("/api/alarm/arm", {
        method: "POST", json: true,
        body: JSON.stringify({
          armed: desired,
          zones: alarmConfig.armed_zones,
          excluded_do: alarmConfig.excluded_do,
          siren_duration: alarmConfig.siren_duration,
        })
      });
      isArmed = desired;
      if (!desired) { alarmTriggered = false; alarmInfo = null; }
      updateUiState();
      showToast(desired ? "Alarme armée" : "Alarme désarmée");
    } catch (e) {
      alarmToggle.checked = !alarmToggle.checked;
      setHint(e.message, true);
    }
  });

  btnTestSiren.addEventListener("click", async () => {
    const opened = openRelayModal();
    if (opened) return;
    try {
      btnTestSiren.disabled = true;
      setHint("Modal absent -> test relais complet (fallback)…");
      const j = await api("/api/pet/do/test-all", {
        method: "POST", json: true,
        body: JSON.stringify({ ms: 1000, delay: 1200 })
      });
      if (!j || !j.ok) throw new Error(j?.error || "Erreur test relais");
      setHint("Test lancé (DO0 → DO7)");
    } catch (e) {
      setHint("Erreur test relais : " + (e.message || e), true);
    } finally {
      setTimeout(() => (btnTestSiren.disabled = false), 1000);
    }
  });

  btnAddSlot.addEventListener("click", () => {
    scheduleSlots.push({ start: "21:00", end: "07:00" });
    renderSchedule();
    updateUiState();
  });

  btnSaveSchedule.addEventListener("click", async () => {
    try {
      await api("/schedule", { method: "PUT", json: true, body: JSON.stringify({ slots: scheduleSlots }) });
      showToast("Horaires enregistrés");
      await loadAll();
    } catch (e) { setHint(e.message, true); }
  });

  btnAddBadge.addEventListener("click", async () => {
    const uid = (rfidUid.value || "").trim();
    const owner = (rfidOwner.value || "").trim();
    if (!uid) { setHint("Tu dois mettre un UID RFID.", true); return; }
    try {
      await api("/rfid", { method: "POST", json: true, body: JSON.stringify({ uid, owner, enabled: true }) });
      rfidUid.value = "";
      rfidOwner.value = "";
      showToast("Badge ajouté");
      await loadAll();
    } catch (e) { setHint(e.message, true); }
  });

  // ── NOUVEAU : Boutons DI ──

  if (btnRefreshDI) {
    btnRefreshDI.addEventListener("click", async () => {
      try {
        btnRefreshDI.disabled = true;
        const di = await api("/api/di/read", { method: "GET" });
        if (di && di.inputs) {
          diInputs = di.inputs;
          renderDIStatus();
          showToast("DI actualisées");
        }
      } catch (e) {
        setHint("Erreur lecture DI : " + (e.message || e), true);
      } finally {
        btnRefreshDI.disabled = false;
      }
    });
  }

  if (btnLoadEvents) {
    btnLoadEvents.addEventListener("click", async () => {
      try {
        btnLoadEvents.disabled = true;
        const ev = await api("/api/di/events?limit=50", { method: "GET" });
        if (ev && ev.events) {
          diEvents = ev.events;
          renderDIEvents();
          showToast(`${ev.count} événement(s) chargé(s)`);
        }
      } catch (e) {
        setHint("Erreur chargement historique : " + (e.message || e), true);
      } finally {
        btnLoadEvents.disabled = false;
      }
    });
  }

  // ── NOUVEAU : Sauvegarde config armement ──

  if (btnSaveArmConfig) {
    btnSaveArmConfig.addEventListener("click", async () => {
      try {
        // Lire les zones cochées
        const zones = [...(zoneCheckboxes?.querySelectorAll(".zone-cb:checked") || [])].map(cb => cb.dataset.zone);
        // Lire les DO exclus
        const excludedDO = [...(doExclusionList?.querySelectorAll(".do-excl-cb:checked") || [])].map(cb => Number(cb.dataset.ch));
        // Durée sirène
        const duration = Number(sirenDurationInput?.value) || 180;

        await api("/api/alarm/arm", {
          method: "POST", json: true,
          body: JSON.stringify({
            armed: isArmed,
            zones,
            excluded_do: excludedDO,
            siren_duration: Math.min(600, Math.max(1, duration)),
          })
        });

        alarmConfig.armed_zones = zones;
        alarmConfig.excluded_do = excludedDO;
        alarmConfig.siren_duration = duration;

        renderArmConfig();
        renderDIStatus();
        updateUiState();
        showToast("Configuration sauvegardée");
      } catch (e) {
        setHint("Erreur sauvegarde config : " + (e.message || e), true);
      }
    });
  }

  // ── NOUVEAU : Bouton désarmement d'urgence ──

  if (btnDisarm) {
    btnDisarm.addEventListener("click", async () => {
      try {
        await api("/api/alarm/disarm", { method: "POST", json: true, body: JSON.stringify({}) });
        isArmed = false;
        alarmTriggered = false;
        alarmInfo = null;
        alarmToggle.checked = false;
        updateUiState();
        renderDIStatus();
        showToast("Alarme désarmée — DO coupés");
      } catch (e) {
        setHint("Erreur désarmement : " + (e.message || e), true);
      }
    });
  }

  // ── Caméra (inchangé) ──
  let hls = null;
  let camIsPlaying = false;
  let currentCamUrl = "/cam/sub/live.m3u8";

  function camSetStatus(msg) { camStatus.textContent = msg; }

  function startCam() {
    camSetStatus("Connexion caméra…");
    if (window.Hls && Hls.isSupported()) {
      if (hls) { hls.destroy(); hls = null; }
      hls = new Hls({
        lowLatencyMode: true, liveSyncDuration: 1, liveMaxLatencyDuration: 2,
        maxBufferLength: 1, maxMaxBufferLength: 2, backBufferLength: 0, enableWorker: true
      });
      hls.loadSource(currentCamUrl);
      hls.attachMedia(camVideo);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        camVideo.play().catch(() => {});
        camSetStatus("Caméra en live");
        camIsPlaying = true;
        camVideo.addEventListener("timeupdate", () => {
          if (hls && hls.liveSyncPosition) {
            const delta = camVideo.currentTime - hls.liveSyncPosition;
            if (delta > 2) camVideo.currentTime = hls.liveSyncPosition;
          }
        });
      });
      hls.on(Hls.Events.ERROR, () => { camSetStatus("Erreur flux caméra"); });
    } else {
      camVideo.src = currentCamUrl;
      camVideo.play().catch(() => {});
      camIsPlaying = true;
      camSetStatus("Caméra en live");
    }
  }

  function stopCam() {
    if (hls) { hls.destroy(); hls = null; }
    camVideo.pause();
    camVideo.removeAttribute("src");
    camVideo.load();
    camIsPlaying = false;
    camSetStatus("Caméra coupée");
  }

  btnCamStart.addEventListener("click", startCam);
  btnCamStop.addEventListener("click", stopCam);
  btnCamSub.addEventListener("click", () => {
    currentCamUrl = "/cam/sub/live.m3u8";
    camSetStatus("Sous-flux sélectionné");
    if (camIsPlaying) { stopCam(); startCam(); }
  });
  btnCamMain.addEventListener("click", () => {
    currentCamUrl = "/cam/main/live.m3u8";
    camSetStatus("Flux principal sélectionné");
    if (camIsPlaying) { stopCam(); startCam(); }
  });

  // ── Init ──
  loadAll().catch(e => setHint(e.message, true));
  startDIPolling();
});