import axios, { get } from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getLicenseClassifierPath } from './extensionConfig';

const LICENSE_KEYWORDS = [
    "Apache License", "Apache 2.0", "MIT", "GPL", "BSD","General Purpose License", "Creative Commons", "CC BY-SA"
];
/**
 * Identify the license of a source based on the URL
 */
export async function getLicense(url: string, outputDir: string): Promise<string> {
    if (url.includes("github.com")) {
        return await getGitHubLicense(url, outputDir);
    }
    if (url.includes("stackoverflow.com")) {
        return await getLicenseFromText((await axios.get("https://creativecommons.org/licenses/by-sa/4.0/legalcode.txt")).data, outputDir);
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
        return await getLicenseFromText((await axios.get("https://www.php.net/license/3_01.txt")).data, outputDir);
    }
    // Generic case: analyze the content of the page
    return await searchLicenseInPage(url);
}
/**
 * Extracts the license of a GitHub repository by reading the LICENSE file
 */
async function getGitHubLicense(url: string, outputDir: string): Promise<string> {
    try {
        // Estrarre il nome del repository
        const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) return "GitHub repository not recognized";

        const owner = match[1];
        const repo = match[2];
        
        const repoMetadataUrl = `https://api.github.com/repos/${owner}/${repo}`;
        const repoResponse = await axios.get(repoMetadataUrl, {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });

        const licenseInfo = repoResponse.data.license;
        if (licenseInfo && licenseInfo.spdx_id) {
            console.log("License found in repository metadata:", licenseInfo.spdx_id);
            return licenseInfo.spdx_id;
        }

        return await getGitHubLicenseFromFile(owner, repo, url, outputDir);

    } catch (error) {
        return "Error accessing GitHub repository or its content";
    }
}

async function getGitHubLicenseFromFile(owner: string, repo: string, url: string, outputDir: string): Promise<string> {
        // API URL to get repository content
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
        const response = await axios.get(apiUrl, {
            headers: { "Accept": "application/vnd.github.v3+json" }
        });

        // Find the file that contains the word 'LICENSE' in the name
        const licenseFile = response.data.find((file: any) =>
            file.name.toLowerCase().includes("license")
        );

        if (!licenseFile) {
            console.log("License file not found");
            return url;
        }

        // If found, try reading the file contents
        const fileResponse = await axios.get(licenseFile.download_url);
        const fileContent = fileResponse.data;

        return await getLicenseFromText(fileContent, outputDir);
}

async function getLicenseFromText(text: string, outputDir: string): Promise<string>{
    const licenseClassifierPath = getLicenseClassifierPath();
    console.log("License classifier path:", licenseClassifierPath);
    try{
        // Create a temporary file
        const tempFilePath = path.join(outputDir, `license_${Math.random()}.txt`);
        console.log("Temp file path:", tempFilePath);
        await fs.promises.writeFile(tempFilePath, text, 'utf-8');

        const current_dir = process.cwd();

        // Change working directory
        process.chdir(licenseClassifierPath);

        // Run the licenseclassifier command
        const command = `go run identify_license.go ${tempFilePath}`;
        const stdout = execSync(command, { encoding: 'utf-8' });

        // Delete temporary file
        await fs.promises.unlink(tempFilePath);

        process.chdir(current_dir);

        // Extract SPDX ID from output
        const match = stdout.match(/([A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*)(?=\s*\(confidence)/);
        if (match) {
            return match[1]; // Returns the SPDX ID
        }

        return "Unknown License";
    } catch (error) {
        console.error("Error while classifying license: ", error);
        return "Error during classification";
    }
}
/**
 * Download the contents of a web page and search for keywords related to the license
 */
async function searchLicenseInPage(url: string): Promise<string> {
    try {
        const response = await axios.get(url, {
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
    } catch (error) {
        console.error( `Error accessing page: ${url}`);
        return "Error accessing the page";
    }
}

// Function to save URL and license to a JSON file
export function saveLicenseData(urls: Set<string>, licenses: string[], outputDir: string): { [url: string]: string }{
    const filePath = path.join(outputDir, 'licenses.json');
    let newLicenseData: { [url: string]: string } = {};
    let index = 0; // To keep track of the index of the licenses array

    urls.forEach((url) => {
        newLicenseData[url] = licenses[index];
        index++;
    });

    fs.writeFileSync(filePath, JSON.stringify(newLicenseData, null, 2), 'utf-8');

    return newLicenseData;
}