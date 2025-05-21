"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCodeBlocks = extractCodeBlocks;
exports.extractLinks = extractLinks;
const extensionConfig_1 = require("./extensionConfig");
//Function that creates an array composed of objects with the language and code
function extractCodeBlocks(text) {
    const codeRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g; // to capture language and code
    const codes = [];
    let match;
    while ((match = codeRegex.exec(text)) !== null) {
        const lines = match[2].split('\n').filter(line => line.trim().length > 0);
        if (lines.length > (0, extensionConfig_1.getMinLinesConfig)()) {
            // Let's save an object with the language and the code
            codes.push({
                code: lines.join('\n'),
                language: match[1]
            });
        }
    }
    return codes;
}
//Function to extract links present in the LLM response
function extractLinks(text) {
    const urlRegex = /https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?(?:\/[^\s\)\],]*)?(?=\s|$|[)\],])/g;
    const urls = new Set();
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        urls.add(match[0]);
    }
    return urls;
}
//# sourceMappingURL=extractor.js.map