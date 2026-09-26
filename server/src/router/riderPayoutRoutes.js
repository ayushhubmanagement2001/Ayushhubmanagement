import express from 'express';
import {
  getRiderPayouts,
  createRiderPayout,
  bulkImportRiderPayouts,
  updateRiderPayout,
  deleteRiderPayout,
  bulkDeleteRiderPayouts,
  sendPayoutEmail,
} from '../controller/riderPayoutController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getRiderPayouts)
  .post(createRiderPayout);

router.post('/bulk-import', bulkImportRiderPayouts);
router.post('/bulk-delete', bulkDeleteRiderPayouts);
router.post('/send-email', sendPayoutEmail);

router.route('/:id')
  .patch(updateRiderPayout)
  .delete(deleteRiderPayout);

export default router;
