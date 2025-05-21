import * as vscode from 'vscode';

// Returns the AI model configured for the extension, assuming it's always defined.
export function getModel(): string{
    // I use ! because I'm sure the value is defined in the worst case with the default value
	const model = vscode.workspace.getConfiguration().get<string>('CodeGenLink.AI model')!;
	
	return model;
}

//Function to get the user's API key
export function getAPIKey(): string{
	const apiKey = vscode.workspace.getConfiguration().get<string>('CodeGenLink.APIKey');
    
	if (!apiKey) {
		throw new Error("The OpenAI API key is not defined in the configuration.");
	}
	
	return apiKey;
}

//Function to get the minimum number of rows configured by the user
export function getMinLinesConfig(): number {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const minLines = config.get<number>("minLines")!;
    return minLines;
}

//Function to get the temperature value configured by the user
export function getTemperature(): number {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const temperature = config.get<number>("temperature")!;
    return temperature;
}

//Function to get the user configured clone ratio threshold
export function getCloneRatioThreshold(): number {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const cloneRatioThreshold = config.get<number>("cloneRatioThreshold")!;
    return cloneRatioThreshold;
}

//Function to get the user configured cosine similarity threshold
export function getCosineSimilarityThreshold(): number {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const cosineSimilarityThreshold = config.get<number>("cosineSimilarityThreshold")!;
    return cosineSimilarityThreshold;
}

//Function to get the path of the directory chosen by the user
export function getOutputDirCloneDetection(): string{
	const outputDir = vscode.workspace.getConfiguration().get<string>('CodeGenLink.outputDir');

	if (!outputDir) {
		throw new Error("Output directory is not defined in the configuration.");
	}
	
	console.log(`Output directory: ${outputDir}`);
	return outputDir;
}

//Function to get the path of the directory where the user has the CCFinderSW executable
export function getCCFinderPath(): string {
    const ccfinderPath = vscode.workspace.getConfiguration().get<string>('CodeGenLink.CCFinderSWPath');
    
    if (!ccfinderPath) {
        throw new Error("CCFinderSW path is not set. Please configure it in the settings.");
    }

    return ccfinderPath;
}

// Gets the minimum token sequence length (`-t` parameter) configured by the user for CCFinderSW analysis
export function getMinTokenLength(): string {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const minTokenlength = config.get<string>("minTokenLength")!;
    return minTokenlength;
}

//Function to get the path of the directory where the user has the license_identify.go file
export function getLicenseClassifierPath(): string {
    const licenseClassifierPath = vscode.workspace.getConfiguration().get<string>('CodeGenLink.licenseclassifierPath');
    
    if (!licenseClassifierPath) {
        throw new Error("License classifier path is not defined in the configuration.");
    }

    return licenseClassifierPath;
}