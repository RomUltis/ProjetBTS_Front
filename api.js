const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());

const corsOptions = {
  origin: [
    "http://172.29.16.152",
    "http://172.29.16.152:3000",
    "http://172.29.16.152:3001",
    "http://172.29.16.152:3002",
  ],
  methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization",
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const BACKEND_URL = process.env.BACKEND_URL || "http://172.29.16.152:3001";
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

app.get("/", (req, res) => {
  res.send("Le proxy API fonctionne correctement.");
});

app.listen(PORT, () => {
  console.log(`Proxy API en cours d'exécution sur le port ${PORT}`);
  console.log(`Backend : ${BACKEND_URL}`);
});
