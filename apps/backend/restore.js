const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\Nhi\\.gemini\\antigravity\\brain';
// Order of conversations is important (oldest to newest)
const conversationIds = [
  '27fb84d8-d78f-49ac-9e15-7a9a3e9d6484', // Strict UX UI Dashboard Audit (created 06-19)
  'bf06b7de-0829-4cc6-b6e6-7dd37a2525c5', // Zone 4 UI Audit Implementation (created 06-22)
  '4f0af460-49bf-4274-82f5-c98f4e134f2c'  // Current (created 06-23)
];

const fileCache = new Map();

async function processTranscripts() {
  for (const cid of conversationIds) {
    const logPath = path.join(brainDir, cid, '.system_generated', 'logs', 'transcript_full.jsonl');
    if (!fs.existsSync(logPath)) {
      console.log(`Log not found: ${logPath}`);
      continue;
    }
    
    console.log(`Processing conversation: ${cid}`);
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      let entry;
      try {
        entry = JSON.parse(line);
      } catch(e) { continue; }

      if (entry.type === 'PLANNER_RESPONSE' && entry.tool_calls) {
        for (const tool of entry.tool_calls) {
          if (!tool.args) continue;
          
          let targetFile = tool.args.TargetFile;
          // Normalize backslashes to forward slashes for matching
          if (targetFile) {
            targetFile = targetFile.replace(/\\/g, '/').toLowerCase();
            // We only care about frontend files
            if (!targetFile.includes('frontend/src') && !targetFile.includes('frontend/package.json') && !targetFile.includes('frontend/tailwind.config') && !targetFile.includes('frontend/vite.config') && !targetFile.includes('frontend/index.html') && !targetFile.includes('frontend/tsconfig')) {
              continue;
            }
          }

          if (tool.name === 'write_to_file') {
            const originalPath = tool.args.TargetFile; // Keep case for writing
            fileCache.set(targetFile, {
              path: originalPath,
              content: tool.args.CodeContent
            });
            console.log(`Created: ${originalPath}`);
          } 
          else if (tool.name === 'replace_file_content') {
            if (!fileCache.has(targetFile)) continue;
            let fileObj = fileCache.get(targetFile);
            let content = fileObj.content;
            
            const targetContent = tool.args.TargetContent;
            const replacementContent = tool.args.ReplacementContent;
            
            // Simple replace string (assumes TargetContent is unique enough)
            if (content.includes(targetContent)) {
              content = content.replace(targetContent, replacementContent);
              fileObj.content = content;
            }
          }
          else if (tool.name === 'multi_replace_file_content') {
            if (!fileCache.has(targetFile)) continue;
            let fileObj = fileCache.get(targetFile);
            let content = fileObj.content;
            
            const chunks = tool.args.ReplacementChunks || [];
            for (const chunk of chunks) {
              const targetContent = chunk.TargetContent;
              const replacementContent = chunk.ReplacementContent;
              if (content.includes(targetContent)) {
                content = content.replace(targetContent, replacementContent);
              }
            }
            fileObj.content = content;
          }
        }
      }
    }
  }

  // Now write all files to disk
  console.log('Writing files to disk...');
  for (const [key, fileObj] of fileCache.entries()) {
    const fullPath = fileObj.path;
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, fileObj.content, 'utf8');
    console.log(`Restored: ${fullPath}`);
  }
  console.log('Memory Restoration Complete!');
}

processTranscripts().catch(console.error);