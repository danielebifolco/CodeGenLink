"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCodeClones = detectCodeClones;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const cosineSimilarity_1 = require("./cosineSimilarity");
const extensionConfig_1 = require("./extensionConfig");
// Mapping languages -> extensions
const languageExtension = {
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
function renameFile(tmpDir, language, index) {
    const ccfxPrepDir = path_1.default.join(tmpDir, 'snippets/.ccfxprepdir');
    const tokenFiles = fs_1.default.readdirSync(ccfxPrepDir);
    // Filter .token files to move
    tokenFiles.forEach(file => {
        const filePath = path_1.default.join(ccfxPrepDir, file);
        // Ignore any directories (make sure you only treat files)
        if (fs_1.default.lstatSync(filePath).isFile()) {
            let newFileName = '';
            // If the language is python, use specific names for the files
            if (language === 'python') {
                if (file.includes('code1')) {
                    console.log("File:", file);
                    newFileName = 'py_snippetExtracted.token';
                }
                else {
                    console.log("File:", file);
                    newFileName = 'py_sourceGenerated.token';
                }
            }
            else {
                // Otherwise, use general file names
                if (file.includes('code1')) {
                    console.log("File rin:", file);
                    newFileName = 'snippetExtracted.token';
                }
                else {
                    console.log("File rin:", file);
                    newFileName = `sourceGenerated.token`;
                }
            }
            const newFilePath = path_1.default.join(ccfxPrepDir, newFileName);
            fs_1.default.renameSync(filePath, newFilePath);
        }
    });
}
// Function to create snippet files
function createSnippetFiles(generatedCode, language, sourceSnippet, directory) {
    // Use the extension for the specific language
    const ext = languageExtension[language];
    const snippetDir = path_1.default.join(directory, 'snippets');
    console.log("Creating snippet files in:", snippetDir);
    if (!fs_1.default.existsSync(snippetDir)) {
        fs_1.default.mkdirSync(snippetDir, { recursive: true });
        console.log("Snippet directory created");
    }
    //SNIPPET1 IS THE GENERATED CODE
    fs_1.default.writeFileSync(path_1.default.join(snippetDir, `snippet1.${ext}`), generatedCode, 'utf8');
    //CODE1 IS THE SOURCE CODE
    fs_1.default.writeFileSync(path_1.default.join(snippetDir, `code1.${ext}`), sourceSnippet, 'utf8');
}
// Function to perform clone detection
function runCloneDetection(language, tmpDir) {
    const outputFile = path_1.default.join(tmpDir, "output_file_ccfsw.json");
    const outputName = path_1.default.join(tmpDir, "output_file");
    // Retrieve CCFinderSW path from VS Code settings
    const ccfinderPath = (0, extensionConfig_1.getCCFinderPath)();
    const minTokenLength = (0, extensionConfig_1.getMinTokenLength)();
    console.log("Running clone detection for language:", language);
    const cmd = [
        ccfinderPath, 'D',
        '-d', path_1.default.join(tmpDir, 'snippets'),
        '-l', language,
        '-o', outputName,
        '-t', minTokenLength,
        '-w', '2',
        '-json', '+',
    ];
    try {
        (0, child_process_1.execSync)(cmd.join(' '), { stdio: 'pipe' });
    }
    catch (error) {
        console.error("Error executing CCFinderSW:", error);
    }
    return outputFile;
}
// Function to check for clones
function checkForClones(outputFile) {
    const data = JSON.parse(fs_1.default.readFileSync(outputFile, 'utf8'));
    const fileTable = data['file_table'];
    let fileId = null;
    for (const file of fileTable) {
        if (file['path'].includes('snippet1')) {
            fileId = file['id'];
            break;
        }
    }
    if (fileId == null) {
        console.error('File ID not found');
        return { cloneDetected: 0, clonedLines: 0 };
    }
    const clonePairs = data['clone_pairs']; // Let's type clonePairs
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
function mergeIntervals(intervals) {
    if (intervals.length === 0)
        return [];
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
        }
        else {
            merged.push(current);
            console.log('Pushed new interval:', current);
        }
    }
    return merged;
}
// Function to clean the snippets directory
function cleanSnippetsDirectory(directory) {
    const files = fs_1.default.readdirSync(directory);
    files.forEach(file => {
        const filePath = path_1.default.join(directory, file);
        if (fs_1.default.lstatSync(filePath).isDirectory()) {
            fs_1.default.rmSync(filePath, { recursive: true });
        }
        else {
            fs_1.default.unlinkSync(filePath);
        }
    });
}
function detectCodeClones(combinedData, outputDir) {
    const outputDirCloneDetection = path_1.default.join(outputDir, 'clone_detection');
    const outputDirCloneDetectionTmp = path_1.default.join(outputDir, 'tmp');
    const results = [];
    combinedData.forEach((match, index) => {
        console.log(`Processing result ${index} of ${combinedData.length}`);
        // Creates snippet files based on the specified language
        createSnippetFiles(match.generatedSnippet, match.language, match.extractedSnippet, outputDirCloneDetectionTmp);
        // Perform language-based clone detection
        const outputFile = runCloneDetection(match.language, outputDirCloneDetectionTmp);
        const { cloneDetected, clonedLines } = checkForClones(outputFile);
        // Calculate the clone ratio
        const cloningRatio = clonedLines > 0 ? parseFloat(((clonedLines / match.generatedSnippet.split('\n').length) * 100).toFixed(2)) : 0;
        console.log("Numero linee:", match.generatedSnippet.split('\n').length);
        renameFile(outputDirCloneDetectionTmp, match.language, index);
        const resultCosineSimilarity = (0, cosineSimilarity_1.computeCosineSimilarity)(outputDirCloneDetectionTmp);
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
    const outputJson = path_1.default.join(outputDirCloneDetection, 'clone_similarity_output.json');
    // Create the folder if it does not exist
    if (!fs_1.default.existsSync(outputDirCloneDetection)) {
        fs_1.default.mkdirSync(outputDirCloneDetection, { recursive: true });
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
    fs_1.default.writeFileSync(outputJson, JSON.stringify(jsonData, null, 2)); // `null, 2` to format the JSON in a readable way
    return results;
}
//# sourceMappingURL=ccfinder.js.map