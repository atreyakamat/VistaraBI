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

    // The previous script replaced `err.message` with `message` everywhere, 
    // causing `const message = err instanceof Error ? message : ...`
    // We need to revert that specific part to `err.message` (or `error.message`, `e.message`)
    
    const regex1 = /const message = err instanceof Error \? message : String\(err\);/g;
    if (regex1.test(content)) {
        content = content.replace(regex1, 'const message = err instanceof Error ? err.message : String(err);');
        modified = true;
    }

    const regex2 = /const message = error instanceof Error \? message : String\(error\);/g;
    if (regex2.test(content)) {
        content = content.replace(regex2, 'const message = error instanceof Error ? error.message : String(error);');
        modified = true;
    }

    const regex3 = /const message = e instanceof Error \? message : String\(e\);/g;
    if (regex3.test(content)) {
        content = content.replace(regex3, 'const message = e instanceof Error ? e.message : String(e);');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed message initializer in:', filePath);
    }
}

walkDir('./src/app/api', processFile);
