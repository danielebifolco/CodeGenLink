import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Function to run a Python script
function runPythonScript(scriptPath: string, args: string[]): string {
    try {
      const command = `python3 ${scriptPath} ${args.join(' ')}`;
      const stdout = execSync(command, { encoding: 'utf-8' }); // The response will be a string
      return stdout;
    } catch (error) {
      throw new Error(`Error running the Python script: ${error}`);
    }
}

// Function to invoke Python to calculate similarity
function calculateSimilarity(folder: string): number {
  const files = fs.readdirSync(folder);
  let snippetExtractedFile : string;
  let sourceGeneratedFile : string;

  // Check the present files and map the correct files
  if (files.includes('py_snippetExtracted.token') && files.includes('py_sourceGenerated.token')) {
    snippetExtractedFile = path.join(folder, 'py_snippetExtracted.token');
    sourceGeneratedFile = path.join(folder, 'py_sourceGenerated.token');
  } else if (files.includes('snippetExtracted.token') && files.includes('sourceGenerated.token')) {
    snippetExtractedFile = path.join(folder, 'snippetExtracted.token');
    sourceGeneratedFile = path.join(folder, 'sourceGenerated.token');
  } else {
    console.warn(`Missing files in the folder: ${folder}`);
    return  0 ;
  }

  const scriptPath = path.join(__dirname, '../../src/modules/cosine_similarity.py');
  // Call to Python to calculate similarity
  const result =  runPythonScript(scriptPath, [sourceGeneratedFile, snippetExtractedFile]);

  const similarityScore = parseFloat(result);
  
  return  similarityScore;
}

// Function to compute the cosine similarity
export function computeCosineSimilarity(tmp: string): number {
  const tokenDir = path.join(tmp, 'snippets/.ccfxprepdir');
  
  const result =  calculateSimilarity(tokenDir);
  return result;
}