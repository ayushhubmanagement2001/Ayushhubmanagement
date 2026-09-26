import express from 'express';
import {
  getLossDetails,
  createLossDetail,
  bulkImportLossDetails,
  updateLossDetail,
  deleteLossDetail,
  bulkDeleteLossDetails,
} from '../controller/lossDetailController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getLossDetails)
  .post(createLossDetail);

router.post('/bulk-import', bulkImportLossDetails);
router.post('/bulk-delete', bulkDeleteLossDetails);

router.route('/:id')
  .patch(updateLossDetail)
  .delete(deleteLossDetail);

export default router;
