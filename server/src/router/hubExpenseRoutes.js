import express from 'express';
import {
  getHubExpenses,
  createHubExpense,
  bulkImportHubExpenses,
  updateHubExpense,
  deleteHubExpense,
  bulkDeleteHubExpenses,
} from '../controller/hubExpenseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getHubExpenses)
  .post(createHubExpense);

router.post('/bulk-import', bulkImportHubExpenses);
router.post('/bulk-delete', bulkDeleteHubExpenses);

router.route('/:id')
  .patch(updateHubExpense)
  .delete(deleteHubExpense);

export default router;
