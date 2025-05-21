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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCodeFromUrls = extractCodeFromUrls;
const cheerio = __importStar(require("cheerio"));
const axios_1 = __importDefault(require("axios"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
async function analyzeStackoverflow(url, results, minLines) {
    if (!url.includes("stackoverflow.com")) {
        return false;
    }
    console.log("minLines: " + minLines);
    try {
        const response = await axios_1.default.get(url);
        console.log("stackoverflow");
        const $ = cheerio.load(response.data);
        $('pre code').each((i, element) => {
            const code = $(element).text();
            const lines = code.split('\n').filter(line => line.trim().length > 0);
            console.log('Code:', lines.join('\n'));
            console.log('Lunghezza snippet estratto ' + lines.length);
            if (lines.length > minLines) {
                results.push({ url, snippet: lines.join('\n') });
            }
        });
        return true;
    }
    catch (error) {
        console.error(`Error analyzing Stack Overflow URL ${url}:`, error);
        return false;
    }
}
async function analyzeGithub(url, results, minLines) {
    if (!url.includes("github.com")) {
        return false;
    }
    console.log("minLines: " + minLines);
    try {
        // Convert GitHub URLs to RAW format
        const rawUrl = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
        // Make the HTTP request to obtain the source code
        const response = await axios_1.default.get(rawUrl);
        if (response.status === 404) {
            console.error("GitHub file unreachable:", url);
            return false;
        }
        const codeSnippet = response.data;
        const lines = codeSnippet.split("\n").filter((line) => line.trim().length > 0);
        console.log("analyzeGithub:", url);
        console.log("Total lines:", lines.length);
        console.log("Code snippet:", lines.join("\n"));
        if (lines.length > minLines) {
            results.push({ url, snippet: lines.join("\n") });
            return true;
        }
        return false;
    }
    catch (error) {
        console.error(`Error analyzing GitHub URL ${url}:`, error);
        return false;
    }
}
async function analyzeGeeksforgeek(url, results, minLines) {
    if (!url.includes("geeksforgeeks.org")) {
        return false;
    }
    try {
        const response = await axios_1.default.get(url);
        console.log("geeksforgeeks");
        const $ = cheerio.load(response.data);
        const codeContainers = $('div.code-container');
        if (codeContainers.length > 0) {
            console.log(codeContainers.length);
            codeContainers.each((i, element) => {
                console.log('Code-container found');
                const code = $(element).text(); // Get all the text in the container
                const lines = code.split('\n').filter(line => line.trim().length > 0);
                console.log('Code:', lines.join('\n'));
                console.log('Lunghezza ' + lines.length);
                if (lines.length > minLines) {
                    results.push({ url, snippet: lines.join('\n') });
                }
            });
        }
        else {
            console.log('No code-container found');
            $('code').each((i, element) => {
                const code = $(element).text();
                const lines = code.split('\n').filter(line => line.trim().length > 0);
                console.log('Code:', lines.join('\n'));
                console.log('Lunghezza ' + lines.length);
                if (lines.length > minLines) {
                    results.push({ url, snippet: lines.join('\n') });
                }
            });
        }
        return true;
    }
    catch (error) {
        console.error(`Error analyzing GeeksforGeeks URL ${url}:`, error);
        return false;
    }
}
async function analyzeOtherSource(url, results, minLines) {
    try {
        console.log("minLines: " + minLines);
        const response = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        console.log("analyzeOtherSource");
        $('pre').each((i, element) => {
            let code = $(element).html();
            // If there are <br> tags, replace them with \n
            if (code) {
                code = code.replace(/<br\s*\/?>/g, '\n');
            }
            // Extract Code Text with Cheerio
            const text = cheerio.load(code ?? '').text();
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            console.log('Code:', lines.join('\n'));
            console.log('Lunghezza ' + lines.length);
            if (lines.length > minLines) {
                results.push({ url, snippet: lines.join('\n') });
            }
        });
        return true;
    }
    catch (error) {
        console.error(`Error analyzing other source URL ${url}:`, error);
        return false;
    }
}
async function analyzeW3schoolSource(url, results, minLines) {
    if (!url.includes("w3schools.com")) {
        return false;
    }
    console.log("minLines: " + minLines);
    try {
        const response = await axios_1.default.get(url);
        const $ = cheerio.load(response.data);
        console.log('w3schools');
        $('div[class*="w3-code notranslate"]').each((i, element) => {
            let code = $(element).html();
            // If there are <br> tags, replace them with \n
            if (code) {
                code = code.replace(/<br\s*\/?>/g, '\n');
            }
            // Extract Code Text with Cheerio
            const text = cheerio.load(code ?? '').text();
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            console.log('Code:', lines.join('\n'));
            console.log('Lunghezza  ' + lines.length + '\n');
            if (lines.length > minLines) {
                results.push({ url, snippet: lines.join('\n') });
            }
        });
        return true;
    }
    catch (error) {
        console.error(`Error analyzing W3Schools URL ${url}:`, error);
        return false;
    }
}
async function analyzePhpSource(url, results, minLines) {
    if (!url.includes("php.net")) {
        return false;
    }
    console.log("minLines: " + minLines);
    try {
        const response = await axios_1.default.get(url);
        const $ = cheerio.load(response.data);
        console.log(' PHP');
        $('div.phpcode code').each((i, element) => {
            const outerSpan = $(element).find('span').first();
            if (outerSpan.length) {
                const innerSpans = outerSpan.children('span');
                let code = innerSpans.map((_, span) => $(span).html()).get().join(' ');
                code = code.replace(/<br\s*\/?>/g, '\n');
                const text = cheerio.load(code).text(); // Carica la stringa HTML con Cheerio
                const lines = text.split('\n').filter(line => line.trim().length > 0);
                console.log('Code:', lines.join('\n'));
                console.log('Lunghezza  ' + lines.length + '\n\n\n\n\n');
                if (lines.length > minLines) {
                    results.push({ url, snippet: lines.join('\n') });
                }
            }
        });
        return true;
    }
    catch (error) {
        console.error(`Error analyzing PHP URL ${url}:`, error);
        return false;
    }
}
async function extractCodeFromUrls(urls, pathToExtraction, minLines) {
    const savePath = path.join(pathToExtraction, 'snippetExtractor');
    const results = [];
    for (const url of urls) {
        console.log(`Processing URL: ${url}`);
        //move to the next iteration of the for loop when one of the analyze... functions returns true
        if (await analyzeStackoverflow(url, results, minLines))
            continue;
        if (await analyzeGithub(url, results, minLines))
            continue;
        if (await analyzeGeeksforgeek(url, results, minLines))
            continue;
        if (await analyzeW3schoolSource(url, results, minLines))
            continue;
        if (await analyzePhpSource(url, results, minLines))
            continue;
        if (await analyzeOtherSource(url, results, minLines))
            continue;
    }
    // *** SAVING RESULTS ***
    if (savePath) { // Save only if savePath is provided
        // Create the folder if it doesn't exist
        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true }); // `{ recursive: true }` create nested folders if necessary
        }
        const jsonFilePath = path.join(savePath, 'extracted_code.json');
        fs.writeFileSync(jsonFilePath, JSON.stringify(results, null, 2));
        console.log('Extracted code saved to: ' + JSON.stringify(results, null, 2));
    }
    return results;
}
//# sourceMappingURL=snippetExtractor.js.map