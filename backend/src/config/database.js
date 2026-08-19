const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js 17+ / Render DNS resolution issues with MongoDB Atlas SRV records
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is missing or undefined in environment settings.');
    return;
  }
  
  const hostMatch = process.env.MONGODB_URI.match(/@([^/\?]+)/);
  const targetHost = hostMatch ? hostMatch[1] : 'unknown host';

  const tryConnect = async (attempt = 1) => {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000
      });
      console.log('✅ MongoDB connection established successfully');
      console.log(`📊 Connected to: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    } catch (error) {
      console.error(`❌ [Attempt ${attempt}] MongoDB connection failed for [${targetHost}]:`, error.message);
      console.log('⏳ Retrying MongoDB connection in 5 seconds...');
      setTimeout(() => tryConnect(attempt + 1), 5000);
    }
  };

  await tryConnect();
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;