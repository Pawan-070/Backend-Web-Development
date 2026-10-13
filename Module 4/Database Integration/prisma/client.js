const { PrismaClient } = require('@prisma/client');

// One PrismaClient per application process. Reusing a single instance keeps a
// single connection pool instead of opening a new one on every module load.
const prisma = new PrismaClient();

module.exports = prisma;
