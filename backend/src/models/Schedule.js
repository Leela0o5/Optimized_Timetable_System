import mongoose from 'mongoose';

const scheduleEntrySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  timeSlot: {
    slotNumber: Number,
    startTime: String,
    endTime: String
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseCode: String,
  courseName: String,
  sessionType: {
    type: String,
    enum: ['theory', 'lab'],
    required: true
  },
  section: {
    type: String,
    required: true
  },
  batch: String,  // For lab batches
  faculty: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  facultyName: String,
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  roomNumber: String,
  duration: {
    type: Number,
    default: 1  // in hours
  },
  consecutiveSlots: {
    type: Number,
    default: 1  // for multi-hour sessions
  }
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true  // "2024-2025"
  },
  semester: {
    type: String,
    enum: ['Odd', 'Even'],
    required: true
  },
  department: {
    type: String,
    required: true
  },
  generationMethod: {
    type: String,
    enum: ['genetic_algorithm', 'manual', 'hybrid'],
    default: 'genetic_algorithm'
  },
  status: {
    type: String,
    enum: ['draft', 'generating', 'completed', 'published', 'archived'],
    default: 'draft'
  },
  entries: [scheduleEntrySchema],
  
  // Algorithm metrics
  metrics: {
    fitnessScore: {
      type: Number,
      default: 0
    },
    generationNumber: {
      type: Number,
      default: 0
    },
    hardConstraintViolations: {
      type: Number,
      default: 0
    },
    softConstraintViolations: {
      type: Number,
      default: 0
    },
    computationTime: {
      type: Number,  // in seconds
      default: 0
    }
  },
  
  // Conflict tracking
  conflicts: [{
    type: {
      type: String,
      enum: [
        'faculty_double_booking',
        'room_double_booking',
        'student_section_conflict',
        'workload_exceeded',
        'room_capacity_exceeded',
        'unavailable_time_slot',
        'lab_continuity_broken'
      ]
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium'
    },
    description: String,
    affectedEntities: {
      faculty: String,
      room: String,
      course: String,
      section: String,
      timeSlot: String
    },
    resolved: {
      type: Boolean,
      default: false
    },
    resolutionNote: String
  }],
  
  // Workload distribution
  workloadDistribution: [{
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    facultyName: String,
    assignedHours: Number,
    maxHours: Number,
    theorySessions: Number,
    labSessions: Number,
    utilizationPercentage: Number
  }],
  
  // Room utilization
  roomUtilization: [{
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    },
    roomNumber: String,
    hoursBooked: Number,
    totalAvailableHours: Number,
    utilizationPercentage: Number
  }],
  
  // Optimization preferences used
  optimizationConfig: {
    prioritizeWorkloadBalance: {
      type: Boolean,
      default: true
    },
    minimizeGaps: {
      type: Boolean,
      default: true
    },
    respectPreferences: {
      type: Boolean,
      default: true
    },
    maxGenerations: {
      type: Number,
      default: 1000
    },
    populationSize: {
      type: Number,
      default: 100
    }
  },
  
  // Versions for comparison
  version: {
    type: Number,
    default: 1
  },
  parentScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    default: null
  },
  
  notes: {
    type: String,
    default: ''
  },
  
  createdBy: {
    type: String,  // Clerk user ID
    required: true
  },
  
  publishedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for performance
scheduleSchema.index({ academicYear: 1, semester: 1, department: 1 });
scheduleSchema.index({ status: 1 });
scheduleSchema.index({ createdBy: 1 });

// Method to calculate overall fitness
scheduleSchema.methods.calculateFitness = function() {
  let score = 1000;  // Start with perfect score
  
  // Heavy penalty for hard constraint violations
  score -= (this.metrics.hardConstraintViolations * 100);
  
  // Light penalty for soft constraint violations
  score -= (this.metrics.softConstraintViolations * 10);
  
  // Bonus for workload balance
  if (this.workloadDistribution.length > 0) {
    const avgUtilization = this.workloadDistribution.reduce(
      (sum, w) => sum + w.utilizationPercentage, 0
    ) / this.workloadDistribution.length;
    
    const variance = this.workloadDistribution.reduce(
      (sum, w) => sum + Math.pow(w.utilizationPercentage - avgUtilization, 2), 0
    ) / this.workloadDistribution.length;
    
    score -= Math.sqrt(variance);  // Penalize high variance
  }
  
  this.metrics.fitnessScore = Math.max(0, score);
  return this.metrics.fitnessScore;
};

// Method to detect conflicts
scheduleSchema.methods.detectConflicts = function() {
  const conflicts = [];
  const facultySchedule = new Map();
  const roomSchedule = new Map();
  const sectionSchedule = new Map();

  for (const entry of this.entries) {
    const timeKey = `${entry.day}-${entry.timeSlot.slotNumber}`;
    
    // Check faculty conflicts
    const facultyKey = entry.faculty.toString();
    if (!facultySchedule.has(facultyKey)) {
      facultySchedule.set(facultyKey, new Set());
    }
    if (facultySchedule.get(facultyKey).has(timeKey)) {
      conflicts.push({
        type: 'faculty_double_booking',
        severity: 'critical',
        description: `Faculty ${entry.facultyName} has multiple classes at ${entry.day} slot ${entry.timeSlot.slotNumber}`,
        affectedEntities: {
          faculty: entry.facultyName,
          timeSlot: timeKey
        }
      });
    }
    facultySchedule.get(facultyKey).add(timeKey);
    
    // Check room conflicts
    const roomKey = entry.room.toString();
    if (!roomSchedule.has(roomKey)) {
      roomSchedule.set(roomKey, new Set());
    }
    if (roomSchedule.get(roomKey).has(timeKey)) {
      conflicts.push({
        type: 'room_double_booking',
        severity: 'critical',
        description: `Room ${entry.roomNumber} is double-booked at ${entry.day} slot ${entry.timeSlot.slotNumber}`,
        affectedEntities: {
          room: entry.roomNumber,
          timeSlot: timeKey
        }
      });
    }
    roomSchedule.get(roomKey).add(timeKey);
    
    // Check section conflicts (students can't be in two places)
    const sectionKey = `${entry.section}`;
    if (!sectionSchedule.has(sectionKey)) {
      sectionSchedule.set(sectionKey, new Set());
    }
    if (sectionSchedule.get(sectionKey).has(timeKey)) {
      conflicts.push({
        type: 'student_section_conflict',
        severity: 'critical',
        description: `Section ${entry.section} has overlapping classes at ${entry.day} slot ${entry.timeSlot.slotNumber}`,
        affectedEntities: {
          section: entry.section,
          timeSlot: timeKey
        }
      });
    }
    sectionSchedule.get(sectionKey).add(timeKey);
  }

  this.conflicts = conflicts;
  this.metrics.hardConstraintViolations = conflicts.filter(c => c.severity === 'critical').length;
  return conflicts;
};

export default mongoose.model('Schedule', scheduleSchema);