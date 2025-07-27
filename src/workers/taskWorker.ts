import {AppDataSource} from '../data-source';
import {Task} from '../models/Task';
import {TaskRunner, TaskStatus} from './taskRunner';

export async function taskWorker(start = true) {
  const taskRepository = AppDataSource.getRepository(Task);
  const taskRunner = new TaskRunner(taskRepository);
  console.log(`TASK RUNNER ${start ? 'STARTED' : 'STOPPED'}...`);

  while (start) {
    try {
      const tasksInQueue = await taskRepository.find({
        where: {status: TaskStatus.Queued},
        relations: ['workflow'] // Ensure workflow is loaded
      });
      console.log('WATCHING TASKS......');

      for (const task of tasksInQueue) {
        const previousTask = await taskRepository.findOne({
          where: {taskId: task?.dependsOn}
        });
        if (!task?.dependsOn || previousTask?.status === 'completed') {
          console.log(`------TaskId: ${task.taskId}--------`);
          console.log(`Running Task ${task.taskType} - ${task.taskId}`);
          await taskRunner.run(task);
        } else {
          console.log(
            `Pending to run ${task.status} task: ${task.taskType} of workflow: ${task.workflow.workflowId}.
            As previous task: ${previousTask?.taskType} has status: ${previousTask?.status}
            --------------------------------------------`
          );
        }
      }
    } catch (error) {
      console.error('Task execution failed. Task status has already been updated by TaskRunner.');
      console.error(error);
    } finally {
      // Wait before checking for the next taskInQueue again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
