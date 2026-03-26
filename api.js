const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());

const corsOptions = {
  origin: [
    "http://172.29.19.193",
    "http://172.29.19.193:3000",
    "http://172.29.19.193:3001",
    "http://172.29.19.193:3002",
  ],
  methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const BACKEND_URL = process.env.BACKEND_URL || "http://172.29.19.193:3001";
const PORT = Number(process.env.PORT || 3002);

// Proxy pour l'inscription
app.post("/register", async (req, res) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/register`, req.body, {
      headers: { "Content-Type": "application/json" },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Erreur Proxy (register) :", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Erreur API Proxy (register)",
    });
  }
});

// Proxy pour la connexion
app.post("/login", async (req, res) => {
  try {
    const response = await axios.post(`${BACKEND_URL}/login`, req.body, {
      headers: { "Content-Type": "application/json" },
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Erreur Proxy (login) :", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Erreur API Proxy (login)",
    });
  }
});

// Proxy générique /api/* → backend
// Couvre toutes les nouvelles routes DI :
//   GET  /api/di/status
//   GET  /api/di/read
//   GET  /api/di/events
//   GET  /api/di/mapping
//   GET  /api/alarm/status
//   POST /api/alarm/arm
//   POST /api/alarm/disarm
//   POST /api/pet/do/pulse
//   POST /api/pet/do/test-all
//   POST /api/pet/do/test-selected
app.use("/api", async (req, res) => {
  try {
    const url = `${BACKEND_URL}${req.originalUrl}`;

    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.authorization || "",
      },
      validateStatus: () => true,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Erreur Proxy (/api) :", error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      ok: false,
      error: "Erreur API Proxy (/api)",
    });
  }
});

// Proxy routes legacy (alarm, schedule, rfid) — sans préfixe /api
app.use("/alarm", async (req, res) => {
  try {
    const url = `${BACKEND_URL}${req.originalUrl}`;
    const response = await axios({
      method: req.method, url, data: req.body,
      headers: { "Content-Type": "application/json", Authorization: req.headers.authorization || "" },
      validateStatus: () => true,
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ ok: false, error: "Erreur Proxy (/alarm)" });
  }
});

app.use("/schedule", async (req, res) => {
  try {
    const url = `${BACKEND_URL}${req.originalUrl}`;
    const response = await axios({
      method: req.method, url, data: req.body,
      headers: { "Content-Type": "application/json", Authorization: req.headers.authorization || "" },
      validateStatus: () => true,
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ ok: false, error: "Erreur Proxy (/schedule)" });
  }
});

app.use("/rfid", async (req, res) => {
  try {
    const url = `${BACKEND_URL}${req.originalUrl}`;
    const response = await axios({
      method: req.method, url, data: req.body,
      headers: { "Content-Type": "application/json", Authorization: req.headers.authorization || "" },
      validateStatus: () => true,
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ ok: false, error: "Erreur Proxy (/rfid)" });
  }
});

app.get("/", (req, res) => {
  res.send("Le proxy API fonctionne correctement.");
});

app.listen(PORT, () => {
  console.log(`Proxy API en cours d'exécution sur le port ${PORT}`);
  console.log(`Backend : ${BACKEND_URL}`);
});