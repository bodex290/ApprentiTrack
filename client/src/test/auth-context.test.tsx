/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mock the api module
vi.mock('../services/api', () => ({
  login: vi.fn(),
  getMe: vi.fn(),
}));

import { login as apiLogin, getMe } from '../services/api';

const mockedApiLogin = vi.mocked(apiLogin);
const mockedGetMe = vi.mocked(getMe);

// Helper component to expose auth state for testing
function AuthConsumer() {
  const { user, token, loading, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="token">{token ?? 'null'}</div>
      <button data-testid="login-btn" onClick={async () => {
        try {
          const result = await login('test@test.com', 'pass');
          (window as any).__loginResult = result;
        } catch (e: any) {
          (window as any).__loginError = e;
        }
      }}>Login</button>
      <button data-testid="logout-btn" onClick={logout}>Logout</button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

const mockCoachUser = {
  id: 1,
  email: 'coach@test.com',
  role: 'coach' as const,
  first_name: 'Test',
  last_name: 'Coach',
  must_change_password: false,
  apprentice_id: null,
};

const mockApprenticeUser = {
  id: 2,
  email: 'apprentice@test.com',
  role: 'apprentice' as const,
  first_name: 'Test',
  last_name: 'Apprentice',
  must_change_password: false,
  apprentice_id: 10,
};

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  delete (window as any).__loginResult;
  delete (window as any).__loginError;
});

describe('AuthContext', () => {
  describe('Initial state', () => {
    it('starts with loading=true and user=null when no token', async () => {
      // No token in localStorage → AuthProvider won't call getMe
      renderWithAuth();

      // Eventually loading should become false
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('token').textContent).toBe('null');
    });

    it('fetches user when token already in localStorage', async () => {
      localStorage.setItem('token', 'existing-token');
      mockedGetMe.mockResolvedValue({ data: mockCoachUser } as any);

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toContain('coach@test.com');
      expect(screen.getByTestId('token').textContent).toBe('existing-token');
    });

    it('clears invalid token and sets user to null', async () => {
      localStorage.setItem('token', 'bad-token');
      mockedGetMe.mockRejectedValue({ response: { status: 401 } });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('token').textContent).toBe('null');
    });
  });

  describe('login()', () => {
    it('sets user and token on successful login', async () => {
      // No token initially → getMe not called on mount
      mockedApiLogin.mockResolvedValue({
        data: { access_token: 'new-jwt', must_change_password: false },
      } as any);
      mockedGetMe.mockResolvedValue({ data: mockCoachUser } as any);

      renderWithAuth();
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const user = userEvent.setup();
      await user.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toContain('coach@test.com');
      });
      expect(screen.getByTestId('token').textContent).toBe('new-jwt');
      expect(localStorage.getItem('token')).toBe('new-jwt');
    });

    it('returns must_change_password flag', async () => {
      mockedApiLogin.mockResolvedValue({
        data: { access_token: 'new-jwt', must_change_password: true },
      } as any);
      mockedGetMe.mockResolvedValue({ data: { ...mockCoachUser, must_change_password: true } } as any);

      renderWithAuth();
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const user = userEvent.setup();
      await user.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        expect((window as any).__loginResult).toEqual({ must_change_password: true });
      });
    });

    it('handles login failure', async () => {
      mockedApiLogin.mockRejectedValue({
        response: { data: { detail: 'Invalid credentials' } },
      });

      renderWithAuth();
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      const user = userEvent.setup();
      await user.click(screen.getByTestId('login-btn'));

      await waitFor(() => {
        expect((window as any).__loginError).toBeDefined();
      });
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  describe('logout()', () => {
    it('clears user, token, and localStorage', async () => {
      localStorage.setItem('token', 'existing-token');
      mockedGetMe.mockResolvedValue({ data: mockCoachUser } as any);

      renderWithAuth();
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toContain('coach@test.com');
      });

      const user = userEvent.setup();
      await user.click(screen.getByTestId('logout-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
      });
      expect(screen.getByTestId('token').textContent).toBe('null');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('auth:logout event', () => {
    it('clears state on auth:logout dispatch (from 401 interceptor)', async () => {
      localStorage.setItem('token', 'existing-token');
      mockedGetMe.mockResolvedValue({ data: mockCoachUser } as any);

      renderWithAuth();
      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toContain('coach@test.com');
      });

      // Simulate the 401 interceptor dispatching auth:logout
      act(() => {
        window.dispatchEvent(new Event('auth:logout'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('user').textContent).toBe('null');
        expect(screen.getByTestId('token').textContent).toBe('null');
      });
    });
  });
});
