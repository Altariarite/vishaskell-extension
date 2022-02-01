import { posix } from 'path';
import * as vscode from 'vscode';
import { showInputBox } from './basicInputs';
import { getNonce } from './getNonce';


export function activate(context: vscode.ExtensionContext) {
	// from simple ghc

	context.subscriptions.push(
		vscode.commands.registerCommand('catCoding.start', () => {
			CodingPanel.createOrShow(context.extensionUri);
		})
	);

	context.subscriptions.push(
		// Command #3 - Write and read a file
		// * shows how to derive a new file-uri from a folder-uri
		// * shows how to convert a string into a typed array and back
		vscode.commands.registerCommand('catCoding.writeFile', async function () {

			if (!vscode.workspace.workspaceFolders) {
				return vscode.window.showInformationMessage('No folder or workspace opened');
			}

			const writeStr = '1€ is 1.12$ is 0.9£';
			const writeData = Buffer.from(writeStr, 'utf8');

			const folderUri = vscode.workspace.workspaceFolders[0].uri;
			const fileUri = folderUri.with({ path: posix.join(folderUri.path, 'out.json') });

			// await vscode.workspace.fs.writeFile(fileUri, writeData);

			const readData = await vscode.workspace.fs.readFile(fileUri);
			const readStr = Buffer.from(readData).toString('utf8');

			vscode.window.showInformationMessage(readStr);
			vscode.window.showTextDocument(fileUri);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('catCoding.refresh', () => {
			if (CodingPanel.currentPanel) {
				CodingPanel.currentPanel.dispose();
			}

			CodingPanel.createOrShow(context.extensionUri);
			setTimeout(() => vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools"), 500);
		})
	);



}

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [
			vscode.Uri.joinPath(extensionUri, 'media'),
			vscode.Uri.joinPath(extensionUri, 'out/compiled'),
			// vscode.workspace.workspaceFolders[0].uri
		]
	};
}

async function writeFile(json: JSON) {
	if (!vscode.workspace.workspaceFolders) {
		return vscode.window.showInformationMessage('No folder or workspace opened');
	}

	const writeStr = JSON.stringify(json);
	const writeData = Buffer.from(writeStr, 'utf8');

	const folderUri = vscode.workspace.workspaceFolders[0].uri;
	const fileUri = folderUri.with({ path: posix.join(folderUri.path, 'out.json') });

	await vscode.workspace.fs.writeFile(fileUri, writeData);
}

async function readFile(json: JSON) {
	if (!vscode.workspace.workspaceFolders) {
		return vscode.window.showInformationMessage('No folder or workspace opened');
	}
	const folderUri = vscode.workspace.workspaceFolders[0].uri;
	const fileUri = folderUri.with({ path: posix.join(folderUri.path, 'out.json') });

	// await vscode.workspace.fs.writeFile(fileUri, writeData);

	const readData = await vscode.workspace.fs.readFile(fileUri);
	const readStr = Buffer.from(readData).toString('utf8');

	vscode.window.showInformationMessage(readStr);
	// vscode.window.showTextDocument(fileUri);
	return readStr;
}

/**
 * Manages coding webview panels
 */
class CodingPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: CodingPanel | undefined;

	public static readonly viewType = 'catCoding';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (CodingPanel.currentPanel) {
			CodingPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			CodingPanel.viewType,
			'Coding',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		CodingPanel.currentPanel = new CodingPanel(panel, extensionUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		CodingPanel.currentPanel = new CodingPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
					case 'save': {
						vscode.window.showInformationMessage("Pressed save:" + message.d);
						writeFile(message.d);
						return;
					}
					case 'load': {
						vscode.window.showInformationMessage("Pressed Load");
						readFile(message.d).then(jsonString => {
							if (jsonString)
								this._panel.webview.postMessage({ command: 'load', data: JSON.parse(jsonString) })
						}
						);
					}




				}

			});

	}



	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		CodingPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private async _update() {
		const webview = this._panel.webview;

		this._panel.webview.html = this._getHtmlForWebview(webview);
		webview.onDidReceiveMessage(async (data) => {
			switch (data.type) {
				case "onError": {
					if (!data.value) {
						return;
					}
					vscode.window.showErrorMessage(data.value);
					break;
				}
			}
		})

	}


	private _getHtmlForWebview(webview: vscode.Webview) {
		// // Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'out/compiled', 'HelloWorld.js');

		// // And the uri we use to load this script in the webview
		const scriptUri = (scriptPathOnDisk).with({ 'scheme': 'vscode-resource' });


		// Local path to css styles
		const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
		const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');



		// Uri to load styles into webview
		const stylesResetUri = webview.asWebviewUri(styleResetPath);
		const stylesVSCodeUri = webview.asWebviewUri(stylesPathMainPath);


		const stylesMainUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "out/compiled", "HelloWorld.css")
		);

		// Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();
		
		
		
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesResetUri}" rel="stylesheet">
				<link href="${stylesVSCodeUri}" rel="stylesheet">
				<link href="${stylesMainUri}" rel="stylesheet">
				

				<title>Visual Coding</title>
			</head>
			<body>
					
			</body>
			
			<script src="${scriptUri}" nonce="${nonce}">
			</html>`;
	}
}

