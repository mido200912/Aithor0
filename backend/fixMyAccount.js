import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from './models/company.js';
import User from './models/User.js';

dotenv.config();

const fixUserCompany = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Get all users
        const users = await User.find({});
        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            // 2. Check if company exists
            const company = await Company.findOne({ owner: user._id });

            if (company) {
                console.log(`✅ User ${user.email} has company: ${company.name}`);
            } else {
                console.log(`❌ User ${user.email} MISSING company! Creating one...`);

                // 3. Create default company
                const newCompany = await Company.create({
                    owner: user._id,
                    name: user.name ? `${user.name}'s Company` : "My Company",
                    industry: "Technology",
                    description: "Created automatically by fix script",
                    extractedKnowledge: "",
                    requests: []
                });

                console.log(`✨ Created company for ${user.email}: ${newCompany.name}`);
            }
        }

        console.log("\n✅ All checks complete!");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

fixUserCompany();
