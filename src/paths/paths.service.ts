import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { OptimizePathDto } from './dto/optimizePath.dto';
import { Task, TaskStatus } from 'src/tasks/task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { In, Repository } from 'typeorm';
import { Chromosome, LocationPoint, Population } from './dto/algorytm.dto';
import { TasksService } from 'src/tasks/tasks.service';

@Injectable()
export class PathfindingService {
  // In a real app, inject Task and User repositories
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private tasksService: TasksService,
  ) {}

  /**
   * Main entry point for the Genetic Algorithm
   * Finds the optimal path for a user to complete a list of tasks.
   */
  async findOptimalPath(dto: OptimizePathDto, userId: string): Promise<Task[]> {
    // 1. Fetch User & Tasks (Same as before)
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const tasks = await this.tasksRepository.find({
      where: { id: In(dto.taskIds), status: TaskStatus.OPEN },
    });
    if (tasks.length === 0) return [];

    const startPoint: LocationPoint = {
      latitude: dto.startLatitude,
      longitude: dto.startLongitude,
    };

    // 2. Pre-calculate Distances (Critical for performance)
    const distanceMatrix = this.buildDistanceMatrix(startPoint, tasks);

    // 3. Calculate Total Possible Reward (The "Perfect Score")
    // We use this to calculate how much reward we "missed" later
    const maxPossibleReward = tasks.reduce(
      (sum, t) => sum + (t.reward || 1),
      0,
    );

    // 4. Run GA
    const populationSize = 100;
    const generations = 250;

    // Smart Initialization (Optional but recommended)
    // We seed the population with random paths AND one "Greedy" path (highest value/time ratio)
    const population = this.createInitialPopulation(
      tasks,
      startPoint,
      populationSize,
      distanceMatrix,
    );

    const bestPath = this.runGA(
      population,
      distanceMatrix,
      dto.maxTimeMinutes,
      dto.movementSpeed,
      generations,
      0.05, // Mutation
      0.8, // Crossover
      maxPossibleReward, // Pass the total reward cap
    );

    return bestPath;
  }

  /**
   * Runs the main GA loop
   * @param population - Initial population
   * @param startPoint - The user's starting location
   * @param maxTimeMinutes - Maximum time available for completing tasks
   * @param movementSpeed - Movement speed in km/h
   * @param generations - How many generations to run
   * @param mutationRate - Chance of mutation
   * @param crossoverRate - Chance of crossover
   */
  private runGA(
    population: Population,
    distanceMatrix: Map<string, number>,
    maxTimeMinutes: number,
    movementSpeed: number,
    generations: number,
    mutationRate: number,
    crossoverRate: number,
    maxPossibleReward: number,
  ): Chromosome {
    let currentPopulation = population;

    for (let i = 0; i < generations; i++) {
      // Calculate Fitness
      const fitnessScores = currentPopulation.map((chromo) => ({
        path: chromo,
        fitness: this.calculateFitness(
          chromo,
          distanceMatrix,
          maxTimeMinutes,
          movementSpeed,
          maxPossibleReward,
        ),
      }));

      // Sort: Lower fitness is better
      fitnessScores.sort((a, b) => a.fitness - b.fitness);

      const newPopulation: Population = [];

      // Elitism: Keep the top 2 absolute best paths found so far
      newPopulation.push(fitnessScores[0].path);
      newPopulation.push(fitnessScores[1].path);

      // Generate rest
      while (newPopulation.length < currentPopulation.length) {
        const parent1 = this.selection(fitnessScores);
        const parent2 = this.selection(fitnessScores);

        let child = parent1;
        if (Math.random() < crossoverRate)
          child = this.crossover(parent1, parent2);
        if (Math.random() < mutationRate) child = this.mutate(child);

        newPopulation.push(child);
      }
      currentPopulation = newPopulation;
    }

    // Final result processing
    const finalScores = currentPopulation.map((chromo) => ({
      path: chromo,
      fitness: this.calculateFitness(
        chromo,
        distanceMatrix,
        maxTimeMinutes,
        movementSpeed,
        maxPossibleReward,
      ),
    }));
    finalScores.sort((a, b) => a.fitness - b.fitness);

    return this.decodePath(
      finalScores[0].path,
      distanceMatrix,
      maxTimeMinutes,
      movementSpeed,
    );
  }

  /**
   * Filters a path to only include tasks that fit within the time limit
   */
  private filterPathByTimeLimit(
    path: Chromosome,
    startPoint: LocationPoint,
    maxTimeMinutes: number,
    movementSpeed: number,
  ): Chromosome {
    const filteredPath: Chromosome = [];
    let totalTime = 0;
    let currentPoint = startPoint;

    for (const task of path) {
      const travelDistance = this.tasksService.haversineDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        task.latitude,
        task.longitude,
      );

      const travelTimeMinutes = (travelDistance / movementSpeed) * 60;
      const timeWithThisTask =
        totalTime + travelTimeMinutes + task.estimatedDurationMinutes;

      if (timeWithThisTask > maxTimeMinutes) {
        break;
      }

      filteredPath.push(task);
      totalTime = timeWithThisTask;
      currentPoint = task;
    }

    return filteredPath;
  }

  /**
   * Creates an initial population of random paths
   */
  private createInitialPopulation(
    allTasks: Task[],
    startPoint: LocationPoint, // We need start point now
    populationSize: number,
    distanceMatrix: Map<string, number>,
  ): Population {
    const population: Population = [];
    // const geneIds = allTasks.map((t) => t.id);

    // 1. STRATEGY A: "High Density" (Reward / Distance)
    // Prioritizes tasks that are close AND valuable.
    // This specifically fixes your problem.
    const densityPath = this.generateHeuristicPath(
      allTasks,
      startPoint,
      distanceMatrix,
      (task, currentPos, dist) => {
        const reward = task.reward || 1;
        // Avoid division by zero. If dist is 0, treat as 0.1
        const safeDist = dist < 0.1 ? 0.1 : dist;
        // The higher the score, the more likely we pick it
        return reward / safeDist;
      },
    );
    population.push(densityPath);

    // 2. STRATEGY B: "Nearest Neighbor"
    // Just goes to the closest task next. Great for finding clusters of medium tasks.
    const nearestPath = this.generateHeuristicPath(
      allTasks,
      startPoint,
      distanceMatrix,
      (task, currentPos, dist) => {
        // Inverse of distance (closer = higher score)
        return 1 / (dist + 0.01);
      },
    );
    population.push(nearestPath);

    // 3. STRATEGY C: "Pure Greed" (Reward only)
    // What you likely had before (High Reward, ignoring distance)
    const greedyPath = [...allTasks].sort(
      (a, b) => (b.reward || 0) - (a.reward || 0),
    );
    population.push(greedyPath);

    // 4. Fill the rest with Random (for genetic diversity)
    while (population.length < populationSize) {
      const randomPath = [...allTasks].sort(() => Math.random() - 0.5);
      population.push(randomPath);
    }

    return population;
  }

  private generateHeuristicPath(
    tasks: Task[],
    startPoint: LocationPoint,
    distanceMatrix: Map<string, number>,
    scoreFn: (task: Task, currentId: string, dist: number) => number,
  ): Task[] {
    const remainingTasks = new Set(tasks);
    const path: Task[] = [];
    let currentId = 'START'; // Corresponds to key in distanceMatrix

    while (remainingTasks.size > 0) {
      let bestTask: Task | null = null;
      let bestScore = -Infinity;

      for (const task of remainingTasks) {
        const dist = distanceMatrix.get(`${currentId}-${task.id}`) || 10000;
        const score = scoreFn(task, currentId, dist);

        if (score > bestScore) {
          bestScore = score;
          bestTask = task;
        }
      }

      if (bestTask) {
        path.push(bestTask);
        remainingTasks.delete(bestTask);
        currentId = bestTask.id;
      } else {
        break;
      }
    }
    return path;
  }

  /**
   * Fitness function: Calculates the total cost of a path.
   * A lower score is better.
   * Cost = Total Travel Time + Total Task Duration
   * If path exceeds maxTimeMinutes, adds heavy penalty
   */
  private calculateFitness(
    path: Chromosome,
    distanceMatrix: Map<string, number>,
    maxTimeMinutes: number,
    movementSpeed: number,
    maxPossibleReward: number,
  ): number {
    let currentTime = 0;
    let collectedReward = 0;
    let lastId = 'START';

    for (const task of path) {
      const distKm = distanceMatrix.get(`${lastId}-${task.id}`) || 0;
      const travelTime = (distKm / movementSpeed) * 60;
      const nextTime = currentTime + travelTime + task.estimatedDurationMinutes;

      // If we can fit this task in the day, take the reward
      if (nextTime <= maxTimeMinutes) {
        currentTime = nextTime;
        collectedReward += task.reward || 1; // <--- Accumulate Value
        lastId = task.id;
      } else {
        // Stop counting once we run out of time
        break;
      }
    }

    // Weighting Logic:
    // We want High Reward first, Low Time second.
    // Penalty = (Money we left on the table) * HugeFactor
    const uncollectedReward = maxPossibleReward - collectedReward;

    // The Factor must be larger than the max possible time (minutes)
    // so that saving 1 min never outweighs gaining 1 reward point.
    const rewardPriorityFactor = 10000;

    return uncollectedReward * rewardPriorityFactor + currentTime;
  }

  /**
   * Selects a parent from the population based on fitness.
   * (Using simple Tournament Selection)
   */
  private selection(
    fitnessScores: { path: Chromosome; fitness: number }[],
  ): Chromosome {
    // Get 2 random individuals and return the one with better fitness
    const k = 2;
    let best = fitnessScores[Math.floor(Math.random() * fitnessScores.length)];
    for (let i = 1; i < k; i++) {
      const next =
        fitnessScores[Math.floor(Math.random() * fitnessScores.length)];
      if (next.fitness < best.fitness) {
        best = next;
      }
    }
    return best.path;
  }

  /**
   * Creates a new path (child) from two parents.
   * (Using simple Ordered Crossover)
   */
  private crossover(parent1: Chromosome, parent2: Chromosome): Chromosome {
    const len = parent1.length;
    const start = Math.floor(Math.random() * len);
    const end = Math.floor(Math.random() * (len - start) + start);

    const child: Chromosome = new Array(len).fill(null);
    // Create a Set for O(1) lookups of what is already in the child
    const childSet = new Set<string>();

    // Copy segment
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
      childSet.add(parent1[i].id);
    }

    // Fill remaining
    let p2Index = 0;
    for (let i = 0; i < len; i++) {
      if (child[i] === null) {
        while (childSet.has(parent2[p2Index].id)) {
          p2Index++;
        }
        child[i] = parent2[p2Index];
        childSet.add(parent2[p2Index].id);
      }
    }
    return child;
  }

  private mutate(path: Chromosome): Chromosome {
    const newPath = [...path];
    const i = Math.floor(Math.random() * newPath.length);
    let j = Math.floor(Math.random() * newPath.length);
    while (i === j) j = Math.floor(Math.random() * newPath.length);

    [newPath[i], newPath[j]] = [newPath[j], newPath[i]];
    return newPath;
  }

  private buildDistanceMatrix(
    start: LocationPoint,
    tasks: Task[],
  ): Map<string, number> {
    const matrix = new Map<string, number>();

    // Helper to store key
    const setDist = (id1: string, id2: string, dist: number) => {
      matrix.set(`${id1}-${id2}`, dist);
    };

    // 1. Distance from Start to every Task
    tasks.forEach((task) => {
      const dist = this.tasksService.haversineDistance(
        start.latitude,
        start.longitude,
        task.latitude,
        task.longitude,
      );
      setDist('START', task.id, dist);
    });

    // 2. Distance between every Task pair
    for (let i = 0; i < tasks.length; i++) {
      for (let j = 0; j < tasks.length; j++) {
        if (i === j) continue;
        const dist = this.tasksService.haversineDistance(
          tasks[i].latitude,
          tasks[i].longitude,
          tasks[j].latitude,
          tasks[j].longitude,
        );
        setDist(tasks[i].id, tasks[j].id, dist);
      }
    }
    return matrix;
  }

  private decodePath(
    path: Chromosome,
    distanceMatrix: Map<string, number>,
    maxTimeMinutes: number,
    movementSpeed: number,
  ): Task[] {
    const result: Task[] = [];
    let currentTime = 0;
    let lastId = 'START';

    for (const task of path) {
      const distKm = distanceMatrix.get(`${lastId}-${task.id}`) || 0;
      const travelTime = (distKm / movementSpeed) * 60;
      const nextTime = currentTime + travelTime + task.estimatedDurationMinutes;

      if (nextTime <= maxTimeMinutes) {
        result.push(task);
        currentTime = nextTime;
        lastId = task.id;
      } else {
        break;
      }
    }
    return result;
  }
}
