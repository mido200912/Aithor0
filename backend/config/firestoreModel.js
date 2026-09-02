import mongoose from "mongoose";
import { cacheGet, cacheSet, cacheDelete } from "../utils/cache.js";

// MongoDB connection is handled centrally in server.js

// Define a dynamic schema that accepts anything (NoSQL style)
const dynamicSchema = new mongoose.Schema(
  {},
  { strict: false, timestamps: true },
);

// ⚡ Pre-create indexes for frequently queried fields
// These are created lazily when models are first used — no overhead if the index already exists
const ensuredIndexes = new Set();

async function createThem(model, collectionName) {
  try {
    // Common query patterns across the app
    if (collectionName === "users") {
      await model.collection.createIndex(
        { email: 1 },
        { background: true, sparse: true },
      );
      await model.collection.createIndex(
        { googleId: 1 },
        { background: true, sparse: true },
      );
    } else if (collectionName === "companies") {
      await model.collection.createIndex({ owner: 1 }, { background: true });
      await model.collection.createIndex(
        { slug: 1 },
        { background: true, unique: true, sparse: true },
      );
      await model.collection.createIndex(
        { apiKey: 1 },
        { background: true, sparse: true },
      );
      await model.collection.createIndex(
        { chatToken: 1 },
        { background: true, sparse: true },
      );
    } else if (collectionName === "company_chats") {
      await model.collection.createIndex(
        { company: 1, user: 1 },
        { background: true },
      );
      await model.collection.createIndex(
        { company: 1, createdAt: -1 },
        { background: true },
      );
    } else if (collectionName === "integrations") {
      await model.collection.createIndex(
        { company: 1, platform: 1 },
        { background: true },
      );
    } else if (collectionName === "leads") {
      await model.collection.createIndex(
        { company: 1, phone: 1 },
        { background: true },
      );
      await model.collection.createIndex(
        { company: 1, status: 1 },
        { background: true },
      );
      await model.collection.createIndex(
        { company: 1, createdAt: -1 },
        { background: true },
      );
    }
  } catch (e) {
    // Index creation is best-effort — don't crash on duplicate or permission errors
    if (e.code !== 85 && e.code !== 86) {
      // 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict
      console.warn(
        `⚠️ Index creation warning for ${collectionName}:`,
        e.message,
      );
    }
  }
}

async function ensureIndexes(model, collectionName) {
  if (ensuredIndexes.has(collectionName)) return;
  ensuredIndexes.add(collectionName);
  
  if (mongoose.connection.readyState === 1) {
    createThem(model, collectionName);
  } else {
    mongoose.connection.once('connected', () => {
      createThem(model, collectionName);
    });
  }
}

export class FirestoreModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
    // Map collection name to a Mongoose model
    this.Model =
      mongoose.models[collectionName] ||
      mongoose.model(collectionName, dynamicSchema);
    // ⚡ Ensure indexes on first load (non-blocking)
    ensureIndexes(this.Model, collectionName);
  }

  async findById(id) {
    if (!id) return null;
    const cacheKey = `${this.collectionName}:id:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    // ⚡ .lean() returns plain JS objects — 3-5x faster than Mongoose documents
    const doc = await this.Model.findById(id).lean();
    if (!doc) return null;

    const instance = this._createDocumentInstance(doc, true);
    cacheSet(cacheKey, instance, 2 * 60 * 1000);
    return instance;
  }

  async findOne(query) {
    // Translate _id if present
    const mongoQuery = { ...query };
    if (mongoQuery._id) {
      mongoQuery._id = mongoQuery._id;
    }

    const doc = await this.Model.findOne(mongoQuery).lean();
    if (!doc) return null;

    return this._createDocumentInstance(doc, true);
  }

  async find(query = {}) {
    const docs = await this.Model.find(query).lean();
    return docs.map((doc) => this._createDocumentInstance(doc, true));
  }

  async create(data) {
    const doc = await this.Model.create(data);
    const plain = doc.toObject();
    const instance = this._createDocumentInstance(plain, false);
    cacheSet(`${this.collectionName}:id:${doc._id}`, instance, 2 * 60 * 1000);
    return instance;
  }

  async findByIdAndDelete(id) {
    if (!id) return false;
    await this.Model.findByIdAndDelete(id);
    cacheDelete(`${this.collectionName}:id:${id}`);
    return true;
  }

  // Mimic the Firestore instance behavior with a .save() method
  // isLean: true if source was .lean() (plain object), false if toObject()
  _createDocumentInstance(docObj, isLean = false) {
    const instance = {
      ...docObj,
      _id: docObj._id.toString(),
      id: docObj._id.toString(),
    };
    const Model = this.Model;
    const collectionName = this.collectionName;

    Object.defineProperty(instance, "save", {
      value: async function () {
        const dataToSave = { ...this };
        const id = dataToSave._id;
        delete dataToSave._id;
        delete dataToSave.id;
        delete dataToSave.save;

        await Model.findByIdAndUpdate(id, dataToSave, { upsert: true });
        cacheDelete(`${collectionName}:id:${id}`);
        return this;
      }.bind(instance),
      enumerable: false,
    });

    return instance;
  }
}
