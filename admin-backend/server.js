import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// 🛡️ Security Hardening
app.use(helmet()); // Sets various security-related HTTP headers
app.use(cors({
  origin: process.env.FRONTEND_URL || '*', // Restrict this in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' })); // Limit body size to prevent DoS

// 🚦 Rate Limiting - Prevent Brute Force on Login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per window
  message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

// Admin Credentials (Should be in .env but keeping for compatibility)
const ADMIN_EMAIL = 'midovoxio@gmail.com';
const ADMIN_PASS = 'mido927010';

// Auth Middleware
const adminAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error('No token provided');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) throw new Error('Not authorized');
    
    req.admin = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please authenticate as admin' });
  }
};

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    const token = jwt.sign({ isAdmin: true, email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid admin credentials' });
  }
});

app.get('/api/admin/users', adminAuth, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const companiesSnapshot = await db.collection('companies').get();
    const integrationsSnapshot = await db.collection('integrations').get();

    const companies = companiesSnapshot.docs.map(d => ({ _id: d.id, ...d.data() }));
    const integrations = integrationsSnapshot.docs.map(d => ({ _id: d.id, ...d.data() }));

    const users = usersSnapshot.docs.map(doc => {
      const u = doc.data();
      const company = companies.find(c => c.owner === doc.id);
      const userIntegrations = company ? integrations.filter(i => i.company === company._id) : [];

      return {
        _id: doc.id,
        name: u.name,
        email: u.email,
        isSuspended: u.isSuspended || false,
        companyName: company ? company.name : 'No Company',
        companyId: company ? company._id : null,
        messageLimit: company ? company.messageLimit : 1000,
        integrationsCount: userIntegrations.length
      };
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.get('/api/admin/companies/:id', adminAuth, async (req, res) => {
  try {
    const companyDoc = await db.collection('companies').doc(req.params.id).get();
    if (!companyDoc.exists) return res.status(404).json({ error: 'Company not found' });
    
    const companyData = companyDoc.data();
    
    // Fetch owner info
    const ownerDoc = await db.collection('users').doc(companyData.owner).get();
    const ownerData = ownerDoc.exists ? ownerDoc.data() : { email: 'Unknown' };

    // Fetch integrations
    const intgSnap = await db.collection('integrations').where('company', '==', req.params.id).get();
    const integrations = intgSnap.docs.map(d => ({ _id: d.id, ...d.data() }));

    res.json({
      _id: companyDoc.id,
      ...companyData,
      ownerEmail: ownerData.email,
      integrations
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch company details' });
  }
});

app.delete('/api/admin/users/:userId', adminAuth, async (req, res) => {
  try {
    const userId = req.params.userId;
    const companiesSnapshot = await db.collection('companies').where('owner', '==', userId).get();
    
    for (const doc of companiesSnapshot.docs) {
      const companyId = doc.id;
      
      const intgSnap = await db.collection('integrations').where('company', '==', companyId).get();
      for (const iDoc of intgSnap.docs) await db.collection('integrations').doc(iDoc.id).delete();
      
      const chatSnap = await db.collection('company_chats').where('company', '==', companyId).get();
      for (const cDoc of chatSnap.docs) await db.collection('company_chats').doc(cDoc.id).delete();
      
      await db.collection('companies').doc(companyId).delete();
    }
    
    await db.collection('users').doc(userId).delete();
    res.json({ message: 'User and associated data deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.put('/api/admin/users/:userId/suspend', adminAuth, async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.params.userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    
    const isSuspended = !userDoc.data().isSuspended;
    await userRef.update({ isSuspended });
    
    const compSnap = await db.collection('companies').where('owner', '==', req.params.userId).get();
    for (const doc of compSnap.docs) {
      await db.collection('companies').doc(doc.id).update({ isSuspended });
    }
    
    res.json({ message: 'Status updated', isSuspended });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

app.put('/api/admin/companies/:companyId/limit', adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.body.limit);
    await db.collection('companies').doc(req.params.companyId).update({ messageLimit: limit });
    res.json({ message: 'Limit updated' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update limit' });
  }
});

// 🤖 Manage AI Knowledge & Prompts (Full Control)
app.get('/api/admin/companies/:companyId/ai-config', adminAuth, async (req, res) => {
  try {
    const compDoc = await db.collection('companies').doc(req.params.companyId).get();
    if (!compDoc.exists) return res.status(404).json({ error: 'Company not found' });
    
    const data = compDoc.data();
    res.json({
      name: data.name || '',
      industry: data.industry || '',
      description: data.description || '',
      vision: data.vision || '',
      mission: data.mission || '',
      values: data.values || '',
      systemPrompt: data.customInstructions || '',
      extractedKnowledge: data.extractedKnowledge || '',
      urlExtractedKnowledge: data.urlExtractedKnowledge || '',
      knowledgeBase: data.knowledgeBase || [],
      websiteUrl: data.websiteUrl || ''
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch AI config' });
  }
});

app.put('/api/admin/companies/:companyId/ai-config', adminAuth, async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      industry: req.body.industry,
      description: req.body.description,
      vision: req.body.vision,
      mission: req.body.mission,
      values: req.body.values,
      customInstructions: req.body.systemPrompt,
      extractedKnowledge: req.body.extractedKnowledge,
      urlExtractedKnowledge: req.body.urlExtractedKnowledge,
      updatedAt: new Date(),
      updatedBy: 'admin'
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    await db.collection('companies').doc(req.params.companyId).update(updateData);
    res.json({ message: 'Company AI configuration synchronized successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update AI config' });
  }
});

// 🚫 Advanced Blocking
app.post('/api/admin/users/:userId/block', adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const userRef = db.collection('users').doc(req.params.userId);
    await userRef.update({ 
      isSuspended: true, 
      blockReason: reason,
      blockedAt: new Date()
    });
    
    const compSnap = await db.collection('companies').where('owner', '==', req.params.userId).get();
    for (const doc of compSnap.docs) {
      await db.collection('companies').doc(doc.id).update({ isSuspended: true });
    }
    
    res.json({ message: 'User and associated companies blocked' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to block user' });
  }
});

app.get('/api/admin/agents', adminAuth, async (req, res) => {
  try {
    const intgSnap = await db.collection('integrations').get();
    const compSnap = await db.collection('companies').get();
    const userSnap = await db.collection('users').get();

    const companies = compSnap.docs.reduce((acc, doc) => ({...acc, [doc.id]: doc.data()}), {});
    const users = userSnap.docs.reduce((acc, doc) => ({...acc, [doc.id]: doc.data()}), {});

    const agents = intgSnap.docs.map(doc => {
      const a = doc.data();
      const comp = companies[a.company];
      const owner = comp ? users[comp.owner] : null;
      return {
        _id: doc.id,
        platform: a.platform,
        isActive: a.isActive,
        companyName: comp ? comp.name : 'Unknown',
        ownerEmail: owner ? owner.email : 'Unknown'
      };
    });
    res.json(agents);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

app.delete('/api/admin/agents/:agentId', adminAuth, async (req, res) => {
  try {
    await db.collection('integrations').doc(req.params.agentId).delete();
    res.json({ message: 'Agent deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

app.post('/api/admin/broadcast', adminAuth, async (req, res) => {
  try {
    await db.collection('SystemSettings').doc('broadcast').set({ ...req.body, updatedAt: new Date() }, { merge: true });
    res.json({ message: 'Broadcast updated' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update broadcast' });
  }
});

app.get('/api/admin/support-messages', adminAuth, async (req, res) => {
  try {
    const snapshot = await db.collection('support_messages').orderBy('createdAt', 'desc').get();
    const messages = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    res.json(messages);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.put('/api/admin/support-messages/:id/read', adminAuth, async (req, res) => {
  try {
    await db.collection('support_messages').doc(req.params.id).update({ status: 'read' });
    res.json({ message: 'Message marked as read' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update message' });
  }
});

app.delete('/api/admin/support-messages/:id', adminAuth, async (req, res) => {
  try {
    await db.collection('support_messages').doc(req.params.id).delete();
    res.json({ message: 'Message deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

app.get('/api/admin/analytics', adminAuth, async (req, res) => {
  try {
    const usersCount = (await db.collection('users').count().get()).data().count;
    const integrationsCount = (await db.collection('integrations').count().get()).data().count;
    const aiChatsCount = (await db.collection('company_chats').where('sender', '==', 'ai').count().get()).data().count;
    
    res.json({ usersCount, integrationsCount, totalAIMessages: aiChatsCount });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🛡️ Secure Admin Backend running on port ${PORT}`);
});
