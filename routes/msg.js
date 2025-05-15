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
  const updated = await DB.messages.updateAsync(
    { _id: req.query.id },
    { $set: { openedOn: new Date().valueOf() } },
    { returnUpdatedDocs: true }
  );

  const doc = updated?.affectedDocuments;

  if (doc) {
    const time = new Date().getHours() + '.' + ('' + new Date(doc.openedOn).getMinutes()).padStart(2, '0');

    fetch('https://ntfy.sh/busbus-admin-log', {
      method: 'POST',
      body: `${time}: ${capitalize(doc.recipient)} je odprl/a sporočilo: "${doc.content}".`,
      headers: {
        Title: encodeBase64('Sporočilo!'),
        // Click: 'https://strojcek.ftp.sh/busbus/msg/send/',
      },
    });
  }

  res.json({ updated });
});

// --- UTILS

function capitalize(str) {
  return str[0].toUpperCase() + str.slice(1);
}

function trimString(str, maxLength) {
  try {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 8) + '..' + str.slice(str.length - 6);
  } catch (error) {
    return null;
  }
}

function encodeBase64(str) {
  return '=?UTF-8?B?' + Buffer.from(str).toString('base64') + '?=';
}

// --- EXPORT

export default router;
