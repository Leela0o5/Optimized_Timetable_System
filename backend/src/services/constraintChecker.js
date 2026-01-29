class ConstraintChecker {
    constructor() {
      this.hardConstraints = [];
      this.softConstraints = [];
    }
  
    /**
     * Validate a complete schedule against all constraints
     */
    validateSchedule(schedule, courses, faculty, rooms, constraints) {
      const violations = {
        hard: [],
        soft: []
      };
  
      // Check each constraint
      for (const constraint of constraints) {
        if (!constraint.isActive) continue;
  
        const result = this.checkConstraint(constraint, schedule, courses, faculty, rooms);
        
        if (result.violated) {
          if (constraint.type === 'hard') {
            violations.hard.push({
              constraint: constraint.name,
              category: constraint.category,
              description: constraint.description,
              details: result.details,
              count: result.count || 1
            });
          } else {
            violations.soft.push({
              constraint: constraint.name,
              category: constraint.category,
              description: constraint.description,
              details: result.details,
              count: result.count || 1,
              weight: constraint.weight
            });
          }
        }
      }
  
      return violations;
    }
  
    /**
     * Check a specific constraint
     */
    checkConstraint(constraint, schedule, courses, faculty, rooms) {
      switch (constraint.category) {
        case 'faculty_workload':
          return this.checkFacultyWorkloadConstraint(constraint, schedule, faculty);
        
        case 'room_allocation':
          return this.checkRoomAllocationConstraint(constraint, schedule, rooms);
        
        case 'time_slot':
          return this.checkTimeSlotConstraint(constraint, schedule);
        
        case 'student_section':
          return this.checkStudentSectionConstraint(constraint, schedule);
        
        case 'lab_continuity':
          return this.checkLabContinuityConstraint(constraint, schedule);
        
        case 'elective_grouping':
          return this.checkElectiveGroupingConstraint(constraint, schedule, courses);
        
        default:
          return { violated: false };
      }
    }
  
    /**
     * Check faculty workload constraints
     */
    checkFacultyWorkloadConstraint(constraint, schedule, faculty) {
      const facultyHours = new Map();
  
      // Calculate hours for each faculty
      for (const entry of schedule.entries) {
        const facultyId = entry.faculty.toString();
        const current = facultyHours.get(facultyId) || 0;
        facultyHours.set(facultyId, current + (entry.duration || 1));
      }
  
      const violations = [];
  
      for (const facultyMember of faculty) {
        const assigned = facultyHours.get(facultyMember._id.toString()) || 0;
        const max = facultyMember.workload?.maxHoursPerWeek || 18;
        const min = facultyMember.workload?.minHoursPerWeek || 12;
  
        if (constraint.name.includes('Max') && assigned > max) {
          violations.push({
            faculty: facultyMember.name,
            assigned,
            max,
            violation: assigned - max
          });
        }
  
        if (constraint.name.includes('Min') && assigned < min) {
          violations.push({
            faculty: facultyMember.name,
            assigned,
            min,
            violation: min - assigned
          });
        }
      }
  
      return {
        violated: violations.length > 0,
        count: violations.length,
        details: violations
      };
    }
  
    /**
     * Check room allocation constraints
     */
    checkRoomAllocationConstraint(constraint, schedule, rooms) {
      const roomMap = new Map(rooms.map(r => [r._id.toString(), r]));
      const violations = [];
  
      // Check for double booking
      if (constraint.name.includes('Double Booking')) {
        const roomTimeSlots = new Map();
  
        for (const entry of schedule.entries) {
          const key = `${entry.room}-${entry.day}-${entry.timeSlot.slotNumber}`;
          
          if (roomTimeSlots.has(key)) {
            violations.push({
              room: entry.roomNumber,
              day: entry.day,
              slot: entry.timeSlot.slotNumber,
              courses: [roomTimeSlots.get(key), entry.courseCode]
            });
          }
          roomTimeSlots.set(key, entry.courseCode);
        }
      }
  
      // Check capacity
      if (constraint.name.includes('Capacity')) {
        for (const entry of schedule.entries) {
          const room = roomMap.get(entry.room.toString());
          if (room) {
            // Estimate section size (you'd get this from the course/section data)
            const estimatedSize = 60;  // Placeholder
            if (room.capacity < estimatedSize) {
              violations.push({
                room: entry.roomNumber,
                capacity: room.capacity,
                required: estimatedSize,
                course: entry.courseCode
              });
            }
          }
        }
      }
  
      return {
        violated: violations.length > 0,
        count: violations.length,
        details: violations
      };
    }
  
    /**
     * Check time slot constraints
     */
    checkTimeSlotConstraint(constraint, schedule) {
      const violations = [];
  
      // Check for availability violations
      if (constraint.name.includes('Availability')) {
        // This would check against faculty availability data
        // Implemented in fitness calculator already
      }
  
      return {
        violated: violations.length > 0,
        count: violations.length,
        details: violations
      };
    }
  
    /**
     * Check student section constraints
     */
    checkStudentSectionConstraint(constraint, schedule) {
      const violations = [];
  
      // Check for section conflicts (students in two places at once)
      if (constraint.name.includes('Conflict') || constraint.name.includes('No Student Section')) {
        const sectionTimeSlots = new Map();
  
        for (const entry of schedule.entries) {
          const key = `${entry.section}-${entry.day}-${entry.timeSlot.slotNumber}`;
          
          if (sectionTimeSlots.has(key)) {
            violations.push({
              section: entry.section,
              day: entry.day,
              slot: entry.timeSlot.slotNumber,
              courses: [sectionTimeSlots.get(key), entry.courseCode]
            });
          }
          sectionTimeSlots.set(key, entry.courseCode);
        }
      }
  
      // Check for excessive gaps
      if (constraint.name.includes('Gap')) {
        const sectionSchedules = new Map();
  
        for (const entry of schedule.entries) {
          const key = `${entry.section}-${entry.day}`;
          if (!sectionSchedules.has(key)) {
            sectionSchedules.set(key, []);
          }
          sectionSchedules.get(key).push(entry.timeSlot.slotNumber);
        }
  
        for (const [key, slots] of sectionSchedules) {
          slots.sort((a, b) => a - b);
          for (let i = 1; i < slots.length; i++) {
            const gap = slots[i] - slots[i-1] - 1;
            if (gap > 2) {  // More than 2-hour gap
              const [section, day] = key.split('-');
              violations.push({
                section,
                day,
                gapSize: gap,
                betweenSlots: `${slots[i-1]} and ${slots[i]}`
              });
            }
          }
        }
      }
  
      return {
        violated: violations.length > 0,
        count: violations.length,
        details: violations
      };
    }
  
    /**
     * Check lab continuity constraints
     */
    checkLabContinuityConstraint(constraint, schedule) {
      const violations = [];
  
      // Find all lab sessions
      const labSessions = schedule.entries.filter(e => e.sessionType === 'lab');
  
      for (const session of labSessions) {
        if (session.consecutiveSlots > 1) {
          // Verify consecutive slots are actually consecutive
          // This is a simplified check - real implementation would be more complex
          const requiredSlots = session.consecutiveSlots;
          
          // Check if there are enough consecutive slots available
          // (This would need actual verification against the schedule)
          
         
          const isConsecutive = true;  // This would be actual check
          
          if (!isConsecutive) {
            violations.push({
              course: session.courseCode,
              section: session.section,
              day: session.day,
              requiredSlots,
              issue: 'Lab session not scheduled in consecutive slots'
            });
          }
        }
      }
  
      return {
        violated: violations.length > 0,
        count: violations.length,
        details: violations
      };
    }
  
    /**
     * Check elective grouping constraints
     */
    checkElectiveGroupingConstraint(constraint, schedule, courses) {
      const violations = [];
      const courseMap = new Map(courses.map(c => [c._id.toString(), c]));
  
      // Group entries by elective group
      const electiveGroups = new Map();
  
      for (const entry of schedule.entries) {
        const course = courseMap.get(entry.course.toString());
        if (course && course.isElective && course.electiveGroup) {
          const timeKey = `${entry.day}-${entry.timeSlot.slotNumber}`;
          const groupKey = course.electiveGroup;
  
          if (!electiveGroups.has(groupKey)) {
            electiveGroups.set(groupKey, new Map());
          }
  
          const group = electiveGroups.get(groupKey);
          if (!group.has(timeKey)) {
            group.set(timeKey, []);
          }
          group.get(timeKey).push(entry.courseCode);
        }
      }
  
      // Check for overlaps in elective groups
      for (const [groupKey, timeSlots] of electiveGroups) {
        for (const [timeKey, courses] of timeSlots) {
          if (courses.length > 1) {
            violations.push({
              electiveGroup: groupKey,
              timeSlot: timeKey,
              overlappingCourses: courses,
              issue: 'Electives in same group scheduled at same time'
            });
          }
        }
      }
  
      return {
        violated: violations.length > 0,
        count: violations.length,
        details: violations
      };
    }
  
    /**
     * Get summary of all constraint violations
     */
    getSummary(violations) {
      return {
        totalHard: violations.hard.length,
        totalSoft: violations.soft.length,
        hardByCategory: this.groupByCategory(violations.hard),
        softByCategory: this.groupByCategory(violations.soft),
        criticalIssues: violations.hard.filter(v => v.count > 0)
      };
    }
  
    /**
     * Group violations by category
     */
    groupByCategory(violations) {
      const grouped = {};
      for (const violation of violations) {
        if (!grouped[violation.category]) {
          grouped[violation.category] = [];
        }
        grouped[violation.category].push(violation);
      }
      return grouped;
    }
  }
  
  export default ConstraintChecker;