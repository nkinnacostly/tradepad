const SIGN_IN_ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Incorrect email or password",
  "Email not confirmed": "Please verify your email before signing in",
  "User not found": "Incorrect email or password",
};

const SIGN_UP_ERROR_MAP: Record<string, string> = {
  "User already registered": "An account with this email already exists",
  "Email already in use": "An account with this email already exists",
};

export const mapSignInError = (message: string): string => {
  for (const [key, value] of Object.entries(SIGN_IN_ERROR_MAP)) {
    if (message.includes(key)) return value;
  }
  return "Something went wrong. Please try again.";
};

export const mapSignUpError = (message: string): string => {
  for (const [key, value] of Object.entries(SIGN_UP_ERROR_MAP)) {
    if (message.includes(key)) return value;
  }
  return "Something went wrong. Please try again.";
};
