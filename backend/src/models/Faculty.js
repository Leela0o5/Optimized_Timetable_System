import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema({
  facultyId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  department: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'],
    default: 'Assistant Professor'
  },
  subjects: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    courseName: String,
    canTeach: {
      type: Boolean,
      default: true
    }
  }],
  availability: {
    monday: [{
      startTime: String,    // "09:00"
      endTime: String       // "17:00"
    }],
    tuesday: [{
      startTime: String,
      endTime: String
    }],
    wednesday: [{
      startTime: String,
      endTime: String
    }],
    thursday: [{
      startTime: String,
      endTime: String
    }],
    friday: [{
      startTime: String,
      endTime: String
    }],
    saturday: [{
      startTime: String,
      endTime: String
    }]
  },
  preferences: {
    preferredTimeSlots: [{
      day: String,
      startTime: String,
      endTime: String
    }],
    avoidTimeSlots: [{
      day: String,
      startTime: String,
      endTime: String
    }],
    maxConsecutiveHours: {
      type: Number,
      default: 3
    },
    preferredGapBetweenClasses: {
      type: Number,
      default: 0  // in hours
    }
  },
  workload: {
    maxHoursPerWeek: {
      type: Number,
      default: 18,
      min: 0,
      max: 30
    },
    currentHoursAssigned: {
      type: Number,
      default: 0
    },
    minHoursPerWeek: {
      type: Number,
      default: 12
    }
  },
  constraints: {
    canTakeLabSessions: {
      type: Boolean,
      default: true
    },
    maxLabSessionsPerWeek: {
      type: Number,
      default: 4
    },
    requiresProjector: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  leaveRequests: [{
    startDate: Date,
    endDate: Date,
    reason: String
  }]
}, {
  timestamps: true
});

// Index for faster queries
facultySchema.index({ facultyId: 1, department: 1 });

// Virtual for total hours assigned
facultySchema.virtual('hoursRemaining').get(function() {
  return this.workload.maxHoursPerWeek - this.workload.currentHoursAssigned;
});

// Method to check if faculty is available at a given time
facultySchema.methods.isAvailableAt = function(day, startTime, endTime) {
  const dayLower = day.toLowerCase();
  const dayAvailability = this.availability[dayLower];
  
  if (!dayAvailability || dayAvailability.length === 0) {
    return false;
  }

  // Check if the requested time falls within any availability window
  for (let slot of dayAvailability) {
    if (startTime >= slot.startTime && endTime <= slot.endTime) {
      return true;
    }
  }
  
  return false;
};

export default mongoose.model('Faculty', facultySchema);