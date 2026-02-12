document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://172.29.16.152:3002";

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

  // ---- State ----
  let scheduleSlots = [];
  let badges = [];
  let isArmed = false;

  // Mapping relais
  const RELAYS = [
    { ch: 0, label: "Relais 0 (pin 3-4)", zone: "Labo CIEL 1", role: "Gâche" },
    { ch: 1, label: "Relais 1 (pin 5-6)", zone: "Labo CIEL 1", role: "Flash" },
    { ch: 2, label: "Relais 2 (pin 7-8)", zone: "Labo CIEL 1", role: "Sirène" },

    { ch: 3, label: "Relais 3 (pin 9-10)", zone: "Labo CIEL 2", role: "Flash" },
    { ch: 4, label: "Relais 4 (pin 11-12)", zone: "Labo CIEL 2", role: "Sirène" },

    { ch: 5, label: "Relais 5 (pin 1-2)", zone: "Labo Serveur / Physique", role: "Flash" },
    { ch: 6, label: "Relais 6 (pin 3-4)", zone: "Labo Serveur / Physique", role: "Sirène" },
    // { ch: 7, label: "Relais 7 (...)", zone: "...", role: "..." },
  ];

  // Helpers UI
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

  // API helper
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

  // Schedule render
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

  // Badges render
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

  // UI State
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

  async function loadAll() {
    setHint("");

    const status = await api("/alarm/status", { method: "GET" });
    if (status) isArmed = !!status.armed;

    const sched = await api("/schedule", { method: "GET" });
    scheduleSlots = (sched && sched.slots) ? sched.slots : [];

    const r = await api("/rfid", { method: "GET" });
    badges = (r && r.badges) ? r.badges : [];

    renderSchedule();
    renderBadges();
    updateUiState();
  }

  // Modal Test Relais
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
              <span style="opacity:.75">${r.zone}</span>
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

  // Bind modal buttons once
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

        if (!selected.length) {
          setHint("Tu dois cocher au moins un relais.", true);
          return;
        }

        relayRunTest.disabled = true;
        setHint("Test en cours (1s par relais)…");

        const j = await api("/api/pet/do/test-selected", {
          method: "POST",
          json: true,
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

  // ---- Events ----
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

      await api("/alarm/toggle", {
        method: "POST",
        json: true,
        body: JSON.stringify({ armed: desired })
      });

      isArmed = desired;
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
        method: "POST",
        json: true,
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

  // Caméra
  let hls = null;
  let camIsPlaying = false;
  let currentCamUrl = "/cam/sub/live.m3u8";

  function camSetStatus(msg) {
    camStatus.textContent = msg;
  }

  function startCam() {
    camSetStatus("Connexion caméra…");

    if (window.Hls && Hls.isSupported()) {
      if (hls) {
        hls.destroy();
        hls = null;
      }

      hls = new Hls({
        lowLatencyMode: true,
        liveSyncDurationCount: 2,
        maxLiveSyncPlaybackRate: 1.5,
        maxBufferLength: 2,
        backBufferLength: 0
      });

      hls.loadSource(currentCamUrl);
      hls.attachMedia(camVideo);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        camVideo.play().catch(() => {});
        camSetStatus("Caméra en live");
        camIsPlaying = true;
      });

      hls.on(Hls.Events.ERROR, () => {
        camSetStatus("Erreur flux caméra");
      });

    } else {
      camVideo.src = currentCamUrl;
      camVideo.play().catch(() => {});
      camIsPlaying = true;
      camSetStatus("Caméra en live");
    }
  }

  function stopCam() {
    if (hls) {
      hls.destroy();
      hls = null;
    }
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

  loadAll().catch(e => setHint(e.message, true));
});
