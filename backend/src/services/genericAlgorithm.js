import FitnessCalculator from './fitnessCalculator.js';
import ConstraintChecker from './constraintChecker.js';

class GeneticAlgorithm {
  constructor(config = {}) {
    this.populationSize = config.populationSize || 100;
    this.maxGenerations = config.maxGenerations || 1000;
    this.mutationRate = config.mutationRate || 0.1;
    this.crossoverRate = config.crossoverRate || 0.8;
    this.elitismCount = config.elitismCount || 5;
    this.tournamentSize = config.tournamentSize || 5;
    
    this.fitnessCalculator = new FitnessCalculator(config.weights);
    this.constraintChecker = new ConstraintChecker();
    
    this.population = [];
    this.bestChromosome = null;
    this.generationHistory = [];
  }

  /**
   * Initialize the algorithm with problem data
   */
  initialize(data) {
    this.courses = data.courses;
    this.faculty = data.faculty;
    this.rooms = data.rooms;
    this.timeSlots = data.timeSlots;
    this.constraints = data.constraints;
    
    console.log(`Initializing GA with:`);
    console.log(`- Courses: ${this.courses.length}`);
    console.log(`- Faculty: ${this.faculty.length}`);
    console.log(`- Rooms: ${this.rooms.length}`);
    console.log(`- Time Slots: ${this.timeSlots.length}`);
  }

  /**
   * Main optimization loop
   */
  async optimize(progressCallback = null) {
    const startTime = Date.now();
    
    // Step 1: Generate initial population
    console.log('Generating initial population...');
    this.generateInitialPopulation();
    
    // Step 2: Evolution loop
    for (let generation = 0; generation < this.maxGenerations; generation++) {
      // Evaluate fitness for all chromosomes
      this.evaluatePopulation();
      
      // Track best chromosome
      const currentBest = this.getBestChromosome();
      if (!this.bestChromosome || currentBest.fitness > this.bestChromosome.fitness) {
        this.bestChromosome = JSON.parse(JSON.stringify(currentBest));
      }
      
      // Track progress
      const stats = this.getGenerationStats();
      this.generationHistory.push({
        generation,
        bestFitness: stats.bestFitness,
        avgFitness: stats.avgFitness,
        hardViolations: this.bestChromosome.hardViolations,
        softViolations: this.bestChromosome.softViolations
      });
      
      // Progress callback for UI updates
      if (progressCallback && generation % 10 === 0) {
        await progressCallback({
          generation,
          maxGenerations: this.maxGenerations,
          progress: (generation / this.maxGenerations) * 100,
          bestFitness: stats.bestFitness,
          avgFitness: stats.avgFitness,
          hardViolations: this.bestChromosome.hardViolations
        });
      }
      
      // Early stopping if perfect solution found
      if (this.bestChromosome.hardViolations === 0 && this.bestChromosome.fitness > 950) {
        console.log(`Perfect solution found at generation ${generation}!`);
        break;
      }
      
      // Create next generation
      this.evolve();
      
      // Log progress every 100 generations
      if (generation % 100 === 0) {
        console.log(`Generation ${generation}: Best Fitness = ${stats.bestFitness.toFixed(2)}, ` +
                   `Hard Violations = ${this.bestChromosome.hardViolations}`);
      }
    }
    
    const endTime = Date.now();
    const computationTime = (endTime - startTime) / 1000;
    
    console.log(`\nOptimization completed in ${computationTime.toFixed(2)} seconds`);
    console.log(`Best fitness: ${this.bestChromosome.fitness.toFixed(2)}`);
    console.log(`Hard constraint violations: ${this.bestChromosome.hardViolations}`);
    console.log(`Soft constraint violations: ${this.bestChromosome.softViolations}`);
    
    return {
      schedule: this.bestChromosome,
      generations: this.generationHistory,
      computationTime
    };
  }

  /**
   * Generate initial population with random schedules
   */
  generateInitialPopulation() {
    this.population = [];
    
    for (let i = 0; i < this.populationSize; i++) {
      const chromosome = this.createRandomChromosome();
      this.population.push(chromosome);
    }
  }

