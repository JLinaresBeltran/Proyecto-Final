const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const { ObjectId } = require('mongodb');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });

// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase();
        //Step 2: task 2 - insert code here
        logger.info('Getting all secondChanceItems');
        //Step 2: task 3 - insert code here
        const collection = db.collection("secondChanceItems");
        //Step 2: task 4 - insert code here
        const secondChanceItems = await collection.find({}).toArray();
        res.json(secondChanceItems);
    } catch (e) {
        logger.error('oops something went wrong', e);
        next(e);
    }
});

// Add a new item
router.post('/', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        //Step 3: task 2 - insert code here
        const collection = db.collection("secondChanceItems");
        //Step 3: task 3 - insert code here
        const newItem = req.body;
        //Step 3: task 4 - insert code here
        if (!newItem.name || !newItem.category || !newItem.condition) {
            return res.status(400).json({ message: 'Name, category, and condition are required fields' });
        }
        //Step 3: task 5 - insert code here
        const result = await collection.insertOne(newItem);
        const secondChanceItem = { 
            ...newItem, 
            _id: result.insertedId,
            ops: [{ ...newItem, _id: result.insertedId }]
        };
        res.status(201).json(secondChanceItem.ops[0]);
    } catch (e) {
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase();
        //Step 4: task 2 - insert code here
        const collection = db.collection("secondChanceItems");
        //Step 4: task 3 - insert code here
        const itemId = req.params.id;
        //Step 4: task 4 - insert code here
        const item = await collection.findOne({ id: itemId });
        
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json(item);
    } catch (e) {
        next(e);
    }
});

// Update an existing item
router.put('/:id', async(req, res, next) => {
    try {
        const db = await connectToDatabase();
        //Step 5: task 2 - insert code here
        const collection = db.collection("secondChanceItems");
        //Step 5: task 3 - insert code here
        const itemId = req.params.id;
        //Step 5: task 4 - insert code here
        const updatedItem = req.body;
        
        if (!updatedItem.name || !updatedItem.category || !updatedItem.condition) {
            return res.status(400).json({ message: 'Name, category, and condition are required fields' });
        }
        
        //Step 5: task 5 - insert code here
        const result = await collection.updateOne(
            { id: itemId },
            { $set: updatedItem }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json({ message: 'Item updated successfully', item: updatedItem });
    } catch (e) {
        next(e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res, next) => {
    try {
        const db = await connectToDatabase();
        //Step 6: task 2 - insert code here
        const collection = db.collection("secondChanceItems");
        //Step 6: task 3 - insert code here
        const itemId = req.params.id;
        //Step 6: task 4 - insert code here
        const result = await collection.deleteOne({ id: itemId });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }
        
        res.json({ message: 'Item deleted successfully' });
    } catch (e) {
        next(e);
    }
});

module.exports = router;
