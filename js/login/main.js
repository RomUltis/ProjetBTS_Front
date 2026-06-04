// Point d'entrée de la page de connexion (module ES).
import { LoginPage } from "./LoginPage.js";

document.addEventListener("DOMContentLoaded", () => {
  new LoginPage().init();
});
