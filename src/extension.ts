// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { extractCodeBlocks, extractLinks } from './modules/extractor';
import { extractCodeFromUrls } from './modules/snippetExtractor';
import { combineCodeWithResults } from './modules/combinatedCodeResults';
import { detectCodeClones } from './modules/ccfinder';
import { GeneratedCode, CodeSimilarityAnalysis,FinalResults } from './modules/interface';
import { getLicense, saveLicenseData } from './modules/extractLicense';
import { getAPIKey, getModel, getTemperature, getMinLinesConfig, getOutputDirCloneDetection, getCloneRatioThreshold, getCosineSimilarityThreshold} from './modules/extensionConfig';
import { createResultsWebView, getWebviewContent } from './modules/resultsWebViewManager';
import OpenAI from "openai";

let resultsWebView: vscode.WebviewPanel | undefined;
let finalResults: FinalResults[] = [];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	let cleanedCode: string;
	let prompt:string;
	let language:string;
	const client = new OpenAI({
		apiKey: getAPIKey()
	});

	const openResultsCommand = vscode.commands.registerCommand('CodeGenLink.openResults', () => {
        if (resultsWebView) {
            // If the WebView is open, close it
            resultsWebView.dispose();
			resultsWebView = undefined;
        } else {
            // If it's not open, we create it
            resultsWebView = createResultsWebView(context, finalResults);
    
            // Add a listener for closing the WebView
            resultsWebView.onDidDispose(() => {
                resultsWebView = undefined; // Reset the reference when the WebView is closed
            });
        }
    });

	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(file-code) Open Results";  // Use a built-in VS Code icon
    statusBarItem.command = 'CodeGenLink.openResults';  // Associate the command to open the results
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
		if(cleanedCode.split('\n').length <= getMinLinesConfig()){
			vscode.window.showErrorMessage("The selected code is too short. Please select a snippet with more than " + getMinLinesConfig() + " lines of code.");
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
            model: getModel(),
            tools: [ { type: "web_search_preview" } ],
            input: userQuery,
			temperature: getTemperature()
        });
		
		let responseData = '';

		// Receive and view the response
		for await (const token of chatRequest.output_text) {
			response.markdown(token);
			responseData += token;
		}

		const urls = extractLinks(responseData);

		// Start pipeline if there are links
		if (urls.size > 0) {
			const codes: GeneratedCode[] = [{ code: cleanedCode, language: language }];
			await pipeline(codes, urls);
		}
		else{
			// If there is no  link, it displays a message DO NOTHING
			vscode.window.showErrorMessage("Link not present or invalid.");
		}
	});
	
	vscode.chat.createChatParticipant("vscode-CodeGenLink", async (request, context, response, token) => {
		const userQuery = request.prompt;
		response.progress('Generating the code and searching for online resources...');

		// Send the request to the model
		let chatRequest = await client.responses.create({
            model: getModel(),
            input: userQuery,
			temperature: getTemperature()
        });

		let responseData = '';
	
		// Receives the response and displays it in chat
		for await (const token of chatRequest.output_text) {
			response.markdown(token);  // Show in chat
			responseData += token;     // Accumulate the answer
		}
		
		// Use extractor.ts module to extract code and links
		const codes = extractCodeBlocks(responseData);
		codes.forEach((block, index) => {
			console.log(`Codice ${index + 1} (Linguaggio: ${block.language}):`);
			console.log(block.code);
		});
		
		if(codes.length == 0){
			vscode.window.showErrorMessage("The generated code doesn't have the required minimum of "+ getMinLinesConfig()+ " lines.");
			return;
		}
		
		chatRequest = await client.responses.create({
            model: getModel(),
            tools: [ { type: "web_search_preview" } ],
            input: "Search the web to find links where I can get more information about the generated code present in this responde." +responseData,
			temperature: getTemperature()
        });

		response.markdown("  \n");
		for await (const token of chatRequest.output_text) {
			response.markdown(token);  // Show in chat
		}
        const urls = extractLinks(chatRequest.output_text);

		if(urls.size == 0) {
			vscode.window.showErrorMessage("No link extracted from Copilot's response.");
			return;
		}

		// Start the pipeline
		await pipeline(codes, urls);
	});

	context.subscriptions.push( sendSelectedCodeCommand, openResultsCommand, statusBarItem);
}

// This method is called when your extension is deactivated
export function deactivate() {}

async function pipeline(codes: GeneratedCode[], urls: Set<string>) {

	// Fetch minimum number of rows configured by user
	const minLines = getMinLinesConfig();
	console.log(`Numero minimo di righe: ${minLines}`);
	// Retrieve user-configured output directory
	const outputDir = getOutputDirCloneDetection();

	// Extract code from URLs
	const extractionResult = await extractCodeFromUrls(urls, outputDir, minLines)
	.catch((error) => {
		console.error('Error extracting code from URLs:', error);
		return []; // Restituisci un array vuoto in caso di errore
	});

	if(extractionResult.length === 0){
		console.log('No code extracted');
		vscode.window.showWarningMessage("No code extracted from the links provided.");
		return;
	}

	//Combine codes with results
	const combinedData = combineCodeWithResults(codes, extractionResult);
	
	const similarityAnalysisOutput = detectCodeClones(combinedData, outputDir);

	const licenses = await Promise.all([...urls].map(url => getLicense(url, outputDir)));
	let index = 0;
	for (const url of urls) {
		console.log(`🔹 URL: ${url}`);
		console.log(`   ➤ License: ${licenses[index]}`);
		index++;
	}
	// Save license extraction results to JSON file
	const licensesOutput = saveLicenseData(urls, licenses, outputDir);

	console.log('🔹 Licenses:', licensesOutput);

	const cloneRatioThreshold = getCloneRatioThreshold();
	const cosineSimilarityThreshold = getCosineSimilarityThreshold();
	console.log(`🔹 cosine similarityThreshold: ${cosineSimilarityThreshold}`);
	console.log(`🔹 cloneRatioThreshold: ${cloneRatioThreshold}`);

	finalResults = filterBySimilarityAndGetLicenses(similarityAnalysisOutput, licensesOutput, cloneRatioThreshold, cosineSimilarityThreshold);

	console.log('🔹 Final Result:', finalResults);
	if(resultsWebView)
		resultsWebView.webview.html = getWebviewContent(finalResults);

}

function filterBySimilarityAndGetLicenses(similarityAnalysisOutput: CodeSimilarityAnalysis[], licensesOutput: { [url: string]: string }, cloneRatioThreshold: number, cosineSimilarityThreshold: number): FinalResults[] {
	const urlMap = new Map<string, string>();
    
    similarityAnalysisOutput
    	.filter(entry => entry.cloningRatio > cloneRatioThreshold || entry.cosineSimilarity > cosineSimilarityThreshold)
        .forEach(entry => {
            if (!urlMap.has(entry.url)) {
                urlMap.set(entry.url, licensesOutput[entry.url]); // Add only non-duplicate URLs
            }
	});
	return Array.from(urlMap, ([url, license]) => ({ url, license }));
}