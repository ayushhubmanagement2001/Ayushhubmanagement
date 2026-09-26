import express from 'express';
import {
  getPayments,
  updatePaymentStatus,
  createPayment,
  deletePayment,
  bulkDeletePayments,
} from '../controller/paymentLedgerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPayments)
  .post(createPayment);

router.post('/bulk-delete', bulkDeletePayments);

router.route('/:id')
  .delete(deletePayment);

router.patch('/:id/status', updatePaymentStatus);

export default router;
