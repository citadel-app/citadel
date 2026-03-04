const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

/**
 * Script to enrich LeetCode Markdown files with company metadata from a CSV.
 * Usage: node scripts/enrich_companies.js
 */

const CSV_PATH = "C:\\Users\\nilay\\Downloads\\leetcode_problems_and_companies.csv";
const MD_DIR = "C:\\Users\\nilay\\OneDrive\\Documents\\Codex\\01_Problems";

async function run() {
    try {
        if (!fs.existsSync(CSV_PATH)) {
            console.error(`CSV file not found: ${CSV_PATH}`);
            return;
        }

        if (!fs.existsSync(MD_DIR)) {
            console.error(`Markdown directory not found: ${MD_DIR}`);
            return;
        }

        console.log(`Reading CSV from: ${CSV_PATH}`);
        const csvData = fs.readFileSync(CSV_PATH, 'utf8');
        const lines = csvData.split('\n');
        
        // Map: sourceUrl -> Set of companyNames
        const companyMap = new Map();

        // Skip header
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Basic CSV parse (assuming no commas in fields for now, 
            // but problem_link and company_name usually don't have them in LC data)
            // If they do, we'd need a proper CSV parser.
            // problem_link,problem_name,company_name,num_occur
            const parts = line.split(',');
            if (parts.length < 3) continue;

            let sourceUrl = parts[0].trim();
            const companyName = parts[2].trim();

            // Normalize URL (ensure trailing slash)
            if (!sourceUrl.endsWith('/')) sourceUrl += '/';

            if (!companyMap.has(sourceUrl)) {
                companyMap.set(sourceUrl, new Set());
            }
            companyMap.get(sourceUrl).add(companyName);
        }

        console.log(`Identified company data for ${companyMap.size} unique problem URLs.`);

        const files = fs.readdirSync(MD_DIR).filter(f => f.endsWith('.md'));
        let updateCount = 0;
        let skipCount = 0;

        console.log(`Scanning ${files.length} Markdown files...`);

        for (const file of files) {
            const filePath = path.join(MD_DIR, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = matter(content);

            let sourceUrl = parsed.data.sourceUrl;
            if (!sourceUrl) {
                skipCount++;
                continue;
            }

            // Normalize URL for matching
            if (!sourceUrl.endsWith('/')) sourceUrl += '/';

            if (companyMap.has(sourceUrl)) {
                const companies = Array.from(companyMap.get(sourceUrl));
                
                // Update frontmatter
                const existingCompanies = parsed.data.companies || [];
                const mergedCompanies = Array.from(new Set([...existingCompanies, ...companies]));

                // Only update if changed
                if (JSON.stringify(existingCompanies.sort()) !== JSON.stringify(mergedCompanies.sort())) {
                    parsed.data.companies = mergedCompanies;
                    parsed.data.updated = new Date().toISOString();
                    
                    const updatedContent = matter.stringify(parsed.content, parsed.data);
                    fs.writeFileSync(filePath, updatedContent);
                    updateCount++;
                } else {
                    skipCount++;
                }
            } else {
                skipCount++;
            }
        }

        console.log(`
Enrichment Complete!
------------------------------
Total Files Scanned:    ${files.length}
Files Updated:          ${updateCount}
Files Skipped/Unchanged: ${skipCount}
------------------------------
`);

    } catch (error) {
        console.error('Error during enrichment:', error);
    }
}

run();
