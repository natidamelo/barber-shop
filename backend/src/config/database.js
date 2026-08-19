const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js 17+ / Render DNS resolution issues with MongoDB Atlas SRV records
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is missing or undefined in environment settings.');
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ MongoDB connection established successfully');
    console.log(`📊 Connected to: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
  } catch (error) {
    const hostMatch = process.env.MONGODB_URI ? process.env.MONGODB_URI.match(/@([^/\?]+)/) : null;
    const targetHost = hostMatch ? hostMatch[1] : 'unknown host';
    console.error(`❌ MongoDB connection failed for [${targetHost}]:`, error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;