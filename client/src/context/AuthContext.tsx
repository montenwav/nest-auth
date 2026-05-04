import { createContext, useContext, useState } from "react";
import API from "../api/axios";

interface UserProfileType {
  picture?: string;
  email: string;
  fullname: string;
  platforms: string[];
  roles: string[];
  isVerified: boolean;
  isTwoFactor: boolean;
  methods: string[];
}

interface AuthContextType {
  user: UserProfileType;
  setUser: any;
  isAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    fullname: string,
    email: string,
    password: string,
    passwordConfirm: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isAuth, setIsAuth] = useState<any>(null);

  const login = async (email: string, password: string) => {
    const res = await API.post("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("accessToken", res.data.accessToken);
    setUser((prev: any) => ({ ...prev }));
  };

  const register = async (
    fullname: string,
    email: string,
    password: string,
    passwordConfirm: string,
  ) => {
    await API.post("/auth/register", {
      email,
      password,
      fullname,
      passwordConfirm,
    });
    await login(email, password);
  };

  const logout = async () => {
    await API.delete("/auth/logout");
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  const refresh = async () => {
    try {
      const res: any = await API.get("/auth/refresh");
      localStorage.setItem("accessToken", res.data.accessToken);
    } catch (err: any) {
      throw new Error(err);
    }
  };

  const checkAuth = async () => {
    try {
      const { data } = await API.get("/auth/user");
      setUser(data);
      setIsAuth(true);
    } catch {
      setIsAuth(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuth,
        checkAuth,
        user,
        login,
        register,
        logout,
        refresh,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
