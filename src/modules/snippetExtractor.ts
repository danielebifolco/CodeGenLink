import * as cheerio from 'cheerio';
import axios from 'axios';
import * as path from 'path';
import * as fs from 'fs';
import { ExtractedCode } from './interface';

async function analyzeStackoverflow(url: string, results: ExtractedCode[], minLines: number): Promise<boolean> {
    if (!url.includes("stackoverflow.com")) {
        return false;
    }
    console.log("minLines: "+minLines);
    try {
        const response = await axios.get(url);
        console.log("stackoverflow");
        const $ = cheerio.load(response.data);
        $('pre code').each((i, element) => {
            const code = $(element).text();
            const lines = code.split('\n').filter(line => line.trim().length > 0);
            console.log('Code:', lines.join('\n'));
            console.log('Lunghezza snippet estratto '+lines.length);
            if (lines.length > minLines) {
                results.push({ url, snippet:lines.join('\n') });
            }
        });
        return true;
    } catch (error) {
        console.error(`Error analyzing Stack Overflow URL ${url}:`, error);
        return false;
    }
}

async function analyzeGithub(url: string, results: ExtractedCode[], minLines: number): Promise<boolean> {
    if (!url.includes("github.com")) {
        return false;
    }
    console.log("minLines: "+minLines);

    try {
        // Convert GitHub URLs to RAW format
        const rawUrl = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");

        // Make the HTTP request to obtain the source code
        const response = await axios.get(rawUrl);
        
        if (response.status === 404) {
            console.error("GitHub file unreachable:", url);
            return false;
        }

        const codeSnippet = response.data;
        const lines = codeSnippet.split("\n").filter((line: string) => line.trim().length > 0);

        console.log("analyzeGithub:", url);
        console.log("Total lines:", lines.length);
        console.log("Code snippet:", lines.join("\n"));

        if (lines.length > minLines) {
            results.push({ url, snippet: lines.join("\n") });
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Error analyzing GitHub URL ${url}:`, error);
        return false;
    }
}

async function analyzeGeeksforgeek(url: string, results: ExtractedCode[], minLines: number): Promise<boolean> {
    if ( !url.includes("geeksforgeeks.org")) {
        return false;
    }
    try {
        const response = await axios.get(url);
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
                console.log('Lunghezza '+lines.length);
                
                if (lines.length > minLines) {
                    results.push({ url, snippet:lines.join('\n') });
                }
            });
        } else {
            console.log('No code-container found');
            $('code').each((i, element) => {
                const code = $(element).text();
                const lines = code.split('\n').filter(line => line.trim().length > 0);
                console.log('Code:', lines.join('\n'));
                console.log('Lunghezza '+lines.length);
                if (lines.length > minLines) {
                    results.push({ url, snippet:lines.join('\n') });
                }
            });
        }
        return true;
    } catch (error) {
        console.error(`Error analyzing GeeksforGeeks URL ${url}:`, error);
        return false;
    }
}

async function analyzeOtherSource(url: string, results: ExtractedCode[], minLines: number): Promise<boolean> {
    try {
        console.log("minLines: "+minLines);
        const response = await axios.get(url, {
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
            const text = cheerio.load(code?? '').text();

            const lines = text.split('\n').filter(line => line.trim().length > 0);
            console.log('Code:', lines.join('\n'));
            console.log('Lunghezza '+lines.length);
            if (lines.length > minLines) {
                results.push({ url, snippet: lines.join('\n') });
            }
        });
        return true;
    } catch (error) {
        console.error(`Error analyzing other source URL ${url}:`, error);
        return false;
    }
}

async function analyzeW3schoolSource(url: string, results: ExtractedCode[], minLines: number): Promise<boolean> {
    if ( !url.includes("w3schools.com")) {
        return false;
    }
    console.log("minLines: "+minLines);
    try {
        const response = await axios.get(url);
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
            console.log('Lunghezza  '+lines.length+'\n');
            if (lines.length > minLines) {
                results.push({ url, snippet: lines.join('\n') });
            }
        });
        return true;
    } catch (error) {
        console.error(`Error analyzing W3Schools URL ${url}:`, error);
        return false;
    }
}

async function analyzePhpSource(url: string, results: ExtractedCode[], minLines: number): Promise<boolean> {
    if (!url.includes("php.net")) {
        return false;
    }
    console.log("minLines: "+minLines);
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        console.log(' PHP');

        $('div.phpcode code').each((i, element) => {
            const outerSpan = $(element).find('span').first();
            if (outerSpan.length) {
                const innerSpans = outerSpan.children('span');
                let code = innerSpans.map((_, span) => $(span).html()).get().join(' ');
                code = code.replace(/<br\s*\/?>/g, '\n');
                const text= cheerio.load(code).text();  // Carica la stringa HTML con Cheerio
                const lines = text.split('\n').filter(line => line.trim().length > 0);
                console.log('Code:', lines.join('\n'));
                console.log('Lunghezza  ' + lines.length + '\n\n\n\n\n');
                if (lines.length > minLines) {
                    results.push({ url, snippet: lines.join('\n') });
                }
            }
        });
        return true;
    } catch (error) {
        console.error(`Error analyzing PHP URL ${url}:`, error);
        return false;
    }
}

export async function extractCodeFromUrls(urls: Set<string>, pathToExtraction: string, minLines:number): Promise<ExtractedCode[]> {
    const savePath = path.join(pathToExtraction, 'snippetExtractor');
    const results: ExtractedCode[] = [];
    
    for (const url of urls) {
        console.log(`Processing URL: ${url}`);
        //move to the next iteration of the for loop when one of the analyze... functions returns true
        if (await analyzeStackoverflow(url, results, minLines)) continue;
        if (await analyzeGithub(url, results, minLines)) continue;
        if (await analyzeGeeksforgeek(url, results, minLines)) continue;
        if (await analyzeW3schoolSource(url, results, minLines)) continue;
        if (await analyzePhpSource(url, results, minLines)) continue;
        if (await analyzeOtherSource(url, results, minLines)) continue;
    }
    // *** SAVING RESULTS ***
    if (savePath) { // Save only if savePath is provided
        // Create the folder if it doesn't exist
        if (!fs.existsSync(savePath)) {
            fs.mkdirSync(savePath, { recursive: true }); // `{ recursive: true }` create nested folders if necessary
        }
        const jsonFilePath = path.join(savePath, 'extracted_code.json');
        fs.writeFileSync(jsonFilePath, JSON.stringify(results, null, 2));
        console.log('Extracted code saved to: '+JSON.stringify(results, null, 2));
    }
    return results;
}