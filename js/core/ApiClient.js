// Client API : ajoute le token Bearer, gère le 401 (redirection login),
// parse le JSON et lève une Error lisible sur réponse non-OK.
// Extrait de dashboard.js (lignes 154-176).

export class ApiClient {
  constructor(token, apiUrl = "") {
    this.token = token;
    this.apiUrl = apiUrl;
  }

  async request(path, options = {}) {
    const headers = options.headers || {};
    headers["Authorization"] = `Bearer ${this.token}`;
    if (options.json) headers["Content-Type"] = "application/json";

    const res = await fetch(`${this.apiUrl}${path}`, { ...options, headers });

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
}
