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
    // 1. Get User and validate skills
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const userSkillIds = user.skills?.map((s) => s.id) || [];

    // 2. Get all requested tasks from DB
    const tasks = await this.tasksRepository.find({
      where: {
        id: In(dto.taskIds),
        status: TaskStatus.OPEN,
      },
      relations: ['requiredSkills'],
    });

    // 3. Filter tasks by user's skills
    const eligibleTasks = tasks.filter((task) =>
      task.requiredSkills.every((skill) => userSkillIds.includes(skill.id)),
    );

    if (eligibleTasks.length === 0) {
      return [];
    }

    // 4. Run the Genetic Algorithm
    const startPoint: LocationPoint = {
      latitude: dto.startLatitude,
      longitude: dto.startLongitude,
    };

    // The "genes" for our algorithm are the eligible tasks
    const genes: Task[] = eligibleTasks;

    const population = this.createInitialPopulation(genes, 50);
    const bestPath = this.runGA(population, startPoint, 100, 0.1, 0.8);

    return bestPath;
  }

  /**
   * Runs the main GA loop
   * @param population - Initial population
   * @param startPoint - The user's starting location
   * @param generations - How many generations to run
   * @param mutationRate - Chance of mutation
   * @param crossoverRate - Chance of crossover
   */
  private runGA(
    population: Population,
    startPoint: LocationPoint,
    generations: number,
    mutationRate: number,
    crossoverRate: number,
  ): Chromosome {
    let currentPopulation = population;

    for (let i = 0; i < generations; i++) {
      // 1. Calculate fitness for each individual
      const fitnessScores = currentPopulation.map((chromo) => ({
        path: chromo,
        fitness: this.calculateFitness(chromo, startPoint),
      }));

      // Sort by fitness (lower is better)
      fitnessScores.sort((a, b) => a.fitness - b.fitness);

      const newPopulation: Population = [];

      // Elitism: Keep the best one
      newPopulation.push(fitnessScores[0].path);

      // 2. Selection, Crossover, Mutation
      while (newPopulation.length < currentPopulation.length) {
        const parent1 = this.selection(fitnessScores);
        const parent2 = this.selection(fitnessScores);

        let child = parent1;
        if (Math.random() < crossoverRate) {
          child = this.crossover(parent1, parent2);
        }

        if (Math.random() < mutationRate) {
          child = this.mutate(child);
        }
        newPopulation.push(child);
      }
      currentPopulation = newPopulation;
    }

    // Return the best path from the final generation
    const finalFitnessScores = currentPopulation.map((chromo) => ({
      path: chromo,
      fitness: this.calculateFitness(chromo, startPoint),
    }));
    finalFitnessScores.sort((a, b) => a.fitness - b.fitness);

    return finalFitnessScores[0].path;
  }

  /**
   * Creates an initial population of random paths
   */
  private createInitialPopulation(
    genes: Task[],
    populationSize: number,
  ): Population {
    const population: Population = [];
    for (let i = 0; i < populationSize; i++) {
      // Create a new random path (chromosome) by shuffling the tasks
      const newPath = [...genes].sort(() => Math.random() - 0.5);
      population.push(newPath);
    }
    return population;
  }

  /**
   * Fitness function: Calculates the total cost of a path.
   * A lower score is better.
   * Cost = Total Travel Time + Total Task Duration
   */
  private calculateFitness(
    path: Chromosome,
    startPoint: LocationPoint,
  ): number {
    let totalCost = 0;
    let currentPoint = startPoint;

    for (const task of path) {
      const travelDistance = this.tasksService.haversineDistance(
        currentPoint.latitude,
        currentPoint.longitude,
        task.latitude,
        task.longitude,
      );

      // Assuming average travel speed of 15 km/h (walking/city travel)
      // This is a major simplification!
      const travelTimeMinutes = (travelDistance / 15) * 60;

      totalCost += travelTimeMinutes;
      totalCost += task.estimatedDurationMinutes;

      // Update current location for next leg
      currentPoint = task;
    }
    return totalCost;
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
    const start = Math.floor(Math.random() * parent1.length);
    const end = Math.floor(Math.random() * (parent1.length - start) + start);

    const child: Chromosome = new Array(parent1.length).fill(null);

    // Copy segment from parent1
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    // Fill remaining spots from parent2
    let parent2Index = 0;
    for (let i = 0; i < child.length; i++) {
      if (child[i] === null) {
        while (child.includes(parent2[parent2Index])) {
          parent2Index++;
        }
        child[i] = parent2[parent2Index];
      }
    }
    return child;
  }

  /**
   * Randomly alters a path.
   * (Using simple Swap Mutation)
   */
  private mutate(path: Chromosome): Chromosome {
    const i = Math.floor(Math.random() * path.length);
    let j = Math.floor(Math.random() * path.length);
    // Ensure j is different from i
    while (i === j) {
      j = Math.floor(Math.random() * path.length);
    }

    // Swap two tasks in the path
    const newPath = [...path];
    [newPath[i], newPath[j]] = [newPath[j], newPath[i]];

    return newPath;
  }
}
