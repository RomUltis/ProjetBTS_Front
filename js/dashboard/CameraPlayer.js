// Lecteur HLS d'une caméra (wrapper Hls.js). Injecte le token JWT dans chaque
// requête HLS (RGPD), gère le 403 (alarme désarmée) via video._rgpdHandler,
// et retente après 3s sur erreur fatale non-403.
// Extrait de dashboard.js (lignes 1024-1084). Hls.js est chargé en global (window.Hls).

export class CameraPlayer {
  constructor(video) {
    this.video = video;
    this.hls = null;
  }

  load(url) {
    this.hls = this._build(this.video, url);
  }

  _build(video, url) {
    // RGPD : ajouter le token JWT à toutes les requêtes HLS.
    const token = localStorage.getItem("token") || "";

    if (window.Hls && Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 2,
        maxBufferLength: 1,
        maxMaxBufferLength: 2,
        backBufferLength: 0,
        enableWorker: true,
        // Injecter Authorization Bearer dans chaque requête HLS (.m3u8, .ts, .m4s)
        xhrSetup: (xhr) => {
          if (token) xhr.setRequestHeader("Authorization", "Bearer " + token);
        },
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;

        // RGPD : refus serveur (403 = alarme désarmée)
        const status = data.response && data.response.code;
        if (status === 403) {
          if (video._rgpdHandler) video._rgpdHandler();
          return; // ne PAS retry, c'est volontaire
        }

        // Sinon retry après 3s
        setTimeout(() => {
          try { hls.loadSource(url); } catch {}
        }, 3000);
      });
      return hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari natif : impossible de set un header → token en query
      const sep = url.includes("?") ? "&" : "?";
      video.src = url + (token ? sep + "token=" + encodeURIComponent(token) : "");
      video.play().catch(() => {});
      return null;
    }
    return null;
  }

  destroy() {
    if (this.hls) { try { this.hls.destroy(); } catch {} this.hls = null; }
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
      this.video.load();
    }
  }
}
