import bcrypt from 'bcryptjs';
bcrypt.compare('123456', '$2b$10$dN4W/PxKTidT/BObD.0FfOeDscIXzjIrZLqKt1lbznXcCQmJLLjKK').then(console.log);
