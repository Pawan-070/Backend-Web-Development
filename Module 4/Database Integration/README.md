# Database Integration Assignment

The community-platform API now persists through **Prisma + PostgreSQL**. The in-memory
array behind `src/repositories/postRepository.js` is gone, but every layer above the
repository — routes, controller, service — is unchanged, because the repository keeps the
same asynchronous contract.

## Run

```bash
npm install
cp .env.example .env        # then set your real PostgreSQL URL
npm run db:migrate -- --name <change>   # create/apply a migration
npm run prisma:generate                  # regenerate the client
npm run db:seed                          # repeatable seed data
npm start                                # API on PORT (default 3000)
```

## Database scripts

| Script | Purpose |
| --- | --- |
| `npm run db:migrate` | Create and apply a migration from `prisma/schema.prisma` |
| `npm run db:deploy` | Apply committed migrations (CI / production) |
| `npm run prisma:generate` | Regenerate the Prisma Client from the schema |
| `npm run db:seed` | Idempotent seed (`prisma/seed.js`, runnable repeatedly) |
| `npm run db:reset` | Drop, re-apply all migrations, re-run the seed |
| `npm run prisma:format` / `prisma:validate` | Schema hygiene checks |

## Layout

```
prisma/
  schema.prisma      users, posts, comments, votes, follows, tags (+ PostTag join)
  migrations/        committed migration history
  client.js          single PrismaClient shared by the process
  seed.js            repeatable seed
src/
  repositories/postRepository.js   Prisma behind the original repository contract
  errors/dataIntegrityError.js     safe, client-facing storage failure
  services/  controllers/          unchanged
```

## Schema notes

- `Vote` is unique per `(userId, postId)`; `Follow` is unique per `(followerId, followingId)`;
  `Tag.name` is unique; `PostTag` has a composite primary key so a tag cannot repeat on a post.
- Indexes cover the demonstrated lookup paths: posts by author and by creation time, comments
  by post, votes by post, and both directions of a follow.
- Deletion behaviour is explicit everywhere: `Cascade` for children of a removed post or user,
  `Cascade` on primary-key updates.

## Boundary discipline

Prisma appears only in `prisma/client.js`, `prisma/seed.js`, and `src/repositories/`.
Services still call `findAll / findById / create / update / remove` and never see
`findMany`, model delegates, or Prisma error codes; database failures are translated into
`DataIntegrityError` (HTTP 422) with a generic message, while the raw database error stays
in the server log.

## Verified behaviour

`list`, `read existing`, `read missing (404)`, `create (201)`, `create without title (422)`,
`create with unknown author (422, foreign key)`, `update existing (200)`, `update missing (404)`,
`remove existing (204)`, `remove missing (404)` — all identical to the in-memory version, and
data survives a server restart.
