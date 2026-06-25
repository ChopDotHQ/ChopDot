import { describe, expect, it } from 'vitest';
import {
  runChopDotDotAdversarialChecks,
  runChopDotDotAgentSimulationReport,
  runCommunityFundAgentSimulation,
  runEmergencyPotAgentSimulation,
  runSavingsCircleAgentSimulation,
} from './simulationAgents';

describe('ChopDot.dot simulated product agents', () => {
  it('runs a savings circle from catch through private closeout', () => {
    const result = runSavingsCircleAgentSimulation();

    expect(result.finalChapter.state).toBe('closed');
    expect(result.finalChapter.mode).toBe('savings_circle');
    expect(result.finalChapter.obligations).toHaveLength(3);
    expect(result.finalChapter.obligations.filter((item) => item.state === 'confirmed')).toHaveLength(2);
    expect(result.finalChapter.obligations.filter((item) => item.state === 'exception_recorded')).toHaveLength(1);
    expect(result.finalChapter.releaseRequests[0]?.state).toBe('confirmed');
    expect(result.statusTimeline.some((item) => item.status.closeoutReadiness === 'blocked')).toBe(true);
    expect(result.statusTimeline.at(-1)?.status.closeoutReadiness).toBe('ready');
    expect(result.receipt.state).toBe('closed');
  });

  it('runs an emergency pot with redacted closeout defaults', () => {
    const result = runEmergencyPotAgentSimulation();
    const receiptJson = JSON.stringify(result.receipt);

    expect(result.finalChapter.state).toBe('closed');
    expect(result.finalChapter.mode).toBe('emergency_pot');
    expect(result.finalChapter.obligations.every((item) => item.state === 'confirmed')).toBe(true);
    expect(result.finalChapter.releaseRequests[0]?.state).toBe('confirmed');
    expect(result.receipt.redaction).toBe('redacted');
    expect(result.receipt.chapterName).toBe('Emergency pot');
    expect(receiptJson).not.toContain('Jordan');
    expect(receiptJson).not.toContain('Medical bridge support');
    expect(receiptJson).not.toContain('Private medical details');
  });

  it('runs a community fund period with two approvals and receiver confirmation', () => {
    const result = runCommunityFundAgentSimulation();

    expect(result.finalChapter.state).toBe('closed');
    expect(result.finalChapter.mode).toBe('community_fund');
    expect(result.finalChapter.approvalRequests[0]?.state).toBe('approved');
    expect(result.finalChapter.approvalDecisions).toHaveLength(2);
    expect(result.finalChapter.releaseRequests[0]?.state).toBe('confirmed');
    expect(result.statusTimeline.map((item) => item.status.closeoutReadiness)).toContain('blocked');
    expect(result.statusTimeline.at(-1)?.status.closeoutReadiness).toBe('ready');
  });

  it('blocks adversarial behavior across contribution, approval, release, closeout, and privacy paths', () => {
    const checks = runChopDotDotAdversarialChecks();

    expect(checks).toHaveLength(12);
    expect(checks.every((check) => check.blocked)).toBe(true);
    expect(checks.map((check) => check.name)).toContain('Duplicate contribution claim');
    expect(checks.map((check) => check.name)).toContain('Viewer records exception');
    expect(checks.map((check) => check.name)).toContain('Emergency redaction');
  });

  it('produces an audit report that preserves the user-facing findings', () => {
    const report = runChopDotDotAgentSimulationReport();

    expect(report.modeResults).toHaveLength(3);
    expect(report.adversarialChecks.every((check) => check.blocked)).toBe(true);
    expect(report.findings).toContain('All three expanded modes can complete the shared Catch, Show, Move, End loop.');
    expect(report.findings.at(-1)).toBe('No adversarial checks bypassed the current kernel guardrails.');
  });
});

