import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { ApiError, apiFetch, type User } from "./api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  refetchUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery<User | null>({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await apiFetch<User>("/api/auth/me");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 60_000,
  });

  const refetchUser = async () => {
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  };

  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST" });
    queryClient.setQueryData(["auth", "me"], null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, refetchUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        Loading session...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        Checking permissions...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (user.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto my-16 bg-white border border-rose-200 rounded-xl p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900">Admin Access Required</h1>
        <p className="mt-2 text-slate-600 text-sm">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
