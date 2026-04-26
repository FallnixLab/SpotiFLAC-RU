const fs = require('fs');
const path = require('path');

function resolveConflictsBetter(content) {
    const conflictRegex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> upstream\/main/g;
    
    return content.replace(conflictRegex, (match, head, upstream) => {
        const hasRussian = /[\u0400-\u04FF]/.test(head);
        
        if (!head.includes('<') && !upstream.includes('<')) {
            if (hasRussian) return head;
            return upstream;
        }

        if (head.trim().startsWith('<') && upstream.trim().startsWith('<')) {
            const headTag = head.trim().split(' ')[0];
            const upstreamTag = upstream.trim().split(' ')[0];
            if (headTag === upstreamTag) {
                if (hasRussian && !/[\u0400-\u04FF]/.test(upstream)) {
                    return head; 
                }
                return upstream;
            }
        }
        
        if (upstream.includes('applyFont') && head.includes('applyFont')) {
            return upstream;
        }

        if (hasRussian) return head;
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
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('<<<<<<< HEAD')) {
            const resolved = resolveConflictsBetter(content);
            fs.writeFileSync(filePath, resolved);
            console.log(`Resolved conflicts in ${filePath}`);
        }
    }
});
