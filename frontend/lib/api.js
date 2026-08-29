import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: API_URL });

// Attach the JWT (stored in localStorage after login) to every request.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("netshield_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function saveToken(token) {
  localStorage.setItem("netshield_token", token);
}

export function clearToken() {
  localStorage.removeItem("netshield_token");
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("netshield_token");
}
