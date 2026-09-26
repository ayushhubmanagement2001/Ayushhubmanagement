import express from 'express';
import { sendReportEmail } from '../controller/emailController.js';

const router = express.Router();

// POST /api/email/send-report
router.post('/send-report', sendReportEmail);

export default router;
