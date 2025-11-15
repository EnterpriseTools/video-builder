/**
 * Application configuration
 * Centralized configuration for API endpoints and other settings
 */

// Get API base URL from environment variable
// - In production (Vercel): uses VITE_API_BASE_URL pointing to Railway backend
// - In development: defaults to '/api' which is proxied to localhost:8000 by Vite
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
