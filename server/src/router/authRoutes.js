import express from 'express';
import {
  loginAdmin,
  getProfile,
  updateProfile,
  uploadAvatar,
} from '../controller/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public route: Only login is accessible
router.post('/login', loginAdmin);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/upload-avatar', protect, upload.single('avatar'), uploadAvatar);

export default router;
