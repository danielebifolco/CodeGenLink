import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {computeCosineSimilarity} from './cosineSimilarity';
import { CombinedData, ClonePair, CodeSimilarityAnalysis } from './interface';
import { getCCFinderPath, getMinTokenLength } from './extensionConfig';

// Mapping languages -> extensions
const languageExtension: Record<string, string> = {
  javascript: 'js',
  python: 'py',
  java: 'java',
  ruby: 'rb',
  php: 'php',
  go: 'go',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs'
};

function renameFile(tmpDir: string, language: string, index: number): void {
  const ccfxPrepDir = path.join(tmpDir, 'snippets/.ccfxprepdir');

  const tokenFiles = fs.readdirSync(ccfxPrepDir);

  // Filter .token files to move
  tokenFiles.forEach(file => {
    const filePath = path.join(ccfxPrepDir, file);

    // Ignore any directories (make sure you only treat files)
    if (fs.lstatSync(filePath).isFile()) {
      let newFileName = '';
      // If the language is python, use specific names for the files
      if (language === 'python') {
        if (file.includes('code1')) {
          console.log("File:", file);
          newFileName = 'py_snippetExtracted.token';
        } else {
          console.log("File:", file);
          newFileName = 'py_sourceGenerated.token';
        }
      } else {
        // Otherwise, use general file names
        if (file.includes('code1')) {
          console.log("File rin:", file);
          newFileName = 'snippetExtracted.token';
        } else {
          console.log("File rin:", file);
          newFileName = `sourceGenerated.token`;
        }
      }
      const newFilePath = path.join(ccfxPrepDir, newFileName);
      fs.renameSync(filePath, newFilePath);
    }
  });
}

// Function to create snippet files
function createSnippetFiles(generatedCode:string, language:string, sourceSnippet:string, directory: string): void {
  // Use the extension for the specific language
  const ext = languageExtension[language];
  const snippetDir = path.join(directory, 'snippets');
  console.log("Creating snippet files in:", snippetDir);
  
  if (!fs.existsSync(snippetDir)) {
    fs.mkdirSync(snippetDir, { recursive: true });
    console.log("Snippet directory created");
  }

  //SNIPPET1 IS THE GENERATED CODE
  fs.writeFileSync(path.join(snippetDir, `snippet1.${ext}`), generatedCode, 'utf8');
  //CODE1 IS THE SOURCE CODE
  fs.writeFileSync(path.join(snippetDir, `code1.${ext}`), sourceSnippet, 'utf8');
}

// Function to perform clone detection
function runCloneDetection(language: string, tmpDir: string): string {
  const outputFile = path.join(tmpDir, "output_file_ccfsw.json");
  const outputName = path.join(tmpDir, "output_file");

  // Retrieve CCFinderSW path from VS Code settings
  const ccfinderPath = getCCFinderPath();
  const minTokenLength = getMinTokenLength();
  console.log("Running clone detection for language:", language);
  
  const cmd = [
    ccfinderPath, 'D',
    '-d', path.join(tmpDir, 'snippets'),
    '-l', language,
    '-o', outputName,
    '-t', minTokenLength,
    '-w', '2',
    '-json', '+',
  ];
  try {
    execSync(cmd.join(' '), { stdio: 'pipe' });
  } catch (error) {
    console.error("Error executing CCFinderSW:", error);
  }

  return outputFile;
}

// Function to check for clones
function checkForClones(outputFile: string): { cloneDetected: number, clonedLines: number } {
  const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
  const fileTable = data['file_table'];
  let fileId = null;

  for (const file of fileTable) {
    if (file['path'].includes('snippet1')) {
      fileId = file['id'];
      break;
    }
  }

  if (fileId==null) {
    console.error('File ID not found');
    return { cloneDetected: 0, clonedLines: 0 };
  }

  const clonePairs: ClonePair[] = data['clone_pairs']; // Let's type clonePairs
  //console.log("Clone pairs found:", clonePairs.length);
  const intervalsFile0 = clonePairs
    .filter(pair => pair.fragment1.file_id === fileId)
    .map(pair => [pair.fragment1.begin, pair.fragment1.end]);

  const mergedIntervals = mergeIntervals(intervalsFile0);
  const totalClonedLines = mergedIntervals.reduce((sum, [start, end]) => sum + (end - start + 1), 0);

  console.log("Total cloned lines:", totalClonedLines);

  return {
    cloneDetected: totalClonedLines > 0 ? 1 : 0,
    clonedLines: totalClonedLines
  };
}

