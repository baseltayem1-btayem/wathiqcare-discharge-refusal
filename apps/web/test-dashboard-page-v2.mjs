import { readFileSync } from 'fs';
import { join } from 'path';

console.log('Testing dashboard page...');

try {
    const pagePath = join(process.cwd(), 'app/dashboard/page.tsx');
    const content = readFileSync(pagePath, 'utf8');
    console.log('Page file read successfully');
    
    // Check for obvious syntax issues or suspicious imports in the text
    if (content.includes('<<<<<<<')) {
        console.error('Found git conflict markers!');
    }
    
    const lines = content.split('\n');
    console.log(`Page has ${lines.length} lines`);
    
} catch (error) {
    console.error('Failed to read page:', error.message);
}
