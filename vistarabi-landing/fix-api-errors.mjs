import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath, callback);
        } else if (dirPath.endsWith('route.ts')) {
            callback(dirPath);
        }
    });
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 1. Replace catch (err: any) -> catch (err: unknown)
    const errRegex = /catch\s*\(\s*(err|error|e)\s*:\s*any\s*\)\s*\{/g;
    
    if (errRegex.test(content)) {
        content = content.replace(errRegex, (match, varName) => {
            return `catch (${varName}: unknown) {\n        const message = ${varName} instanceof Error ? ${varName}.message : String(${varName});`;
        });
        
        // Also replace occurrences of `err.message`, `error.message`, `e.message` with `message` in that file
        content = content.replace(/err\.message/g, 'message');
        content = content.replace(/error\.message/g, 'message');
        content = content.replace(/e\.message/g, 'message');
        
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed catch blocks in:', filePath);
    }
}

walkDir('./src/app/api', processFile);
