const express = require('express');
const postController = require('./controllers/postController');
const prisma = require('../prisma/client');

const app = express();
app.use(express.json());

app.get('/posts', postController.list);
app.get('/posts/:id', postController.get);
app.post('/posts', postController.create);
app.patch('/posts/:id', postController.update);
app.delete('/posts/:id', postController.remove);

app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json({ error: error.message });
});

if (require.main === module) {
  prisma
    .$connect()
    .then(() => {
      console.log('Prisma connected');
      app.listen(process.env.PORT || 3000, () => console.log('API listening'));
    })
    .catch((error) => {
      console.error('Prisma failed to connect:', error.message);
      process.exit(1);
    });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      prisma.$disconnect().finally(() => process.exit(0));
    });
  }
}

module.exports = app;
