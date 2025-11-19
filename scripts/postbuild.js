#!/usr/bin/env node
/**
 * Cross-platform postbuild script
 * Copies game files from src/ to dist/ and creates hook directory
 */

const fs = require('fs');
const path = require('path');

// Helper to recursively copy directory
function copyDir(src, dest) {
    // Create destination directory
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    
    // Read directory contents
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

try {
    console.log('Running postbuild script...');
    
    // Copy game files from src/game to dist/game
    const srcGameDir = path.join(__dirname, '..', 'src', 'game');
    const distGameDir = path.join(__dirname, '..', 'dist', 'game');
    
    console.log(`Copying ${srcGameDir} to ${distGameDir}...`);
    copyDir(srcGameDir, distGameDir);
    
    // Create dist/hook directory
    const distHookDir = path.join(__dirname, '..', 'dist', 'hook');
    if (!fs.existsSync(distHookDir)) {
        fs.mkdirSync(distHookDir, { recursive: true });
        console.log(`Created ${distHookDir}`);
    }
    
    console.log('Postbuild script completed successfully');
} catch (err) {
    console.error('Postbuild script failed:', err);
    process.exit(1);
}

