import { Skill } from 'src/skills/skill.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  // Real app would have password hash, email, etc.

  @ManyToMany(() => Skill)
  @JoinTable()
  skills: Skill[];
}
