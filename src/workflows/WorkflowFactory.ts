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
  dependsOn?: string;
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

    // Create workflow
    const workflow = new Workflow();
    workflow.clientId = clientId;
    workflow.status = WorkflowStatus.Initial;

    const savedWorkflow = await workflowRepository.save(workflow);
    console.log('SAVED WORKFLOW...', savedWorkflow);
    console.log(`-------------WorkFlowId: ${savedWorkflow.workflowId}-----------------`);
    // Create tasks
    const tasks: Task[] = [];
    const taskIdMap = new Map<number, string>();

    for (const step of workflowDef.steps) {
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
    }

    for (let i = 0; i < workflowDef.steps.length; i++) {
      const step = workflowDef.steps[i];
      if (step.dependsOn) {
        const dependentStepNumber = parseInt(step.dependsOn);
        const dependentTaskId = taskIdMap.get(dependentStepNumber);
        if (dependentTaskId) {
          tasks[i].dependsOn = dependentTaskId;
          await taskRepository.save(tasks[i]);
        }
      }
    }

    savedWorkflow.tasks = tasks;
    return savedWorkflow;
  }
}
