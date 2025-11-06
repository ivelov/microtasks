import { Task } from 'src/tasks/task.entity';

export type Chromosome = Task[]; // A path is an ordered list of Tasks
export type Population = Chromosome[];
export interface LocationPoint {
  latitude: number;
  longitude: number;
}
