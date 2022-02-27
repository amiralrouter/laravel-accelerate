import * as vscode from 'vscode';
console.log(3333);
import ModelAttributes from './model_attributes';
 

const modelAttributes = new ModelAttributes();

 
export function activate(context: vscode.ExtensionContext) { 
 
	let disposable = vscode.commands.registerCommand('laravel-accelerate.repairModelAttributes', () => {

		modelAttributes.repair();

		vscode.window.showInformationMessage('Model attributes repaired!');
	}); 
	context.subscriptions.push(disposable);


	let button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	button.text = '$(bracket-dot) Repair Model Attributes';
	button.command = 'laravel-accelerate.repairModelAttributes';
	button.show();
}



export function deactivate() {}
