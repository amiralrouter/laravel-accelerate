import * as vscode from 'vscode'; 
// import ModelAttributes from './model_attributes'; 
import Model from './model';
import Table from './table';
 


const editor = vscode.window.activeTextEditor; 
if(editor) { 
	const model = new Model(); 
	model.build();

	const table = new Table(model); 
	table.build();
} 


// const table = new LaravelTable(model);
// table.repair();

 
export function activate(context: vscode.ExtensionContext) { 
 
	let disposable = vscode.commands.registerCommand('laravel-accelerate.repairModelAttributes', () => {
		const editor = vscode.window.activeTextEditor; 
		if(editor) { 
			const model = new Model(); 
			model.build();
		
			const table = new Table(model); 
			table.build();

			vscode.window.showInformationMessage('Model attributes repaired!');
		} 
		
	}); 
	context.subscriptions.push(disposable);

	let button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	button.text = '$(bracket-dot) Repair Model Attributes';
	button.command = 'laravel-accelerate.repairModelAttributes';
	button.show();
}



export function deactivate() {}
