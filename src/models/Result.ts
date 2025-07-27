import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from 'typeorm';
import {Workflow} from './Workflow';

@Entity({name: 'results'})
export class Result {
  @PrimaryGeneratedColumn('uuid')
  resultId!: string;

  @Column()
  taskId!: string;

  @Column({nullable: true})
  taskType!: string;

  @Column('text')
  data!: string | null; // Could be JSON or any serialized format

  @ManyToOne(() => Workflow, (workflow) => workflow.workflowId)
  @JoinColumn({name: 'workflowId'})
  workflow?: Workflow;
}