// Function to join overlapping ranges
function mergeIntervals(intervals: number[][]): number[][] {
  if (intervals.length === 0) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0]];
  console.log('Initial intervals:', intervals);

  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const current = intervals[i];

    console.log('Last merged interval:', last);
    console.log('Current interval:', current);

    if (current[0] <= last[1]) {
      merged[merged.length - 1] = [last[0], Math.max(last[1], current[1])];
      console.log('Merged interval:', merged[merged.length - 1]);
    } else {
      merged.push(current);
      console.log('Pushed new interval:', current);
    }
  }
  return merged;
}

// Function to clean the snippets directory
function cleanSnippetsDirectory(directory: string): void {
  const files = fs.readdirSync(directory);
  files.forEach(file => {
    const filePath = path.join(directory, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      fs.rmSync(filePath, { recursive: true });
    } else {
        fs.unlinkSync(filePath);
    }
  });
}

export function detectCodeClones(combinedData: CombinedData[], outputDir: string): CodeSimilarityAnalysis[] {
  const outputDirCloneDetection = path.join(outputDir, 'clone_detection');
  const outputDirCloneDetectionTmp = path.join(outputDir, 'tmp');

  const results: CodeSimilarityAnalysis[] = [];
  
  combinedData.forEach((match, index) => {
    console.log(`Processing result ${index} of ${combinedData.length}`);
    
    // Creates snippet files based on the specified language
    createSnippetFiles(match.generatedSnippet,match.language, match.extractedSnippet, outputDirCloneDetectionTmp);
  
    // Perform language-based clone detection
    const outputFile = runCloneDetection(match.language, outputDirCloneDetectionTmp);
    const { cloneDetected, clonedLines } = checkForClones(outputFile);
    // Calculate the clone ratio
    const cloningRatio = clonedLines > 0 ?  parseFloat(((clonedLines / match.generatedSnippet.split('\n').length) * 100).toFixed(2)) : 0;

    console.log("Numero linee:", match.generatedSnippet.split('\n').length);

    renameFile(outputDirCloneDetectionTmp, match.language, index);
    const resultCosineSimilarity = computeCosineSimilarity(outputDirCloneDetectionTmp);

    // Add clone detection results to the combined data
    results.push({
      generatedSnippet: match.generatedSnippet,
      url: match.url,
      extractedSnippet: match.extractedSnippet,
      language: match.language,
      cloneDetected: cloneDetected,
      cloningRatio: cloningRatio,
      clonedLines: clonedLines,
      cosineSimilarity: resultCosineSimilarity
    });

    // Cleaning up the snippets directory after you're done
    cleanSnippetsDirectory(outputDirCloneDetectionTmp);
  });

  const outputJson = path.join(outputDirCloneDetection, 'clone_similarity_output.json');

  // Create the folder if it does not exist
  if (!fs.existsSync(outputDirCloneDetection)) {
    fs.mkdirSync(outputDirCloneDetection, { recursive: true });
  }
  
  // Create an array of objects for JSON
  const jsonData = results.map(item => ({
    generatedCode: item.generatedSnippet,
    url: item.url,
    extractedSnippet: item.extractedSnippet,
    cloneDetected: item.cloneDetected,
    'cloningRatio (%)': item.cloningRatio,
    clonedLines: item.clonedLines,
    cosineSimilarity: item.cosineSimilarity
  }));

  // Write data to JSON file
  fs.writeFileSync(outputJson, JSON.stringify(jsonData, null, 2)); // `null, 2` to format the JSON in a readable way

  return results;
}