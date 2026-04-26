const fs = require('fs');
const path = require('path');

function resolveConflicts(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Pattern to match Git conflict markers
    const conflictRegex = /<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>> upstream\/main/g;
    
    let resolved = content.replace(conflictRegex, (match, head, upstream) => {
        // Strategy:
        // 1. If HEAD contains Russian characters (regex: [\u0400-\u04FF]), and upstream doesn't or it's mostly translation, keep HEAD.
        // 2. However, if upstream adds new properties (like downloadRemainingCount), we need to merge.
        
        const hasRussian = /[\u0400-\u04FF]/.test(head);
        
        // Complex merge for component props
        if (head.includes('return (<AlbumInfo') || head.includes('return (<PlaylistInfo') || head.includes('return (<ArtistInfo')) {
            // Merge properties: keep all from upstream, but if head has translations or specific overrides, we might need manual care.
            // For now, if we see new props in upstream, we take upstream.
            if (upstream.includes('downloadRemainingCount') && !head.includes('downloadRemainingCount')) {
                return upstream; // Take upstream but we might lose translations if they were in the props? 
                // Mostly props are variables, not strings.
            }
        }

        if (hasRussian) {
            return head;
        }
        
        // Default to upstream if no Russian and no specific reason to keep HEAD
        return upstream;
    });

    fs.writeFileSync(filePath, resolved);
    console.log(`Resolved conflicts in ${filePath}`);
}

const filesToFix = [
    'frontend/src/App.tsx',
    'frontend/src/types/api.ts',
    'frontend/src/lib/api.ts',
    'frontend/src/lib/api-status.ts',
    'frontend/src/hooks/usePreview.ts',
    'frontend/src/hooks/useMetadata.ts',
    'frontend/src/hooks/useLyrics.ts',
    'frontend/src/hooks/useDownload.ts',
    'frontend/src/lib/settings.ts'
];

filesToFix.forEach(relPath => {
    const fullPath = path.resolve(process.argv[2], relPath);
    if (fs.existsSync(fullPath)) {
        resolveConflicts(fullPath);
    } else {
        console.warn(`File not found: ${fullPath}`);
    }
});
