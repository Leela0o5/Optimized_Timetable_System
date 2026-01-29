import express from 'express';
import {
  createFaculty,
  getAllFaculty,
  getFacultyById,
  updateFaculty,
  deleteFaculty
} from '../controllers/facultyController.js';

const router = express.Router();

router.post('/', createFaculty);
router.get('/', getAllFaculty);
router.get('/:id', getFacultyById);
router.put('/:id', updateFaculty);
router.delete('/:id', deleteFaculty);

export default router;

