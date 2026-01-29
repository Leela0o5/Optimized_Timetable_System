import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  slotNumber: {
    type: Number,
    required: true
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true
  },
  startTime: {
    type: String,
    required: true  // "09:00"
  },
  endTime: {
    type: String,
    required: true  // "10:00"
  },
  duration: {
    type: Number,
    required: true  // in minutes
  },
  slotType: {
    type: String,
    enum: ['regular', 'break', 'lunch', 'extended'],
    default: 'regular'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique slot per day
timeSlotSchema.index({ day: 1, slotNumber: 1 }, { unique: true });

// Static method to generate standard college time slots
timeSlotSchema.statics.generateStandardSlots = async function() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Standard Amrita timetable structure
  const dailySlots = [
    { slotNumber: 1, startTime: '08:00', endTime: '08:50', duration: 50, slotType: 'regular' },
    { slotNumber: 2, startTime: '08:50', endTime: '09:40', duration: 50, slotType: 'regular' },
    { slotNumber: 3, startTime: '09:40', endTime: '10:30', duration: 50, slotType: 'regular' },
  
  
    { slotNumber:4 , startTime: '10:45', endTime: '11:35', duration: 50, slotType: 'regular' },
    { slotNumber: 5, startTime: '11:35', endTime: '12:25', duration: 50, slotType: 'regular' },
    { slotNumber: 6, startTime: '12:25', endTime: '13:15', duration: 50, slotType: 'regular' },
  
    { slotNumber: 7, startTime: '13:15', endTime: '14:05', duration: 50, slotType: 'lunch' }, // Lunch Break
  
    { slotNumber: 8, startTime: '14:05', endTime: '14:55', duration: 50, slotType: 'regular' },
    { slotNumber: 9, startTime: '14:55', endTime: '15:45', duration: 50, slotType: 'regular' },
    { slotNumber: 10, startTime: '15:45', endTime: '16:35', duration: 50, slotType: 'regular' },
    { slotNumber: 11, startTime: '16:35', endTime: '17:25', duration: 50, slotType: 'regular' },
    { slotNumber: 12, startTime: '17:25', endTime: '18:15', duration: 50, slotType: 'extended' }
  ];
  
  

  const slots = [];
  
  for (const day of days) {
    for (const slot of dailySlots) {
      slots.push({
        day,
        ...slot
      });
    }
  }

  try {
    // Clear existing slots and insert new ones
    await this.deleteMany({});
    await this.insertMany(slots);
    console.log('Standard time slots generated successfully');
    return slots;
  } catch (error) {
    console.error('Error generating time slots:', error);
    throw error;
  }
};

// Method to check if two time slots overlap
timeSlotSchema.methods.overlapsWith = function(otherSlot) {
  if (this.day !== otherSlot.day) {
    return false;
  }
  
  const thisStart = this.startTime;
  const thisEnd = this.endTime;
  const otherStart = otherSlot.startTime;
  const otherEnd = otherSlot.endTime;
  
  // Check for overlap
  return (thisStart < otherEnd && thisEnd > otherStart);
};

// Static method to get slots for a specific day
timeSlotSchema.statics.getSlotsForDay = async function(day) {
  return await this.find({ day, isActive: true }).sort('slotNumber');
};

// Static method to find available consecutive slots (for labs)
timeSlotSchema.statics.findConsecutiveSlots = async function(day, numberOfSlots) {
  const allSlots = await this.find({ 
    day, 
    isActive: true,
    slotType: { $ne: 'lunch' }  // Exclude lunch slots
  }).sort('slotNumber');

  const consecutiveGroups = [];
  let currentGroup = [];

  for (let i = 0; i < allSlots.length; i++) {
    if (currentGroup.length === 0) {
      currentGroup.push(allSlots[i]);
    } else {
      const lastSlot = currentGroup[currentGroup.length - 1];
      const currentSlot = allSlots[i];
      
      // Check if slots are consecutive (slot number differs by 1)
      if (currentSlot.slotNumber - lastSlot.slotNumber === 1) {
        currentGroup.push(currentSlot);
      } else {
        if (currentGroup.length >= numberOfSlots) {
          consecutiveGroups.push([...currentGroup]);
        }
        currentGroup = [currentSlot];
      }
    }
  }

  // Check last group
  if (currentGroup.length >= numberOfSlots) {
    consecutiveGroups.push(currentGroup);
  }

  return consecutiveGroups;
};

export default mongoose.model('TimeSlot', timeSlotSchema);