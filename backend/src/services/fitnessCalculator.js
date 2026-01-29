class FitnessCalculator {
    constructor(weights = {}) {
      // Weights for different constraint violations
      this.weights = {
        facultyDoubleBooking: weights.facultyDoubleBooking || 1000,
        roomDoubleBooking: weights.roomDoubleBooking || 1000,
        sectionConflict: weights.sectionConflict || 1000,
        facultyUnavailable: weights.facultyUnavailable || 900,
        labContinuity: weights.labContinuity || 800,
        roomCapacity: weights.roomCapacity || 800,
        workloadExceeded: weights.workloadExceeded || 100,
        workloadUnderUtilized: weights.workloadUnderUtilized || 80,
        studentGaps: weights.studentGaps || 50,
        facultyGaps: weights.facultyGaps || 40,
        workloadBalance: weights.workloadBalance || 60,
        preferenceMatch: weights.preferenceMatch || 30,
        consecutiveHours: weights.consecutiveHours || 50,
        dailyDistribution: weights.dailyDistribution || 40
      };
    }
  
    /**
     * Calculate fitness score for a chromosome (schedule)
     */
    calculate(chromosome, courses, faculty, rooms, constraints) {
      let fitness = 1000;  // Start with perfect score
      let hardViolations = 0;
      let softViolations = 0;
      const details = {
        hardConstraints: [],
        softConstraints: []
      };
  
      // Check hard constraints
      const facultyConflicts = this.checkFacultyConflicts(chromosome);
      hardViolations += facultyConflicts.count;
      fitness -= facultyConflicts.count * this.weights.facultyDoubleBooking;
      if (facultyConflicts.count > 0) {
        details.hardConstraints.push({
          type: 'faculty_double_booking',
          count: facultyConflicts.count,
          penalty: facultyConflicts.count * this.weights.facultyDoubleBooking
        });
      }
  
      const roomConflicts = this.checkRoomConflicts(chromosome);
      hardViolations += roomConflicts.count;
      fitness -= roomConflicts.count * this.weights.roomDoubleBooking;
      if (roomConflicts.count > 0) {
        details.hardConstraints.push({
          type: 'room_double_booking',
          count: roomConflicts.count,
          penalty: roomConflicts.count * this.weights.roomDoubleBooking
        });
      }
  
      const sectionConflicts = this.checkSectionConflicts(chromosome);
      hardViolations += sectionConflicts.count;
      fitness -= sectionConflicts.count * this.weights.sectionConflict;
      if (sectionConflicts.count > 0) {
        details.hardConstraints.push({
          type: 'section_conflict',
          count: sectionConflicts.count,
          penalty: sectionConflicts.count * this.weights.sectionConflict
        });
      }
  
      const unavailableSlots = this.checkFacultyAvailability(chromosome, faculty);
      hardViolations += unavailableSlots.count;
      fitness -= unavailableSlots.count * this.weights.facultyUnavailable;
      if (unavailableSlots.count > 0) {
        details.hardConstraints.push({
          type: 'faculty_unavailable',
          count: unavailableSlots.count,
          penalty: unavailableSlots.count * this.weights.facultyUnavailable
        });
      }
  
      const labContinuity = this.checkLabContinuity(chromosome);
      hardViolations += labContinuity.count;
      fitness -= labContinuity.count * this.weights.labContinuity;
      if (labContinuity.count > 0) {
        details.hardConstraints.push({
          type: 'lab_continuity_broken',
          count: labContinuity.count,
          penalty: labContinuity.count * this.weights.labContinuity
        });
      }
  
      const capacityIssues = this.checkRoomCapacity(chromosome, courses, rooms);
      hardViolations += capacityIssues.count;
      fitness -= capacityIssues.count * this.weights.roomCapacity;
      if (capacityIssues.count > 0) {
        details.hardConstraints.push({
          type: 'room_capacity_exceeded',
          count: capacityIssues.count,
          penalty: capacityIssues.count * this.weights.roomCapacity
        });
      }
  
      // Check soft constraints
      const workloadViolations = this.checkWorkloadConstraints(chromosome, faculty);
      softViolations += workloadViolations.exceeded + workloadViolations.underUtilized;
      fitness -= workloadViolations.exceeded * this.weights.workloadExceeded;
      fitness -= workloadViolations.underUtilized * this.weights.workloadUnderUtilized;
      if (workloadViolations.exceeded + workloadViolations.underUtilized > 0) {
        details.softConstraints.push({
          type: 'workload_imbalance',
          exceeded: workloadViolations.exceeded,
          underUtilized: workloadViolations.underUtilized,
          penalty: (workloadViolations.exceeded * this.weights.workloadExceeded) + 
                   (workloadViolations.underUtilized * this.weights.workloadUnderUtilized)
        });
      }
  
      const studentGaps = this.calculateStudentGaps(chromosome);
      softViolations += studentGaps.totalGaps;
      fitness -= studentGaps.totalGaps * this.weights.studentGaps;
      if (studentGaps.totalGaps > 0) {
        details.softConstraints.push({
          type: 'student_gaps',
          count: studentGaps.totalGaps,
          penalty: studentGaps.totalGaps * this.weights.studentGaps
        });
      }
  
      const facultyGaps = this.calculateFacultyGaps(chromosome);
      softViolations += facultyGaps.totalGaps;
      fitness -= facultyGaps.totalGaps * this.weights.facultyGaps;
      if (facultyGaps.totalGaps > 0) {
        details.softConstraints.push({
          type: 'faculty_gaps',
          count: facultyGaps.totalGaps,
          penalty: facultyGaps.totalGaps * this.weights.facultyGaps
        });
      }
  
      const workloadBalance = this.evaluateWorkloadBalance(chromosome, faculty);
      softViolations += workloadBalance.imbalance;
      fitness -= workloadBalance.imbalance * this.weights.workloadBalance;
      if (workloadBalance.imbalance > 0) {
        details.softConstraints.push({
          type: 'workload_balance',
          variance: workloadBalance.variance,
          penalty: workloadBalance.imbalance * this.weights.workloadBalance
        });
      }
  
      const consecutiveHours = this.checkConsecutiveHours(chromosome, faculty);
      softViolations += consecutiveHours.count;
      fitness -= consecutiveHours.count * this.weights.consecutiveHours;
      if (consecutiveHours.count > 0) {
        details.softConstraints.push({
          type: 'excessive_consecutive_hours',
          count: consecutiveHours.count,
          penalty: consecutiveHours.count * this.weights.consecutiveHours
        });
      }
  
      // Ensure fitness is non-negative
      fitness = Math.max(0, fitness);
  
      return {
        fitness,
        hardViolations,
        softViolations,
        details
      };
    }
  
    /**
     * Check for faculty double-booking
     */
    checkFacultyConflicts(chromosome) {
      const conflicts = new Map();
      let count = 0;
  
      for (const gene of chromosome.genes) {
        const key = `${gene.facultyId}-${gene.timeSlot.day}-${gene.timeSlot.slotNumber}`;
        
        if (conflicts.has(key)) {
          count++;
        }
        conflicts.set(key, true);
      }
  
      return { count, conflicts: Array.from(conflicts.keys()) };
    }
  
    /**
     * Check for room double-booking
     */
    checkRoomConflicts(chromosome) {
      const conflicts = new Map();
      let count = 0;
  
      for (const gene of chromosome.genes) {
        const key = `${gene.roomId}-${gene.timeSlot.day}-${gene.timeSlot.slotNumber}`;
        
        if (conflicts.has(key)) {
          count++;
        }
        conflicts.set(key, true);
      }
  
      return { count, conflicts: Array.from(conflicts.keys()) };
    }
  
    /**
     * Check for student section conflicts
     */
    checkSectionConflicts(chromosome) {
      const conflicts = new Map();
      let count = 0;
  
      for (const gene of chromosome.genes) {
        const key = `${gene.section}-${gene.timeSlot.day}-${gene.timeSlot.slotNumber}`;
        
        if (conflicts.has(key)) {
          count++;
        }
        conflicts.set(key, true);
      }
  
      return { count, conflicts: Array.from(conflicts.keys()) };
    }
  
    /**
     * Check faculty availability
     */
    checkFacultyAvailability(chromosome, faculty) {
      let count = 0;
      const facultyMap = new Map(faculty.map(f => [f._id.toString(), f]));
  
      for (const gene of chromosome.genes) {
        const facultyMember = facultyMap.get(gene.facultyId.toString());
        if (facultyMember && facultyMember.availability) {
          const day = gene.timeSlot.day.toLowerCase();
          const dayAvailability = facultyMember.availability[day];
          
          if (!dayAvailability || dayAvailability.length === 0) {
            count++;
            continue;
          }
  
          let isAvailable = false;
          for (const slot of dayAvailability) {
            if (gene.timeSlot.startTime >= slot.startTime && 
                gene.timeSlot.endTime <= slot.endTime) {
              isAvailable = true;
              break;
            }
          }
  
          if (!isAvailable) {
            count++;
          }
        }
      }
  
      return { count };
    }
  
    /**
     * Check lab session continuity
     */
    checkLabContinuity(chromosome) {
      let count = 0;
  
      // Group lab sessions by course and section
      const labSessions = chromosome.genes.filter(g => g.sessionType === 'lab');
      
      for (const session of labSessions) {
        if (session.consecutiveSlots > 1) {
          // This lab needs multiple consecutive slots
          // Check if they're actually consecutive
          // (Simplified check - in real implementation, verify actual slot continuity)
          count += 0;  // Placeholder - implement actual continuity check
        }
      }
  
      return { count };
    }
  
    /**
     * Check room capacity
     */
    checkRoomCapacity(chromosome, courses, rooms) {
      let count = 0;
      const roomMap = new Map(rooms.map(r => [r._id.toString(), r]));
      const courseMap = new Map(courses.map(c => [c._id.toString(), c]));
  
      for (const gene of chromosome.genes) {
        const room = roomMap.get(gene.roomId.toString());
        const course = courseMap.get(gene.courseId.toString());
        
        if (room && course) {
          const section = course.sections.find(s => s.sectionName === gene.section);
          if (section && room.capacity < section.strength) {
            count++;
          }
        }
      }
  
      return { count };
    }
  
    /**
     * Check workload constraints
     */
    checkWorkloadConstraints(chromosome, faculty) {
      const workload = new Map();
      
      // Calculate hours for each faculty
      for (const gene of chromosome.genes) {
        const facultyId = gene.facultyId.toString();
        const current = workload.get(facultyId) || 0;
        workload.set(facultyId, current + gene.duration);
      }
  
      let exceeded = 0;
      let underUtilized = 0;
  
      for (const facultyMember of faculty) {
        const assigned = workload.get(facultyMember._id.toString()) || 0;
        const max = facultyMember.workload?.maxHoursPerWeek || 18;
        const min = facultyMember.workload?.minHoursPerWeek || 12;
  
        if (assigned > max) {
          exceeded++;
        } else if (assigned < min) {
          underUtilized++;
        }
      }
  
      return { exceeded, underUtilized };
    }
  
    /**
     * Calculate gaps in student schedules
     */
    calculateStudentGaps(chromosome) {
      const sectionSchedules = new Map();
      
      // Group by section and day
      for (const gene of chromosome.genes) {
        const key = `${gene.section}-${gene.timeSlot.day}`;
        if (!sectionSchedules.has(key)) {
          sectionSchedules.set(key, []);
        }
        sectionSchedules.get(key).push(gene.timeSlot.slotNumber);
      }
  
      let totalGaps = 0;
  
      // Calculate gaps for each section-day
      for (const [key, slots] of sectionSchedules) {
        slots.sort((a, b) => a - b);
        for (let i = 1; i < slots.length; i++) {
          const gap = slots[i] - slots[i-1] - 1;
          totalGaps += gap;
        }
      }
  
      return { totalGaps };
    }
  
    /**
     * Calculate gaps in faculty schedules
     */
    calculateFacultyGaps(chromosome) {
      const facultySchedules = new Map();
      
      for (const gene of chromosome.genes) {
        const key = `${gene.facultyId}-${gene.timeSlot.day}`;
        if (!facultySchedules.has(key)) {
          facultySchedules.set(key, []);
        }
        facultySchedules.get(key).push(gene.timeSlot.slotNumber);
      }
  
      let totalGaps = 0;
  
      for (const [key, slots] of facultySchedules) {
        slots.sort((a, b) => a - b);
        for (let i = 1; i < slots.length; i++) {
          const gap = slots[i] - slots[i-1] - 1;
          totalGaps += gap;
        }
      }
  
      return { totalGaps };
    }
  
    /**
     * Evaluate workload balance across faculty
     */
    evaluateWorkloadBalance(chromosome, faculty) {
      const workload = new Map();
      
      for (const gene of chromosome.genes) {
        const facultyId = gene.facultyId.toString();
        const current = workload.get(facultyId) || 0;
        workload.set(facultyId, current + gene.duration);
      }
  
      const workloads = Array.from(workload.values());
      if (workloads.length === 0) return { imbalance: 0, variance: 0 };
  
      const mean = workloads.reduce((a, b) => a + b, 0) / workloads.length;
      const variance = workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length;
      const standardDeviation = Math.sqrt(variance);
  
      return {
        imbalance: Math.floor(standardDeviation),
        variance: variance.toFixed(2)
      };
    }
  
    /**
     * Check for excessive consecutive teaching hours
     */
    checkConsecutiveHours(chromosome, faculty) {
      const facultySchedules = new Map();
      
      for (const gene of chromosome.genes) {
        const key = `${gene.facultyId}-${gene.timeSlot.day}`;
        if (!facultySchedules.has(key)) {
          facultySchedules.set(key, []);
        }
        facultySchedules.get(key).push(gene.timeSlot.slotNumber);
      }
  
      let count = 0;
      const maxConsecutive = 3;
  
      for (const [key, slots] of facultySchedules) {
        slots.sort((a, b) => a - b);
        let consecutive = 1;
  
        for (let i = 1; i < slots.length; i++) {
          if (slots[i] - slots[i-1] === 1) {
            consecutive++;
            if (consecutive > maxConsecutive) {
              count++;
            }
          } else {
            consecutive = 1;
          }
        }
      }
  
      return { count };
    }
  }
  
  export default FitnessCalculator;