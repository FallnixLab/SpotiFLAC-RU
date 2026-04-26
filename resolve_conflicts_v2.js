const fs = require('fs');

function resolveConflictsBetter(content) {
    // This regex matches Git conflict blocks
    const conflictRegex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> upstream\/main/g;
    
    return content.replace(conflictRegex, (match, head, upstream) => {
        // Rule 1: If it's purely a translation difference in JSX text
        // Check if head has Russian and upstream is English
        const hasRussian = /[\u0400-\u04FF]/.test(head);
        
        // If it's just text (no tags)
        if (!head.includes('<') && !upstream.includes('<')) {
            if (hasRussian) return head;
            return upstream;
        }

        // Rule 2: If it's a JSX tag with different props
        // Example: <DialogContent className="..." ...>
        if (head.trim().startsWith('<') && upstream.trim().startsWith('<')) {
            const headTag = head.trim().split(' ')[0];
            const upstreamTag = upstream.trim().split(' ')[0];
            if (headTag === upstreamTag) {
                // If the tag is the same, take upstream for structural/class changes
                // BUT if HEAD has Russian children and upstream doesn't, we might need to merge carefully.
                // For simplicity, if HEAD has Russian, it's likely a localized label.
                if (hasRussian && !/[\u0400-\u04FF]/.test(upstream)) {
                    // Try to preserve Russian text while taking upstream props?
                    // Hard to do with regex. 
                    // Let's see if HEAD is just the tag with text.
                    return head; 
                }
                return upstream;
            }
        }
        
        // Rule 3: Logic changes
        // If HEAD has something like applyFont(x) and upstream has applyFont(x, y)
        if (upstream.includes('applyFont') && head.includes('applyFont')) {
            return upstream;
        }

        // Default: If it has Russian, keep HEAD (assuming it's our localization)
        if (hasRussian) return head;
        
        return upstream;
    });
}

const filePath = 'frontend/src/App.tsx';
if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const resolved = resolveConflictsBetter(content);
    fs.writeFileSync(filePath, resolved);
    console.log('Resolved conflicts in App.tsx');
}
