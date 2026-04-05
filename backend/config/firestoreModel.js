import { db } from './firebase.js';
import admin from './firebase.js';
import { cacheGet, cacheSet, cacheDelete } from '../utils/cache.js';

export class FirestoreModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  get collection() {
    if (!db) throw new Error("Firestore database is not initialized. Check your environment variables.");
    return db.collection(this.collectionName);
  }

  async findById(id) {
    if (!id) return null;

    // ⚡ Cache by ID
    const cacheKey = `${this.collectionName}:id:${id}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    const doc = await this.collection.doc(id.toString()).get();
    if (!doc.exists) return null;
    const instance = this._createDocumentInstance(doc.id, doc.data());
    cacheSet(cacheKey, instance, 2 * 60 * 1000); // 2 min cache
    return instance;
  }

  async findOne(query) {
    // Special case: if _id is in query, use findById directly
    if (query._id) {
      const doc = await this.findById(query._id);
      if (!doc) return null;
      for (const [key, value] of Object.entries(query)) {
        if (key !== '_id' && doc[key] !== value) return null;
      }
      return doc;
    }

    // ⚡ Cache for simple single-field queries (e.g. { email: "..." })
    const queryKeys = Object.keys(query).filter(k => !k.includes('.'));
    const queryCacheKey = queryKeys.length === 1
      ? `${this.collectionName}:${queryKeys[0]}:${query[queryKeys[0]]}`
      : null;

    if (queryCacheKey) {
      const cached = cacheGet(queryCacheKey);
      if (cached !== null) return cached;
    }

    let ref = this.collection;
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && !key.includes('.')) {
        ref = ref.where(key, '==', value);
      }
    }
    const snapshot = await ref.limit(1).get();
    if (snapshot.empty) {
      if (queryCacheKey) cacheSet(queryCacheKey, null, 60 * 1000); // cache "not found" for 1 min
      return null;
    }
    const doc = snapshot.docs[0];
    const instance = this._createDocumentInstance(doc.id, doc.data());

    // Filter nested queries in JS (e.g. 'credentials.phoneNumberId')
    for (const [key, value] of Object.entries(query)) {
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        if (instance[parent]?.[child] !== value) return null;
      }
    }

    if (queryCacheKey) cacheSet(queryCacheKey, instance, 2 * 60 * 1000);
    return instance;
  }

  async find(query = {}) {
    // Special case: if _id is in query, return array with single doc
    if (query._id) {
      const doc = await this.findById(query._id);
      return doc ? [doc] : [];
    }

    let ref = this.collection;
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && !key.includes('.')) {
        ref = ref.where(key, '==', value);
      }
    }
    const snapshot = await ref.get();
    const docs = snapshot.docs.map(doc => this._createDocumentInstance(doc.id, doc.data()));

    // Apply nested field filtering in JS
    return docs.filter(doc => {
      for (const [key, value] of Object.entries(query)) {
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          if (doc[parent]?.[child] !== value) return false;
        }
      }
      return true;
    });
  }

  async create(data) {
    const docRef = await this.collection.add({
      ...data,
      createdAt: new Date()
    });
    const instance = this._createDocumentInstance(docRef.id, { ...data, createdAt: new Date() });
    // ⚡ Warm up cache for the new doc
    cacheSet(`${this.collectionName}:id:${docRef.id}`, instance, 2 * 60 * 1000);
    return instance;
  }

  async findByIdAndDelete(id) {
    if (!id) return false;
    await this.collection.doc(id.toString()).delete();
    // ⚡ Invalidate cache
    cacheDelete(`${this.collectionName}:id:${id}`);
    return true;
  }

  // Create an instance that has a .save() method to mimic Mongoose documents
  _createDocumentInstance(id, data) {
    const collectionName = this.collectionName;
    const instance = { ...data, _id: id, id: id };

    Object.defineProperty(instance, 'save', {
      value: async function () {
        const dataToSave = { ...this };
        delete dataToSave._id;
        delete dataToSave.id;
        delete dataToSave.save;
        delete dataToSave._collectionName;

        // ⚡ No more dynamic import() every save — admin is imported at module load
        // Firestore ignoreUndefinedProperties is set in firebase.js, so no need to convert undefined manually

        await db.collection(collectionName).doc(this._id).set(dataToSave, { merge: true });

        // ⚡ Invalidate stale cache entries after save
        cacheDelete(`${collectionName}:id:${this._id}`);
        // Also clear email-based cache if present
        if (dataToSave.email) cacheDelete(`${collectionName}:email:${dataToSave.email}`);

        return this;
      }.bind(instance),
      enumerable: false
    });

    Object.defineProperty(instance, '_collectionName', {
      value: collectionName,
      enumerable: false
    });

    return instance;
  }
}