  /**
   * Create a random schedule (chromosome)
   */
  createRandomChromosome() {
    const schedule = {
      genes: [],  // Each gene is a class assignment
      fitness: 0,
      hardViolations: 0,
      softViolations: 0
    };

    // For each course and section, create class assignments
    for (const course of this.courses) {
      const sessions = this.getRequiredSessions(course);
      
      for (const section of course.sections) {
        for (const session of sessions) {
          // Randomly assign: timeSlot, faculty, room
          const gene = this.createRandomGene(course, section, session);
          if (gene) {
            schedule.genes.push(gene);
          }
        }
      }
    }

    return schedule;
  }

  /**
   * Calculate required sessions for a course
   */
  getRequiredSessions(course) {
    const sessions = [];
    
    // Theory sessions
    if (course.theoryHours.hoursPerWeek > 0) {
      const numSessions = Math.ceil(
        course.theoryHours.hoursPerWeek / course.theoryHours.sessionDuration
      );
      for (let i = 0; i < numSessions; i++) {
        sessions.push({
          type: 'theory',
          duration: course.theoryHours.sessionDuration,
          consecutiveSlots: 1
        });
      }
    }
    
    // Lab sessions
    if (course.labHours.hoursPerWeek > 0) {
      const numSessions = Math.ceil(
        course.labHours.hoursPerWeek / course.labHours.sessionDuration
      );
      const slotsNeeded = Math.ceil(course.labHours.sessionDuration);
      
      for (let i = 0; i < numSessions; i++) {
        sessions.push({
          type: 'lab',
          duration: course.labHours.sessionDuration,
          consecutiveSlots: slotsNeeded
        });
      }
    }
    
    return sessions;
  }

  /**
   * Create a random gene (class assignment)
   */
  createRandomGene(course, section, session) {
    try {
      // Random time slot
      const timeSlot = this.timeSlots[Math.floor(Math.random() * this.timeSlots.length)];
      
      // Find suitable faculty
      const eligibleFaculty = this.faculty.filter(f => 
        f.subjects.some(s => s.courseId.toString() === course._id.toString()) &&
        f.isActive
      );
      
      if (eligibleFaculty.length === 0) {
        console.warn(`No eligible faculty for course ${course.courseCode}`);
        return null;
      }
      
      const faculty = eligibleFaculty[Math.floor(Math.random() * eligibleFaculty.length)];
      
      // Find suitable room
      const eligibleRooms = this.rooms.filter(r => 
        this.isRoomSuitable(r, course, session.type, section)
      );
      
      if (eligibleRooms.length === 0) {
        console.warn(`No eligible rooms for course ${course.courseCode}`);
        return null;
      }
      
      const room = eligibleRooms[Math.floor(Math.random() * eligibleRooms.length)];
      
      return {
        courseId: course._id,
        courseCode: course.courseCode,
        courseName: course.courseName,
        section: section.sectionName,
        sessionType: session.type,
        timeSlot: {
          day: timeSlot.day,
          slotNumber: timeSlot.slotNumber,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime
        },
        facultyId: faculty._id,
        facultyName: faculty.name,
        roomId: room._id,
        roomNumber: room.roomNumber,
        duration: session.duration,
        consecutiveSlots: session.consecutiveSlots
      };
    } catch (error) {
      console.error('Error creating gene:', error);
      return null;
    }
  }

  /**
   * Check if room is suitable for course/session
   */
  isRoomSuitable(room, course, sessionType, section) {
    if (!room.isActive) return false;
    
    // Check capacity
    if (room.capacity < section.strength) return false;
    
    // Check room type
    if (sessionType === 'lab') {
      if (room.type !== 'lab') return false;
      
      // Check specific lab requirements
      if (course.roomRequirements?.lab?.specificLabType) {
        const requiredType = course.roomRequirements.lab.specificLabType.toLowerCase();
        if (room.labType !== requiredType && requiredType !== 'general') {
          return false;
        }
      }
    } else {
      if (room.type !== 'classroom' && room.type !== 'seminar_hall') return false;
    }
    
    return true;
  }

  /**
   * Evaluate fitness for entire population
   */
  evaluatePopulation() {
    for (const chromosome of this.population) {
      this.evaluateChromosome(chromosome);
    }
  }

  /**
   * Evaluate a single chromosome
   */
  evaluateChromosome(chromosome) {
    const evaluation = this.fitnessCalculator.calculate(
      chromosome,
      this.courses,
      this.faculty,
      this.rooms,
      this.constraints
    );
    
    chromosome.fitness = evaluation.fitness;
    chromosome.hardViolations = evaluation.hardViolations;
    chromosome.softViolations = evaluation.softViolations;
    chromosome.details = evaluation.details;
  }

