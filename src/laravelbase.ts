

import * as vscode from 'vscode';  

export default class Laravelbase{

    baseParts : string[] = [];
    seperator : string = '/';

    constructor(){
        if(!vscode.window.activeTextEditor) return;

        const fileName = vscode.window.activeTextEditor.document.fileName;
        this.seperator = fileName.includes('/') ? '/' : '\\';
        const parts = fileName.split(this.seperator); 
 
        const appIndex = parts.findIndex((part : string) => part === 'app');
        if(appIndex === -1) return;
        this.baseParts = parts.slice(0,appIndex) ;
    }

    add( path : string | string[]) : Laravelbase{
        if(typeof path === 'string'){
            this.baseParts.push(path);
        }else{
            this.baseParts.push(...path);
        }
        return this;
    } 

    getPath(){ 
        return this.baseParts.join(this.seperator);
    }

}