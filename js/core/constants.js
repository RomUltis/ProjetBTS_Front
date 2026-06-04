// Constantes partagées du dashboard (mapping relais + libellés de zones).
// Extrait de dashboard.js (lignes 109-123).

export const RELAYS = [
  { ch: 0, label: "Relais 0 (pin 3-4)", zone: "ciel1", zoneName: "Labo CIEL 1", role: "Gâche" },
  { ch: 1, label: "Relais 1 (pin 5-6)", zone: "ciel1", zoneName: "Labo CIEL 1", role: "Flash" },
  { ch: 2, label: "Relais 2 (pin 7-8)", zone: "ciel1", zoneName: "Labo CIEL 1", role: "Sirène" },
  { ch: 3, label: "Relais 3 (pin 9-10)", zone: "ciel2", zoneName: "Labo CIEL 2", role: "Flash" },
  { ch: 4, label: "Relais 4 (pin 11-12)", zone: "ciel2", zoneName: "Labo CIEL 2", role: "Sirène" },
  { ch: 7, label: "Relais 7 (pin 5-6)", zone: "physique", zoneName: "Labo Serveur / Physique", role: "Flash" },
  { ch: 6, label: "Relais 6 (pin 3-4)", zone: "physique", zoneName: "Labo Serveur / Physique", role: "Sirène" },
];

export const ZONES = {
  ciel1: "Labo CIEL 1",
  ciel2: "Labo CIEL 2",
  physique: "Labo Serveur / Physique",
};
