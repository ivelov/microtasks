import { Skill } from 'src/skills/skill.entity';
import { User } from 'src/users/user.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TaskStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
}

/**
 * Represents a Task on the map
 */
@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal' })
  reward: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @Column({
    name: 'estimated_duration_minutes',
  })
  estimatedDurationMinutes: number;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.OPEN,
  })
  status: TaskStatus;

  @ManyToOne(() => User)
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  assignedTo: User;

  @ManyToMany(() => Skill)
  @JoinTable()
  requiredSkills: Skill[];
}
