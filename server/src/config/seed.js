import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../modals/User.js';
import Company from '../modals/Company.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const seedInitialData = async () => {
  try {
    const connStr = process.env.MONGO_URL ||`mongodb+srv://codebyvineet1611_db_user:QpTfcCDTQZhqeenN@ayushdatabase.zobnvlr.mongodb.net/AYUSH_DATABASE?retryWrites=true&w=majority`;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(connStr);
      console.log(`[Seed DB Connected]: ${connStr}`);
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // 1. Seed or Verify Admin Account
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log(`[Seeding]: Creating default admin user '${adminEmail}'...`);
      const newAdmin = new User({
        name: 'Ayush Admin',
        email: adminEmail,
        password: adminPassword, // pre('save') hook will hash with bcrypt
        role: 'Super Administrator',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      });
      await newAdmin.save();
      console.log(`[Seeding Success]: Admin account created successfully!`);
      console.log(`  -> Email: ${adminEmail}`);
      console.log(`  -> Password: ${adminPassword}`);
    } else {
      console.log(`[Seeding Info]: Admin account '${adminEmail}' already exists in database.`);
    }

    // 2. Seed Initial Active Company if database is empty
    const companyCount = await Company.countDocuments();
    if (companyCount === 0) {
      console.log('[Seeding]: Creating initial logistics companies...');
      await Company.create([
        {
          name: 'SHADOWFAX',
          code: 'COMP-2389',
          status: 'Active',
          icon: 'Building2',
          color: '#E53935',
          sheetType: 'shadowfax',
          trackRiderDetails: true,
        },
        {
          name: 'XPRESS BEES',
          code: 'COMP-8729',
          status: 'Active',
          icon: 'Truck',
          color: '#2563EB',
          sheetType: 'xpressbees',
          trackRiderDetails: true,
        },
        {
          name: 'VALMO',
          code: 'COMP-7432',
          status: 'Active',
          icon: 'Building2',
          color: '#16A34A',
          sheetType: 'valmo',
          trackRiderDetails: true,
        },
      ]);
      console.log('[Seeding Success]: 3 initial companies created.');
    }
  } catch (error) {
    console.error('[Seeding Error]:', error.message);
  }
};

// Check if run directly
if (process.argv[1] === __filename) {
  seedInitialData().then(() => {
    console.log('[Seeding Complete]: Disconnecting database.');
    mongoose.disconnect();
    process.exit(0);
  });
}

export default seedInitialData;
