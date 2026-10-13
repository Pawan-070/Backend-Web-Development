const prisma = require('../../prisma/client');
const { DataIntegrityError } = require('../errors/dataIntegrityError');

// Prisma speaks findMany/findUnique/create/update/delete; the application above
// this boundary speaks findAll/findById/create/update/remove. This repository is
// the only place that knows both vocabularies.

// The public shape of a post is unchanged by the storage swap.
function toPost(row) {
  return { id: row.id, title: row.title, body: row.body, authorId: row.authorId };
}

// Reject ids the database could never hold, so they behave like "not found"
// exactly as they did against the in-memory store.
function toId(id) {
  const numericId = Number(id);
  return Number.isInteger(numericId) ? numericId : null;
}

// Unique, foreign key, and missing-row failures are translated into the
// repository's own vocabulary. Services never see Prisma error codes.
function translateFailure(error, operation) {
  if (error && ['P2002', 'P2003', 'P2014'].includes(error.code)) {
    console.error(`[postRepository] ${operation} rejected: ${error.code}`);
    throw new DataIntegrityError('Post data violates a database constraint');
  }
  throw error;
}

async function findAll() {
  const rows = await prisma.post.findMany({ orderBy: { id: 'asc' } });
  return rows.map(toPost);
}

async function findById(id) {
  const postId = toId(id);
  if (postId === null) return null;
  const row = await prisma.post.findUnique({ where: { id: postId } });
  return row ? toPost(row) : null;
}

async function create(fields) {
  try {
    const row = await prisma.post.create({
      data: {
        title: fields.title,
        body: fields.body || '',
        authorId: fields.authorId,
      },
    });
    return toPost(row);
  } catch (error) {
    return translateFailure(error, 'create');
  }
}

async function update(id, patch) {
  const postId = toId(id);
  if (postId === null) return null;

  const data = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.body !== undefined) data.body = patch.body;
  if (Object.keys(data).length === 0) return findById(postId);

  try {
    const row = await prisma.post.update({ where: { id: postId }, data });
    return toPost(row);
  } catch (error) {
    if (error && error.code === 'P2025') return null;
    return translateFailure(error, 'update');
  }
}

async function remove(id) {
  const postId = toId(id);
  if (postId === null) return false;

  try {
    await prisma.post.delete({ where: { id: postId } });
    return true;
  } catch (error) {
    if (error && error.code === 'P2025') return false;
    return translateFailure(error, 'remove');
  }
}

module.exports = { findAll, findById, create, update, remove };
