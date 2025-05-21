import { GeneratedCode, ExtractedCode, CombinedData } from './interface';

export function combineCodeWithResults(generatedCode: GeneratedCode[], extractionResults: ExtractedCode[]): CombinedData[] {
    return generatedCode.flatMap(genCode => 
        extractionResults.map(extrResults => ({
            generatedSnippet: genCode.code,
            language: genCode.language,
            url: extrResults.url,
            extractedSnippet: extrResults.snippet
        }))
    );
}