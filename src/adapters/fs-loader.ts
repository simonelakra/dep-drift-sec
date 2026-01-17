import fs from 'fs/promises';
import path from 'path';
import { RawProjectData } from '../core/types.js';

export async function loadProjectData(projectPath: string): Promise<RawProjectData> {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageLockPath = path.join(projectPath, 'package-lock.json');

    try {
        const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
        const packageLockContent = await fs.readFile(packageLockPath, 'utf8');

        return {
            packageJson: JSON.parse(packageJsonContent),
            packageLock: JSON.parse(packageLockContent),
        };
    } catch (error: any) {
        throw new Error(`Failed to load project data from ${projectPath}: ${error.message}`);
    }
}
