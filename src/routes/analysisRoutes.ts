import {Router} from 'express';
import {AppDataSource} from '../data-source';
import {WorkflowFactory} from '../workflows/WorkflowFactory'; // Create a folder for factories if you prefer
import path from 'path';

const router = Router();
const workflowFactory = new WorkflowFactory(AppDataSource);

router.post('/', async (req, res) => {
  try {
    const {clientId, geoJson} = req.body;

    if (!clientId || !geoJson) {
      res.status(400).json({error: 'Invalid input: clientId and geoJson are required.'});
      return;
    }

    if (!geoJson) {
      res.status(400).json({error: 'Invalid input: No geoJson provided for area calculation.'});
      return;
    }

    if (!('type' in geoJson) || !('coordinates' in geoJson)) {
      res
        .status(400)
        .json({error: 'Invalid input: Expected type and coordinates properties in geoJson.'});
      return;
    }

    if (geoJson?.type !== 'Polygon') {
      res.status(400).json({error: 'Invalid input: Expected Polygon type in geoJson'});
      return;
    }

    const workflowFile = path.join(__dirname, '../workflows/example_workflow.yml');
    const workflow = await workflowFactory.createWorkflowFromYAML(
      workflowFile,
      clientId,
      JSON.stringify(geoJson)
    );

    res.status(202).json({
      workflowId: workflow.workflowId,
      currentStatus: workflow.status,
      message: 'Workflow created and tasks queued from YAML definition.'
    });
  } catch (error: any) {
    console.error('Error creating workflow:', error);
    res.status(500).json({message: 'Failed to create workflow'});
  }
});

export default router;
