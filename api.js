const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());

const corsOptions = {
    origin: [
        "http://172.29.16.152",
        "http://172.29.16.152:3000", 
        "http://172.29.16.152:3001", 
        "http://172.29.16.152:3002"
    ],
    methods: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    allowedHeaders: "Origin, X-Requested-With, Content-Type, Accept, Authorization"
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

const BACKEND_URL = "http://172.29.16.152:3001";

// Proxy pour l'inscription
app.post('/register', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/register`, req.body, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Erreur Proxy (register) :", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Erreur API Proxy (register)" });
    }
});

// Proxy pour la connexion
app.post('/login', async (req, res) => {
    try {
        const response = await axios.post(`${BACKEND_URL}/login`, req.body, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Erreur Proxy (login) :", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Erreur API Proxy (login)" });
    }
});

// Page de test pour vérifier si le proxy fonctionne
app.get('/', (req, res) => {
    res.send('Le proxy API fonctionne correctement.');
});

// Lancer le serveur Proxy
app.listen(3002, () => {
    console.log("🚀 Proxy API en cours d'exécution sur le port 3002");
});
