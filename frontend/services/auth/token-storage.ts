"use client";

import type { AuthUser } from "@/types/auth";

const ACCESS_TOKEN_KEY = "token";
const AUTH_USER_KEY = "auth_user";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setToken(token: string) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearToken() {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function setStoredUser(user: AuthUser) {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getStoredUser(): AuthUser | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearStoredUser() {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(AUTH_USER_KEY);
}

export function isAuthenticated() {
  return Boolean(getToken());
}
