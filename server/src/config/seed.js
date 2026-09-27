import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './db.js';
import User from '../modals/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env.local, .env.development, .env)
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../.env.development') });
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const seedInitialData = async ({ forceUpdate = false } = {}) => {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Seed or Update Admin Account only
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      console.log(`[Seeding]: Creating admin user '${adminEmail}'...`);
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
      console.log(`  -> Role: Super Administrator`);
    } else {
      if (forceUpdate) {
        console.log(`[Seeding]: Admin '${adminEmail}' already exists. Updating credentials...`);
        existingAdmin.password = adminPassword;
        existingAdmin.role = 'Super Administrator';
        await existingAdmin.save();
        console.log(`[Seeding Success]: Admin password & credentials updated successfully!`);
        console.log(`  -> Email: ${adminEmail}`);
        console.log(`  -> Password: ${adminPassword}`);
        console.log(`  -> Role: Super Administrator`);
      } else {
        console.log(`[Seeding Info]: Admin account '${adminEmail}' already exists in database.`);
      }
    }
  } catch (error) {
    console.error('[Seeding Error]:', error.message);
    throw error;
  }
};

// Check if run directly via CLI (e.g. npm run seed)
const isDirectRun =
  process.argv[1] &&
  (path.resolve(process.argv[1]) === path.resolve(__filename) ||
    process.argv[1].endsWith('seed.js'));

if (isDirectRun) {
  seedInitialData({ forceUpdate: true })
    .then(async () => {
      console.log('[Seeding Complete]: Disconnecting database.');
      await mongoose.disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seeding Failed]:', err.message);
      await mongoose.disconnect();
      process.exit(1);
    });
}

export default seedInitialData;
