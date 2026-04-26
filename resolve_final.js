const fs = require('fs');
const path = require('path');

function resolveConflictsBetter(content) {
    // Handling possible \r\n (Windows) or \n (Linux)
    const conflictRegex = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> upstream\/main/g;
    
    return content.replace(conflictRegex, (match, head, upstream) => {
        const hasRussian = /[\u0400-\u04FF]/.test(head);
        
        // Strategy:
        // 1. If it's a structural change (applyFont, downloadRemainingCount, etc.), take UPSTREAM.
        // 2. If it's a translation (HEAD has Russian, UPSTREAM doesn't), take HEAD.
        
        if (upstream.includes('applyFont') || 
            upstream.includes('downloadRemainingCount') || 
            upstream.includes('remainingCount') ||
            upstream.includes('LoadSettings') ||
            upstream.includes('SaveSettings')) {
            // New logic/props from upstream
            return upstream;
        }

        if (hasRussian && !/[\u0400-\u04FF]/.test(upstream)) {
            return head;
        }
        
        // Fallback to upstream for all structural stuff
        return upstream;
    });
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('frontend/src', (filePath) => {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('<<<<<<< HEAD')) {
            const resolved = resolveConflictsBetter(content);
            fs.writeFileSync(filePath, resolved);
            console.log(`Resolved conflicts in ${filePath}`);
        }
    }
});
