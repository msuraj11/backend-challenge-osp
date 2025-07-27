import {Router} from 'express';
import {AppDataSource} from '../data-source';
import {Workflow} from '../models/Workflow';
import {Task} from '../models/Task';

const router = Router();

router.get('/:id/status', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const taskRepository = AppDataSource.getRepository(Task);

    const workflow = await workflowRepository.findOne({
      where: {workflowId: workflowId}
    });

    if (!workflow) {
      res.status(404).json({error: 'Bad request: Workflow not found'});
      return;
    }

    const tasks = await taskRepository.find({
      where: {workflow: {workflowId: workflowId}}
    });

    const completedTasks = tasks.filter((t) => t.status === 'completed').length;

    res.json({
      workflowId: workflow.workflowId,
      status: workflow.status,
      completedTasks,
      totalTasks: tasks.length
    });
  } catch (error: any) {
    console.error('Error getting workflow status:', error);
    res.status(500).json({error: 'Failed to get workflow status'});
  }
});

router.get('/:id/results', async (req, res) => {
  try {
    const workflowId = req.params.id;
    const workflowRepository = AppDataSource.getRepository(Workflow);

    const workflow = await workflowRepository.findOne({
      where: {workflowId: workflowId}
    });

    if (!workflow) {
      res.status(404).json({error: 'Bad request: Workflow not found'});
      return;
    }

    if (workflow.status !== 'completed') {
      res.status(400).json({error: 'Workflow is not yet completed'});
      return;
    }

    res.json({
      workflowId: workflow.workflowId,
      status: workflow.status,
      finalResult: workflow.finalResult ? JSON.parse(workflow.finalResult) : null
    });
  } catch (error) {
    console.error('Error getting workflow results:', error);
    res.status(500).json({error: 'Failed to get workflow results'});
  }
});

export default router;
