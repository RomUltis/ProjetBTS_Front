document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "http://172.29.16.152:3002";

    const loginCard = document.querySelector(".login-card");
    const registerCard = document.querySelector(".register-card");
    const showRegister = document.getElementById("showRegister");
    const showLogin = document.getElementById("showLogin");

    // Fonction pour afficher le bon formulaire selon l'URL
    function updateView() {
        if (window.location.hash === "#register") {
            loginCard.style.display = "none";
            registerCard.style.display = "block";
        } else {
            registerCard.style.display = "none";
            loginCard.style.display = "block";
        }
    }

    // Détecte le clic sur "Créer un compte"
    showRegister.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.hash = "#register";
        updateView();
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

    // Gestion de l'inscription
    document.getElementById("registerForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("newUsername").value;
        const password = document.getElementById("newPassword").value;

        fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Compte créé avec succès !");
                window.location.hash = "#login";
                updateView();
            } else {
                document.getElementById("register-error-message").textContent = data.message;
            }
        })
        .catch(error => {
            console.error("Erreur lors de l'inscription :", error);
            document.getElementById("register-error-message").textContent = "Une erreur est survenue.";
        });
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
            // Correction : On utilise maintenant "role" au lieu de "userRole"
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
