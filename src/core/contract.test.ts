import { describe, it, expect } from 'vitest';
import { ScanResultSchema } from './types.js';

describe('ScanResultSchema', () => {
    it('should validate a correct ScanResultV1', () => {
        const validResult = {
            meta: {
                schemaVersion: "1.0",
                scanId: "550e8400-e29b-41d4-a716-446655440000",
                projectName: "test-project",
                projectId: "a3f5b2c",
                generatedAt: new Date().toISOString()
            },
            summary: {
                driftCount: 0,
                securityCount: 1,
                riskLevel: "medium",
                riskReason: "1 dependency is risky",
                recommendedAction: "warn",
                recommendedExitCode: 2
            },
            drift: [],
            security: []
        };

        const result = ScanResultSchema.safeParse(validResult);
        expect(result.success).toBe(true);
    });

    it('should fail validation if meta is missing', () => {
        const invalidResult = {
            summary: {
                driftCount: 0,
                securityCount: 0,
                riskLevel: "low",
                recommendedExitCode: 0
            },
            drift: [],
            security: []
        };

        const result = ScanResultSchema.safeParse(invalidResult);
        expect(result.success).toBe(false);
    });

    it('should fail validation if scanId is not a valid UUID', () => {
        const invalidResult = {
            meta: {
                schemaVersion: "1.0",
                scanId: "not-a-uuid",
                projectName: "test-project",
                projectId: "abc",
                generatedAt: new Date().toISOString()
            },
            summary: {
                driftCount: 0,
                securityCount: 0,
                riskLevel: "low",
                recommendedExitCode: 0
            },
            drift: [],
            security: []
        };

        const result = ScanResultSchema.safeParse(invalidResult);
        expect(result.success).toBe(false);
    });
});
