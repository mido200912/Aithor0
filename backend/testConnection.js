import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
    console.log('🔍 Testing MongoDB connection...');
    console.log('📝 MONGO_URI:', process.env.MONGO_URI ? 'Found ✅' : 'Missing ❌');

    try {
        console.log('⏳ Attempting to connect...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s
        });
        console.log('✅ SUCCESS! MongoDB connected successfully!');
        console.log('📊 Connection state:', mongoose.connection.readyState);
        process.exit(0);
    } catch (error) {
        console.error('❌ CONNECTION FAILED!');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);

        if (error.message.includes('ENOTFOUND')) {
            console.log('\n💡 DNS resolution failed - check your internet connection');
        } else if (error.message.includes('authentication')) {
            console.log('\n💡 Authentication failed - check username/password');
        } else if (error.message.includes('timeout')) {
            console.log('\n💡 Connection timeout - check Network Access in MongoDB Atlas');
            console.log('   Make sure to whitelist your IP or use 0.0.0.0/0');
        }

        process.exit(1);
    }
};

testConnection();
