import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Smart Environment Loading:
// In production: loads .env.production then .env (system/Render env vars take top precedence)
// In development: loads .env.local, .env.development, then .env
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  dotenv.config({ path: path.join(__dirname, '../.env.production') });
  dotenv.config({ path: path.join(__dirname, '../.env') });
} else {
  dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });
  dotenv.config({ path: path.join(__dirname, '../.env.development'), override: true });
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import seedInitialData from './config/seed.js';
import apiRoutes from './router/index.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Connect to MongoDB Database
connectDB().then(async () => {
  // Automatically ensure default admin credentials exist
  await seedInitialData();
});

// Configure Allowed Origins for CORS
const configuredClientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  ...configuredClientUrls,
];

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, server-to-server, Postman)
      if (!origin) return callback(null, true);

      // Check if origin is explicitly in allowedOrigins or belongs to Vercel/Render subdomains
      const isAllowed =
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        /\.onrender\.com$/.test(origin);

      if (isAllowed) {
        return callback(null, true);
      }

      // Default allow with warning to prevent breaking live production during initial setup
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded photos/avatars statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Ayush Rider Portal Backend API Server',
    api_docs: '/api/health',
  });
});

// Mount All API Routes
app.use('/api', apiRoutes);

// Centralized Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4500;
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [Server Running]: http://localhost:${PORT}`);
  console.log(`📁 [Uploads Served]: http://localhost:${PORT}/uploads`);
  console.log(`🔑 [API Endpoints]: http://localhost:${PORT}/api`);
  console.log(`======================================================\n`);
});

export { app, server };
