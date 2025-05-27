// authRoutes.js
const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { body, validationResult } = require('express-validator');

// Clave secreta para JWT (mejor si viene de variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta";

// Resto de tu código existente (middleware auth, rutas register, login, user)...

// Ruta para actualizar perfil de usuario
router.put('/update', [
    // Task 1: Utilizar body, validationResult de express-validator para la validación de entradas
    body('firstName', 'El nombre es obligatorio').not().isEmpty(),
    body('lastName', 'El apellido es obligatorio').not().isEmpty(),
    body('email', 'Por favor, incluya un email válido').isEmail(),
], async (req, res) => {
    // Task 2: Validar la entrada usando validationResult
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.error(`Validation errors: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Task 3: Verificar si email está presente
        const userEmail = req.body.email;
        if (!userEmail) {
            logger.error('Email not present in request');
            return res.status(400).json({ error: 'El email es obligatorio para actualizar el perfil' });
        }

        // Task 4: Conectarse a MongoDB
        const db = await connectToDatabase();
        const collection = db.collection("users");
        
        // Task 5: Encontrar las credenciales del usuario
        const existingUser = await collection.findOne({ email: userEmail });
        if (!existingUser) {
            logger.error(`User not found with email: ${userEmail}`);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Preparar datos para actualización
        const updateData = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            updatedAt: new Date()
        };

        // Task 6: Actualizar el usuario en la base de datos
        const result = await collection.updateOne(
            { email: userEmail },
            { $set: updateData }
        );

        if (result.modifiedCount === 0) {
            logger.error(`Failed to update user: ${userEmail}`);
            return res.status(400).json({ error: 'Error al actualizar el usuario' });
        }

        // Task 7: Crear JWT con user._id como payload
        // NOTA: Asegúrate de que JWT_SECRET esté definido correctamente arriba
        const payload = {
            user: {
                id: existingUser._id.toString(),
            },
        };
        
        const authtoken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        logger.info(`User updated successfully: ${userEmail}`);
        res.json({ 
            authtoken,
            message: 'Usuario actualizado correctamente' 
        });
    } catch (e) {
        logger.error(`Error updating user: ${e.message}`);
        return res.status(500).send('Internal server error');
    }
});

module.exports = router;