import { DataSource } from 'typeorm';
import { Task, TaskStatus } from 'src/tasks/task.entity';
import { User } from 'src/users/user.entity';
import { Skill } from 'src/skills/skill.entity';
import * as fs from 'fs';
import * as path from 'path';

// Geographic boundaries
const CENTER_LAT = 50.41420606283159;
const CENTER_LNG = 30.430412292480472;
const MAX_RIGHT_LAT = 50.417706358529024;
const MAX_RIGHT_LNG = 30.522422790527347;

// Calculate deltas for coordinate conversion
const MAX_X = 600;
const MAX_Y = 500;
const DELTA_LNG = (MAX_RIGHT_LNG - CENTER_LNG) * 2; // Full width
const DELTA_LAT = DELTA_LNG * (MAX_Y / MAX_X); // Maintain aspect ratio

// Task name templates
const TASK_PREFIXES = [
  'Deliver package to',
  'Pick up order from',
  'Drop off documents at',
  'Collect items from',
  'Transport goods to',
  'Retrieve parcel from',
  'Bring supplies to',
  'Take documents to',
  'Fetch package from',
  'Carry items to',
];

const LOCATIONS = [
  'downtown office',
  'residential area',
  'shopping center',
  'business district',
  'apartment complex',
  'warehouse',
  'retail store',
  'corporate building',
  'local market',
  'community center',
  'medical clinic',
  'restaurant',
  'hotel lobby',
  'parking lot',
  'subway station',
];

const DESCRIPTIONS = [
  'Quick delivery needed',
  'Urgent pickup required',
  'Handle with care',
  'Time-sensitive task',
  'Standard delivery service',
  'Express shipping needed',
  'Lightweight package',
  'Multiple items to transport',
  'Fragile items - careful handling',
  'Documents need signature',
];

const SKILLS = [
  'Driving',
  'Cycling',
  'Walking',
  'Navigation',
  'Customer Service',
  'Time Management',
  'Package Handling',
  'Communication',
];

function convertCoordinates(
  x: number,
  y: number,
): { lat: number; lng: number } {
  // Convert x (0-600) to longitude offset from center
  const lngOffset = ((x - MAX_X / 2) / MAX_X) * DELTA_LNG;

  // Convert y (0-500) to latitude offset from center (y increases downward, lat increases upward)
  const latOffset = ((MAX_Y / 2 - y) / MAX_Y) * DELTA_LAT;

  return {
    lat: CENTER_LAT + latOffset,
    lng: CENTER_LNG + lngOffset,
  };
}

function generateTaskName(): string {
  const prefix =
    TASK_PREFIXES[Math.floor(Math.random() * TASK_PREFIXES.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  return `${prefix} ${location}`;
}

function generateDescription(): string {
  return DESCRIPTIONS[Math.floor(Math.random() * DESCRIPTIONS.length)];
}

function selectRandomSkills(count: number = 2): string[] {
  const shuffled = [...SKILLS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, SKILLS.length));
}

export async function seedTasks(dataSource: DataSource) {
  const taskRepository = dataSource.getRepository(Task);
  const userRepository = dataSource.getRepository(User);
  const skillRepository = dataSource.getRepository(Skill);

  console.log('Starting task seeding...');

  // Read mock tasks
  const mockTasksPath = path.join(
    __dirname,
    '../../../storage/mock-tasks.json',
  );
  const mockTasksData = JSON.parse(fs.readFileSync(mockTasksPath, 'utf-8'));

  console.log(`Found ${mockTasksData.length} tasks in mock data`);

  // Get or create a default user for tasks
  let defaultUser = await userRepository.findOne({
    where: { username: 'seed-user' },
  });
  if (!defaultUser) {
    defaultUser = userRepository.create({
      username: 'seed-user',
      password: 'not-used',
    });
    await userRepository.save(defaultUser);
    console.log('Created default seed user');
  }

  // Ensure all skills exist
  const skillMap = new Map<string, Skill>();
  for (const skillTitle of SKILLS) {
    let skill = await skillRepository.findOne({ where: { title: skillTitle } });
    if (!skill) {
      skill = skillRepository.create({ title: skillTitle });
      await skillRepository.save(skill);
    }
    skillMap.set(skillTitle, skill);
  }
  console.log(`Ensured ${SKILLS.length} skills exist`);

  // Clear existing tasks (optional - comment out if you want to keep existing tasks)
  //   await taskRepository.delete({});
  console.log('Cleared existing tasks');

  // Create tasks from mock data
  const tasks: Task[] = [];
  for (const mockTask of mockTasksData) {
    const { lat, lng } = convertCoordinates(mockTask.x, mockTask.y);
    const selectedSkills = selectRandomSkills(2);

    const task = taskRepository.create({
      title: generateTaskName(),
      description: generateDescription(),
      reward: mockTask.r,
      latitude: lat,
      longitude: lng,
      estimatedDurationMinutes: mockTask.d,
      requiredSkills: selectedSkills.map((s) => skillMap.get(s)!),
      createdBy: defaultUser,
    });

    tasks.push(task);
  }

  await taskRepository.save(tasks);
  console.log(`Successfully seeded ${tasks.length} tasks`);

  // Print sample coordinates for verification
  console.log('\nSample coordinates:');
  console.log(
    `First task: lat=${tasks[0].latitude}, lng=${tasks[0].longitude}`,
  );
  console.log(
    `Last task: lat=${tasks[tasks.length - 1].latitude}, lng=${tasks[tasks.length - 1].longitude}`,
  );
  console.log(`Center should be around: lat=${CENTER_LAT}, lng=${CENTER_LNG}`);
}
