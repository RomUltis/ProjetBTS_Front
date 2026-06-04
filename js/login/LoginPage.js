// Page de connexion : login + inscription désactivée (le lien "Créer un compte"
// redirige vers un rickroll si l'utilisateur force #register dans l'URL).
// Extrait de script.js (lignes 1-83).

export class LoginPage {
  constructor() {
    // API sur le même serveur (adjudicator.js sert le front + l'API)
    this.apiUrl = "";
    this.loginCard = document.querySelector(".login-card");
    this.registerCard = document.querySelector(".register-card");
    this.showRegister = document.getElementById("showRegister");
    this.showLogin = document.getElementById("showLogin");
    this.RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1";
  }

  // Affiche le bon formulaire selon l'URL
  updateView() {
    if (window.location.hash === "#register") {
      window.location.href = this.RICKROLL_URL;
      return;
    }
    this.registerCard.style.display = "none";
    this.loginCard.style.display = "block";
  }

  init() {
    // Clic sur "Créer un compte"
    this.showRegister.addEventListener("click", (event) => {
      event.preventDefault();
      this.registerCard.style.display = "none";
      this.loginCard.style.display = "block";
      document.getElementById("error-message").textContent = "Inscription désactivé";
    });

    // Clic sur "Se connecter"
    this.showLogin.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.hash = "#login";
      this.updateView();
    });

    // Mise à jour de la vue au changement d'URL
    window.addEventListener("hashchange", () => this.updateView());

    // Affiche la bonne page au chargement
    this.updateView();

    // Inscription désactivée
    document.getElementById("registerForm").addEventListener("submit", (event) => {
      event.preventDefault();
      document.getElementById("register-error-message").textContent = "Inscription désactivé";
    });

    // Connexion
    document.getElementById("loginForm").addEventListener("submit", (event) => {
      event.preventDefault();

      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      fetch(`${this.apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role);
            localStorage.setItem("userId", data.userId);
            window.location.href = "dashboard.html";
          } else {
            document.getElementById("error-message").textContent = data.message;
          }
        })
        .catch((error) => {
          console.error("Erreur lors de la connexion :", error);
          document.getElementById("error-message").textContent = "Une erreur est survenue.";
        });
    });
  }
}
