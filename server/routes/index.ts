import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import learningRoutes from './learning.js';
import publicRoutes from './public.js';

const router = express.Router();

// Public routes
router.use('/', publicRoutes);
router.use('/auth', authRoutes);

// Protected routes (middleware applied within modules or here if preferred)
router.use('/user', userRoutes);
router.use('/', learningRoutes);

export default router;
