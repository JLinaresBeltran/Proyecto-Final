const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');

// Search for gifts
router.get('/', async (req, res, next) => {
    try {
        // ✅ Tarea 1: Conectar a MongoDB
        const db = await connectToDatabase();

        const collection = db.collection("gifts");

        // Inicializa el objeto de consulta
        let query = {};

        // ✅ Tarea 2: Agregar el filtro de nombre
        if (req.query.name && req.query.name.trim() !== '') {
            query.name = { $regex: req.query.name, $options: "i" }; // búsqueda parcial, sin distinción entre mayúsculas y minúsculas
        }

        // ✅ Tarea 3: Agregar otros filtros
        if (req.query.category) {
            query.category = req.query.category;
        }
        if (req.query.condition) {
            query.condition = req.query.condition;
        }
        if (req.query.age_years) {
            query.age_years = { $lte: parseInt(req.query.age_years) };
        }

        // ✅ Tarea 4: Obtener los elementos filtrados
        const gifts = await collection.find(query).toArray();

        res.json(gifts);
    } catch (e) {
        next(e);
    }
});

module.exports = router;
