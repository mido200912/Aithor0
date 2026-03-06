import axios from 'axios';

async function testAPIs() {
    const baseURL = 'http://localhost:5000/api';
    const token = 'test-token'; // Replace with actual token

    console.log('🧪 Testing Aithor API Endpoints...\n');

    const tests = [
        { name: 'Root', url: 'http://localhost:5000/' },
        { name: 'Company Analytics', url: `${baseURL}/company/analytics`, auth: true },
        { name: 'Company Info', url: `${baseURL}/company`, auth: true },
        { name: 'API Key', url: `${baseURL}/company/apikey`, auth: true },
        { name: 'AI Files', url: `${baseURL}/ai`, auth: true },
        { name: 'Extracted Knowledge', url: `${baseURL}/ai/extracted-knowledge`, auth: true },
    ];

    for (const test of tests) {
        try {
            const config = test.auth ? {
                headers: { Authorization: `Bearer ${token}` }
            } : {};

            const response = await axios.get(test.url, config);
            console.log(`✅ ${test.name}: ${response.status}`);
        } catch (error) {
            const status = error.response?.status || 'No Response';
            const message = error.response?.data?.error || error.message;
            console.log(`❌ ${test.name}: ${status} - ${message}`);
        }
    }
}

testAPIs();
