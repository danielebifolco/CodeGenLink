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
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
const extractor_1 = require("./modules/extractor");
const snippetExtractor_1 = require("./modules/snippetExtractor");
const combinatedCodeResults_1 = require("./modules/combinatedCodeResults");
const ccfinder_1 = require("./modules/ccfinder");
const extractLicense_1 = require("./modules/extractLicense");
const extensionConfig_1 = require("./modules/extensionConfig");
const resultsWebViewManager_1 = require("./modules/resultsWebViewManager");
const openai_1 = __importDefault(require("openai"));
let resultsWebView;
let finalResults = [];
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    let cleanedCode;
    let prompt;
    let language;
    const client = new openai_1.default({
        apiKey: (0, extensionConfig_1.getAPIKey)()
    });
    const openResultsCommand = vscode.commands.registerCommand('CodeGenLink.openResults', () => {
        if (resultsWebView) {
            // If the WebView is open, close it
            resultsWebView.dispose();
            resultsWebView = undefined;
        }
        else {
            // If it's not open, we create it
            resultsWebView = (0, resultsWebViewManager_1.createResultsWebView)(context, finalResults);
            // Add a listener for closing the WebView
            resultsWebView.onDidDispose(() => {
                resultsWebView = undefined; // Reset the reference when the WebView is closed
            });
        }
    });
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(file-code) Open Results"; // Use a built-in VS Code icon
    statusBarItem.command = 'CodeGenLink.openResults'; // Associate the command to open the results
    statusBarItem.show();
    const sendSelectedCodeCommand = vscode.commands.registerCommand('CodeGenLink.sendSelectedCode', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('Nessun editor aperto.');
            return;
        }
        // Get the selected code in the editor
        const selection = editor.selection;
        const selectedCode = editor.document.getText(selection);
        //Filter the code to remove empty lines
        cleanedCode = selectedCode.split('\n').filter(line => line.trim().length > 0).join('\n');
        if (cleanedCode.split('\n').length <= (0, extensionConfig_1.getMinLinesConfig)()) {
            vscode.window.showErrorMessage("The selected code is too short. Please select a snippet with more than " + (0, extensionConfig_1.getMinLinesConfig)() + " lines of code.");
            return;
        }
        // Get the language recognized by VS Code
        language = editor.document.languageId;
        // Add the desired prompt
        prompt = `@LinkSearcher Search the web to find links where I can get more information about this code. \n \`\`\`${language}\n${cleanedCode}\n\`\`\``;
        // Send the code and prompt to Copilot chat
        vscode.commands.executeCommand('workbench.action.chat.open', prompt);
    });
    vscode.chat.createChatParticipant("vscode-LinkSearcher", async (request, context, response, token) => {
        const userQuery = request.prompt;
        response.progress('Searching for relevant sources online...');
        // Send the request to the model
        const chatRequest = await client.responses.create({
            model: (0, extensionConfig_1.getModel)(),
            tools: [{ type: "web_search_preview" }],
            input: userQuery,
            temperature: (0, extensionConfig_1.getTemperature)()
        });
        let responseData = '';
        // Receive and view the response
        for await (const token of chatRequest.output_text) {
            response.markdown(token);
            responseData += token;
        }
        const urls = (0, extractor_1.extractLinks)(responseData);
        // Start pipeline if there are links
        if (urls.size > 0) {
            const codes = [{ code: cleanedCode, language: language }];
            await pipeline(codes, urls);
        }
        else {
            // If there is no  link, it displays a message DO NOTHING
            vscode.window.showErrorMessage("Link not present or invalid.");
        }
    });
    vscode.chat.createChatParticipant("vscode-CodeGenLink", async (request, context, response, token) => {
        const userQuery = request.prompt;
        response.progress('Generating the code and searching for online resources...');
        // Send the request to the model
        let chatRequest = await client.responses.create({
            model: (0, extensionConfig_1.getModel)(),
            input: userQuery,
            temperature: (0, extensionConfig_1.getTemperature)()
        });
        let responseData = '';
        // Receives the response and displays it in chat
        for await (const token of chatRequest.output_text) {
            response.markdown(token); // Show in chat
            responseData += token; // Accumulate the answer
        }
        // Use extractor.ts module to extract code and links
        const codes = (0, extractor_1.extractCodeBlocks)(responseData);
        codes.forEach((block, index) => {
            console.log(`Codice ${index + 1} (Linguaggio: ${block.language}):`);
            console.log(block.code);
        });
        if (codes.length == 0) {
            vscode.window.showErrorMessage("The generated code doesn't have the required minimum of " + (0, extensionConfig_1.getMinLinesConfig)() + " lines.");
            return;
        }
        chatRequest = await client.responses.create({
            model: (0, extensionConfig_1.getModel)(),
            tools: [{ type: "web_search_preview" }],
            input: "Search the web to find links where I can get more information about the generated code present in this responde." + responseData,
            temperature: (0, extensionConfig_1.getTemperature)()
        });
        response.markdown("  \n");
        for await (const token of chatRequest.output_text) {
            response.markdown(token); // Show in chat
        }
        const urls = (0, extractor_1.extractLinks)(chatRequest.output_text);
        if (urls.size == 0) {
            vscode.window.showErrorMessage("No link extracted from Copilot's response.");
            return;
        }
        // Start the pipeline
        await pipeline(codes, urls);
    });
    context.subscriptions.push(sendSelectedCodeCommand, openResultsCommand, statusBarItem);
}
// This method is called when your extension is deactivated
function deactivate() { }
async function pipeline(codes, urls) {
    // Fetch minimum number of rows configured by user
    const minLines = (0, extensionConfig_1.getMinLinesConfig)();
    console.log(`Numero minimo di righe: ${minLines}`);
    // Retrieve user-configured output directory
    const outputDir = (0, extensionConfig_1.getOutputDirCloneDetection)();
    // Extract code from URLs
    const extractionResult = await (0, snippetExtractor_1.extractCodeFromUrls)(urls, outputDir, minLines)
        .catch((error) => {
        console.error('Error extracting code from URLs:', error);
        return []; // Restituisci un array vuoto in caso di errore
    });
    if (extractionResult.length === 0) {
        console.log('No code extracted');
        vscode.window.showWarningMessage("No code extracted from the links provided.");
        return;
    }
    //Combine codes with results
    const combinedData = (0, combinatedCodeResults_1.combineCodeWithResults)(codes, extractionResult);
    const similarityAnalysisOutput = (0, ccfinder_1.detectCodeClones)(combinedData, outputDir);
    const licenses = await Promise.all([...urls].map(url => (0, extractLicense_1.getLicense)(url, outputDir)));
    let index = 0;
    for (const url of urls) {
        console.log(`🔹 URL: ${url}`);
        console.log(`   ➤ License: ${licenses[index]}`);
        index++;
    }
    // Save license extraction results to JSON file
    const licensesOutput = (0, extractLicense_1.saveLicenseData)(urls, licenses, outputDir);
    console.log('🔹 Licenses:', licensesOutput);
    const cloneRatioThreshold = (0, extensionConfig_1.getCloneRatioThreshold)();
    const cosineSimilarityThreshold = (0, extensionConfig_1.getCosineSimilarityThreshold)();
    console.log(`🔹 cosine similarityThreshold: ${cosineSimilarityThreshold}`);
    console.log(`🔹 cloneRatioThreshold: ${cloneRatioThreshold}`);
    finalResults = filterBySimilarityAndGetLicenses(similarityAnalysisOutput, licensesOutput, cloneRatioThreshold, cosineSimilarityThreshold);
    console.log('🔹 Final Result:', finalResults);
    if (resultsWebView)
        resultsWebView.webview.html = (0, resultsWebViewManager_1.getWebviewContent)(finalResults);
}
function filterBySimilarityAndGetLicenses(similarityAnalysisOutput, licensesOutput, cloneRatioThreshold, cosineSimilarityThreshold) {
    const urlMap = new Map();
    similarityAnalysisOutput
        .filter(entry => entry.cloningRatio > cloneRatioThreshold || entry.cosineSimilarity > cosineSimilarityThreshold)
        .forEach(entry => {
        if (!urlMap.has(entry.url)) {
            urlMap.set(entry.url, licensesOutput[entry.url]); // Add only non-duplicate URLs
        }
    });
    return Array.from(urlMap, ([url, license]) => ({ url, license }));
}
//# sourceMappingURL=extension.js.map