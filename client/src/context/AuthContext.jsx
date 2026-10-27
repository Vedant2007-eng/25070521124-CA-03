import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  setAuthToken,
  setUnauthorizedHandler,
} from "../services/api";

const EMPTY_AUTH = {
  token: null,
  user: null,
};

export const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(EMPTY_AUTH);

  const login = useCallback(({ token, user }) => {
    setAuthToken(token);
    setAuth({ token, user });
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setAuth(EMPTY_AUTH);
  }, []);

  useEffect(() => {
    const clearAuthentication = () => {
      setAuthToken(null);
      setAuth(EMPTY_AUTH);
    };

    return setUnauthorizedHandler(clearAuthentication);
  }, []);

  const value = useMemo(
    () => ({
      token: auth.token,
      user: auth.user,
      isAuthenticated: Boolean(auth.token && auth.user),
      isAuthReady: true,
      login,
      logout,
    }),
    [auth.token, auth.user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
