import * as vscode from 'vscode';
import * as pluralize from 'pluralize'


export default class Model {  
    editor ?: vscode.TextEditor;
    document ?: vscode.TextDocument;
    
    source_code : string[] = [];

    model_name : string = '';
    table_name : string = '';
    translatable ?: IProperty;
    attributes ?: IProperty;
    casts ?: IProperty;
    timestamps : boolean = true;

    constructor() { 
        this.editor = vscode.window.activeTextEditor;
        if(!this.editor)  return;
        this.document = this.editor.document;
        if(!this.document) return;
 
        this.setSourceCode(this.document.getText());
    }

    setSourceCode(source_code : string) {
        this.source_code = source_code.split('\n');
        this.parse();
    }
    getModelName() : string {
        for(let i = 0; i < this.source_code.length; i++) {
            if(this.source_code[i].includes('class')) {
                const model_name = this.source_code[i].match(/class\s(\w+)/);
                if(model_name) {
                    return model_name[1];
                }
            }
        } 
        return '';
    }
    getTableName() : string {
        let name = pluralize(this.getModelName());
        name = name.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
        if(name.substring(0,1) === '_') {
            name = name.substring(1);
        }
        return name; 
    }

    findPosition(pattern : string, begin_line: number = 0) : IPosition {
        for(let i = begin_line; i < this.source_code.length; i++) {
            if(this.source_code[i].includes(pattern)) {
                return {
                    line : i,
                    column : this.source_code[i].indexOf(pattern)
                }
            }
        }
        return {
            line : 0,
            column : 0
        }
    }
    getBeginPattern(name : string) : string {
        return 'protected $' + name + ' = [';
    }
    getEndPattern(name : string) : string {
        return '];';
    }
    findPropertyInSourceCode(name : string) : IProperty {
        const begin_pattern = this.getBeginPattern(name);
        const end_pattern = this.getEndPattern(name);
        const begin_position = this.findPosition(begin_pattern);
        const end_position = this.findPosition(end_pattern, begin_position.line);
        return {
            name : name,
            outerFrom : begin_position,
            outerTo : end_position,
            innerFrom : {
                line : begin_position.line,
                column : begin_position.column + begin_pattern.length
            },
            innerTo : {
                line : end_position.line,
                column : end_position.column - end_pattern.length
            },
            items : []
        }
    }
    getSection(from : IPosition,to : IPosition) : string[] {   
        let section = [];
        for(let i = from.line; i <= to.line; i++) {
            if(i === from.line) {
                section.push(this.source_code[i].substring(from.column));
            } else if(i === to.line) {
                section.push(this.source_code[i].substring(0, to.column));
            } else {
                section.push(this.source_code[i]);
            } 
        }
        return section; 
    }
    cleanSection(section : string[]) : string[] {
        let cleaned_section = [];
        for(let i = 0; i < section.length; i++) {
            if(section[i].trim() !== '') {
                cleaned_section.push(section[i].trim());
            }
        }
        return cleaned_section;
    }
    
    getEmptyItem() : IItem {
        return {
            key : '', 
            value : null, 
            default : '',
            type : '',
            castType : '',
            dbType : '',
            length : -1,
            class : '',
            foreignId : '',
            foreignTable : '',
            cascade : false,
            nullable : false,
            index : false,
            unique : false,
            unsigned : false, 
            is_belong_to : false,
            description : '',
            castable : true,
        } 
    }

