"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  userId: string;
  username: string;
  email: string;
  name: string;
  imageUrl: string | null;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * useAuth - Custom hook for authentication
 * Replaces Clerk's useUser, useAuth, etc.
 * 
 * Usage:
 * const { user, isLoading, isAuthenticated, login, logout } = useAuth();
 * 
 * Example:
 * if (isLoading) return <div>Loading...</div>;
 * if (!isAuthenticated) return <div>Please sign in</div>;
 * return <div>Hello, {user.name}</div>;
 */
export const useAuth = (): UseAuthReturn => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchUser = async () => {
    try {
      const response = await axios.get("/api/auth/session");
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      await axios.post("/api/auth/login", { username, password });
      await fetchUser();
      router.refresh();
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await axios.post("/api/auth/logout");
      setUser(null);
      setIsAuthenticated(false);
      router.push("/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };
};
