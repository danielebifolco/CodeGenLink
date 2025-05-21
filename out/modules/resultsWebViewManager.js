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
exports.createResultsWebView = createResultsWebView;
exports.getWebviewContent = getWebviewContent;
const vscode = __importStar(require("vscode"));
function createResultsWebView(context, finalResults) {
    const panel = vscode.window.createWebviewPanel('finalResultsView', 'Final Results', vscode.ViewColumn.One, {
        enableScripts: true,
    });
    panel.webview.html = getWebviewContent(finalResults);
    return panel;
}
function getWebviewContent(finalResults) {
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
//# sourceMappingURL=resultsWebViewManager.js.map