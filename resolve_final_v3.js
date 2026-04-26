const fs = require('fs');
const path = require('path');

function resolveConflictsBetter(content) {
    const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> upstream\/main/g;
    
    return content.replace(conflictRegex, (match, head, upstream) => {
        const hasRussian = /[\u0400-\u04FF]/.test(head);
        
        // Structural changes in Go or TS
        if (upstream.includes('import') || 
            upstream.includes('func') || 
            upstream.includes('var') ||
            upstream.includes('type') ||
            upstream.includes('package') ||
            upstream.includes('applyFont') ||
            upstream.includes('downloadRemainingCount')) {
            return upstream;
        }

        if (hasRussian && !/[\u0400-\u04FF]/.test(upstream)) {
            return head;
        }
        
        return upstream;
    });
}

function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (f === 'node_modules' || f === '.git' || f === 'wailsjs') return;
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const targets = ['.tsx', '.ts', '.go'];
const dirs = ['frontend/src', 'backend'];

dirs.forEach(dir => {
    walkDir(dir, (filePath) => {
        if (targets.some(ext => filePath.endsWith(ext))) {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('<<<<<<< HEAD')) {
                const resolved = resolveConflictsBetter(content);
                fs.writeFileSync(filePath, resolved);
                console.log(`Resolved conflicts in ${filePath}`);
            }
        }
    });
});
