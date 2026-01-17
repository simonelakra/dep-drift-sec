import { describe, it, expect } from 'vitest';
import { buildDependencyGraph } from './graph.js';
import { RawProjectData } from './types.js';

describe('buildDependencyGraph', () => {
    it('should calculate introducedBy parent chains correctly from path nesting', () => {
        const project: RawProjectData = {
            packageJson: {
                name: 'root-pkg',
                dependencies: {
                    'direct-a': '1.0.0'
                }
            },
            packageLock: {
                packages: {
                    '': {
                        name: 'root-pkg'
                    },
                    'node_modules/direct-a': {
                        version: '1.0.0'
                    },
                    'node_modules/direct-a/node_modules/transitive-b': {
                        version: '1.0.0'
                    }
                }
            }
        };

        const graph = buildDependencyGraph(project, {});
        const b = graph.dependencies.find(d => d.name === 'transitive-b');
        expect(b).toBeDefined();
        expect(b?.transitive).toBe(true);
        expect(b?.introducedBy).toContain('direct-a');
    });

    it('should calculate introducedBy from dependencies field (flat)', () => {
        const project: RawProjectData = {
            packageJson: {
                name: 'root-pkg',
                dependencies: {
                    'direct-a': '1.0.0'
                }
            },
            packageLock: {
                packages: {
                    '': {
                        name: 'root-pkg',
                        dependencies: { 'direct-a': '1.0.0' }
                    },
                    'node_modules/direct-a': {
                        version: '1.0.0',
                        dependencies: { 'transitive-b': '1.0.0' }
                    },
                    'node_modules/transitive-b': {
                        version: '1.0.0'
                    }
                }
            }
        };

        const graph = buildDependencyGraph(project, {});
        const b = graph.dependencies.find(d => d.name === 'transitive-b');
        expect(b?.introducedBy).toContain('direct-a');
    });
});
