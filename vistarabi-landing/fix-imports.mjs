import fs from 'fs';
import path from 'path';

const mappings = {
    'module-6b': 'module-6/events',
    'module-6c': 'module-6/correlations',
    'module-6d': 'module-6/infrastructure',
    'module-6e': 'module-6/synthesis',
    'module-6f': 'module-6/orchestration'
};

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx')) {
            callback(dirPath);
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const [oldMod, newMod] of Object.entries(mappings)) {
        // Standard imports: from '...module-6x...'
        const importPathRegex = new RegExp(`(from\\s+['"].*?)${oldMod}(.*?['"])`, 'g');
        if (importPathRegex.test(content)) {
            content = content.replace(importPathRegex, `$1${newMod}$2`);
            modified = true;
        }
        
        // Dynamic imports: import('...module-6x...')
        const dynamicImportRegex = new RegExp(`(import\\(\\s*['"].*?)${oldMod}(.*?['"]\\s*\\))`, 'g');
        if (dynamicImportRegex.test(content)) {
            content = content.replace(dynamicImportRegex, `$1${newMod}$2`);
            modified = true;
        }
        
        // Vitest mocks: vi.mock('...module-6x...')
        const mockRegex = new RegExp(`(vi\\.mock\\(\\s*['"].*?)${oldMod}(.*?['"])`, 'g');
        if (mockRegex.test(content)) {
            content = content.replace(mockRegex, `$1${newMod}$2`);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated imports in:', filePath);
    }
}

walkDir('./src', processFile);
walkDir('./tests', processFile);
