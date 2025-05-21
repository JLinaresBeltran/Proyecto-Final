// db.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

// MongoDB connection URL and DB name from environment variables
const url = process.env.MONGO_URL;
const dbName = process.env.MONGO_DB;

let dbInstance = null;

async function connectToDatabase() {
    if (dbInstance) {
        return dbInstance;
    }

    try {
        const client = await MongoClient.connect(url, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        dbInstance = client.db(dbName);
        return dbInstance;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
}

module.exports = connectToDatabase;
