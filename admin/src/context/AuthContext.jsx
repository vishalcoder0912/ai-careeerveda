import {createContext, useContext, useEffect, useMemo, useState, useCallback} from "react";

import * as apiClient from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({children}) => {
  const [admin, setAdmin] = useState(null);
  // `restoring` is distinct from "logged out". On boot we do not yet know which
  // one it is, and rendering the login screen during that gap flashes it at
  // someone who is in fact signed in.
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiClient.setSessionEndedHandler(() => {
      if (!cancelled) setAdmin(null);
    });

    // The access token does not survive a page reload — it is deliberately kept
    // in memory only. The httpOnly refresh cookie does, so this exchanges it
    // for a new session and keeps the reload from logging the user out.
    apiClient
      .restoreSession()
      .then((restored) => {
        if (!cancelled) setAdmin(restored);
      })
      .finally(() => {
        if (!cancelled) setRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const account = await apiClient.login(email, password);
    setAdmin(account);
    return account;
  }, []);

  const signOut = useCallback(async () => {
    await apiClient.logout();
    setAdmin(null);
  }, []);

  // Permission checks read from the account the server returned, so the panel
  // and the API agree on what this user may do. Hiding a control the server
  // would refuse is a courtesy; the refusal is the actual control.
  const can = useCallback(
    (permission) => Boolean(admin && admin.permissions && admin.permissions.includes(permission)),
    [admin],
  );

  const value = useMemo(
    () => ({admin, restoring, signIn, signOut, can, setAdmin}),
    [admin, restoring, signIn, signOut, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
