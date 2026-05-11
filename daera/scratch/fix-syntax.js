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
    
    // Replace apiFetch('/api...`) with apiFetch(`/api...`)
    // The issue is apiFetch('/api  followed by anything  then `)
    const regex = /apiFetch\(\'(\/api[^\']*?)\`\)/g;
    const newContent = content.replace(regex, 'apiFetch(`$1`)');
    
    // Also handle cases with extra parameters like apiFetch('/api...`, {
    const regex2 = /apiFetch\(\'(\/api[^\']*?)\`\,/g;
    const newContent2 = newContent.replace(regex2, 'apiFetch(`$1`,');

    if (content !== newContent2) {
        fs.writeFileSync(file, newContent2, 'utf8');
        console.log('Fixed syntax in', file);
        count++;
    }
});
console.log('Fixed ' + count + ' files.');
