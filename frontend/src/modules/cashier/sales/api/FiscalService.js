import { client } from '../../../../shared/api/client';

export class FiscalService {
  static async getStatus() {
    return await client('fiscal/status');
  }

  static async getLastReceipt() {
    return await client('fiscal/last-receipt');
  }

  static async getJobStatus(jobId) {
    const url = jobId ? `fiscal/job-status?jobId=${jobId}` : 'fiscal/job-status';
    return await client(url);
  }

  static async reportX() { return await client('fiscal/report-x', { method: 'POST' }); }
  static async reportZ() { return await client('fiscal/report-z', { method: 'POST' }); }
}
