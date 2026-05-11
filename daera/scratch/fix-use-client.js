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

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if use client exists
    const useClientRegex = /^[\s]*('use client'|"use client");?/m;
    const match = content.match(useClientRegex);
    
    if (match) {
        // Remove the matched 'use client' directive
        let newContent = content.replace(useClientRegex, '');
        // Trim leading whitespace/newlines
        newContent = newContent.trimStart();
        // Prepend it to the absolute top
        newContent = match[1] + ";\n" + newContent;
        
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log('Fixed use client in', file);
            count++;
        }
    }
});
console.log('Fixed ' + count + ' files.');
