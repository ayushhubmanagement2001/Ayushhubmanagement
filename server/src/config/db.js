import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Node.js on Windows with MongoDB Atlas querySrv ECONNREFUSED
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // If system prevents overriding DNS, ignore and continue
}

const connectDB = async () => {
  try {
    let connStr =
      process.env.MONGODB_URI ||
      process.env.MONGO_URL ||
      'mongodb://localhost:27017/AYUSH_WESBITE';

    // Strip surrounding quotes if present in .env
    connStr = connStr.trim().replace(/^["']|["']$/g, '');

    const conn = await mongoose.connect(connStr);
    console.log(`[MongoDB Connected]: ${conn.connection.host} / ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
