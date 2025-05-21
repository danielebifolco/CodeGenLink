"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineCodeWithResults = combineCodeWithResults;
function combineCodeWithResults(generatedCode, extractionResults) {
    return generatedCode.flatMap(genCode => extractionResults.map(extrResults => ({
        generatedSnippet: genCode.code,
        language: genCode.language,
        url: extrResults.url,
        extractedSnippet: extrResults.snippet
    })));
}
//# sourceMappingURL=combinatedCodeResults.js.map