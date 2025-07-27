import {Repository} from 'typeorm';
import {Task} from '../models/Task';
import {getJobForTaskType} from '../jobs/JobFactory';
import {WorkflowStatus} from '../workflows/WorkflowFactory';
import {Workflow} from '../models/Workflow';
import {Result} from '../models/Result';

export enum TaskStatus {
  Queued = 'queued',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed'
}

export class TaskRunner {
  constructor(private taskRepository: Repository<Task>) {}

  /**
   * Runs the appropriate job based on the task's type, managing the task's status.
   * @param task - The task entity that determines which job to run.
   * @throws If the job fails, it rethrows the error.
   */
  async run(task: Task): Promise<void> {
    const resultRepository = this.taskRepository.manager.getRepository(Result);
    try {
      task.status = TaskStatus.InProgress;
      task.progress = 'starting job...';
      await this.taskRepository.save(task);
      const job = getJobForTaskType(task.taskType);
      console.log(`Starting job ${task.taskType} for task ${task.taskId}...`);

      // Execure each job and store the result in Result table.
      const taskResult = await job.run(task);
      console.log(`Job ${task.taskType} for task ${task.taskId} completed successfully.`);
      const result = new Result();
      result.taskId = task.taskId!;
      result.taskType = task.taskType;
      result.data = taskResult;
      result.workflow = task.workflow;
      await resultRepository.save(result);

      // Save result data in Task table
      task.resultId = result.resultId!;
      task.status = TaskStatus.Completed;
      task.progress = null;
      task.output = taskResult;
      await this.taskRepository.save(task);
    } catch (error: any) {
      console.error(`Error running job ${task.taskType} for task ${task.taskId}:`, error);

      task.status = TaskStatus.Failed;
      task.progress = null;
      await this.taskRepository.save(task);

      throw error;
    }

    const workflowRepository = this.taskRepository.manager.getRepository(Workflow);
    const currentWorkflow = await workflowRepository.findOne({
      where: {workflowId: task.workflow.workflowId},
      relations: ['tasks']
    });
    const currentWorkflowResult = await resultRepository.find({
      where: {workflow: {workflowId: task.workflow.workflowId}}
    });

    if (currentWorkflow) {
      const allCompleted = currentWorkflow.tasks.every((t) => t.status === TaskStatus.Completed);
      const anyFailed = currentWorkflow.tasks.some((t) => t.status === TaskStatus.Failed);

      if (anyFailed) {
        currentWorkflow.status = WorkflowStatus.Failed;
      } else if (allCompleted) {
        currentWorkflow.status = WorkflowStatus.Completed;
        currentWorkflow.finalResult = JSON.stringify({
          completedAt: new Date().toISOString(),
          tasksCompleted: currentWorkflow.tasks.filter((t) => t.status === TaskStatus.Completed)
            .length,
          totalTasks: currentWorkflow.tasks.length,
          results: currentWorkflowResult.map((r) => ({
            taskId: r.taskId,
            taskType: r.taskType,
            output: r.data ? JSON.parse(r.data) : null
          }))
        });
      } else {
        currentWorkflow.status = WorkflowStatus.InProgress;
      }

      await workflowRepository.save(currentWorkflow);
    }
  }
}