    pickTranslatable(){
        if(!this.translatable) return;
        const translatable_section = this.getSection(this.translatable.innerFrom, this.translatable.innerTo);
        const translatable_section_cleaned = this.cleanSection(translatable_section);
        translatable_section_cleaned.forEach(line => { 
            line.split(',').forEach(element => { 
                if(!this.translatable) return; 
                if(!this.attributes) return; 
                const element_name = element.match(/(\w+)/);
                if(element_name) {
                    const element_name_value = element_name[1];
                    const item : IItem = {
                        ...this.getEmptyItem(), 
                        key : element_name_value,
                        type : 'string',
                        dbType : 'json',
                        castable : false,
                        default : '\'{}\'',
                    }; 
                    this.translatable.items.push(item); 
                    this.attributes.items.push(item); 
                }
            })
        })
    }
    pickAttributes(){
        if(!this.attributes) return; 
        const attributes_section = this.getSection(this.attributes.innerFrom, this.attributes.innerTo);
        const attributes_section_cleaned = this.cleanSection(attributes_section);
        // find '(.*?)'\s*=>\s*(.*?)\s*,
        attributes_section_cleaned.forEach(line => {
            if(!this.attributes) return; 
            const regex = /'(.*?)'\s*=>\s*(.*?)\s*,/;
            const result = regex.exec(line);
            if(result) {
                const key = result[1];
                const value = result[2]; 
                const item : IItem = {
                    ...this.getEmptyItem(),
                    key : key,
                    type : 'string', 
                    value : value,
                }
                item.key = key; 
                
                const comment_regex = /\/\/(.*)/; 
                const comment_result = comment_regex.exec(line);
                let comment = '';
                if(comment_result) {
                    comment = comment_result[1];
                    let matchs = comment.match(/((.*?)(\[(.*?)\])|)\s*(.*?)$/)   
                    if(matchs == null || matchs.length < 6) return;
                    let [, , , , informations, description] = matchs; 
                    if(description) item.description = description; 
                    if(informations){   
                        [...informations.matchAll(/(\s*(\w+)\s*:\s*(\w+))/g)].forEach(match => {
                            let [, , name, value] = match;   
                            switch(name) {
                                case 'type':
                                    item.type = value;
                                    break;
                                case 'length': 
                                    item.length = parseInt(value);
                                    break;
                                case 'def':
                                case 'default':
                                    item.default = value;
                                    break;
                                case 'nullable':
                                    item.nullable = value === 'true';
                                    break;
                                case 'unsigned':
                                    item.unsigned = value === 'true';
                                    break; 
                                case 'comment':
                                    item.description = value;
                                    break;
                                case 'unique':
                                    item.unique = value === 'true';
                                    break;
                                case 'index':
                                    item.index = value === 'true';
                                    break;
                                case 'class':
                                case 'enum':
                                    item.class = value;
                                    item.is_belong_to = true;
                                    break;
                                case 'foreignId':
                                    item.foreignId = value;
                                    item.is_belong_to = true;
                                    break;
                                case 'foreignTable':
                                    item.foreignTable = value;
                                    item.is_belong_to = true;
                                    break; 
                                case 'cascade':
                                    item.cascade = value === 'true'; 
                                    break; 
                            }
                        })
                    } 
                }

                item.dbType = item.type;
                item.castType = '\'' + item.type + '\'';

                if(item.type === 'enum') {
                    item.castType = item.class + '::class';
                }
                
                this.attributes.items.push(item);
            }
        }) 
    }
    pickTimestamps(){ 
        for(let i = 0; i < this.source_code.length; i++) {
            const line = this.source_code[i]; 
            if(line.includes('$timestamps')){
                this.timestamps = line.includes('true');
            }
            if(line.includes('$attributes')){
                break;
            }
        } 
    }
    parse(){
        this.model_name = this.getModelName();
        this.table_name = this.getTableName();

        this.translatable = this.findPropertyInSourceCode('translatable');
        this.attributes = this.findPropertyInSourceCode('attributes');



        this.pickTranslatable();
        this.pickAttributes();

        this.pickTimestamps();

        
    }

    getBuildedCode() : string{
        if(!this.attributes) return '';
        const casts : IProperty = this.findPropertyInSourceCode('casts'); 
        // clone source_code
        let source_code = this.source_code.slice();

        let target_line = casts.outerFrom.line
        if(casts.outerFrom.line > 0){ 
            source_code.splice(casts.outerFrom.line, casts.outerTo.line - casts.outerFrom.line + 1);
        }
        else{ 
            // add new line after attributes.outerTo.line
            source_code.splice(casts.outerTo.line + 1, 0, '\n');
            target_line = casts.outerTo.line + 2
        }

        let casts_code = '\t' + this.getBeginPattern('casts') + '\n';

        casts_code += this.attributes.items.filter((attribute : IItem) => attribute.castable).map((attribute : IItem) => { 
            return `\t\t'${attribute.key}' => ${attribute.castType}`
        }).join(',\n') ;

        casts_code += '\n\t' + this.getEndPattern('casts');
        
        source_code.splice(target_line, 0, casts_code);

        let bundle : string = source_code.join('\n'); 
        
        return bundle;
        // remove 

    }


    build(){
        if(!this.editor) return; 
        this.editor.edit((editBuilder) => {
            if(!this.document) return; 
            editBuilder.replace(new vscode.Range(0, 0, this.document.lineCount, 0), this.getBuildedCode());
		});
    }
}