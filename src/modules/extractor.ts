import{GeneratedCode} from './interface'
import { getMinLinesConfig } from './extensionConfig';

//Function that creates an array composed of objects with the language and code
export function extractCodeBlocks(text: string): GeneratedCode[] {
    const codeRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g; // to capture language and code
    const codes : GeneratedCode[] = [];
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
        const lines =  match[2].split('\n').filter(line => line.trim().length > 0);

        if(lines.length > getMinLinesConfig()) {
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
export function extractLinks(text: string): Set<string> {
    const urlRegex = /https?:\/\/(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?(?:\/[^\s\)\],]*)?(?=\s|$|[)\],])/g;
    const urls = new Set<string>();
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
        urls.add(match[0]);
    }

    return urls;
}