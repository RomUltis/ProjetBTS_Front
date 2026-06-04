// Point d'entrée du dashboard (module ES).
import { Dashboard } from "./Dashboard.js";

document.addEventListener("DOMContentLoaded", () => {
  new Dashboard().init();
});
