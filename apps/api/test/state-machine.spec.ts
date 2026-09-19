import { canTransition, JobStatus } from '@secureprint/shared-types';

describe('Job State Machine', () => {
  it('allows valid sequential transitions', () => {
    expect(canTransition(JobStatus.REQUEST_SENT, JobStatus.SHOP_RECEIVED)).toBe(true);
    expect(canTransition(JobStatus.SHOP_RECEIVED, JobStatus.PRINTING)).toBe(true);
    expect(canTransition(JobStatus.PRINTING, JobStatus.PRINTING_COMPLETED)).toBe(true);
    expect(canTransition(JobStatus.PRINTING_COMPLETED, JobStatus.AWAITING_PAYMENT)).toBe(true);
    expect(canTransition(JobStatus.AWAITING_PAYMENT, JobStatus.PAYMENT_SUCCESS)).toBe(true);
    expect(canTransition(JobStatus.PAYMENT_SUCCESS, JobStatus.CLEANUP_PENDING)).toBe(true);
    expect(canTransition(JobStatus.CLEANUP_PENDING, JobStatus.FILES_DELETED)).toBe(true);
    expect(canTransition(JobStatus.FILES_DELETED, JobStatus.JOB_CLOSED)).toBe(true);
  });

  it('strictly blocks illegal transitions', () => {
    // Cannot jump from REQUEST_SENT directly to PAYMENT_SUCCESS
    expect(canTransition(JobStatus.REQUEST_SENT, JobStatus.PAYMENT_SUCCESS)).toBe(false);

    // Cannot jump from PRINTING directly to FILES_DELETED without verified payment
    expect(canTransition(JobStatus.PRINTING, JobStatus.FILES_DELETED)).toBe(false);

    // Cannot jump from AWAITING_PAYMENT directly to FILES_DELETED
    expect(canTransition(JobStatus.AWAITING_PAYMENT, JobStatus.FILES_DELETED)).toBe(false);

    // Closed job cannot transition to any status
    expect(canTransition(JobStatus.JOB_CLOSED, JobStatus.PRINTING)).toBe(false);
  });
});
