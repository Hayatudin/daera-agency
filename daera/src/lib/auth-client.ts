import { useState, useEffect } from 'react';
import { apiFetch } from './api-client';

export const signIn = {
  email: async ({ email, password }: any) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      if (!response.ok) {
        return { error: { message: data.message || 'Login failed' } };
      }
      
      localStorage.setItem('auth_token', data.token);
      return { data: { user: data.user }, error: null };
    } catch (e: any) {
      return { error: { message: e.message } };
    }
  }
};

export const signUp = {
  email: async ({ email, password, name }: any) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      });
      
      const data = await response.json();
      if (!response.ok) {
        return { error: { message: data.message || 'Registration failed' } };
      }
      
      localStorage.setItem('auth_token', data.token);
      return { data: { user: data.user }, error: null };
    } catch (e: any) {
      return { error: { message: e.message } };
    }
  }
};

export const signOut = async () => {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    console.error('Logout error', e);
  } finally {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  }
};

export function useSession() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setSessionData(null);
        setIsPending(false);
        return;
      }

      try {
        const response = await apiFetch('/api/auth/session');
        if (response.ok) {
          const data = await response.json();
          setSessionData({ user: data.user, session: { token } });
        } else {
          localStorage.removeItem('auth_token');
          setSessionData(null);
        }
      } catch (e) {
        setError(e);
        setSessionData(null);
      } finally {
        setIsPending(false);
      }
    };

    fetchSession();
  }, []);

  return {
    data: sessionData,
    isPending,
    error
  };
}

export const getSession = async () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) return null;
  
  try {
    const response = await apiFetch('/api/auth/session');
    if (response.ok) {
      const data = await response.json();
      return { data: { user: data.user, session: { token } } };
    }
  } catch (e) {}
  return null;
};

// Export a dummy authClient just in case any component relies on its signature
export const authClient = {
  useSession,
  signIn,
  signUp,
  signOut,
  getSession
};
