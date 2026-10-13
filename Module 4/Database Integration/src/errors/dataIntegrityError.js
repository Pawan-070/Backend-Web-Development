// Storage-level failure that is safe to surface to an API client.
// The underlying database message and Prisma error code stay in the server log.
class DataIntegrityError extends Error {
  constructor(message = 'Request violates a data constraint') {
    super(message);
    this.name = 'DataIntegrityError';
    this.statusCode = 422;
  }
}

module.exports = { DataIntegrityError };
