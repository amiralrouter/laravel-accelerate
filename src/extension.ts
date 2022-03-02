import * as vscode from 'vscode'; 
// import ModelAttributes from './model_attributes';
import LaravelModel from './laravel_model';
import LaravelTable from './laravel_table';
 


// const modelAttributes = new ModelAttributes();



 
export function activate(context: vscode.ExtensionContext) { 
 
	let disposable = vscode.commands.registerCommand('laravel-accelerate.repairModelAttributes', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const document = editor.document;
        if (!document) return;  

		const model = new LaravelModel(editor);
		model.writeCasts();
		const table = new LaravelTable(model);
		table.repair();
 

		vscode.window.showInformationMessage('Model attributes repaired!');
	}); 
	context.subscriptions.push(disposable);

	let button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
	button.text = '$(bracket-dot) Repair Model Attributes';
	button.command = 'laravel-accelerate.repairModelAttributes';
	button.show();
}



export function deactivate() {}
