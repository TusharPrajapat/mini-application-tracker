import React, { createContext, useContext, useEffect, useState } from "react";
import { UserRole } from "../types/auth";
import { getMe } from "../services/authService";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "../utils/tokenStorage";

export interface AuthContextType {
  userId: number | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string) => Promise<{ userId: number; role: UserRole }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyAuth() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await getMe();
        if (res.success && res.data) {
          setUserId(res.data.userId);
          setRole(res.data.role);
          setIsAuthenticated(true);
        } else {
          clearAccessToken();
        }
      } catch {
        clearAccessToken();
        setUserId(null);
        setRole(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const login = async (token: string): Promise<{ userId: number; role: UserRole }> => {
    setAccessToken(token);
    const res = await getMe();
    if (!res.success || !res.data) {
      clearAccessToken();
      throw new Error("Failed to verify authenticated profile identity");
    }

    setUserId(res.data.userId);
    setRole(res.data.role);
    setIsAuthenticated(true);

    return {
      userId: res.data.userId,
      role: res.data.role,
    };
  };

  const logout = (): void => {
    clearAccessToken();
    setUserId(null);
    setRole(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        role,
        isAuthenticated,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
