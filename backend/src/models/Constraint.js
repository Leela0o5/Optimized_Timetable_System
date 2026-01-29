import mongoose from 'mongoose';

const constraintSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['hard', 'soft'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'faculty_workload',
      'room_allocation',
      'time_slot',
      'student_section',
      'lab_continuity',
      'elective_grouping',
      'preference',
      'institutional_policy'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  weight: {
    type: Number,
    min: 0,
    max: 100,
    default: 10  // Used in fitness calculation
  },
  isActive: {
    type: Boolean,
    default: true
  },
  parameters: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for querying
constraintSchema.index({ type: 1, category: 1 });

// Static method to get default institutional constraints
constraintSchema.statics.getDefaultConstraints = function() {
  return [
    // HARD CONSTRAINTS (Must be satisfied)
    {
      name: 'No Faculty Double Booking',
      type: 'hard',
      category: 'faculty_workload',
      description: 'A faculty member cannot be assigned to multiple classes at the same time',
      priority: 10,
      weight: 100,
      isActive: true
    },
    {
      name: 'No Room Double Booking',
      type: 'hard',
      category: 'room_allocation',
      description: 'A room cannot be assigned to multiple classes at the same time',
      priority: 10,
      weight: 100,
      isActive: true
    },
    {
      name: 'No Student Section Conflict',
      type: 'hard',
      category: 'student_section',
      description: 'Students of a section cannot have multiple classes at the same time',
      priority: 10,
      weight: 100,
      isActive: true
    },
    {
      name: 'Lab Session Continuity',
      type: 'hard',
      category: 'lab_continuity',
      description: 'Lab sessions must be scheduled in consecutive time slots without breaks',
      priority: 9,
      weight: 90,
      isActive: true
    },
    {
      name: 'Room Capacity Check',
      type: 'hard',
      category: 'room_allocation',
      description: 'Room capacity must be sufficient for the section strength',
      priority: 9,
      weight: 90,
      isActive: true
    },
    {
      name: 'Faculty Qualification Match',
      type: 'hard',
      category: 'faculty_workload',
      description: 'Faculty must be qualified to teach the assigned course',
      priority: 9,
      weight: 90,
      isActive: true
    },
    {
      name: 'Faculty Availability',
      type: 'hard',
      category: 'time_slot',
      description: 'Classes must be scheduled during faculty available hours',
      priority: 9,
      weight: 90,
      isActive: true
    },
    {
      name: 'Elective Group No Overlap',
      type: 'hard',
      category: 'elective_grouping',
      description: 'Electives in the same group must not be scheduled at the same time',
      priority: 8,
      weight: 80,
      isActive: true
    },
    
    // SOFT CONSTRAINTS (Preferably satisfied)
    {
      name: 'Faculty Max Hours Per Week',
      type: 'soft',
      category: 'faculty_workload',
      description: 'Faculty teaching hours should not exceed maximum weekly limit',
      priority: 8,
      weight: 70,
      isActive: true,
      parameters: {
        maxHours: 18
      }
    },
    {
      name: 'Faculty Min Hours Per Week',
      type: 'soft',
      category: 'faculty_workload',
      description: 'Faculty should be assigned minimum teaching hours',
      priority: 7,
      weight: 60,
      isActive: true,
      parameters: {
        minHours: 12
      }
    },
    {
      name: 'Workload Balance',
      type: 'soft',
      category: 'faculty_workload',
      description: 'Teaching load should be balanced across faculty members',
      priority: 7,
      weight: 60,
      isActive: true
    },
    {
      name: 'Minimize Student Gaps',
      type: 'soft',
      category: 'student_section',
      description: 'Minimize idle time between classes for students',
      priority: 6,
      weight: 50,
      isActive: true
    },
    {
      name: 'Faculty Preferred Time Slots',
      type: 'soft',
      category: 'preference',
      description: 'Try to assign classes during faculty preferred time slots',
      priority: 5,
      weight: 40,
      isActive: true
    },
    {
      name: 'Avoid Faculty Consecutive Hours',
      type: 'soft',
      category: 'faculty_workload',
      description: 'Faculty should not teach more than 3 consecutive hours',
      priority: 6,
      weight: 50,
      isActive: true,
      parameters: {
        maxConsecutive: 3
      }
    },
    {
      name: 'Balanced Daily Distribution',
      type: 'soft',
      category: 'time_slot',
      description: 'Classes should be distributed evenly across days of the week',
      priority: 5,
      weight: 40,
      isActive: true
    },
    {
      name: 'Course Preferred Days',
      type: 'soft',
      category: 'preference',
      description: 'Schedule courses on their preferred days when possible',
      priority: 4,
      weight: 30,
      isActive: true
    },
    {
      name: 'Room Utilization Optimization',
      type: 'soft',
      category: 'room_allocation',
      description: 'Optimize room usage to avoid under-utilization',
      priority: 4,
      weight: 30,
      isActive: true
    },
    {
      name: 'Lab Type Match',
      type: 'soft',
      category: 'room_allocation',
      description: 'Assign labs to rooms with appropriate equipment',
      priority: 7,
      weight: 60,
      isActive: true
    }
  ];
};

// Method to check if a constraint is violated
constraintSchema.methods.checkViolation = function(scheduleData) {
  // This will be implemented based on specific constraint logic
  // Returns { violated: boolean, details: string }
  return {
    violated: false,
    details: 'Constraint check not implemented'
  };
};

export default mongoose.model('Constraint', constraintSchema);