import {Task} from '../models/Task';
import {Job} from './Job';
import {area} from '@turf/area';

export class PolygonAreaJob implements Job {
  async run(task: Task): Promise<string> {
    try {
      const geoJson = JSON.parse(task.geoJson);
      // Use @turf/area to calculate the polygon area from the geoJson field in the task.
      const plygonArea = area(geoJson);

      const result = {
        area: plygonArea,
        unit: 'square meters',
        calculatedAt: new Date().toISOString()
      };

      const output = JSON.stringify(result);

      task.output = output;
      return output;
    } catch (error: any) {
      throw new Error(`Polygon area calculation failed: ${error.message}`);
    }
  }
}
