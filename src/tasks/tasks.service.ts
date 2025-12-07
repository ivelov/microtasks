import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task, TaskStatus } from './task.entity';
import { In, Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { Skill } from 'src/skills/skill.entity';
import { CreateTaskDto } from './dto/createTask.dto';
import { TaskQueryDto } from './dto/taskQuery.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Skill)
    private skillsRepository: Repository<Skill>,
  ) {}

  public async create(
    createTaskDto: CreateTaskDto,
    userId: string,
  ): Promise<Task> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new HttpException('User not found', 404);

    const skills = await this.skillsRepository.findBy({
      title: In(createTaskDto.requiredSkills),
    });
    const newSkillTitles = createTaskDto.requiredSkills.filter(
      (title) => !skills.find((skill) => skill.title === title),
    );

    for (const title of newSkillTitles) {
      const newSkill = this.skillsRepository.create({ title });
      await this.skillsRepository.save(newSkill);
      skills.push(newSkill);
    }

    const task = this.tasksRepository.create({
      ...createTaskDto,
      status: TaskStatus.OPEN,
      createdBy: user,
      requiredSkills: skills,
    });

    return this.tasksRepository.save(task);
  }

  public async findAll(): Promise<Task[]> {
    return this.tasksRepository.find();
  }

  public async findNearby(
    query: TaskQueryDto,
    userId?: string,
  ): Promise<Task[]> {
    let allTasks = await this.tasksRepository.find({
      relations: ['requiredSkills'],
    });
    if (!allTasks || allTasks.length === 0) {
      return [];
    }
    if (!query.ignoreUserSkills && userId) {
      const user = await this.usersRepository.findOne({
        where: { id: userId },
        relations: ['skills'],
      });
      if (user) {
        const userSkillIds = user.skills?.map((s) => s.id) || [];
        // Filter tasks by user's skills
        const eligibleTasks = allTasks.filter((task) =>
          task.requiredSkills.every((skill) => userSkillIds.includes(skill.id)),
        );
        allTasks = eligibleTasks;
      }
    }

    // In a real app, you'd do this with a PostGIS query for efficiency
    return allTasks.filter((task) => {
      const distance = this.haversineDistance(
        query.lat,
        query.lng,
        task.latitude,
        task.longitude,
      );
      return distance <= query.radius && task.status === TaskStatus.OPEN;
    });
  }

  /**
   * Calculates distance between two coordinates using Haversine formula
   * @returns Distance in kilometers
   */
  public haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
