import Schedule from '../models/Schedule.js';
import Course from '../models/Course.js';
import Faculty from '../models/Faculty.js';
import Room from '../models/Room.js';
import TimeSlot from '../models/TimeSlot.js';
import Constraint from '../models/Constraint.js';
import GeneticAlgorithm from '../services/genericAlgorithm.js';
import ConstraintChecker from '../services/constraintChecker.js';

/**
 * Generate a new timetable schedule
 */
export const generateSchedule = async (req, res) => {
  try {
    const {
      name,
      academicYear,
      semester,
      department,
      optimizationConfig
    } = req.body;

    const userId = req.auth?.userId || 'system';

    console.log(`Starting schedule generation for ${department} - ${academicYear} ${semester}`);

    // Fetch all required data
    const courses = await Course.find({ 
      department, 
      isActive: true 
    }).populate('sections.assignedFaculty.theory sections.assignedFaculty.lab');

    const faculty = await Faculty.find({ 
      department, 
      isActive: true 
    });

    const rooms = await Room.find({ 
      isActive: true 
    });

    const timeSlots = await TimeSlot.find({ 
      isActive: true 
    }).sort('day slotNumber');

    const constraints = await Constraint.find({ 
      isActive: true 
    });

    if (courses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No courses found for the specified department'
      });
    }

    if (faculty.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No faculty found for the specified department'
      });
    }

    if (rooms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rooms found'
      });
    }

    if (timeSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No time slots configured. Please initialize time slots first.'
      });
    }

    // Create draft schedule
    const schedule = new Schedule({
      name: name || `${department} ${semester} ${academicYear}`,
      academicYear,
      semester,
      department,
      status: 'generating',
      optimizationConfig: optimizationConfig || {},
      createdBy: userId,
      entries: [],
      conflicts: [],
      metrics: {
        fitnessScore: 0,
        generationNumber: 0,
        hardConstraintViolations: 0,
        softConstraintViolations: 0
      }
    });

    await schedule.save();

    // Setup WebSocket or SSE for progress updates
    const progressCallback = async (progress) => {
      console.log(`Generation ${progress.generation}/${progress.maxGenerations}: ` +
                  `Fitness ${progress.bestFitness.toFixed(2)}, ` +
                  `Hard Violations: ${progress.hardViolations}`);
      
      // Update schedule with progress
      schedule.metrics.generationNumber = progress.generation;
      schedule.metrics.fitnessScore = progress.bestFitness;
      await schedule.save();
    };

    // Initialize Genetic Algorithm
    const ga = new GeneticAlgorithm({
      populationSize: optimizationConfig?.populationSize || 100,
      maxGenerations: optimizationConfig?.maxGenerations || 1000,
      mutationRate: optimizationConfig?.mutationRate || 0.1,
      crossoverRate: optimizationConfig?.crossoverRate || 0.8
    });

    ga.initialize({
      courses: courses.map(c => c.toObject()),
      faculty: faculty.map(f => f.toObject()),
      rooms: rooms.map(r => r.toObject()),
      timeSlots: timeSlots.map(t => t.toObject()),
      constraints: constraints.map(c => c.toObject())
    });

    // Run optimization
    const result = await ga.optimize(progressCallback);

    // Convert genes to schedule entries
    const entries = result.schedule.genes.map(gene => ({
      day: gene.timeSlot.day,
      timeSlot: {
        slotNumber: gene.timeSlot.slotNumber,
        startTime: gene.timeSlot.startTime,
        endTime: gene.timeSlot.endTime
      },
      course: gene.courseId,
      courseCode: gene.courseCode,
      courseName: gene.courseName,
      sessionType: gene.sessionType,
      section: gene.section,
      faculty: gene.facultyId,
      facultyName: gene.facultyName,
      room: gene.roomId,
      roomNumber: gene.roomNumber,
      duration: gene.duration,
      consecutiveSlots: gene.consecutiveSlots
    }));

    schedule.entries = entries;
    schedule.status = 'completed';
    schedule.metrics = {
      fitnessScore: result.schedule.fitness,
      generationNumber: result.generations.length,
      hardConstraintViolations: result.schedule.hardViolations,
      softConstraintViolations: result.schedule.softViolations,
      computationTime: result.computationTime
    };

    // Detect conflicts
    const detectedConflicts = schedule.detectConflicts();
    schedule.conflicts = detectedConflicts;

    // Calculate workload distribution
    const workloadDist = calculateWorkloadDistribution(entries, faculty);
    schedule.workloadDistribution = workloadDist;

    // Calculate room utilization
    const roomUtil = calculateRoomUtilization(entries, rooms, timeSlots);
    schedule.roomUtilization = roomUtil;

    await schedule.save();

    res.status(201).json({
      success: true,
      message: 'Schedule generated successfully',
      data: {
        scheduleId: schedule._id,
        metrics: schedule.metrics,
        conflicts: schedule.conflicts.length,
        workloadDistribution: schedule.workloadDistribution,
        generationHistory: result.generations.slice(-10)  // Last 10 generations
      }
    });

  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating schedule',
      error: error.message
    });
  }
};

/**
 * Get schedule by ID
 */
export const getSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('entries.course')
      .populate('entries.faculty')
      .populate('entries.room');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schedule',
      error: error.message
    });
  }
};

