const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const srcDir = path.join(__dirname, '../src');
const files = walk(srcDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // We only want to replace fetch() calls that hit /api
    // Be careful not to replace it if it's already apiFetch
    if (content.includes('fetch(') || content.includes('fetch(`/api')) {
        let originalContent = content;
        
        // Regex to match fetch('/api...') or fetch(`/api...`) or fetch(url) where url is built
        // It's safer to just replace fetch( with apiFetch( for API calls
        content = content.replace(/\bfetch\(\s*['"`]\/api/g, 'apiFetch(\'/api');
        content = content.replace(/\bfetch\(\s*`\/api/g, 'apiFetch(`/api');
        
        // Handle fetch(url) where url might be a variable
        content = content.replace(/\bfetch\(url/g, 'apiFetch(url');
        content = content.replace(/\bfetch\(dataUrl\)/g, 'apiFetch(dataUrl)');

        if (content !== originalContent) {
            // Add import if not present
            if (!content.includes('import { apiFetch }')) {
                // Determine relative path to lib/api-client.ts
                const relativePath = path.relative(path.dirname(file), path.join(srcDir, 'lib/api-client'));
                let importPath = relativePath.replace(/\\/g, '/');
                if (!importPath.startsWith('.')) {
                    importPath = './' + importPath;
                }
                
                // Add import at the top after other imports
                const importStmt = `import { apiFetch } from '@/lib/api-client';\n`;
                
                // Find first non-import line or place at top
                content = importStmt + content;
            }
            
            fs.writeFileSync(file, content, 'utf8');
            console.log('Updated', file);
        }
    }
});
