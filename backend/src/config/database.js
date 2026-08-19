const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js 17+ / Render DNS resolution issues with MongoDB Atlas SRV records
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const sanitizeMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return uri;
  const match = uri.trim().match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^/\?]+)(.*)$/);
  if (!match) return uri.trim();
  
  const [, prefix, user, rawPassword, host, rest] = match;
  let password = rawPassword;
  
  // Remove enclosing placeholder brackets <...> if user included them
  if (password.startsWith('<') && password.endsWith('>')) {
    password = password.slice(1, -1);
  }
  
  // URL-encode password if it has unescaped characters
  let encodedPassword = password;
  try {
    if (decodeURIComponent(password) === password) {
      encodedPassword = encodeURIComponent(password);
    }
  } catch {
    encodedPassword = encodeURIComponent(password);
  }
  
  return `${prefix}${encodeURIComponent(user)}:${encodedPassword}@${host}${rest}`;
};

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI environment variable is missing or undefined in environment settings.');
    return;
  }
  
  const sanitizedUri = sanitizeMongoUri(process.env.MONGODB_URI);
  const hostMatch = sanitizedUri.match(/@([^/\?]+)/);
  const targetHost = hostMatch ? hostMatch[1] : 'unknown host';

  return new Promise((resolve) => {
    const tryConnect = async (attempt = 1) => {
      try {
        const conn = await mongoose.connect(sanitizedUri, {
          serverSelectionTimeoutMS: 10000
        });
        console.log('✅ MongoDB connection established successfully');
        console.log(`📊 Connected to: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
        resolve(conn);
      } catch (error) {
        console.error(`❌ [Attempt ${attempt}] MongoDB connection failed for [${targetHost}]:`, error.message);
        console.log('⏳ Retrying MongoDB connection in 5 seconds...');
        setTimeout(() => tryConnect(attempt + 1), 5000);
      }
    };

    tryConnect();
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;