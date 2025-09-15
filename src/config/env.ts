
export const ENV = {
  API_URL: import.meta.env.VITE_API_URL as string,
  API_PREFIX: import.meta.env.VITE_API_PREFIX || '',
  API_VERSION: import.meta.env.VITE_API_VERSION || '',
  XSRF_COOKIE: import.meta.env.VITE_XSRF_COOKIE || '',
  XSRF_HEADER: import.meta.env.VITE_XSRF_HEADER || '',
};

export const API_BASE = [ENV.API_URL, ENV.API_PREFIX]
  .filter(Boolean)
  .join('');
