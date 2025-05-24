// authRoutes.js
const express = require('express');
const router = express.Router();
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Clave secreta para JWT (mejor si viene de variables de entorno)
const JWT_SECRET = process.env.JWT_SECRET || "tu_clave_secreta";

// Middleware de autenticación para rutas protegidas
const auth = (req, res, next) => {
    // Obtener el token del header
    const token = req.header('x-auth-token');

    // Verificar si no hay token
    if (!token) {
        logger.error('No token provided, authentication denied');
        return res.status(401).json({ error: 'No hay token, autorización denegada' });
    }

    try {
        // Verificar token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Añadir el usuario del payload al objeto request
        req.user = decoded.user;
        
        // Continuar con la siguiente función middleware
        next();
    } catch (error) {
        logger.error(`Invalid token: ${error.message}`);
        res.status(401).json({ error: 'Token no válido' });
    }
};

// Ruta de registro de usuarios
router.post('/register', async (req, res) => {
    try {
        // Task 1: Connect to `secondChance` in MongoDB through `connectToDatabase` in `db.js`.
        const db = await connectToDatabase();
        
        // Task 2: Access MongoDB `users` collection
        const collection = db.collection("users");
        
        // Task 3: Check if user credentials already exists in the database and throw an error if they do
        const existingEmail = await collection.findOne({ email: req.body.email });
        if (existingEmail) {
            logger.error('Email id already exists');
            return res.status(400).json({ error: 'Email id already exists' });
        }
        
        // Task 4: Create a hash to encrypt the password so that it is not readable in the database
        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(req.body.password, salt);
        
        // Task 5: Insert the user into the database
        const newUser = await collection.insertOne({
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: hash,
            createdAt: new Date(),
        });
        
        // Task 6: Create JWT authentication if passwords match with user._id as payload
        const payload = {
            user: {
                id: newUser.insertedId,
            },
        };
        const authtoken = jwt.sign(payload, JWT_SECRET);
        
        // Task 7: Log the successful registration using the logger
        logger.info('User registered successfully');
        
        // Task 8: Return the user email and the token as a JSON
        res.json({ authtoken, email: req.body.email });
    } catch (e) {
        logger.error(`Error registering user: ${e.message}`);
        return res.status(500).send('Internal server error');
    }
});

// Ruta de login de usuarios
router.post('/login', async (req, res) => {
    try {
        // Obtener email y password del cuerpo de la solicitud
        const { email, password } = req.body;

        // Validar que se proporcionaron email y password
        if (!email || !password) {
            logger.error('Email or password missing');
            return res.status(400).json({ error: 'Por favor ingrese todos los campos requeridos' });
        }

        // Conectar a la base de datos
        const db = await connectToDatabase();
        const collection = db.collection("users");

        // Buscar al usuario por email
        const user = await collection.findOne({ email });

        // Verificar si el usuario existe
        if (!user) {
            logger.error(`Login attempt with non-existent email: ${email}`);
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        // Verificar si la contraseña coincide
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
            logger.error(`Login attempt with incorrect password for: ${email}`);
            return res.status(400).json({ error: 'Credenciales inválidas' });
        }

        // Crear payload para el token JWT
        const payload = {
            user: {
                id: user._id,
            },
        };

        // Generar el token JWT
        const authtoken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        // Registrar login exitoso
        logger.info(`User logged in successfully: ${email}`);

        // Enviar respuesta con token
        res.json({
            authtoken,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        });

    } catch (error) {
        logger.error(`Error in login: ${error.message}`);
        return res.status(500).json({ error: 'Error del servidor' });
    }
});

// Ruta protegida para obtener información del usuario actual
router.get('/user', auth, async (req, res) => {
    try {
        // Conectar a la base de datos
        const db = await connectToDatabase();
        const collection = db.collection("users");
        
        // Obtener el ID del usuario desde el middleware de autenticación
        const userId = req.user.id;
        
        // Buscar al usuario por ID (convertir string a ObjectId si es necesario)
        const { ObjectId } = require('mongodb');
        const user = await collection.findOne({ _id: new ObjectId(userId) });
        
        // Verificar si se encontró el usuario
        if (!user) {
            logger.error(`User not found with ID: ${userId}`);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Enviar información del usuario (sin incluir la contraseña)
        const { password, ...userInfo } = user;
        res.json(userInfo);
        
    } catch (error) {
        logger.error(`Error retrieving user info: ${error.message}`);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;