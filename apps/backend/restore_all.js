const fs = require('fs');
const path = require('path');
const readline = require('readline');

const brainDir = 'C:\\Users\\Nhi\\.gemini\\antigravity\\brain';
const fileCache = new Map();

function getAllTranscripts() {
  const dirs = fs.readdirSync(brainDir);
  const transcripts = [];
  
  for (const dir of dirs) {
    const logPath = path.join(brainDir, dir, '.system_generated', 'logs', 'transcript_full.jsonl');
    if (fs.existsSync(logPath)) {
      // Read first line to get created_at
      const fd = fs.openSync(logPath, 'r');
      const buffer = Buffer.alloc(1024);
      const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
      fs.closeSync(fd);
      const firstLine = buffer.toString('utf8', 0, bytesRead).split('\n')[0];
      try {
        const entry = JSON.parse(firstLine);
        const time = new Date(entry.created_at || entry.timestamp || 0).getTime();
        transcripts.push({ path: logPath, time: time });
      } catch (e) {
        const stats = fs.statSync(logPath);
        transcripts.push({ path: logPath, time: stats.birthtimeMs || stats.mtimeMs });
      }
    }
  }
  
  // Sort from oldest to newest
  transcripts.sort((a, b) => a.time - b.time);
  return transcripts.map(t => t.path);
}

async function processTranscripts() {
  const logs = getAllTranscripts();
  
  for (const logPath of logs) {
    console.log(`Processing: ${logPath}`);
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
          if (targetFile) {
            targetFile = targetFile.replace(/\\/g, '/').toLowerCase();

          }

          if (tool.name === 'write_to_file') {
            const originalPath = tool.args.TargetFile; // Keep case for writing
            fileCache.set(targetFile, {
              path: originalPath,
              content: tool.args.CodeContent
            });
          } 
          else if (tool.name === 'replace_file_content') {
            if (!fileCache.has(targetFile)) continue;
            let fileObj = fileCache.get(targetFile);
            let content = fileObj.content;
            
            const targetContent = tool.args.TargetContent;
            const replacementContent = tool.args.ReplacementContent;
            
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
  console.log(`Memory Restoration Complete: Restored ${fileCache.size} files!`);
}

processTranscripts().catch(console.error);