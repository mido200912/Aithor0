// Simple test to verify routes are loaded
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'Test route works!' });
});

// Import and test all routes one by one
async function testRoutes() {
    try {
        console.log('Testing routes import...\n');

        console.log('1. Importing authRoutes...');
        const authRoutes = await import('./routes/authRoutes.js');
        console.log('✅ authRoutes loaded');

        console.log('2. Importing chatRoutes...');
        const chatRoutes = await import('./routes/chatRoutes.js');
        console.log('✅ chatRoutes loaded');

        console.log('3. Importing companyRoutes...');
        const companyRoutes = await import('./routes/Company.js');
        console.log('✅ companyRoutes loaded');

        console.log('4. Importing uploadRoutes...');
        const uploadRoutes = await import('./routes/uploadRoutes.js');
        console.log('✅ uploadRoutes loaded');

        console.log('5. Importing chatHistoryRoutes...');
        const chatHistoryRoutes = await import('./routes/chatHistoryRoutes.js');
        console.log('✅ chatHistoryRoutes loaded');

        console.log('6. Importing integrationManagerRoutes...');
        const integrationManagerRoutes = await import('./routes/integrationManagerRoutes.js');
        console.log('✅ integrationManagerRoutes loaded');

        console.log('\n✅ All routes loaded successfully!');

        // Mount routes
        app.use('/api/auth', authRoutes.default);
        app.use('/api/chat', chatRoutes.default);
        app.use('/api/company', companyRoutes.default);
        app.use('/api/ai', uploadRoutes.default);
        app.use('/api/support-chat', chatHistoryRoutes.default);
        app.use('/api/integration-manager', integrationManagerRoutes.default);

        console.log('\n✅ All routes mounted successfully!');

        const PORT = 5001;
        app.listen(PORT, () => {
            console.log(`\n🚀 Test server running on http://localhost:${PORT}`);
            console.log(`Test URL: http://localhost:${PORT}/test`);
        });

    } catch (error) {
        console.error('\n❌ Error loading routes:');
        console.error(error);
        process.exit(1);
    }
}

testRoutes();
