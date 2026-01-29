import express from 'express';
import {
  generateSchedule,
  getSchedule,
  listSchedules,
  deleteSchedule,
  validateSchedule,
  publishSchedule,
  compareSchedules
} from '../controllers/scheduleController.js';

const router = express.Router();

router.post('/', generateSchedule);
router.get('/:id', getSchedule);
router.get('/', listSchedules);
router.delete('/:id', deleteSchedule);
router.post('/:id/validate', validateSchedule);
router.post('/:id/publish', publishSchedule);
router.post('/compare', compareSchedules);

export default router;

