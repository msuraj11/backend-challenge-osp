import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {DataSource} from 'typeorm';
import {Workflow} from '../models/Workflow';
import {Task} from '../models/Task';
import {TaskStatus} from '../workers/taskRunner';

export enum WorkflowStatus {
  Initial = 'initial',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed'
}

interface WorkflowStep {
  taskType: string;
  stepNumber: number;
  runAfter?: string;
}

interface WorkflowDefinition {
  name: string;
  steps: WorkflowStep[];
}

export class WorkflowFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Creates a workflow by reading a YAML file and constructing the Workflow and Task entities.
   * @param filePath - Path to the YAML file.
   * @param clientId - Client identifier for the workflow.
   * @param geoJson - The geoJson data string for tasks (customize as needed).
   * @returns A promise that resolves to the created Workflow.
   */
  async createWorkflowFromYAML(
    filePath: string,
    clientId: string,
    geoJson: string
  ): Promise<Workflow> {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const workflowDef = yaml.load(fileContent) as WorkflowDefinition;

    const workflowRepository = this.dataSource.getRepository(Workflow);
    const taskRepository = this.dataSource.getRepository(Task);

    const workflow = new Workflow();
    workflow.clientId = clientId;
    workflow.status = WorkflowStatus.Initial;

    const savedWorkflow = await workflowRepository.save(workflow);
    console.log('SAVED WORKFLOW...', savedWorkflow);

    const tasks: Task[] = [];
    const taskIdMap = new Map<number, string>();

    workflowDef.steps.forEach(async (step) => {
      const task = new Task();
      task.clientId = clientId;
      task.geoJson = geoJson;
      task.status = TaskStatus.Queued;
      task.taskType = step.taskType;
      task.stepNumber = step.stepNumber;
      task.workflow = savedWorkflow;

      const savedTask = await taskRepository.save(task);
      tasks.push(savedTask);
      taskIdMap.set(step.stepNumber, savedTask.taskId);
    });

    workflowDef.steps.forEach(async (step, index) => {
      if (step.runAfter) {
        const dependentStepNumber = parseInt(step.runAfter);
        const dependentTaskId = taskIdMap.get(dependentStepNumber);
        if (dependentTaskId) {
          tasks[index].runAfter = dependentTaskId;
          await taskRepository.save(tasks[index]);
        }
      }
    });

    savedWorkflow.tasks = tasks;
    return savedWorkflow;
  }
}
