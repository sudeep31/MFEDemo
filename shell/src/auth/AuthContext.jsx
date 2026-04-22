import React, { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

const AUTH_API = "http://localhost:3100";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem("mfe_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => sessionStorage.getItem("mfe_token"));

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${AUTH_API}/users?email=${encodeURIComponent(email)}`);
    const users = await res.json();
    if (users.length === 0) throw new Error("User not found");
    const u = users[0];
    if (u.password !== password) throw new Error("Invalid password");
    const fakeToken = btoa(`${u.email}:${Date.now()}`);
    setUser({ id: u.id, name: u.name, email: u.email });
    setToken(fakeToken);
    sessionStorage.setItem("mfe_user", JSON.stringify({ id: u.id, name: u.name, email: u.email }));
    sessionStorage.setItem("mfe_token", fakeToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem("mfe_user");
    sessionStorage.removeItem("mfe_token");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
