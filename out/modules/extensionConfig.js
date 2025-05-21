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
exports.getModel = getModel;
exports.getAPIKey = getAPIKey;
exports.getMinLinesConfig = getMinLinesConfig;
exports.getTemperature = getTemperature;
exports.getCloneRatioThreshold = getCloneRatioThreshold;
exports.getCosineSimilarityThreshold = getCosineSimilarityThreshold;
exports.getOutputDirCloneDetection = getOutputDirCloneDetection;
exports.getCCFinderPath = getCCFinderPath;
exports.getMinTokenLength = getMinTokenLength;
exports.getLicenseClassifierPath = getLicenseClassifierPath;
const vscode = __importStar(require("vscode"));
// Returns the AI model configured for the extension, assuming it's always defined.
function getModel() {
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const model = vscode.workspace.getConfiguration().get('CodeGenLink.AI model');
    return model;
}
//Function to get the user's API key
function getAPIKey() {
    const apiKey = vscode.workspace.getConfiguration().get('CodeGenLink.APIKey');
    if (!apiKey) {
        throw new Error("The OpenAI API key is not defined in the configuration.");
    }
    return apiKey;
}
//Function to get the minimum number of rows configured by the user
function getMinLinesConfig() {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const minLines = config.get("minLines");
    return minLines;
}
//Function to get the temperature value configured by the user
function getTemperature() {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const temperature = config.get("temperature");
    return temperature;
}
//Function to get the user configured clone ratio threshold
function getCloneRatioThreshold() {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const cloneRatioThreshold = config.get("cloneRatioThreshold");
    return cloneRatioThreshold;
}
//Function to get the user configured cosine similarity threshold
function getCosineSimilarityThreshold() {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const cosineSimilarityThreshold = config.get("cosineSimilarityThreshold");
    return cosineSimilarityThreshold;
}
//Function to get the path of the directory chosen by the user
function getOutputDirCloneDetection() {
    const outputDir = vscode.workspace.getConfiguration().get('CodeGenLink.outputDir');
    if (!outputDir) {
        throw new Error("Output directory is not defined in the configuration.");
    }
    console.log(`Output directory: ${outputDir}`);
    return outputDir;
}
//Function to get the path of the directory where the user has the CCFinderSW executable
function getCCFinderPath() {
    const ccfinderPath = vscode.workspace.getConfiguration().get('CodeGenLink.CCFinderSWPath');
    if (!ccfinderPath) {
        throw new Error("CCFinderSW path is not set. Please configure it in the settings.");
    }
    return ccfinderPath;
}
// Gets the minimum token sequence length (`-t` parameter) configured by the user for CCFinderSW analysis
function getMinTokenLength() {
    const config = vscode.workspace.getConfiguration("CodeGenLink");
    // I use ! because I'm sure the value is defined in the worst case with the default value
    const minTokenlength = config.get("minTokenLength");
    return minTokenlength;
}
//Function to get the path of the directory where the user has the license_identify.go file
function getLicenseClassifierPath() {
    const licenseClassifierPath = vscode.workspace.getConfiguration().get('CodeGenLink.licenseclassifierPath');
    if (!licenseClassifierPath) {
        throw new Error("License classifier path is not defined in the configuration.");
    }
    return licenseClassifierPath;
}
//# sourceMappingURL=extensionConfig.js.map