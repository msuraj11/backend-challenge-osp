import {AppDataSource} from '../data-source';
import {Task} from '../models/Task';
import {Job} from './Job';

export class ReportGenerationJob implements Job {
  async run(task: Task): Promise<string> {
    try {
      const taskRepository = AppDataSource.getRepository(Task);

      // Get all tasks in the workflow
      const workflowTasks = await taskRepository.find({
        where: {workflow: {workflowId: task.workflow.workflowId}},
        order: {stepNumber: 'ASC'}
      });

      const taskReports = workflowTasks
        .filter((t) => t.taskId !== task.taskId)
        .map((t) => ({
          taskId: t.taskId,
          type: t.taskType,
          status: t.status,
          output: t.output ? JSON.parse(t.output) : null
        }));

      const report = {
        workflowId: task.workflow.workflowId,
        tasks: taskReports,
        finalReport: 'Aggregated workflow results - all tasks completed successfully'
      };

      return JSON.stringify(report);
    } catch (error: any) {
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }
}
