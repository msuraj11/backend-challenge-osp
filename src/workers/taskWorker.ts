import {AppDataSource} from '../data-source';
import {Task} from '../models/Task';
import {TaskRunner, TaskStatus} from './taskRunner';

export async function taskWorker(start = true) {
  const taskRepository = AppDataSource.getRepository(Task);
  const taskRunner = new TaskRunner(taskRepository);
  console.log(`TASK WORKER ${start ? 'STARTED' : 'STOPPED'}...`);

  while (start) {
    try {
      const tasksInQueue = await taskRepository.find({
        where: {status: TaskStatus.Queued},
        relations: ['workflow'] // Ensure workflow is loaded
      });
      const failedTasks = await taskRepository.find({
        where: {status: TaskStatus.Failed},
        relations: ['workflow']
      });
      console.log('WATCHING TASKS......');
      console.log(`Pending Tasks -------------- ${tasksInQueue.length}`);
      console.log(`Failed Tasks  -------------- ${failedTasks.length}`);

      for (const task of tasksInQueue) {
        const previousTask = await taskRepository.findOne({
          where: {taskId: task?.dependsOn}
        });
        if (!task?.dependsOn || previousTask?.status === 'completed') {
          console.log(`------TaskId: ${task.taskId}--------`);
          console.log(`Running Task ${task.taskType}....`);
          await taskRunner.run(task);
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
