const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const matter = require('gray-matter');

/**
 * Script to import LeetCode problems from a JSON array into Codex Markdown format.
 * Usage: node scripts/import_leetcode.js <path_to_json_file>
 */

const inputFilePath = "C:\\Users\\nilay\\Downloads\\merged_problems.json"

const outputDir = "C:\\Users\\nilay\\OneDrive\\Documents\\Codex\\01_Problems";

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

const LANGUAGE_MAP = {
    'python3': 'python',
    'python': 'python',
    'cpp': 'cpp',
    'java': 'java',
    'c': 'c',
    'csharp': 'csharp',
    'javascript': 'javascript',
    'typescript': 'typescript',
    'php': 'php',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'dart': 'dart',
    'golang': 'go',
    'ruby': 'ruby',
    'scala': 'scala',
    'rust': 'rust',
    'racket': 'racket',
    'erlang': 'erlang',
    'elixir': 'elixir'
};

function sanitizeMarkdown(str) {
    if (!str || typeof str !== 'string') return str;
    return str
        .replace(/<code>(.*?)<\/code>/gi, '`$1`')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/---/g, '***')
        .trimEnd();
}

async function run() {
    try {
        const rawData = fs.readFileSync(inputFilePath, 'utf8');
        const problems = JSON.parse(rawData);

        console.log(`Processing ${problems.questions.length} problems...`);

        const uniqueTags = new Set();
        let importCount = 0;

        for (const problem of problems.questions) {
            const id = crypto.randomUUID();
            const now = new Date().toISOString();

            // Track tags
            if (problem.topics) {
                problem.topics.forEach(tag => uniqueTags.add(tag));
            }

            // 1. Prepare Frontmatter
            const frontmatter = {
                id: id,
                title: problem.title,
                type: 'problem',
                tags: problem.topics || [],
                created: now,
                updated: now,
                source: 'LeetCode',
                sourceId: String(problem.frontend_id || problem.problem_id),
                difficulty: capitalize(problem.difficulty),
                sourceUrl: `https://leetcode.com/problems/${problem.problem_slug}/`,
                solutions: []
            };

            // Map code snippets to solutions
            if (problem.code_snippets) {
                // If the field is an object { lang: code }
                if (typeof problem.code_snippets === 'object') {
                    Object.entries(problem.code_snippets).forEach(([lang, code], index) => {
                        frontmatter.solutions.push({
                            id: `sol-${Date.now()}-${index}`,
                            language: LANGUAGE_MAP[lang] || lang,
                            code: code
                        });
                    });
                }
            }

            // 2. Prepare Body Sections
            const sections = [];
            sections.push(`## Problem Statement\n\n${sanitizeMarkdown(problem.description.replace("Constraints", ""))}`)
            
            //sections.push(`${sanitizeMarkdown(problem.examples)}\n\n`)
            let s = "";
            if (problem.examples && problem.examples.length > 0) {
                // problemStatement += `### Examples\n\n`;
                problem.examples.forEach(ex => {
                    s += `**Example ${ex.example_num}**\n\`\`\`\n${sanitizeMarkdown(ex.example_text)}\n\`\`\`\n\n`;
                });
            }
            sections.push(`## Example\n\n${s}`)
            s ="";
            if (problem.constraints && problem.constraints.length > 0) {
                problem.constraints.forEach(c => {
                    s += `- ${sanitizeMarkdown(c)}\n`;
                });
                s += `\n`;
            }
            sections.push(`## Constraints\n\n${s}`)
            s = "";
            if (problem.hints && problem.hints.length > 0) {
                problem.hints.forEach(h => {
                    s += `- ${sanitizeMarkdown(h)}\n`;
                });
                s += `\n`;
            }
            sections.push(`## Hints\n\n${s}`)
            

            // Consolidate unused keys into Code Solution section
            const usedKeys = new Set([
                'title', 'topics', 'frontend_id', 'problem_id', 'difficulty', 
                'problem_slug', 'description', 'examples', 'constraints', 
                'hints', 'code_snippets'
            ]);

            let solutionMarkdown = "";
            const additionalData = {};
            let valid = false;
            Object.keys(problem).forEach(key => {
                if (key === 'solution' && problem[key]) {
                    let s = String(problem[key]);
                    s = s.replaceAll("[TOC]\n\n## Solution\n\n---\n", "")
                         .replaceAll("[TOC]\n\n## Solution\n\n---", "")
                         .replaceAll("[TOC]\n\n## Solution\n\n", "")
                         .replaceAll("[TOC]\n\n## Solution", "")
                         .replaceAll("\n\n## Solution", "");
                    solutionMarkdown = sanitizeMarkdown(s);
                    valid = true;
                } else if (!usedKeys.has(key)) {
                    additionalData[key] = problem[key];
                }
            });
            if (valid) {
                sections.push(`## Solution\n\n${solutionMarkdown}`)
            }
            
            const body = sections.join('\n\n---\n').trim();
            const markdownContent = matter.stringify(body, frontmatter);

            const safeTitle = problem.title.replace(/[^a-z0-9]/gi, '_');
            const fileName = `${safeTitle}.md`;
            const filePath = path.join(outputDir, fileName);

            if (fs.existsSync(filePath)) {
                // Already exists, writeFileSync will overwrite, but log it for the user
                console.log(`Overwriting existing file: ${fileName}`);
            }

            fs.writeFileSync(filePath, markdownContent);
            importCount++;
        }

        console.log(`\nImport Complete!`);
        console.log(`------------------------------`);
        console.log(`Total Problems Identified: ${problems.questions.length}`);
        console.log(`Successful Migrations:    ${importCount}`);
        console.log(`Unique Tags Found:       ${uniqueTags.size}`);
        console.log(`Output Directory:         ${outputDir}`);
        console.log(`------------------------------\n`);
    } catch (error) {
        console.error('Error processing import:', error);
    }
}

run();
