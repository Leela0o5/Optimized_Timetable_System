import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  building: {
    type: String,
    required: true
  },
  floor: {
    type: Number,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    enum: ['classroom', 'lab', 'seminar_hall', 'auditorium'],
    required: true
  },
  labType: {
    type: String,
    enum: ['computer', 'physics', 'chemistry', 'biology', 'electronics', 'mechanical', 'general', null],
    default: null
  },
  facilities: {
    hasProjector: {
      type: Boolean,
      default: false
    },
    hasAC: {
      type: Boolean,
      default: false
    },
    hasComputers: {
      type: Boolean,
      default: false
    },
    computerCount: {
      type: Number,
      default: 0
    },
    hasWhiteboard: {
      type: Boolean,
      default: true
    },
    hasSmartBoard: {
      type: Boolean,
      default: false
    },
    hasSoundSystem: {
      type: Boolean,
      default: false
    }
  },
  availability: {
    monday: [{
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }],
    tuesday: [{
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }],
    wednesday: [{
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }],
    thursday: [{
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }],
    friday: [{
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }],
    saturday: [{
      startTime: String,
      endTime: String,
      isAvailable: {
        type: Boolean,
        default: true
      }
    }]
  },
  maintenance: [{
    startDate: Date,
    endDate: Date,
    reason: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 5,  // 1-10, higher means preferred
    min: 1,
    max: 10
  }
}, {
  timestamps: true
});

// Indexes
roomSchema.index({ roomNumber: 1, building: 1 });
roomSchema.index({ type: 1, capacity: 1 });

// Method to check if room is suitable for a course
roomSchema.methods.isSuitableFor = function(course, sessionType) {
  // Check capacity
  const maxSectionStrength = Math.max(...course.sections.map(s => s.strength));
  if (this.capacity < maxSectionStrength) {
    return false;
  }

  // Check room type
  if (sessionType === 'lab') {
    if (this.type !== 'lab') {
      return false;
    }
    
    // Check specific lab type if required
    if (course.roomRequirements.lab.specificLabType) {
      if (this.labType !== course.roomRequirements.lab.specificLabType.toLowerCase()) {
        return false;
      }
    }
    
    // Check if computers are needed
    if (course.roomRequirements.lab.needsLabEquipment) {
      if (!this.facilities.hasComputers && course.roomRequirements.lab.specificLabType === 'Computer Lab') {
        return false;
      }
    }
  } else if (sessionType === 'theory') {
    // Theory classes can be in classrooms or seminar halls
    if (this.type !== 'classroom' && this.type !== 'seminar_hall') {
      return false;
    }
    
    // Check projector requirement
    if (course.roomRequirements.theory.needsProjector && !this.facilities.hasProjector) {
      return false;
    }
    
    // Check computer requirement
    if (course.roomRequirements.theory.needsComputers && !this.facilities.hasComputers) {
      return false;
    }
  }

  return true;
};

// Method to check availability at specific time
roomSchema.methods.isAvailableAt = function(day, startTime, endTime) {
  const dayLower = day.toLowerCase();
  const dayAvailability = this.availability[dayLower];
  
  if (!dayAvailability || dayAvailability.length === 0) {
    return false;
  }

  for (let slot of dayAvailability) {
    if (slot.isAvailable && startTime >= slot.startTime && endTime <= slot.endTime) {
      return true;
    }
  }
  
  return false;
};

export default mongoose.model('Room', roomSchema);