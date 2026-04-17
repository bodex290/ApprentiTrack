/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// We need to test the interceptors defined in api.ts.
// To do this, we import the configured axios instance and
// mock the underlying adapter so no real HTTP calls are made.

// This will execute api.ts which registers the interceptors
let api: ReturnType<typeof axios.create>;

beforeEach(async () => {
  vi.resetModules();
  // Fresh import to re-register interceptors each test
  const mod = await import('../services/api');
  api = mod.default;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Axios Interceptors', () => {
  describe('Request Interceptor', () => {
    it('adds Authorization header when token exists', async () => {
      localStorage.setItem('token', 'test-jwt-token');

      // Access the request interceptor via a mocked adapter
      const adapter = vi.fn().mockResolvedValue({ status: 200, data: {} });
      api.defaults.adapter = adapter;

      await api.get('/api/test');

      const config = adapter.mock.calls[0][0];
      expect(config.headers.Authorization).toBe('Bearer test-jwt-token');
    });

    it('does not add Authorization header when no token', async () => {
      const adapter = vi.fn().mockResolvedValue({ status: 200, data: {} });
      api.defaults.adapter = adapter;

      await api.get('/api/test');

      const config = adapter.mock.calls[0][0];
      expect(config.headers.Authorization).toBeUndefined();
    });

    it('adds cache-bust _t param on GET requests', async () => {
      const adapter = vi.fn().mockResolvedValue({ status: 200, data: {} });
      api.defaults.adapter = adapter;

      await api.get('/api/test');

      const config = adapter.mock.calls[0][0];
      expect(config.params).toHaveProperty('_t');
      expect(typeof config.params._t).toBe('number');
    });

    it('does not add _t param on POST requests', async () => {
      const adapter = vi.fn().mockResolvedValue({ status: 200, data: {} });
      api.defaults.adapter = adapter;

      await api.post('/api/test', {});

      const config = adapter.mock.calls[0][0];
      expect(config.params?._t).toBeUndefined();
    });
  });

  describe('Response Interceptor (401 handling)', () => {
    it('clears token and dispatches auth:logout on 401', async () => {
      localStorage.setItem('token', 'some-token');
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const adapter = vi.fn().mockRejectedValue({
        response: { status: 401 },
        config: { url: '/api/apprentices/' },
      });
      api.defaults.adapter = adapter;

      await expect(api.get('/api/apprentices/')).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBeNull();
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'auth:logout' }));
    });

    it('does NOT clear token on 401 from login endpoint', async () => {
      localStorage.setItem('token', 'some-token');
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const adapter = vi.fn().mockRejectedValue({
        response: { status: 401 },
        config: { url: '/api/auth/login' },
      });
      api.defaults.adapter = adapter;

      await expect(api.post('/api/auth/login', {})).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBe('some-token');
      expect(dispatchSpy).not.toHaveBeenCalled();
    });

    it('does NOT clear token on non-401 errors', async () => {
      localStorage.setItem('token', 'some-token');
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const adapter = vi.fn().mockRejectedValue({
        response: { status: 500 },
        config: { url: '/api/test/' },
      });
      api.defaults.adapter = adapter;

      await expect(api.get('/api/test')).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBe('some-token');
      expect(dispatchSpy).not.toHaveBeenCalled();
    });
  });
});
