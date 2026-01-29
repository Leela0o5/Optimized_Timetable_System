# Automated Timetable Scheduling System

## Project Overview

This project implements an automated timetable scheduling system using a genetic algorithm. The system takes input data including courses, faculty, rooms, time slots, and constraints, and generates an optimized timetable schedule that satisfies hard constraints and improves soft optimization objectives. The backend is built with Node.js and Express. A genetic algorithm is used to generate timetable schedules. A MongoDB database stores all data including faculty, rooms, courses, constraints, time slots, and generated schedules. The frontend interacts with the backend through REST API endpoints.

## Features

- Automated timetable generation using a genetic algorithm
- REST APIs for managing faculty, rooms, courses, time slots, and constraints
- Separation of hard and soft constraints
- Optimized schedules with minimized conflicts
- Continuous integration and deployment setup
- API testing support using Postman

## System Architecture

The system consists of the following components:

### Frontend
- Web-based user interface (React or similar)
- Used by administrators to manage data and view schedules
- Communicates with backend through REST APIs

### Backend Server
- Built using Node.js and Express
- Handles all API requests
- Manages timetable generation requests
- Integrates the genetic algorithm engine

### Genetic Algorithm Engine
- Generates initial random schedules
- Evaluates schedules using fitness scoring
- Applies selection, crossover, and mutation
- Produces optimized timetables over multiple generations

### Database
- MongoDB database
- Stores faculty, rooms, courses, sections, time slots, constraints, and schedules

## User Flow

1. **Administrator accesses the system**  
   The user opens the web application or API client.

2. **Base data setup**  
   The administrator creates and manages:
   - Faculty details and availability
   - Rooms and capacities
   - Courses and sections
   - Time slots
   - Constraints

3. **Initialization step**  
   Time slots and constraints are initialized using provided API endpoints.

4. **Timetable generation request**  
   The administrator triggers timetable generation through the backend API.

5. **Genetic algorithm execution**  
   - The system generates an initial population of schedules.
   - Fitness is calculated based on constraints.
   - Selection, crossover, and mutation are applied.
   - The algorithm evolves schedules over multiple generations.

6. **Schedule storage**  
   The best generated timetable is saved in the database.

7. **Result visualization**  
   The optimized timetable is returned to the frontend and displayed to the access control of the user.

8. **Review and reuse**  
   The administrator can review, regenerate, or export the timetable if needed.

## Technology Stack

### Frontend
- React
### Backend
- Node.js
- Express.js
### Database
- MongoDB Atlas
### Testing
- Jest
### API Testing
- Postman
### Version Control
- Git
- GitHub
### CI/CD
- GitHub Actions
### Deployment
- Vercel (Frontend)
- Backend deployable on cloud platforms or serverless environments

## Genetic Algorithm Approach

The genetic algorithm works as follows:

- Each timetable is treated as a chromosome
- Each class session is treated as a gene
- Fitness is calculated based on constraint satisfaction
- Tournament selection selects parents
- Single-point crossover mixes schedules
- Mutation introduces small random changes
- Elitism preserves the best schedules
- The process repeats over multiple generations
