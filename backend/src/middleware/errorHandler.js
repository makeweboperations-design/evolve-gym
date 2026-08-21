// Centralized error handler. Controllers should call next(err) rather than
// sending ad-hoc error responses, so logging/formatting stays consistent.
module.exports = function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message;

  res.status(status).json({ message });
};
