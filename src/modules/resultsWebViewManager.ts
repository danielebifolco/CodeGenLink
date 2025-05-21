import * as vscode from 'vscode';
import { FinalResults } from './interface';

export function createResultsWebView(context: vscode.ExtensionContext, finalResults: FinalResults[]): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
        'finalResultsView',
        'Final Results',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
        }
    );

    panel.webview.html = getWebviewContent(finalResults);

    return panel;
}

export function getWebviewContent(finalResults: FinalResults[]): string {
    let resultsHtml = finalResults.map(result => {
        return `
        <div class="result">
            <div class="label">URL:</div>
            <div class="url"><a href="${result.url}" target="_blank">${result.url}</a></div>
            <div class="label">License:</div>
            <div class="license">${result.license}</div>
        </div>
        `;
    }).join('');

    return `
    <html>
        <head>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    background-color: #1e1e1e;
                    color: #d4d4d4;
                }
                .result {
                    margin-bottom: 15px;
                    padding: 10px;
                    border: 1px solid #3a3a3a;
                    border-radius: 5px;
                    background-color: #2d2d2d;
                }
                .label {
                    font-weight: bold;
                    color: #ffffff;
                    margin-top: 5px;
                }
                .url a {
                    color: #1E90FF;
                    text-decoration: none;
                    display: block;
                    margin-bottom: 5px;
                }
                .url a:hover {
                    text-decoration: underline;
                }
                .license {
                    font-style: italic;
                    color: #66FF66;
                }
            </style>
        </head>
        <body>
            <h1>Code Similarity Results</h1>
            ${resultsHtml}
        </body>
    </html>
    `;
}