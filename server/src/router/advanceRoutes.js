import express from 'express';
import {
  getAdvances,
  getOutstandingAdvances,
  carryForwardAdvances,
  createAdvance,
  bulkImportAdvances,
  updateAdvance,
  deleteAdvance,
  bulkDeleteAdvances,
} from '../controller/advanceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAdvances)
  .post(createAdvance);

router.get('/outstanding', getOutstandingAdvances);
router.post('/carry-forward', carryForwardAdvances);
router.post('/bulk-import', bulkImportAdvances);
router.post('/bulk-delete', bulkDeleteAdvances);

router.route('/:id')
  .patch(updateAdvance)
  .delete(deleteAdvance);

export default router;
