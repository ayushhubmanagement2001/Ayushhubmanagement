import express from 'express';
import {
  getMyPayments,
  createMyPayment,
  bulkImportMyPayments,
  updateMyPayment,
  deleteMyPayment,
  bulkDeleteMyPayments,
} from '../controller/myPaymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMyPayments)
  .post(createMyPayment);

router.post('/bulk-import', bulkImportMyPayments);
router.post('/bulk-delete', bulkDeleteMyPayments);

router.route('/:id')
  .patch(updateMyPayment)
  .delete(deleteMyPayment);

export default router;
