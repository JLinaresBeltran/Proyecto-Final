// db.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

// Depuración de variables de entorno
console.log('Variables de entorno MongoDB:', {
  MONGO_URL: process.env.MONGO_URL,
  MONGO_DB: process.env.MONGO_DB
});

// MongoDB connection URL and DB name from environment variables
const url = process.env.MONGO_URL;
const dbName = process.env.MONGO_DB || 'secondChance'; // Valor predeterminado si no existe

let dbInstance = null;

async function connectToDatabase() {
    if (dbInstance) {
        console.log('Reutilizando conexión existente a MongoDB');
        return dbInstance;
    }

    // Validación de URL de conexión
    if (!url) {
        throw new Error('MONGO_URL no está definido en las variables de entorno');
    }

    // Validación del nombre de la base de datos
    if (!dbName) {
        console.warn('MONGO_DB no está definido, usando valor predeterminado: secondChance');
    }

    try {
        console.log(`Intentando conectar a MongoDB: ${url.substring(0, url.indexOf('@') > 0 ? url.indexOf('@') : 10)}...`);
        
        const client = await MongoClient.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('Conexión a MongoDB establecida correctamente');
        dbInstance = client.db(dbName);
        console.log(`Base de datos seleccionada: ${dbName}`);
        
        return dbInstance;
    } catch (error) {
        console.error("Error conectando a MongoDB:", error.message);
        
        // Sugerencias específicas según el tipo de error
        if (error.message.includes('Invalid scheme')) {
            console.error("La URL de conexión debe comenzar con 'mongodb://' o 'mongodb+srv://'");
            console.error("Verifique su archivo .env y asegúrese de que MONGO_URL esté correctamente definido");
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error("No se pudo conectar al servidor MongoDB. Verifique que el servidor esté en ejecución y accesible");
        } else if (error.message.includes('Authentication failed')) {
            console.error("Fallo de autenticación. Verifique usuario y contraseña");
        }
        
        throw error;
    }
}

module.exports = connectToDatabase;