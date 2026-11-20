# Password Security & Lifecycle Policy

## 1. Password Complexity Rules
- Minimum length: 10 characters.
- Must include: At least 1 uppercase letter, 1 lowercase letter, 1 numeric digit, and 1 special symbol (`!@#$%^&*`).
- Passwords must not contain the user's name, email, or employee ID.

## 2. Argon2id Implementation
```typescript
import * as argon2 from 'argon2';

export async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,        // 3 iterations
    parallelism: 4,      // 4 threads
  });
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  return argon2.verify(hash, plainText);
}
```

## 3. Account Lockout & Brute-Force Throttling
- 5 consecutive failed login attempts result in a 15-minute temporary IP and account freeze.
- Password reset links expire after 60 minutes and become single-use.
