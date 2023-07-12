// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const homePage = 'http://codefinder.xyz';

function getDefaultTheme() {
  const themeName = vscode.workspace.getConfiguration().get('workbench.colorTheme');
	if (typeof themeName !== 'string') {
		return 'dark';
	}
  if (themeName.endsWith('Dark') || themeName.endsWith('Black')) {
		return 'dark';
	}
	return 'light';
}

function getSelectedText() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return ''; // No open text editor
	}

	const selections = editor.selections;
	if (selections.length === 0) {
		return ''; // No selection
	}

	const selectedText = editor.document.getText(selections[0]);
	return selectedText;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('cf-vscode.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// TODO 单例
		const panel = vscode.window.createWebviewPanel(
			'codeFinder',
			'Code Finder',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				// open in second column

				// enableCommandUris: true,
			}
		);

		// And set its HTML content
		const state: any = context.globalState.get('state');
		const token = state?.token || '';
		const theme = state?.theme || getDefaultTheme();
		const url = `${homePage}?q=${getSelectedText()}&token=${encodeURIComponent(token)}&theme=${theme}`;
		panel.webview.html = getWebviewContent(url);

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(
			message => {
				// set state
				if (message.type === 'setState') {
					const state: any = context.globalState.get('state') || {};
					for (const key of Object.keys(message.state)) {
						state[key] = message.state[key];
					}
					context.globalState.update('state', state);
				}
				// get state
				if (message.type === 'getState') {
					const state = context.globalState.get('state');
					panel.webview.postMessage({
						type: 'loadState',
						state,
					});
				}
				// copy
				if (message.type === 'copy') {
					vscode.env.clipboard.writeText(message.text);
				}
				// open browser
				if (message.type === 'openBrowser') {
					vscode.env.openExternal(vscode.Uri.parse(message.url));
				}
			},
			undefined,
			context.subscriptions
		);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getWebviewContent(url: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cat Coding</title>
		<style type="text/css">
			iframe {
				position: absolute;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				border: none;
			}
		</style>
</head>
<body>
		<iframe id="cf" src="${url}"></iframe>
		<script>
const vscode = acquireVsCodeApi();
const iframe = document.getElementById('cf');

window.addEventListener('message', function(event) {
	// just relay message
	const message = event.data;
	if (message.type === 'setState' || message.type === 'getState' || message.type === 'copy' || message.type === 'openBrowser') {
		vscode.postMessage(message)
	}
	if (message.type === 'loadState') {
		iframe.contentWindow.postMessage(message, '*')
	}
});
		</script>
</body>
</html>`;
}