  /**
   * Evolve to next generation
   */
  evolve() {
    const newPopulation = [];
    
    // Elitism: Keep best chromosomes
    const sortedPopulation = [...this.population].sort((a, b) => b.fitness - a.fitness);
    for (let i = 0; i < this.elitismCount; i++) {
      newPopulation.push(JSON.parse(JSON.stringify(sortedPopulation[i])));
    }
    
    // Generate rest through crossover and mutation
    while (newPopulation.length < this.populationSize) {
      // Tournament selection
      const parent1 = this.tournamentSelection();
      const parent2 = this.tournamentSelection();
      
      // Crossover
      let offspring;
      if (Math.random() < this.crossoverRate) {
        offspring = this.crossover(parent1, parent2);
      } else {
        offspring = JSON.parse(JSON.stringify(parent1));
      }
      
      // Mutation
      if (Math.random() < this.mutationRate) {
        this.mutate(offspring);
      }
      
      newPopulation.push(offspring);
    }
    
    this.population = newPopulation;
  }

  /**
   * Tournament selection
   */
  tournamentSelection() {
    let best = null;
    
    for (let i = 0; i < this.tournamentSize; i++) {
      const candidate = this.population[Math.floor(Math.random() * this.population.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }
    
    return best;
  }

  /**
   * Crossover two chromosomes
   */
  crossover(parent1, parent2) {
    const offspring = {
      genes: [],
      fitness: 0,
      hardViolations: 0,
      softViolations: 0
    };
    
    // Single-point crossover
    const crossoverPoint = Math.floor(Math.random() * parent1.genes.length);
    
    offspring.genes = [
      ...parent1.genes.slice(0, crossoverPoint),
      ...parent2.genes.slice(crossoverPoint)
    ];
    
    return offspring;
  }

  /**
   * Mutate a chromosome
   */
  mutate(chromosome) {
    if (chromosome.genes.length === 0) return;
    
    // Random mutation: change one gene
    const geneIndex = Math.floor(Math.random() * chromosome.genes.length);
    const gene = chromosome.genes[geneIndex];
    
    const mutationType = Math.random();
    
    if (mutationType < 0.33) {
      // Mutate time slot
      const newTimeSlot = this.timeSlots[Math.floor(Math.random() * this.timeSlots.length)];
      gene.timeSlot = {
        day: newTimeSlot.day,
        slotNumber: newTimeSlot.slotNumber,
        startTime: newTimeSlot.startTime,
        endTime: newTimeSlot.endTime
      };
    } else if (mutationType < 0.66) {
      // Mutate faculty
      const course = this.courses.find(c => c._id.toString() === gene.courseId.toString());
      if (course) {
        const eligibleFaculty = this.faculty.filter(f => 
          f.subjects.some(s => s.courseId.toString() === course._id.toString()) && f.isActive
        );
        if (eligibleFaculty.length > 0) {
          const newFaculty = eligibleFaculty[Math.floor(Math.random() * eligibleFaculty.length)];
          gene.facultyId = newFaculty._id;
          gene.facultyName = newFaculty.name;
        }
      }
    } else {
      // Mutate room
      const course = this.courses.find(c => c._id.toString() === gene.courseId.toString());
      const section = course?.sections.find(s => s.sectionName === gene.section);
      if (course && section) {
        const eligibleRooms = this.rooms.filter(r => 
          this.isRoomSuitable(r, course, gene.sessionType, section)
        );
        if (eligibleRooms.length > 0) {
          const newRoom = eligibleRooms[Math.floor(Math.random() * eligibleRooms.length)];
          gene.roomId = newRoom._id;
          gene.roomNumber = newRoom.roomNumber;
        }
      }
    }
  }

  /**
   * Get best chromosome from current population
   */
  getBestChromosome() {
    return this.population.reduce((best, current) => 
      current.fitness > best.fitness ? current : best
    );
  }

  /**
   * Get statistics for current generation
   */
  getGenerationStats() {
    const fitnesses = this.population.map(c => c.fitness);
    const sum = fitnesses.reduce((a, b) => a + b, 0);
    
    return {
      bestFitness: Math.max(...fitnesses),
      worstFitness: Math.min(...fitnesses),
      avgFitness: sum / fitnesses.length
    };
  }
}

export default GeneticAlgorithm;