/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock the auth context
const mockLogin = vi.fn();
const mockLogout = vi.fn();
const mockRefreshUser = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    login: mockLogin,
    logout: mockLogout,
    refreshUser: mockRefreshUser,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import LoginPage from '../pages/LoginPage';

beforeEach(() => {
  vi.clearAllMocks();
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('renders login form with email and password fields', () => {
    renderLoginPage();

    expect(screen.getByText('ApprentiTrack')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows demo credentials hint', () => {
    renderLoginPage();

    expect(screen.getByText('dr.patel@uni.ac.uk')).toBeInTheDocument();
    expect(screen.getByText('Coach123!')).toBeInTheDocument();
  });

  it('calls login and navigates to / on success', async () => {
    mockLogin.mockResolvedValue({ must_change_password: false });
    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('navigates to /change-password when must_change_password', async () => {
    mockLogin.mockResolvedValue({ must_change_password: true });
    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/change-password');
    });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    });
    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'badpass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows generic error when no detail in response', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));
    renderLoginPage();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('you@example.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'badpass');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Login failed. Please check your credentials.')).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    renderLoginPage();
    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const user = userEvent.setup();
    // Find the eye toggle button (it's the button inside the password field area)
    const toggleButtons = screen.getAllByRole('button');
    const eyeToggle = toggleButtons.find(btn => btn.getAttribute('type') === 'button');
    expect(eyeToggle).toBeDefined();

    await user.click(eyeToggle!);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(eyeToggle!);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
