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

const openEndpoints = [];

function checkEndpoint(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    let isSecured = false;
    let hasProjectAuth = false;

    if (content.includes('getCurrentUser') || content.includes('getServerSession')) {
        isSecured = true;
    }

    if (filePath.includes('[id]') || filePath.includes('projects')) {
        if (content.includes('userId !== user.userId') || content.includes('user.userId !== project.userId') || content.includes('project.userId !== user.userId')) {
            hasProjectAuth = true;
        }
    } else {
        hasProjectAuth = true; // Not a project-specific route
    }

    if (!isSecured || !hasProjectAuth) {
        openEndpoints.push({
            file: filePath,
            isSecured,
            hasProjectAuth
        });
    }
}

walkDir('./src/app/api', checkEndpoint);
console.log(JSON.stringify(openEndpoints, null, 2));
