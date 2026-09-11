import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const DEFAULT_USERS = [
  {
    id: 'usr-1',
    name: 'Alex Vance',
    email: 'analyst@threattwin.io',
    password: 'password123',
    role: 'Senior SOC Analyst',
    company: 'Nexus Cyber Systems',
    avatar: '?????',
  },
  {
    id: 'usr-2',
    name: 'Elena Rostova',
    email: 'admin@threattwin.io',
    password: 'adminpassword',
    role: 'CISO & Principal Architect',
    company: 'Nexus Cyber Systems',
    avatar: '???',
  },
];

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('threattwin_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const session = localStorage.getItem('threattwin_session');
      return session ? JSON.parse(session) : DEFAULT_USERS[0];
    } catch {
      return DEFAULT_USERS[0];
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('threattwin_users', JSON.stringify(users));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }, [users]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('threattwin_session', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('threattwin_session');
      }
    } catch (e) {
      console.warn('LocalStorage session save failed', e);
    }
  }, [currentUser]);

  const login = useCallback(
    (email, password) => {
      const found = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (!found) {
        throw new Error('Invalid email or password. Use analyst@threattwin.io / password123 or register a new account.');
      }
      setCurrentUser(found);
      setIsAuthModalOpen(false);
      return found;
    },
    [users]
  );

  const register = useCallback((data) => {
    const { name, email, password, role, company } = data;
    if (!name || !email || !password) {
      throw new Error('Name, email, and password are required.');
    }

    setUsers((prev) => {
      const exists = prev.some((u) => u.email.toLowerCase() === email.toLowerCase());
      if (exists) {
        throw new Error('An account with this email already exists.');
      }
      const newUser = {
        id: `usr-${Date.now()}`,
        name,
        email,
        password,
        role: role || 'Security Analyst',
        company: company || 'Enterprise Corp',
        avatar: '??',
      };
      setCurrentUser(newUser);
      setIsAuthModalOpen(false);
      return [...prev, newUser];
    });
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        register,
        logout,
        isAuthModalOpen,
        setIsAuthModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
