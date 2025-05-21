"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCosineSimilarity = computeCosineSimilarity;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
// Function to run a Python script
function runPythonScript(scriptPath, args) {
    try {
        const command = `python3 ${scriptPath} ${args.join(' ')}`;
        const stdout = (0, child_process_1.execSync)(command, { encoding: 'utf-8' }); // The response will be a string
        return stdout;
    }
    catch (error) {
        throw new Error(`Error running the Python script: ${error}`);
    }
}
// Function to invoke Python to calculate similarity
function calculateSimilarity(folder) {
    const files = fs.readdirSync(folder);
    let snippetExtractedFile;
    let sourceGeneratedFile;
    // Check the present files and map the correct files
    if (files.includes('py_snippetExtracted.token') && files.includes('py_sourceGenerated.token')) {
        snippetExtractedFile = path.join(folder, 'py_snippetExtracted.token');
        sourceGeneratedFile = path.join(folder, 'py_sourceGenerated.token');
    }
    else if (files.includes('snippetExtracted.token') && files.includes('sourceGenerated.token')) {
        snippetExtractedFile = path.join(folder, 'snippetExtracted.token');
        sourceGeneratedFile = path.join(folder, 'sourceGenerated.token');
    }
    else {
        console.warn(`Missing files in the folder: ${folder}`);
        return 0;
    }
    const scriptPath = path.join(__dirname, '../../src/modules/cosine_similarity.py');
    // Call to Python to calculate similarity
    const result = runPythonScript(scriptPath, [sourceGeneratedFile, snippetExtractedFile]);
    const similarityScore = parseFloat(result);
    return similarityScore;
}
// Function to compute the cosine similarity
function computeCosineSimilarity(tmp) {
    const tokenDir = path.join(tmp, 'snippets/.ccfxprepdir');
    const result = calculateSimilarity(tokenDir);
    return result;
}
//# sourceMappingURL=cosineSimilarity.js.map