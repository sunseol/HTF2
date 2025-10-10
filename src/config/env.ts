import dotenv from 'dotenv';

dotenv.config();

export const getEnv = (key: string, fallback?: string): string | undefined => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return fallback;
  }
  return value;
};

export const requireEnv = (key: string): string => {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};
