"use strict";

const zxcvbn = require("zxcvbn");

/**
 * Validates password strength.
 * Returns an error message string if invalid, or null if valid.
 *
 * Rules:
 *  - At least 8 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character
 *  - zxcvbn score >= 3
 */
function validatePassword(password) {
  if (!password) return "Password is required";

  if (password.length < 8)
    return "Password must be at least 8 characters long";

  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter";

  if (!/[a-z]/.test(password))
    return "Password must contain at least one lowercase letter";

  if (!/[0-9]/.test(password))
    return "Password must contain at least one number";

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    return "Password must contain at least one special character";

  if (zxcvbn(password).score < 3)
    return "Password is too weak";

  return null;
}

module.exports = { validatePassword };
