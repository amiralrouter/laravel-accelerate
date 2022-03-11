import * as vscode from 'vscode';  
import * as fs from 'fs';

import Model from "./model";
import Enumeration from "./enumeration";
import Laravelbase from "./laravelbase";

export default class Table {  
    model ?: Model; 
    editor ?: vscode.TextEditor;
    document ?: vscode.TextDocument;

    file_path : string = '';
    source_code : string[] = [];

    constructor(model : Model) {
        this.editor = vscode.window.activeTextEditor;
        if (!this.editor) return;

        this.document = this.editor.document;
        if (!this.document) return;  

        this.setModel(model);


    }

    setModel(model : Model) {
        this.model = model; 
        this.readTableFile()
    }

    findTableFile() : string {
        if(!this.model) return '';
        if(!this.editor) return '';

        const laravelbase : Laravelbase = new Laravelbase();

        laravelbase.add([ 'database', 'migrations'])
 

        const migrationsPath = laravelbase.getPath();

        // list files in migrations folder
        const files = fs.readdirSync(migrationsPath);

        const tableName = this.model.getTableName() 

        const file = files.find(file => file.includes('create_'+tableName+'_table'))
        if(file === undefined) return '' 

        return laravelbase.add(file).getPath();
    }

    readTableFile(){
        this.file_path = this.findTableFile();
        this.source_code = fs.readFileSync(this.file_path, 'utf8').split('\n');
    }

    getBuildedCode() : string{
        if(!this.source_code) return '';
        if(!this.model) return '';
        if(!this.model.attributes) return '';

        let source_code : string[] = this.source_code.slice();

        let start_line = source_code.findIndex(line => line.includes('Schema::create'));
        let end_line = source_code.findIndex(line => line.includes('});')); 

        // const non_removes = ['// static', '// here', '// special', '// protected', '// readonly']
  
        
        for(let i = end_line - 1; i > start_line; i--){ 
            // if(non_removes.some(remove => this.source_code[i].includes(remove))) continue;
            // remove line
            source_code.splice(i, 1); 
            end_line--; 
        }
        let target_line = end_line;

        // let has_here = false;
        // for(let i = target_line; i > start_line; i--){
        //     if(this.source_code[i].includes('// here')){
        //         target_line = i + 1;
        //         has_here = true;
        //         break;
        //     }
        // }
        
        // if(!has_here){
            
        // }

        
        
        let lines : string[] = [];
        lines.push('$table->id();'); 
        this.model.attributes?.items.forEach((item : IItem) => {
            let line = `$table`;

            if(item.is_belong_to){
                if(item.type === 'enum'){
                    const enumeration = new Enumeration(item.class);
                    const enum_type = enumeration.getType();

                    const enum_values = enumeration.getValues().map(value => { 
                        if(enum_type == 'string') return `'${value}'`;
                        return value;
                    }).join(', '); 

                    line += `->enum('${enum_type}',[${enum_values}])`;
                }
                else{
                    line += `->foreignId('${item.key}')`; 
                    if(item.foreignId && item.foreignTable ){ 
                        line += `->references('${item.foreignId}')`; 
                        line += `->on('${item.foreignTable}')`;
                    }else{
                        line += `->constrained()`; 
                    } 
                    if(item.cascade){
                        line += `->onUpdate('cascade')`; 
                        line += `->onDelete('cascade')`;
                    }
                }
            }
            else{
                const typeName = item.dbType || item.type || 'string';
                line += `->${typeName}('${item.key}'`;
                if(item.length > -1){
                    line += `, ${item.length}`;
                }
                line += `)`;   
            }
 

            line += this.getItemAppends(item);

            line += ';';
            lines.push(line);
        })

        if(this.model.timestamps){
            lines.push(`$table->timestamps();`);
        }
        

        lines.forEach(line => {
            source_code.splice(target_line, 0, `\t\t\t${line}`);
            target_line++;
        })  

        return source_code.join('\n'); 
    }
    getItemAppends(item : IItem) : string{ 
        let appends = []; 
        if(item.default) appends.push(`->default(${item.default})`);
        if(item.nullable) appends.push('->nullable()'); 
        if(item.unsigned) appends.push('->unsigned()');
        if(item.index) appends.push('->index()');
        if(item.unique) appends.push('->unique()');
        if(item.unsigned) appends.push('->unsigned()'); 
        if(item.description) appends.push(`->comment('${item.description}')`);
        return appends.join('');
    }



    build(){ 
        fs.writeFileSync(this.file_path, this.getBuildedCode());
    }


 
}