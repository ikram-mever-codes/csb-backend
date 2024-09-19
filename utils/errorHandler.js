class ErrorHandler extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "Custom ErrorHandler";
    Error.captureStackTrace(this, this.constructor);
  }
}

export default ErrorHandler;
