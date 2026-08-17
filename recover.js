const fs = require('fs');
const readline = require('readline');
const path = require('path');

const convIds = [
  "d94ac896-ebe8-4ae2-8ed3-23fb1d60cdbe",
  "9b84b805-b460-4da6-b3b6-b3fab747e993",
  "27fb84d8-d78f-49ac-9e15-7a9a3e9d6484",
  "bf06b7de-0829-4cc6-b6e6-7dd37a2525c5",
  "3a273178-bbed-4860-bf1f-54d393902ff8",
  "4f0af460-49bf-4274-82f5-c98f4e134f2c"
];

const basePath = "C:\\Users\\Nhi\\.gemini\\antigravity\\brain";

async function processTranscripts() {
  const fileStates = {}; // filePath -> lines array

  for (const id of convIds) {
    const transcriptPath = path.join(basePath, id, ".system_generated", "logs", "transcript_full.jsonl");
    if (!fs.existsSync(transcriptPath)) {
      console.log("Missing " + transcriptPath);
      continue;
    }
    
    console.log("Processing " + id);
    const fileStream = fs.createReadStream(transcriptPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      
      let step;
      try {
        step = JSON.parse(line);
      } catch (e) {
        continue;
      }
      
      if (step.tool_calls) {
        for (const tc of step.tool_calls) {
          if (tc.name === 'default_api:write_to_file' && tc.arguments) {
            const args = tc.arguments;
            let p = args.TargetFile;
            if(p && typeof args.CodeContent === 'string') {
               fileStates[p] = args.CodeContent.split('\n');
            }
          }
          if (tc.name === 'default_api:replace_file_content' && tc.arguments) {
            const args = tc.arguments;
            let p = args.TargetFile;
            if(p && fileStates[p] && typeof args.ReplacementContent === 'string') {
               const start = args.StartLine - 1;
               const end = args.EndLine;
               const newLines = args.ReplacementContent.split('\n');
               fileStates[p].splice(start, end - start, ...newLines);
            }
          }
          if (tc.name === 'default_api:multi_replace_file_content' && tc.arguments) {
            const args = tc.arguments;
            let p = args.TargetFile;
            if(p && fileStates[p] && Array.isArray(args.ReplacementChunks)) {
               let chunks = [...args.ReplacementChunks].sort((a,b) => b.StartLine - a.StartLine);
               for(const chunk of chunks) {
                  if (typeof chunk.ReplacementContent === 'string') {
                      const start = chunk.StartLine - 1;
                      const end = chunk.EndLine;
                      const newLines = chunk.ReplacementContent.split('\n');
                      fileStates[p].splice(start, end - start, ...newLines);
                  }
               }
            }
          }
        }
      }
    }
  }

  let count = 0;
  for (const p in fileStates) {
    if (p.includes('frontend') || p.includes('backend')) {
        console.log("Recovering " + p);
        const content = fileStates[p].join('\n');
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, content);
        count++;
    }
  }
  console.log("Recovered " + count + " files successfully!");
}

processTranscripts().catch(console.error);