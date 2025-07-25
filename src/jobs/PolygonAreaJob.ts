import {Task} from '../models/Task';
import {Job} from './Job';

export class PolygonAreaJob implements Job {
  async run(task: Task): Promise<void> {
    try {
      const geoJson = JSON.parse(task.geoJson);
    } catch (error) {}
  }
}
