import {Job} from './Job';
import {Task} from '../models/Task';

export class EmailNotificationJob implements Job {
  async run(task: Task): Promise<string> {
    try {
      console.log(`Sending email notification for task ${task.taskId}...`);
      // Perform notification work
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log('Email sent!');

      const output = JSON.stringify({
        emailSent: true,
        subject: 'Workflow has been completed.',
        summary: `Email sent to ${task.clientId} on ${new Date().toISOString()}, Task completed.`
      });
      return output;
    } catch (error: any) {
      throw new Error(`Email notification failed: ${error.message}`);
    }
  }
}
