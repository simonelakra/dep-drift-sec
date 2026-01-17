import { ScanResultV1, ScanResultSchema } from '../core/types.js';

export function formatJsonReport(report: ScanResultV1): string {
    // Validate schema before outputting to ensure stability
    ScanResultSchema.parse(report);
    return JSON.stringify(report, null, 2);
}
