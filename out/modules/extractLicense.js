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
exports.getLicense = getLicense;
exports.saveLicenseData = saveLicenseData;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const extensionConfig_1 = require("./extensionConfig");
const LICENSE_KEYWORDS = [
    "Apache License", "Apache 2.0", "MIT", "GPL", "BSD", "General Purpose License", "Creative Commons", "CC BY-SA"
];
/**
 * Identify the license of a source based on the URL
 */
async function getLicense(url, outputDir) {
    if (url.includes("github.com")) {
        return await getGitHubLicense(url, outputDir);
    }
    if (url.includes("stackoverflow.com")) {
        return await getLicenseFromText((await axios_1.default.get("https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt")).data, outputDir);
    }
    if (url.includes("geeksforgeeks.org")) {
        console.log("Citation required: Include link to original article:", url);
        return url;
    }
    if (url.includes("w3schools.com")) {
        console.log("Free to use with attribution:", url);
        return url;
    }
    if (url.includes("php.net")) {
        return await getLicenseFromText((await axios_1.default.get("https://www.php.net/license/3_01.txt")).data, outputDir);
    }
    // Generic case: analyze the content of the page
    return await searchLicenseInPage(url);
}
/**
 * Extracts the license of a GitHub repository by reading the LICENSE file
 */
async function getGitHubLicense(url, outputDir) {
    try {
        // Estrarre il nome del repository
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match)
            return "GitHub repository not recognized";
        const owner = match[1];
        const repo = match[2];
        const repoMetadataUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const repoResponse = await axios_1.default.get(repoMetadataUrl, {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });
        const licenseInfo = repoResponse.data.license;
        if (licenseInfo && licenseInfo.spdx_id) {
            console.log("License found in repository metadata:", licenseInfo.spdx_id);
            return licenseInfo.spdx_id;
        }
        return await getGitHubLicenseFromFile(owner, repo, url, outputDir);
    }
    catch (error) {
        return "Error accessing GitHub repository or its content";
    }
}
async function getGitHubLicenseFromFile(owner, repo, url, outputDir) {
    // API URL to get repository content
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
    const response = await axios_1.default.get(apiUrl, {
        headers: { "Accept": "application/vnd.github.v3+json" }
    });
    // Find the file that contains the word 'LICENSE' in the name
    const licenseFile = response.data.find((file) => file.name.toLowerCase().includes("license"));
    if (!licenseFile) {
        console.log("License file not found");
        return url;
    }
    // If found, try reading the file contents
    const fileResponse = await axios_1.default.get(licenseFile.download_url);
    const fileContent = fileResponse.data;
    return await getLicenseFromText(fileContent, outputDir);
}
async function getLicenseFromText(text, outputDir) {
    const licenseClassifierPath = (0, extensionConfig_1.getLicenseClassifierPath)();
    console.log("License classifier path:", licenseClassifierPath);
    try {
        // Create a temporary file
        const tempFilePath = path.join(outputDir, `license_${Math.random()}.txt`);
        console.log("Temp file path:", tempFilePath);
        await fs.promises.writeFile(tempFilePath, text, 'utf-8');
        const current_dir = process.cwd();
        // Change working directory
        process.chdir(licenseClassifierPath);
        // Run the licenseclassifier command
        const command = `go run identify_license.go ${tempFilePath}`;
        const stdout = (0, child_process_1.execSync)(command, { encoding: 'utf-8' });
        // Delete temporary file
        await fs.promises.unlink(tempFilePath);
        process.chdir(current_dir);
        // Extract SPDX ID from output
        const match = stdout.match(/([A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*)(?=\s*\(confidence)/);
        if (match) {
            return match[1]; // Returns the SPDX ID
        }
        return "Unknown License";
    }
    catch (error) {
        console.error("Error while classifying license: ", error);
        return "Error during classification";
    }
}
/**
 * Download the contents of a web page and search for keywords related to the license
 */
async function searchLicenseInPage(url) {
    try {
        const response = await axios_1.default.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(response.data);
        const text = $('body').text(); // Let's take all the text from the page
        // Search for the first keyword in the text of the page
        for (const keyword of LICENSE_KEYWORDS) {
            if (text.includes(keyword)) {
                return `Possible license found: "${keyword}" in ${url}`;
            }
        }
        // If no license is found, return the link as a reference
        console.log(`No explicit license found. Cite the source: ${url}`);
        return url;
    }
    catch (error) {
        console.error(`Error accessing page: ${url}`);
        return "Error accessing the page";
    }
}
// Function to save URL and license to a JSON file
function saveLicenseData(urls, licenses, outputDir) {
    const filePath = path.join(outputDir, 'licenses.json');
    let newLicenseData = {};
    let index = 0; // To keep track of the index of the licenses array
    urls.forEach((url) => {
        newLicenseData[url] = licenses[index];
        index++;
    });
    fs.writeFileSync(filePath, JSON.stringify(newLicenseData, null, 2), 'utf-8');
    return newLicenseData;
}
//# sourceMappingURL=extractLicense.js.map