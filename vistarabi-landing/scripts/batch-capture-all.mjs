import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAINS = ['ecommerce', 'retail', 'saas', 'healthcare', 'finance', 'manufacturing', 'edtech', 'services'];

const provisionScript = fs.readFileSync(path.join(__dirname, 'e2e-special-ecommerce.mjs'), 'utf8');

// We will dynamically replace "Ecommerce" with the target domain
async function run() {
    for (const domain of DOMAINS) {
        console.log(`\n======================================================`);
        console.log(`🚀 PROCESSING DOMAIN: ${domain.toUpperCase()}`);
        console.log(`======================================================\n`);
        
        const tempScriptPath = path.join(__dirname, `e2e-temp-${domain}.mjs`);
        
        let customScript = provisionScript;
        
        // Replace dataset filenames
        customScript = customScript.replace(/ecommerce_part_1/g, `${domain}_part_1`);
        customScript = customScript.replace(/ecommerce_part_2/g, `${domain}_part_2`);
        customScript = customScript.replace(/ecommerce_part_3/g, `${domain}_part_3`);
        
        // Replace project name and domain
        customScript = customScript.replace(/Ecommerce Special Strategy Workspace/gi, `${domain} Special Strategy Workspace`);
        customScript = customScript.replace(/ECOMMERCE/g, domain.toUpperCase());
        customScript = customScript.replace(/Ecommerce/g, domain.charAt(0).toUpperCase() + domain.slice(1));
        
        fs.writeFileSync(tempScriptPath, customScript);
        
        try {
            console.log(`[1] Provisioning Project for ${domain}...`);
            execSync(`node ${tempScriptPath}`, { stdio: 'inherit' });
            
            console.log(`[2] Capturing Screenshots for ${domain}...`);
            const captureScriptPath = path.join(__dirname, '../capture-full-flow.mjs');
            execSync(`node ${captureScriptPath} ${domain}`, { stdio: 'inherit' });
            
        } catch (e) {
            console.error(`❌ Failed for domain ${domain}:`, e);
        } finally {
            if (fs.existsSync(tempScriptPath)) {
                fs.unlinkSync(tempScriptPath);
            }
        }
    }
    console.log(`\n🎉 ALL 8 DOMAINS PROVISIONED AND CAPTURED!`);
}

run();
