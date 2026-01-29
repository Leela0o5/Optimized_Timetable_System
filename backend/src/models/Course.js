import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true
  },
  semester: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  credits: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  type: {
    type: String,
    enum: ['theory', 'lab', 'theory+lab'],
    required: true
  },
  theoryHours: {
    hoursPerWeek: {
      type: Number,
      default: 0
    },
    sessionDuration: {
      type: Number,
      default: 1  // in hours
    }
  },
  labHours: {
    hoursPerWeek: {
      type: Number,
      default: 0
    },
    sessionDuration: {
      type: Number,
      default: 2  // lab sessions are typically 2-3 hours
    },
    requiresContinuousSlots: {
      type: Boolean,
      default: true  // labs need consecutive time slots
    }
  },
  sections: [{
    sectionName: {
      type: String,
      required: true  // "A", "B", "C"
    },
    strength: {
      type: Number,
      required: true,
      min: 1
    },
    batch: {
      type: String,
      default: null  // For lab batches like "A1", "A2"
    },
    assignedFaculty: {
      theory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
      },
      lab: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty'
      }
    }
  }],
  isElective: {
    type: Boolean,
    default: false
  },
  electiveGroup: {
    type: String,
    default: null  // Electives in same group can't be scheduled at same time
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  roomRequirements: {
    theory: {
      needsProjector: {
        type: Boolean,
        default: false
      },
      needsComputers: {
        type: Boolean,
        default: false
      },
      minCapacity: {
        type: Number,
        default: 30
      }
    },
    lab: {
      needsLabEquipment: {
        type: Boolean,
        default: true
      },
      specificLabType: {
        type: String,
        default: null  // "Computer Lab", "Hardware Lab", etc.
      },
      minCapacity: {
        type: Number,
        default: 15
      }
    }
  },
  constraints: {
    preferredDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }],
    avoidDays: [{
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    }],
    preferredTimeSlot: {
      type: String,
      enum: ['morning', 'afternoon', 'any'],
      default: 'any'
    },
    maxGapBetweenLectures: {
      type: Number,
      default: 2  // in days
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
courseSchema.index({ courseCode: 1, department: 1 });
courseSchema.index({ semester: 1, department: 1 });

// Virtual for total hours per week
courseSchema.virtual('totalHoursPerWeek').get(function() {
  return this.theoryHours.hoursPerWeek + this.labHours.hoursPerWeek;
});

// Method to calculate total sessions needed per week
courseSchema.methods.getSessionsRequired = function() {
  let sessions = [];
  
  // Theory sessions
  if (this.theoryHours.hoursPerWeek > 0) {
    const theorySessions = Math.ceil(
      this.theoryHours.hoursPerWeek / this.theoryHours.sessionDuration
    );
    for (let i = 0; i < theorySessions; i++) {
      sessions.push({
        type: 'theory',
        duration: this.theoryHours.sessionDuration
      });
    }
  }
  
  // Lab sessions
  if (this.labHours.hoursPerWeek > 0) {
    const labSessions = Math.ceil(
      this.labHours.hoursPerWeek / this.labHours.sessionDuration
    );
    for (let i = 0; i < labSessions; i++) {
      sessions.push({
        type: 'lab',
        duration: this.labHours.sessionDuration,
        needsContinuous: this.labHours.requiresContinuousSlots
      });
    }
  }
  
  return sessions;
};

export default mongoose.model('Course', courseSchema);