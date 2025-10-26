// DealCoin API Server
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { dealsRouter } from './routes/deals.js';
import { merchantsRouter } from './routes/merchants.js';
import { redemptionRouter } from './routes/redemption.js';
import { qrRouter } from './routes/qr.js';
import { stakingRouter } from './routes/staking.js';
import { runAllJobs } from './jobs/staking-verification.js';
import * as cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'DealCoin API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/deals', dealsRouter);
app.use('/api/merchants', merchantsRouter);
app.use('/api/redemption', redemptionRouter);
app.use('/api/qr', qrRouter);
app.use('/api/staking', stakingRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to DealCoin API',
    version: '1.0.0',
    description: 'Web3-powered discount marketplace using cNFTs',
    endpoints: {
      deals: '/api/deals',
      merchants: '/api/merchants',
      redemption: '/api/redemption',
      qr: '/api/qr',
      health: '/health',
      docs: '/api/docs'
    }
  });
});

// API Documentation endpoint
app.get('/api/docs', (req: Request, res: Response) => {
  res.json({
    title: 'DealCoin API Documentation',
    version: '1.0.0',
    baseUrl: `http://localhost:${PORT}`,
    endpoints: {
      deals: {
        'GET /api/deals': 'Get all available deals',
        'GET /api/deals/:id': 'Get deal by ID',
        'POST /api/deals': 'Create new deal (merchant)',
        'POST /api/deals/:id/claim': 'Claim a deal (user)',
        'GET /api/deals/category/:category': 'Get deals by category',
        'GET /api/deals/location/:location': 'Get deals by location',
        'GET /api/deals/merchant/:merchantId': 'Get deals by merchant'
      },
      merchants: {
        'GET /api/merchants': 'Get all merchants',
        'GET /api/merchants/:id': 'Get merchant by ID',
        'POST /api/merchants': 'Register new merchant',
        'GET /api/merchants/:id/deals': 'Get merchant deals'
      },
      redemption: {
        'POST /api/redemption/verify': 'Verify discount for redemption',
        'POST /api/redemption/process': 'Process discount redemption',
        'GET /api/redemption/history/:userWallet': 'Get redemption history'
      },
      qr: {
        'POST /api/qr/generate': 'Generate QR code for discount',
        'POST /api/qr/scan': 'Process scanned QR code'
      }
    }
  });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Schedule background jobs
// Run verification job every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('⏰ Running scheduled staking verification job...');
  await runAllJobs();
});

// Also run on startup for immediate processing
console.log('⏰ Running initial staking verification job...');
runAllJobs().catch(err => console.error('Error running initial job:', err));

// Start server
app.listen(PORT, () => {
  console.log('🚀 DealCoin API Server Started');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⛓️  Network: ${process.env.NODE_ENV === 'production' ? 'Mainnet' : 'Devnet'}`);
  console.log(`⏰ Staking verification job scheduled to run every 6 hours`);
});

export default app;

