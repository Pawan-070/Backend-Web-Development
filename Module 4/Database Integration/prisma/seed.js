const prisma = require('./client');
const posts = require('../src/data/postSeed');

// Repeatable seed: every write is an upsert keyed on a unique column, so
// `npm run db:seed` can be run any number of times without duplicating rows.
const users = [
  { id: 1, username: 'ada', email: 'ada@example.com', name: 'Ada Lovelace' },
  { id: 2, username: 'linus', email: 'linus@example.com', name: 'Linus Torvalds' },
];

const tags = [
  { id: 1, name: 'architecture' },
  { id: 2, name: 'databases' },
];

async function seed() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: { email: user.email, name: user.name },
      create: user,
    });
  }

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }

  for (const post of posts) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: { title: post.title, body: post.body, authorId: post.authorId },
      create: post,
    });
  }

  // One follow edge and one vote, both protected by uniqueness rules.
  await prisma.follow.upsert({
    where: { followerId_followingId: { followerId: 1, followingId: 2 } },
    update: {},
    create: { followerId: 1, followingId: 2 },
  });

  await prisma.vote.upsert({
    where: { userId_postId: { userId: 2, postId: 1 } },
    update: { value: 1 },
    create: { userId: 2, postId: 1, value: 1 },
  });

  const tagList = await prisma.tag.findMany({ where: { name: { in: tags.map((t) => t.name) } } });
  for (const tag of tagList) {
    await prisma.postTag.upsert({
      where: { postId_tagId: { postId: 1, tagId: tag.id } },
      update: {},
      create: { postId: 1, tagId: tag.id },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    posts: await prisma.post.count(),
    comments: await prisma.comment.count(),
    votes: await prisma.vote.count(),
    follows: await prisma.follow.count(),
    tags: await prisma.tag.count(),
  };
  await resetSequences();
  console.log('Seed complete:', counts);
}

// The seed inserts explicit ids, so the identity sequences are pushed past the
// highest seeded id. Without this, the next application insert would collide
// with a seeded row.
async function resetSequences() {
  for (const table of ['users', 'posts', 'comments', 'votes', 'follows', 'tags']) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST(COALESCE((SELECT MAX("id") FROM "${table}"), 1), 1)) FROM "${table}";`
    );
  }
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
