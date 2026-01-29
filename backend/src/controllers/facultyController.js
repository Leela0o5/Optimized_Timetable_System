import Faculty from '../models/Faculty.js';

export const createFaculty = async (req, res) => {
  try {
    const faculty = new Faculty(req.body);
    await faculty.save();
    res.status(201).json({ success: true, data: faculty });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getAllFaculty = async (req, res) => {
  try {
    const { department } = req.query;
    const filter = department ? { department } : {};
    const faculty = await Faculty.find(filter);
    res.json({ success: true, data: faculty });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getFacultyById = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    res.json({ success: true, data: faculty });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    res.json({ success: true, data: faculty });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByIdAndDelete(req.params.id);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    res.json({ success: true, message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
