import * as vscode from 'vscode';
import * as fs from 'fs';
import * as pluralize from 'pluralize'

interface Attribute {
    key: string; 
    value: string; 
    type: string;
    model : string; 
    size : string; 
    description : string; 
    foreign_id : string;  
    foreign_table : string;  
    nullable : boolean;  
    default : any;  
    has_default : boolean;  
} 

export default class ModelAttributes {
    translatable_sw: string = 'protected $translatable = [';
    translatable_ew: string = '];';
    attributes_sw: string = 'protected $attributes = [';
    attributes_ew: string = '];';
    casts_sw: string = 'protected $casts = [';
    casts_ew: string = '];';
    table_sw : string = 'function (Blueprint $table) {';
    table_ew : string = '});';
    t1: string = '\t';
    t2: string = '\t\t';
    t3: string = '\t\t\t';


    editor : vscode.TextEditor | undefined;
    document : vscode.TextDocument | undefined;


    has_timestamps: boolean = true;
    attributes : Array<Attribute>  = [];

    isNumber(value: string | number): boolean{return ((value != null) && (value !== '') && !isNaN(Number(value.toString())));}

    find(content: string, start: string, end: string) {
        let outerFrom = content.indexOf(start);
        if(outerFrom === -1) {
            return null;
        }  
        let innerFrom = outerFrom + start.length;
        let innerTo = innerFrom + content.substring(innerFrom).indexOf(end);
        let outerTo = innerTo + end.length;
  
        return { 
            outerFrom: outerFrom,
            outerTo: outerTo,
            innerFrom: innerFrom,
            innerTo: innerTo,
            outerText : content.substring(outerFrom, outerTo),
            innerText : content.substring(innerFrom, innerTo)
        }
    }
    replaceBetween(content : string, new_value : string, start_index : number, end_index: number){
        return content.substring(0, start_index) + new_value + content.substring(end_index);
    }
    toSnakeCase(text : string) { 
        text = text.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        if(text.substring(0,1) === '_') {
            text = text.substring(1);
        }
        return text;
    }
    modelToTable(model: string) {
        return this.toSnakeCase(pluralize(model));
    }
    getDefinition(text: string, word: string) {
        let definition = text.match(new RegExp(`${word}\\s*:*\\s*([a-zA-Z]+)`, 'i'));
        if(definition) {
            return definition[1];
        }
        return null;
    }

    parseModel() { 
        this.attributes = [];
        if(this.editor === undefined)
            return;
        let content = this.editor.document.getText();
        let foundTranslatable = this.find(content, this.translatable_sw, this.translatable_ew);
        if(foundTranslatable){
            // find words between two "'" in foundTranslatable
            let translatable = foundTranslatable.innerText.match(/(\w+)/g);

        }

        let foundAttributes = this.find(content, this.attributes_sw, this.attributes_ew);
        if(foundAttributes === null) {
            return;
        }
        let inner = foundAttributes.innerText
        // remove \r in inner
        inner = inner.replace(/\r/g, '');
        let lines = inner.split('\n');
        lines.forEach(line => {
            let trimmed = line.trim();
            if(trimmed.length < 1) {
                return;
            } 
            let code = (trimmed.split('//')[0] || '').trim();
            let comment = (trimmed.split('//')[1] || '').trim();
            let parts = code.split('=>');
            let key = parts[0].trim();
            let value : string = parts[1].trim();
            let type = 'string';
            key = key.substring(1, key.length - 1); 
            if(value.substring(value.length - 1) === ',') {
                value = value.substring(0, value.length - 1);
            }
 
            let attribute : Attribute = {
                key: key,
                value: value,
                type: type,
                model: '',
                size: '',
                description : '',
                foreign_id : '', 
                foreign_table : '',
                nullable : false,
                default : null,
                has_default : false,  
            }

            if(comment.length > 0) { 
                let _type = this.getDefinition(comment, 'type');
                if(_type) {
                    attribute.type = _type;
                }
                let _default = this.getDefinition(comment, 'default');
                if(_default) {
                    attribute.default = _default;
                    attribute.has_default = true;
                }
                let _model = this.getDefinition(comment, 'model');
                if(_model) {
                    attribute.model = _model;
                } 
                let _size = this.getDefinition(comment, 'size');
                if(_size) {
                    attribute.size = _size;
                } 
                let _foreign_id = this.getDefinition(comment, 'foreign_id');
                if(_foreign_id) {
                    attribute.foreign_id = _foreign_id;
                }
                let _foreign_table = this.getDefinition(comment, 'foreign_table');
                if(_foreign_table) {
                    attribute.foreign_table = _foreign_table;
                }
                let _nullable = this.getDefinition(comment, 'nullable');
                if(_nullable) {
                    attribute.nullable = _nullable == 'true';
                }
              
                
                //get text after ] in content by regex 
                let _description = comment.match(/\]\s*(.*)/);
                if(_description) {
                    attribute.description = _description[1];
                }
            }
 
            this.attributes.push(attribute);
        }); 

