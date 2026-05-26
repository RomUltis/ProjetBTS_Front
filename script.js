document.addEventListener("DOMContentLoaded", function () {
    // API sur le même serveur (adjudicator.js sert le front + l'API)
    const API_URL = "";

    const loginCard = document.querySelector(".login-card");
    const registerCard = document.querySelector(".register-card");
    const showRegister = document.getElementById("showRegister");
    const showLogin = document.getElementById("showLogin");

    const RICKROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ&start_radio=1";

    // Fonction pour afficher le bon formulaire selon l'URL
    function updateView() {
        if (window.location.hash === "#register") {
            window.location.href = RICKROLL_URL;
            return;
        }

        registerCard.style.display = "none";
        loginCard.style.display = "block";
    }

    // Détecte le clic sur "Créer un compte"
    showRegister.addEventListener("click", function (event) {
        event.preventDefault();

        registerCard.style.display = "none";
        loginCard.style.display = "block";

        const errorMessage = document.getElementById("error-message");
        errorMessage.textContent = "Inscription désactivé";
    });

    // Détecte le clic sur "Se connecter"
    showLogin.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.hash = "#login";
        updateView();
    });

    // Met à jour la vue quand l'utilisateur change l'URL
    window.addEventListener("hashchange", updateView);

    // Affiche la bonne page au chargement
    updateView();

    // Gestion de l'inscription désactivée
    document.getElementById("registerForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const registerErrorMessage = document.getElementById("register-error-message");
        registerErrorMessage.textContent = "Inscription désactivé";
    });

    // Gestion de la connexion
    document.getElementById("loginForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", data.role);
                localStorage.setItem("userId", data.userId);
                window.location.href = "dashboard.html";
            } else {
                document.getElementById("error-message").textContent = data.message;
            }
        })
        .catch(error => {
            console.error("Erreur lors de la connexion :", error);
            document.getElementById("error-message").textContent = "Une erreur est survenue.";
        });
    });
});