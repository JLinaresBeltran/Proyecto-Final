// authRoutes.js
const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { body, validationResult } = require('express-validator');
const { ObjectId } = require('mongodb');

// Clave secreta para JWT (mejor si viene de variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta";

// Middleware de autenticación
const auth = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) {
        logger.error('No token provided');
        return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token.' });
    }

    try {
        // Remover "Bearer " si está presente
        const cleanToken = token.replace('Bearer ', '');
        const decoded = jwt.verify(cleanToken, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (error) {
        logger.error('Invalid token');
        return res.status(401).json({ error: 'Token inválido.' });
    }
};

// Ruta de registro
router.post('/register', [
    body('firstName', 'El nombre es obligatorio').not().isEmpty(),
    body('lastName', 'El apellido es obligatorio').not().isEmpty(),
    body('email', 'Por favor, incluya un email válido').isEmail(),
    body('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.error(`Validation errors: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    try {
        const db = await connectToDatabase();
        const collection = db.collection("users");

        // Verificar si el usuario ya existe
        const existingUser = await collection.findOne({ email });
        if (existingUser) {
            logger.error(`User already exists: ${email}`);
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Encriptar contraseña
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(password, salt);

        // Crear nuevo usuario
        const newUser = {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            createdAt: new Date()
        };

        const result = await collection.insertOne(newUser);

        // Crear JWT
        const payload = {
            user: {
                id: result.insertedId.toString()
            }
        };

        const authtoken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        logger.info(`User registered successfully: ${email}`);
        res.status(201).json({ 
            authtoken,
            message: 'Usuario registrado correctamente',
            user: {
                id: result.insertedId,
                firstName,
                lastName,
                email
            }
        });

    } catch (error) {
        logger.error(`Error registering user: ${error.message}`);
        return res.status(500).send('Error interno del servidor');
    }
});

// Ruta de login
router.post('/login', [
    body('email', 'Por favor, incluya un email válido').isEmail(),
    body('password', 'La contraseña es obligatoria').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.error(`Validation errors: ${JSON.stringify(errors.array())}`);
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const db = await connectToDatabase();
        const collection = db.collection("users");

        // Buscar usuario
        const user = await collection.findOne({ email });
        if (!user) {
            logger.error(`Login attempt with non-existent email: ${email}`);
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            logger.error(`Invalid password for user: ${email}`);
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        // Crear JWT
        const payload = {
            user: {
                id: user._id.toString()
            }
        };

        const authtoken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        logger.info(`User logged in successfully: ${email}`);
        res.json({ 
            authtoken,
            message: 'Login exitoso',
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
            }
        });

    } catch (error) {
        logger.error(`Error during login: ${error.message}`);
        return res.status(500).send('Error interno del servidor');
    }
});

// Ruta para obtener información del usuario autenticado
router.get('/user', auth, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("users");

        const user = await collection.findOne(
            { _id: new ObjectId(req.user.id) },
            { projection: { password: 0 } }
        );

        if (!user) {
            logger.error(`User not found: ${req.user.id}`);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(user);

    } catch (error) {
        logger.error(`Error getting user info: ${error.message}`);
        return res.status(500).send('Error interno del servidor');
    }
});

// Ruta para actualizar perfil de usuario
router.put('/update', auth, async (req, res) => {
    try {
        // Debug: Log del request completo
        logger.info(`Update request body: ${JSON.stringify(req.body)}`);
        logger.info(`Update request headers email: ${req.headers.email}`);
        logger.info(`User ID from token: ${req.user.id}`);
        
        // Manejar tanto el formato del frontend (name) como el formato separado (firstName, lastName)
        let firstName, lastName;
        
        if (req.body.name) {
            // Si viene 'name', dividirlo en firstName y lastName
            const nameParts = req.body.name.trim().split(' ');
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
        } else {
            // Si vienen por separado
            firstName = req.body.firstName;
            lastName = req.body.lastName;
        }
        
        if (!firstName || firstName.trim() === '') {
            logger.error('firstName is missing or empty');
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }
        
        if (!lastName || lastName.trim() === '') {
            logger.error('lastName is missing or empty');
            return res.status(400).json({ error: 'El apellido es obligatorio' });
        }

        // Conectarse a MongoDB
        const db = await connectToDatabase();
        const collection = db.collection("users");
        
        // Obtener el usuario por ID desde el token JWT
        logger.info(`Looking for user with ID: ${req.user.id}`);
        const userObjectId = new ObjectId(req.user.id);
        const existingUser = await collection.findOne({ _id: userObjectId });
        
        if (!existingUser) {
            logger.error(`User not found with ID: ${req.user.id}`);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        logger.info(`Found user: ${existingUser.email}`);

        // Preparar datos para actualización
        const updateData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            updatedAt: new Date()
        };

        logger.info(`Updating user with data: ${JSON.stringify(updateData)}`);

        // Actualizar el usuario en la base de datos
        const result = await collection.updateOne(
            { _id: userObjectId },
            { $set: updateData }
        );

        if (result.modifiedCount === 0) {
            logger.error(`Failed to update user: ${existingUser.email}`);
            return res.status(400).json({ error: 'Error al actualizar el usuario' });
        }

        // Crear JWT actualizado
        const payload = {
            user: {
                id: existingUser._id.toString(),
            },
        };
        
        const authtoken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        logger.info(`User updated successfully: ${existingUser.email}`);
        res.json({ 
            authtoken,
            message: 'Usuario actualizado correctamente',
            user: {
                id: existingUser._id,
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                email: existingUser.email
            }
        });
    } catch (error) {
        logger.error(`Error updating user: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;