import { Router } from 'express';
import { villageService } from '../services/village';
import { insertVillageMemberSchema } from '@db/schema';

const router = Router();

router.get('/api/village', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    const members = await villageService.getMembersByUserId(req.user.id);
    res.json(members);
  } catch (error) {
    next(error);
  }
});

router.post('/api/village', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    const result = insertVillageMemberSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).send(result.error.message);
    }

    const member = await villageService.addMember(req.user.id, result.data);
    res.json(member);
  } catch (error) {
    console.error('Error in POST /api/village:', error);
    next(error);
  }
});

router.get('/api/village/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).send('Unauthorized');
    }

    const memberContext = await villageService.getMemberWithContext(
      req.user.id,
      parseInt(req.params.id)
    );
    res.json(memberContext);
  } catch (error) {
    next(error);
  }
});

export default router;