/**
 * List all schedules
 */
export const listSchedules = async (req, res) => {
  try {
    const { department, academicYear, semester, status } = req.query;
    
    const filter = {};
    if (department) filter.department = department;
    if (academicYear) filter.academicYear = academicYear;
    if (semester) filter.semester = semester;
    if (status) filter.status = status;

    const schedules = await Schedule.find(filter)
      .sort('-createdAt')
      .select('name academicYear semester department status metrics createdAt');

    res.json({
      success: true,
      data: schedules
    });

  } catch (error) {
    console.error('Error listing schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing schedules',
      error: error.message
    });
  }
};

/**
 * Delete schedule
 */
export const deleteSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting schedule',
      error: error.message
    });
  }
};

/**
 * Validate schedule against constraints
 */
export const validateSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const courses = await Course.find({ department: schedule.department });
    const faculty = await Faculty.find({ department: schedule.department });
    const rooms = await Room.find();
    const constraints = await Constraint.find({ isActive: true });

    const checker = new ConstraintChecker();
    const violations = checker.validateSchedule(
      schedule,
      courses,
      faculty,
      rooms,
      constraints
    );

    const summary = checker.getSummary(violations);

    res.json({
      success: true,
      data: {
        violations,
        summary
      }
    });

  } catch (error) {
    console.error('Error validating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating schedule',
      error: error.message
    });
  }
};

/**
 * Publish schedule
 */
export const publishSchedule = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    schedule.status = 'published';
    schedule.publishedAt = new Date();
    await schedule.save();

    res.json({
      success: true,
      message: 'Schedule published successfully',
      data: schedule
    });

  } catch (error) {
    console.error('Error publishing schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Error publishing schedule',
      error: error.message
    });
  }
};

/**
 * Compare two schedules
 */
export const compareSchedules = async (req, res) => {
  try {
    const { scheduleId1, scheduleId2 } = req.query;

    const schedule1 = await Schedule.findById(scheduleId1);
    const schedule2 = await Schedule.findById(scheduleId2);

    if (!schedule1 || !schedule2) {
      return res.status(404).json({
        success: false,
        message: 'One or both schedules not found'
      });
    }

    const comparison = {
      schedule1: {
        id: schedule1._id,
        name: schedule1.name,
        fitness: schedule1.metrics.fitnessScore,
        hardViolations: schedule1.metrics.hardConstraintViolations,
        softViolations: schedule1.metrics.softConstraintViolations,
        conflicts: schedule1.conflicts.length
      },
      schedule2: {
        id: schedule2._id,
        name: schedule2.name,
        fitness: schedule2.metrics.fitnessScore,
        hardViolations: schedule2.metrics.hardConstraintViolations,
        softViolations: schedule2.metrics.softConstraintViolations,
        conflicts: schedule2.conflicts.length
      },
      differences: {
        fitness: schedule1.metrics.fitnessScore - schedule2.metrics.fitnessScore,
        hardViolations: schedule1.metrics.hardConstraintViolations - schedule2.metrics.hardConstraintViolations,
        softViolations: schedule1.metrics.softConstraintViolations - schedule2.metrics.softConstraintViolations
      },
      recommendation: schedule1.metrics.fitnessScore > schedule2.metrics.fitnessScore ? 'schedule1' : 'schedule2'
    };

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    console.error('Error comparing schedules:', error);
    res.status(500).json({
      success: false,
      message: 'Error comparing schedules',
      error: error.message
    });
  }
};

// Helper functions
function calculateWorkloadDistribution(entries, faculty) {
  const workload = new Map();
  
  for (const entry of entries) {
    const facultyId = entry.faculty.toString();
    const current = workload.get(facultyId) || { hours: 0, theory: 0, lab: 0 };
    
    current.hours += entry.duration || 1;
    if (entry.sessionType === 'theory') {
      current.theory += 1;
    } else {
      current.lab += 1;
    }
    
    workload.set(facultyId, current);
  }

  const distribution = [];
  for (const facultyMember of faculty) {
    const assigned = workload.get(facultyMember._id.toString()) || { hours: 0, theory: 0, lab: 0 };
    const maxHours = facultyMember.workload?.maxHoursPerWeek || 18;
    
    distribution.push({
      facultyId: facultyMember._id,
      facultyName: facultyMember.name,
      assignedHours: assigned.hours,
      maxHours,
      theorySessions: assigned.theory,
      labSessions: assigned.lab,
      utilizationPercentage: Math.round((assigned.hours / maxHours) * 100)
    });
  }

  return distribution;
}

function calculateRoomUtilization(entries, rooms, timeSlots) {
  const roomUsage = new Map();
  const totalSlots = timeSlots.filter(t => t.slotType !== 'lunch').length;

  for (const entry of entries) {
    const roomId = entry.room.toString();
    const current = roomUsage.get(roomId) || 0;
    roomUsage.set(roomId, current + 1);
  }

  const utilization = [];
  for (const room of rooms) {
    const booked = roomUsage.get(room._id.toString()) || 0;
    
    utilization.push({
      roomId: room._id,
      roomNumber: room.roomNumber,
      hoursBooked: booked,
      totalAvailableHours: totalSlots,
      utilizationPercentage: Math.round((booked / totalSlots) * 100)
    });
  }

  return utilization;
}
