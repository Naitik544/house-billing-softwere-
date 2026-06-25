const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../database_fallback.json');

// Initialize local DB file if not exists
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], tenants: [], bills: [], payments: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return { users: [], tenants: [], bills: [], payments: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Global flag to indicate database mode
global.useFallbackDB = false;

// Mock Document Class for Fallback DB
class MockDocument {
  constructor(collectionName, data) {
    this._collectionName = collectionName;
    Object.assign(this, data);
    if (!this._id) {
      // Create a 24-character hex-like ID compatible with MongoDB ObjectId queries
      this._id = [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    if (!this.createdAt) {
      this.createdAt = new Date().toISOString();
    }
  }

  async save() {
    const db = readDB();
    const collection = db[this._collectionName] || [];
    
    // Find index of existing item
    const idx = collection.findIndex(item => item._id.toString() === this._id.toString());
    
    // Clean document fields
    const saveData = {};
    for (const key of Object.keys(this)) {
      if (!key.startsWith('_') || key === '_id') {
        saveData[key] = this[key];
      }
    }

    if (idx >= 0) {
      collection[idx] = saveData;
    } else {
      collection.push(saveData);
    }
    
    db[this._collectionName] = collection;
    writeDB(db);
    return this;
  }
}

// Mock Model Class for Fallback DB
class MockModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  _matches(item, query) {
    if (!query) return true;
    for (const key in query) {
      const val = query[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const op = Object.keys(val)[0];
        if (op === '$ne') {
          if (item[key] === val['$ne']) return false;
        } else if (op === '$in') {
          if (!val['$in'].map(v => v ? v.toString() : '').includes(item[key] ? item[key].toString() : '')) {
            return false;
          }
        }
      } else {
        const itemVal = item[key] ? item[key].toString() : undefined;
        const queryVal = val ? val.toString() : undefined;
        if (itemVal !== queryVal) return false;
      }
    }
    return true;
  }

  async find(query = {}) {
    const db = readDB();
    const list = db[this.collectionName] || [];
    const results = list.filter(item => this._matches(item, query));
    // Sort latest first if they have createdAt
    results.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return results.map(item => new MockDocument(this.collectionName, item));
  }

  async findOne(query = {}) {
    const db = readDB();
    const list = db[this.collectionName] || [];
    const item = list.find(item => this._matches(item, query));
    return item ? new MockDocument(this.collectionName, item) : null;
  }

  async findById(id) {
    if (!id) return null;
    return this.findOne({ _id: id });
  }

  async findByIdAndUpdate(id, updateData, options = {}) {
    const db = readDB();
    const list = db[this.collectionName] || [];
    const idx = list.findIndex(item => item._id.toString() === id.toString());
    if (idx === -1) return null;
    
    const existing = list[idx];
    
    // Support MongoDB $set unwrapping in fallback DB updates
    let finalUpdate = updateData;
    if (updateData && updateData.$set) {
      finalUpdate = updateData.$set;
    }
    
    const updated = { ...existing, ...finalUpdate };
    // Remove the temporary $set field if it leaked in previous requests
    delete updated.$set;
    
    list[idx] = updated;
    db[this.collectionName] = list;
    writeDB(db);
    return new MockDocument(this.collectionName, updated);
  }

  async findByIdAndDelete(id) {
    const db = readDB();
    const list = db[this.collectionName] || [];
    const idx = list.findIndex(item => item._id.toString() === id.toString());
    if (idx === -1) return null;
    const deleted = list.splice(idx, 1)[0];
    db[this.collectionName] = list;
    writeDB(db);
    return new MockDocument(this.collectionName, deleted);
  }

  async countDocuments(query = {}) {
    const results = await this.find(query);
    return results.length;
  }
}

// Factory to create a Mock Model constructor
function createMockModel(collectionName) {
  function ModelConstructor(data) {
    return new MockDocument(collectionName, data);
  }

  const modelInstance = new MockModel(collectionName);
  Object.getOwnPropertyNames(MockModel.prototype).forEach(methodName => {
    if (methodName !== 'constructor') {
      ModelConstructor[methodName] = modelInstance[methodName].bind(modelInstance);
    }
  });

  return ModelConstructor;
}

// Connect Database Function
const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/tenant_billing';
  console.log(`Connecting to database...`);
  
  try {
    // Attempt Mongoose connection with a 2-second timeout
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log('MongoDB database connected successfully.');
    global.useFallbackDB = false;
  } catch (err) {
    console.warn(`\n[DATABASE WARNING] Could not connect to MongoDB: ${err.message}`);
    console.warn(`[DATABASE WARNING] Falling back to local file database: ${DB_FILE}`);
    global.useFallbackDB = true;
    readDB(); // Initialize file
  }
};

// Model retriever helper
const getModel = (modelName, schema) => {
  const collectionMap = {
    User: 'users',
    Tenant: 'tenants',
    Bill: 'bills',
    Payment: 'payments'
  };

  const collectionName = collectionMap[modelName];

  // Return dynamic wrapper
  const wrapper = function (data) {
    if (global.useFallbackDB) {
      return createMockModel(collectionName)(data);
    } else {
      const MongooseModel = mongoose.model(modelName, schema);
      return new MongooseModel(data);
    }
  };

  // Bind static methods dynamically
  const staticMethods = ['find', 'findOne', 'findById', 'findByIdAndUpdate', 'findByIdAndDelete', 'countDocuments'];
  staticMethods.forEach(method => {
    wrapper[method] = async function (...args) {
      if (global.useFallbackDB) {
        const mock = createMockModel(collectionName);
        return mock[method](...args);
      } else {
        const MongooseModel = mongoose.model(modelName, schema);
        return MongooseModel[method](...args);
      }
    };
  });

  return wrapper;
};

module.exports = {
  connectDB,
  getModel,
  readDB,
  writeDB
};
