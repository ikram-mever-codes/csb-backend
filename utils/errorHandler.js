class ErrorHandler extends Error {
  constructor(message, status = 500) {
    super(message);

    this.status = status;
    this.message = message;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      message: this.message,
      status: this.status,
    };
  }
}

export default ErrorHandler;
