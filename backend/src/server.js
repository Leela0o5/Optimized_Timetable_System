import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/database.js';
import errorHandler from './middleware/errorHandler.js';

// Import routes
import scheduleRoutes from './routes/scheduleRoutes.js';
import facultyRoutes from './routes/facultyRoutes.js';
import courseRoutes from './routes/courseRoutes.js';

// Import models for initialization
import TimeSlot from './models/TimeSlot.js';
import Constraint from './models/Constraint.js';
import Room from './models/Room.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/schedules', scheduleRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/courses', courseRoutes);

// Initialize time slots endpoint
app.post('/api/init/timeslots', async (req, res) => {
  try {
    await TimeSlot.generateStandardSlots();
    res.json({
      success: true,
      message: 'Time slots initialized successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error initializing time slots',
      error: error.message
    });
  }
});

// Initialize constraints endpoint
app.post('/api/init/constraints', async (req, res) => {
  try {
    const defaultConstraints = Constraint.getDefaultConstraints();
    
    // Clear existing and insert defaults
    await Constraint.deleteMany({});
    await Constraint.insertMany(defaultConstraints);
    
    res.json({
      success: true,
      message: 'Constraints initialized successfully',
      count: defaultConstraints.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error initializing constraints',
      error: error.message
    });
  }
});

// Room routes (simple CRUD)
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find();
    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const room = new Room(req.body);
    await room.save();
    res.status(201).json({ success: true, data: room });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// TimeSlot routes
app.get('/api/timeslots', async (req, res) => {
  try {
    const { day } = req.query;
    const filter = day ? { day } : {};
    const timeslots = await TimeSlot.find(filter).sort('slotNumber');
    res.json({ success: true, data: timeslots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Constraint routes
app.get('/api/constraints', async (req, res) => {
  try {
    const constraints = await Constraint.find();
    res.json({ success: true, data: constraints });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use(errorHandler);

// Connect to database and start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n Server running on port ${PORT}`);
      console.log(` API URL: http://localhost:${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
      console.log(`\n Ready to accept requests!\n`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  });

// shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;