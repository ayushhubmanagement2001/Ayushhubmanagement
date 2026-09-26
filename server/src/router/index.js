import express from 'express';
import authRoutes from './authRoutes.js';
import companyRoutes from './companyRoutes.js';
import riderPayoutRoutes from './riderPayoutRoutes.js';
import lossDetailRoutes from './lossDetailRoutes.js';
import hubExpenseRoutes from './hubExpenseRoutes.js';
import paymentLedgerRoutes from './paymentLedgerRoutes.js';
import advanceRoutes from './advanceRoutes.js';
import myPaymentRoutes from './myPaymentRoutes.js';
import emailRoutes from './emailRoutes.js';

const router = express.Router();

// API Health Check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Ayush Rider Portal API Server is running smoothly!',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/rider-payouts', riderPayoutRoutes);
router.use('/loss-details', lossDetailRoutes);
router.use('/hub-expenses', hubExpenseRoutes);
router.use('/payments', paymentLedgerRoutes);
router.use('/advances', advanceRoutes);
router.use('/my-payments', myPaymentRoutes);
router.use('/email', emailRoutes);

export default router;
