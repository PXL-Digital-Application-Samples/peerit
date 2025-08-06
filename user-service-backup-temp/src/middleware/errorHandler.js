const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    error: 'Internal Server Error',
    message: 'Something went wrong',
    code: 500,
    timestamp: new Date().toISOString()
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.error = 'Validation Error';
    error.message = err.message;
    error.code = 400;
  }

  // Prisma errors
  if (err.code === 'P2002') {
    error.error = 'Conflict';
    error.message = 'Resource already exists';
    error.code = 409;
  }

  if (err.code === 'P2025') {
    error.error = 'Not Found';
    error.message = 'Resource not found';
    error.code = 404;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.error = 'Unauthorized';
    error.message = 'Invalid token';
    error.code = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.error = 'Unauthorized';
    error.message = 'Token expired';
    error.code = 401;
  }

  // Custom errors with status codes
  if (err.statusCode) {
    error.code = err.statusCode;
    error.message = err.message;
  }

  res.status(error.code).json(error);
};

module.exports = errorHandler;
