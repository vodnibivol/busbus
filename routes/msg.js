import express from 'express';
import DB from '../js/db.js';

const router = express.Router();

// --- MESSAGES

router.post('/send', async (req, res) => {
  const { recipient, content } = req.body;

  const msg = { recipient, content, timestamp: new Date().valueOf(), openedOn: 0 };
  await DB.messages.insertAsync(msg);

  res.redirect('send'); // reload
});

router.get('/delete', async (req, res) => {
  const count = await DB.messages.removeAsync({ _id: req.query.id });

  res.render('partials/pre', { content: `izbrisal ${count} sporočil.\n\n<a href="send">nazaj</a>` });
});

router.get('/open', async (req, res) => {
  const updated = await DB.messages.updateAsync({ _id: req.query.id }, { $set: { openedOn: new Date().valueOf() } });
  res.json({ updated });
});

// --- EXPORT

export default router;
