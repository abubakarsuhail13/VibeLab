import express from 'express';
import authRoutes from './auth.js';
import userRoutes from './user.js';
import learningRoutes from './learning.js';
import publicRoutes from './public.js';
import tutorRoutes from './tutor.js';
import teacherRoutes from './teacher.js';
import ideationRoutes from './ideation.js';
import productCreationRoutes from './productCreation.js';

const router = express.Router();

// Public routes
router.use('/', publicRoutes);
router.use('/auth', authRoutes);
router.use('/ideation', ideationRoutes);
router.use('/product', productCreationRoutes);


// Protected routes (middleware applied within modules or here if preferred)
router.use('/user', userRoutes);
router.use('/tutor', tutorRoutes);
router.use('/teacher', teacherRoutes);
router.use('/', learningRoutes);

export default router;
