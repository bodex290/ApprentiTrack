/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test that all API functions are exported and call the right endpoints
let apiModule: typeof import('../../services/api');
let api: ReturnType<typeof import('axios').default.create>;

beforeEach(async () => {
  vi.resetModules();
  apiModule = await import('../services/api');
  api = apiModule.default;
});

describe('API Exports', () => {
  it('exports all apprentice functions', () => {
    expect(apiModule.getApprentices).toBeDefined();
    expect(apiModule.getApprentice).toBeDefined();
    expect(apiModule.createApprentice).toBeDefined();
    expect(apiModule.updateApprentice).toBeDefined();
    expect(apiModule.deleteApprentice).toBeDefined();
  });

  it('exports all cohort functions', () => {
    expect(apiModule.getCohorts).toBeDefined();
    expect(apiModule.getCohort).toBeDefined();
    expect(apiModule.createCohort).toBeDefined();
    expect(apiModule.updateCohort).toBeDefined();
    expect(apiModule.deleteCohort).toBeDefined();
  });

  it('exports all module functions', () => {
    expect(apiModule.getModules).toBeDefined();
    expect(apiModule.getModule).toBeDefined();
    expect(apiModule.getModuleDetail).toBeDefined();
    expect(apiModule.createModule).toBeDefined();
    expect(apiModule.updateModule).toBeDefined();
    expect(apiModule.deleteModule).toBeDefined();
  });

  it('exports all KSB functions', () => {
    expect(apiModule.getKSBs).toBeDefined();
    expect(apiModule.getKSB).toBeDefined();
    expect(apiModule.createKSB).toBeDefined();
    expect(apiModule.updateKSB).toBeDefined();
    expect(apiModule.deleteKSB).toBeDefined();
  });

  it('exports all submission functions', () => {
    expect(apiModule.getSubmissions).toBeDefined();
    expect(apiModule.getSubmission).toBeDefined();
    expect(apiModule.createSubmission).toBeDefined();
    expect(apiModule.updateSubmission).toBeDefined();
    expect(apiModule.deleteSubmission).toBeDefined();
  });

  it('exports all intervention functions', () => {
    expect(apiModule.getInterventions).toBeDefined();
    expect(apiModule.getIntervention).toBeDefined();
    expect(apiModule.createIntervention).toBeDefined();
    expect(apiModule.updateIntervention).toBeDefined();
    expect(apiModule.deleteIntervention).toBeDefined();
  });

  it('exports all analytics functions', () => {
    expect(apiModule.getDashboardSummary).toBeDefined();
    expect(apiModule.getSubmissionsByStatus).toBeDefined();
    expect(apiModule.getSubmissionsByModule).toBeDefined();
    expect(apiModule.getKSBCoverage).toBeDefined();
    expect(apiModule.getKSBCoverageByType).toBeDefined();
    expect(apiModule.getApprenticeProgress).toBeDefined();
    expect(apiModule.getFeedbackList).toBeDefined();
  });

  it('exports all auth functions', () => {
    expect(apiModule.login).toBeDefined();
    expect(apiModule.changePassword).toBeDefined();
    expect(apiModule.getMe).toBeDefined();
  });

  it('exports all user management functions', () => {
    expect(apiModule.getUsers).toBeDefined();
    expect(apiModule.getUser).toBeDefined();
    expect(apiModule.createCoach).toBeDefined();
    expect(apiModule.createApprenticeUser).toBeDefined();
    expect(apiModule.updateCoach).toBeDefined();
    expect(apiModule.updateApprenticeUser).toBeDefined();
    expect(apiModule.deleteUser).toBeDefined();
    expect(apiModule.assignCohorts).toBeDefined();
    expect(apiModule.getUserCohorts).toBeDefined();
  });

  it('exports all apprentice portal (My) functions', () => {
    expect(apiModule.getMyDashboard).toBeDefined();
    expect(apiModule.getMySubmissions).toBeDefined();
    expect(apiModule.submitMyEvidence).toBeDefined();
    expect(apiModule.updateMySubmission).toBeDefined();
    expect(apiModule.getMyPortfolio).toBeDefined();
    expect(apiModule.getMyModules).toBeDefined();
    expect(apiModule.getMyFeedback).toBeDefined();
    expect(apiModule.getMyKSBs).toBeDefined();
  });

  describe('API function calls correct endpoints', () => {
    let adapter: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      adapter = vi.fn().mockResolvedValue({ status: 200, data: {} });
      api.defaults.adapter = adapter;
    });

    it('getApprentices calls GET /api/apprentices', async () => {
      await apiModule.getApprentices();
      expect(adapter.mock.calls[0][0].url).toBe('/api/apprentices/');
      expect(adapter.mock.calls[0][0].method).toBe('get');
    });

    it('createApprentice calls POST /api/apprentices', async () => {
      await apiModule.createApprentice({ name: 'test' });
      expect(adapter.mock.calls[0][0].url).toBe('/api/apprentices/');
      expect(adapter.mock.calls[0][0].method).toBe('post');
    });

    it('login calls POST /api/auth/login', async () => {
      await apiModule.login('test@test.com', 'pass');
      expect(adapter.mock.calls[0][0].url).toBe('/api/auth/login');
      expect(adapter.mock.calls[0][0].method).toBe('post');
    });

    it('getMe calls GET /api/auth/me', async () => {
      await apiModule.getMe();
      expect(adapter.mock.calls[0][0].url).toBe('/api/auth/me');
      expect(adapter.mock.calls[0][0].method).toBe('get');
    });

    it('submitMyEvidence calls POST /api/my/submissions', async () => {
      await apiModule.submitMyEvidence({ description: 'test' });
      expect(adapter.mock.calls[0][0].url).toBe('/api/my/submissions');
      expect(adapter.mock.calls[0][0].method).toBe('post');
    });

    it('getMyPortfolio calls GET /api/my/portfolio', async () => {
      await apiModule.getMyPortfolio();
      expect(adapter.mock.calls[0][0].url).toBe('/api/my/portfolio');
      expect(adapter.mock.calls[0][0].method).toBe('get');
    });
  });
});
