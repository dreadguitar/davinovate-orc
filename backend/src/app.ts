import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes';
import agentRoutes from './routes/agentRoutes';
import skillRoutes from './routes/skillRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import chatRoutes from './routes/chatRoutes';
import systemRoutes from './routes/systemRoutes';
import aiRoutes from './routes/aiRoutes';

dotenv.config();

const app = express();

// Trust first proxy (Hostinger reverse proxy) so express-rate-limit reads the real client IP
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet()); // Applies secure HTTP headers to mitigate cross-site scripting, clickjacking, and sniffing
app.use(cors());
app.use(express.json());

// Global Rate Limiting to prevent DoS & brute-forcing
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} | ${req.method} ${req.originalUrl} | ${res.statusCode} | ${duration}ms`);
  });
  next();
});

// Apply the rate limiting middleware to all requests
app.use('/api', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/ai', aiRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('--- UNCAUGHT EXCEPTION ---');
  console.error(`Timestamp: ${new Date().toISOString()}`);
  console.error(`Method: ${req.method} | URL: ${req.originalUrl}`);
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  console.error('---------------------------');
  
  res.status(500).json({ 
    message: 'Internal Server Error', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

export default app;
