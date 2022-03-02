import * as vscode from 'vscode'; 
import * as pluralize from 'pluralize'
import * as fs from 'fs';
import LaravelModel from "./laravel_model";

const engine = require('php-parser'); 
const parser = new engine({ 
    parser: {
        extractDoc: true,
        php7: true
    },
    ast: {
        withPositions: true
    }
});

export default class LaravelTable {

    model !: LaravelModel;
    document !: vscode.TextDocument;

    constructor(model : LaravelModel) {
        this.model = model;
        this.document = model.editor.document;   
    }
 
    getTableName() : string {
        let name = pluralize(this.model.name);
        name = name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        if(name.substring(0,1) === '_') {
            name = name.substring(1);
        }
        return name; 
    }


    getTableFilePath(){
        if(this.document === undefined) return;

        let fileName = this.document.fileName;
        let seperator = fileName.includes('/') ? '/' : '\\';
        let parts = fileName.split(seperator); 

        let migrationsPath = [...parts.slice(0,parts.length - 3), 'database', 'migrations'].join(seperator);

        

        // list files in migrations folder
        let files = fs.readdirSync(migrationsPath);
    
        let tableName = this.getTableName() 
  

        const file = files.find(file => file.includes('create_'+tableName+'_table'))
        if(file === undefined) return  
        return migrationsPath + seperator + file;
    }

    repair(){
        const tableFilePath = this.getTableFilePath();  
 
        if(tableFilePath === undefined) return;
 
        let pageContent = fs.readFileSync(tableFilePath, 'utf8');
         
        const programNode = parser.parseCode( pageContent )   


        const returnNode = programNode.children.find((node : INode) => node.kind === 'return')
        if(returnNode === undefined) return;
 
        const upNode = returnNode.expr.what.body.find((node : INode) => node.name.name === 'up')
        if(upNode === undefined) return;
 
        
        const closureNode = upNode.body.children[0].expression.arguments.find((node : INode) => node.kind === 'closure')
        if(closureNode === undefined) return;

        const itemNodes = closureNode.body.children;



        const items = [];
        items.push(`$table->id();`)
        this.model.attributes.forEach(attribute => {
            let item = `$table`;
            let dbType = attribute.properties.dbType || attribute.type;

            if(attribute.properties.model != undefined){
                item += `->foreignId('${attribute.name}')`; 
                if(attribute.properties.foreignId != undefined && attribute.properties.foreignTable != undefined){ 
                    item += `->references('${attribute.properties.foreignId}')`; 
                    item += `->on('${attribute.properties.foreignTable}')`;
                }else{
                    item += `->constrained()`; 
                } 
                item += `->onUpdate('cascade')`; 
                item += `->onDelete('cascade')`;
                if(attribute.description){
                    item += `->comment('${attribute.description}')`;
                }
                item += `;`;  
                items.push(item);
                return;
            }
            
            let nameParams = [attribute.name]
            if(attribute.properties.size != undefined){
                nameParams.push(attribute.properties.size)
            }
            let nameText = nameParams.join(', ')
            item += `->${dbType}('${nameText}')`;

            if(attribute.properties.nullable != undefined){
                item += '->nullable()';
            }

            if(attribute.properties.default != undefined){
                item += `->default(${attribute.properties.default})`;
            }

            if(attribute.properties.unsigned != undefined){
                item += '->unsigned()';
            }

            if(attribute.properties.unique != undefined){
                item += '->unique()';
            }

            if(attribute.properties.index != undefined){
                item += '->index()';
            }

            if(attribute.description){
                item += `->comment('${attribute.description}')`;
            }

            item += ';';
            items.push(item);
        })

        if(this.model.has_times_stamp){ 
            items.push(`$table->timestamps();`)
        } 

        let colsText = '\n\t\t\t' + items.join('\n\t\t\t') + '\n\t\t';

        

        let closureLength = closureNode.loc.end.offset - closureNode.loc.start.offset;
        let closureText = pageContent.substring(closureNode.loc.start.offset, closureNode.loc.end.offset);
        let braceStart = closureText.indexOf('{') + closureNode.loc.start.offset + 1;
        let braceEnd = closureNode.loc.end.offset - 1;
        itemNodes.forEach((entry : IEntry) => {
            if(entry.leadingComments){ 
                let commentText = entry.leadingComments.map(comment => comment.value).join('\n'); 
                if(commentText.includes('custom')){
                    braceEnd = entry.leadingComments[0].loc.start.offset - 1;
                }
            }
        })

        
        let newPageContent = pageContent.substring(0, braceStart) + colsText + pageContent.substring(braceEnd);
 
        fs.writeFileSync(tableFilePath, newPageContent);
    } 


}