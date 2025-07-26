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
      console.log(tasksInQueue, 'WATCHING TASKS......');

      tasksInQueue.forEach(async (task) => {
        const runAfterTask = await taskRepository.findOne({
          where: {taskId: task?.runAfter}
        });
        if (!task?.runAfter || runAfterTask?.status === 'completed') {
          console.log(`Running Task ${task.taskType} - ${task.taskId}`);
          await taskRunner.run(task);
        }
      });
    } catch (error) {
      console.error('Task execution failed. Task status has already been updated by TaskRunner.');
      console.error(error);
    } finally {
      // Wait before checking for the next taskInQueue again
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
