import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from 'typeorm';
import {Workflow} from './Workflow';
import {TaskStatus} from '../workers/taskRunner';

@Entity({name: 'tasks'})
export class Task {
  @PrimaryGeneratedColumn('uuid')
  taskId!: string;

  @Column()
  clientId!: string;

  @Column('text')
  geoJson!: string;

  @Column()
  status!: TaskStatus;

  @Column({nullable: true, type: 'text'})
  progress?: string | null;

  @Column({nullable: true})
  resultId?: string;

  @Column()
  taskType!: string;

  @Column({default: 1})
  stepNumber!: number;

  @Column({nullable: true})
  dependsOn!: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.tasks)
  @JoinColumn({name: 'workflowId'})
  workflow!: Workflow;

  @Column('text', {nullable: true})
  output!: string;
}
