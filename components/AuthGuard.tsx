"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import axios from "axios";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * AuthGuard - A client-side component to protect routes
 * Redirects to sign-in if user is not authenticated
 * 
 * Usage:
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 * 
 * With custom redirect:
 * <AuthGuard redirectTo="/login">
 *   <ProtectedContent />
 * </AuthGuard>
 */
export const AuthGuard = ({
  children,
  fallback,
  redirectTo = "/sign-in",
}: AuthGuardProps) => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await axios.get("/api/auth/session");
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
        router.push(redirectTo);
      }
    };

    checkAuth();
  }, [router, redirectTo]);

  if (isAuthenticated === null) {
    return fallback || (
      <div className="flex items-center justify-center h-full w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};
