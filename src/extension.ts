import { posix } from 'path';
import * as vscode from 'vscode';
import { showInputBox } from './basicInputs';
import { getNonce } from './getNonce';
import { spawn } from 'child_process';
import * as path from 'path';
import { quickOpen } from './quickPick';
import { resolve } from 'dns';

export function activate(context: vscode.ExtensionContext) {
	// from simple ghc

	context.subscriptions.push(
		vscode.commands.registerCommand('catCoding.start', async () => {
			// send to Webviewew
			const workspaceUri = await quickOpen();
			CodingPanel.createOrShow(context.extensionUri, workspaceUri);
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
		vscode.commands.registerCommand('catCoding.refresh', async () => {
			if (CodingPanel.currentPanel) {
				CodingPanel.currentPanel.dispose();
			}
			const workspaceceUri = await quickOpen();
			CodingPanel.createOrShow(context.extensionUri, workspaceceUri);
			setTimeout(() => vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools"), 500);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('catCoding.sendToWebview', async function () {
			// code to send selected word to webview
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				const range = editor.document.getWordRangeAtPosition(
					editor.selection.active,
					/\S+/
				);
				const wholeDef = editor.selection.active.line;
				// get the range of the current line, I don't think there is an easier way in the api
				const currentLineRange = editor.document.lineAt(editor.selection.active.line).range;
				// editor.edit(edit => edit.replace(currentLineRange, "my new text"));
				//test
				if (range && currentLineRange) {
					// then you can get the word that's there:
					const word = editor.document.getText(range); // get the word at the range
					vscode.window.showInformationMessage("The selected word is " + word);
					const paren = editor.document.getText(currentLineRange); // get the word at the range
					vscode.window.showInformationMessage("The definition is " + paren);
					const jsonString = await getEncoding(word);
					vscode.window.showInformationMessage("The object is " + JSON.parse(jsonString));
					// send to Webviewew
					const workspaceUri = await quickOpen();
					CodingPanel.createOrShow(context.extensionUri, workspaceUri);
					CodingPanel.currentPanel?.selectedWordtoPanel(JSON.parse(jsonString));
					// or modify the selection if that's really your goal:
					editor.selection = new vscode.Selection(range.start, range.end);
				}
			}

		}
		));
}

function getWebviewOptions(extensionUri: vscode.Uri, workspaceceUri: vscode.Uri | undefined): vscode.WebviewOptions {
	if (workspaceceUri) {
		return {
			// Enable javascript in the webview
			enableScripts: true,

			// And restrict the webview to only loading content from our extension's `media` directory.
			localResourceRoots: [
				vscode.Uri.joinPath(extensionUri, 'media'),
				vscode.Uri.joinPath(extensionUri, 'out/compiled'),
				// vscode.workspace.workspaceFolders[0].uri
				vscode.Uri.joinPath(workspaceceUri, 'interface')
			]
		};
	}
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

async function getEncoding(variableName: string): Promise<string> {
	//  call the encode function from the haskell script
	return new Promise(function (resolve, reject) {
		let outputBuffer = "";
		if (vscode.workspace.workspaceFolders !== undefined && vscode.window.activeTextEditor) {
			const filename = doFilename(getActiveUri(), true);
			const fullPath = vscode.window.activeTextEditor.document.uri.fsPath;
			const message = `visHaskell: file: ${filename}, path: ${fullPath}`;

			vscode.window.showInformationMessage(message);

			const ls = spawn("ghc", [fullPath, "-e", `encode ${variableName}`]);

			ls.stdout.on('data', (data: any) => {
				console.log(`stdout: ${data}`);
				outputBuffer += data;
			});

			ls.stderr.on('data', (data: any) => {
				console.error(`stderr: ${data}`);
				reject(`erroneous data ${data}`);
			});

			ls.on('close', (code: any) => {
				const result = JSON.parse(outputBuffer);
				console.log(`child process exited with code ${code}`);
				console.log(`outputBuffer is ${outputBuffer}, to json: ${result}`);
				vscode.window.showInformationMessage(outputBuffer);
				resolve(outputBuffer);
			});
		}
		else {
			const message = "visHaskell: Working folder not found, open a folder an try again";
			vscode.window.showErrorMessage(message);
			reject();
		}
	});
}

async function toHaskellCode(data: JSON) {
	return new Promise(function (resolve, reject) {
		let outputBuffer = "";
		if (vscode.workspace.workspaceFolders !== undefined && vscode.window.activeTextEditor) {
			const filename = doFilename(getActiveUri(), true);
			const fullPath = vscode.window.activeTextEditor.document.uri.fsPath;
			const message = `visHaskell: file: ${filename}, path: ${fullPath}`;

			vscode.window.showInformationMessage(message);

			const ls = spawn("ghc", [fullPath, "-e", `decode ${data}`]);

			ls.stdout.on('data', (data: any) => {
				console.log(`stdout: ${data}`);
				outputBuffer += data;
			});

			ls.stderr.on('data', (data: any) => {
				console.error(`stderr: ${data}`);
				reject(`erroneous data ${data}`);
			});

			ls.on('close', (code: any) => {
				const result = JSON.parse(outputBuffer);
				console.log(`child process exited with code ${code}`);
				console.log(`outputBuffer is ${outputBuffer}, to json: ${result}`);
				vscode.window.showInformationMessage(outputBuffer);
				resolve(outputBuffer);
			});
		}
		else {
			const message = "visHaskell: Working folder not found, open a folder an try again";
			vscode.window.showErrorMessage(message);
			reject();
		}
	});
}

// https://github.com/bradzacher/vscode-copy-filename/blob/0d238db7445c8f7da5e4dea9db05fb7096f5a501/src/extension.ts#L52
async function showError(message: string): Promise<void> {
	await vscode.window.showErrorMessage(`Copy filename: ${message}`);
}
function showWarning(message: string): void {
	vscode.window.setStatusBarMessage(`${message}`, 3000);
}
function getActiveUri(): Array<vscode.Uri> | null {
	const activeTextEditor = vscode.window.activeTextEditor;
	if (typeof activeTextEditor === 'undefined') {
		return null;
	}
	return [activeTextEditor.document.uri];
}

function doFilename(
	uris: Array<vscode.Uri> | null,
	includeExtension: boolean,
): string {
	if (uris == null) {
		return "";
	}

	const accumulator = uris
		.map(uri => getFilename(uri, includeExtension))
		.join('\n');
	return accumulator;
}

function getFilename(uri: vscode.Uri, includeExtension: boolean): string {
	const relative = vscode.workspace.asRelativePath(uri);
	const parsed = path.parse(relative);

	if (includeExtension) {
		return parsed.base;
	}
	return parsed.name;
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
	private readonly _workspaceUri: vscode.Uri | undefined;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri, workspaceceUri: vscode.Uri | undefined) {
		// const column = vscode.window.activeTextEditor
		// 	? vscode.window.activeTextEditor.viewColumn
		// 	: undefined;

		// If we already have a panel, show it.
		if (CodingPanel.currentPanel) {
			CodingPanel.currentPanel._panel.reveal(vscode.ViewColumn.Two);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			CodingPanel.viewType,
			'Coding',
			vscode.ViewColumn.Two,
			getWebviewOptions(extensionUri, workspaceceUri),
		);

		CodingPanel.currentPanel = new CodingPanel(panel, extensionUri, workspaceceUri);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, workspaceceUri: vscode.Uri) {
		CodingPanel.currentPanel = new CodingPanel(panel, extensionUri, workspaceceUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, workspaceUri: vscode.Uri | undefined) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._workspaceUri = workspaceUri;
		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		// this._panel.onDidChangeViewState(
		// 	e => {
		// 		if (this._panel.visible) {
		// 			this._update();
		// 		}
		// 	},
		// 	null,
		// 	this._disposables
		// );

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
					// deprecated load from file
					// case 'load': {
					// 	vscode.window.showInformationMessage("Pressed Load");
					// 	readFile(message.d).then(jsonString => {
					// 		if (jsonString)
					// 			this._panel.webview.postMessage({ command: 'load', data: JSON.parse(jsonString) })
					// 	}
					// 	);
					// }




				}

			});

	}



	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public selectedWordtoPanel(jsonString: string) {
		this._panel.webview.postMessage({ command: 'load', data: jsonString });
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

