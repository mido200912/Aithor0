import { db } from './firebase.js';

export class FirestoreModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collection = db.collection(collectionName);
  }

  async findById(id) {
    if (!id) return null;
    const doc = await this.collection.doc(id.toString()).get();
    if (!doc.exists) return null;
    return this._createDocumentInstance(doc.id, doc.data());
  }

  async findOne(query) {
    // Special case: if _id is in query, use findById directly
    if (query._id) {
      const doc = await this.findById(query._id);
      if (!doc) return null;
      // Validate remaining query fields
      for (const [key, value] of Object.entries(query)) {
        if (key !== '_id' && doc[key] !== value) return null;
      }
      return doc;
    }

    let ref = this.collection;
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && !key.includes('.')) {
        ref = ref.where(key, '==', value);
      }
    }
    const snapshot = await ref.limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    const instance = this._createDocumentInstance(doc.id, doc.data());
    
    // Filter nested queries in JS (e.g. 'credentials.phoneNumberId')
    for (const [key, value] of Object.entries(query)) {
      if (key.includes('.')) {
        const [parent, child] = key.split('.');
        if (instance[parent]?.[child] !== value) return null;
      }
    }
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
    return this._createDocumentInstance(docRef.id, { ...data, createdAt: new Date() });
  }

  async findByIdAndDelete(id) {
    if (!id) return false;
    await this.collection.doc(id.toString()).delete();
    return true;
  }

  // Create an instance that has a .save() method to mimic Mongoose documents
  _createDocumentInstance(id, data) {
    const instance = { ...data, _id: id, id: id };
    
    Object.defineProperty(instance, 'save', {
      value: async function () {
        const dataToSave = { ...this };
        delete dataToSave._id;
        delete dataToSave.id;
        delete dataToSave.save;
        
        // Convert undefined to delete operations for Firestore
        const admin = (await import('firebase-admin')).default;
        for (const key in dataToSave) {
            if (dataToSave[key] === undefined) {
                dataToSave[key] = admin.firestore.FieldValue.delete();
            }
        }

        await db.collection(this._collectionName).doc(this._id).set(dataToSave, { merge: true });
        return this;
      }.bind(instance),
      enumerable: false
    });

    Object.defineProperty(instance, '_collectionName', {
      value: this.collectionName,
      enumerable: false
    });
    
    return instance;
  }
}