        this.has_timestamps = !content.includes('$timestamps = false;'); 
    }

    repairCasts() {
        if(this.editor === undefined)
            return;
        let content = this.editor.document.getText();
 
        let casts = this.casts_sw + '\n' + this.attributes.map(attribute => {
            return `${this.t2}'${attribute.key}' => '${attribute.type}'`;
        }).join(',\n') + `\n${this.t1}` + this.casts_ew;

 
        let foundCasts = this.find(content, this.casts_sw, this.casts_ew);
        if(foundCasts === null) {
            let foundAttributes = this.find(content, this.attributes_sw, this.attributes_ew);
            if(foundAttributes === null) {
                return;
            }
            content = this.replaceBetween(content, `\n\n${this.t1}` + casts, foundAttributes.outerTo, foundAttributes.outerTo);
        }
        else{ 
            content = this.replaceBetween(content, casts, foundCasts.outerFrom, foundCasts.outerTo);
        }
        const editor = this.editor;
        editor.edit(function(editBuilder){
            editBuilder.replace(new vscode.Range(0, 0, editor.document.lineCount, 0), content);
		});
    }

    repairTable() {
        if(this.document === undefined)
            return;

        let fileName = this.document.fileName;
        let seperator = fileName.includes('/') ? '/' : '\\';
        let parts = fileName.split(seperator);
        let modelName : string = parts[parts.length - 1].split('.')[0];

        let migrationsPath = [...parts.slice(0,parts.length - 3), 'database', 'migrations'].join(seperator);

        // list files in migrations folder
        let files = fs.readdirSync(migrationsPath);
     
        let tableName = this.modelToTable(modelName)
        let tableFileName = ''
        files.forEach(file => {
            if(file.includes('create_'+tableName+'_table')) {
                tableFileName = file;
            }
        });
        
        if(tableFileName === '') {
            return;
        }

        let tableFilePath = migrationsPath + seperator + tableFileName;
        let tableContent = fs.readFileSync(tableFilePath, 'utf8');
        let foundTable = this.find(tableContent, this.table_sw, this.table_ew);
        if(foundTable === null) {
            return;
        }
        
        let cols : Array<string> = [];
        cols.push('$table->id();');
        this.attributes.forEach(attribute => {
            let col = '$table';
            if(attribute.model){
                col += `->foreignId('${attribute.key}')`; 
                if(attribute.foreign_id && attribute.foreign_table) {
                    col += `->references('${attribute.foreign_id}')`; 
                    col += `->on('${attribute.foreign_table}')`;
                }else{
                    col += `->constrained()`; 
                } 
                col += `->onUpdate('cascade')`; 
                col += `->onDelete('cascade')`;  
            }
            else{
                col += `->${attribute.type}('${attribute.key}'`; 
                if(attribute.size){
                    col += `,${attribute.size}`; 
                }
                col += `)`; 

                if(attribute.default){
                    col += `->default(${attribute.default})`;  
                } 
            }
            if(attribute.nullable) {
                col += `->nullable()`; 
            }
            col += `->comment('${attribute.description}')`; 

            col += ';';
            cols.push(col);
        });
        if(this.has_timestamps){
            cols.push('$table->timestamps();');
        }

        let newTableTypes = cols.map(col => {
            return this.t3+col;
        }).join('\n');

        let newTableContent = this.replaceBetween(tableContent, '\n' + newTableTypes + '\n' + this.t2, foundTable.innerFrom, foundTable.innerTo);
 

        fs.writeFileSync(tableFilePath, newTableContent);

    }

    repair() {
        // get active editor
        this.editor = vscode.window.activeTextEditor;
        if (!this.editor) {
            return;
        }

        // get active document
        this.document = this.editor.document;
        if (!this.document) {
            return;
        }



        

        this.parseModel();
   
        this.repairCasts();
        this.repairTable();


 

    }

}