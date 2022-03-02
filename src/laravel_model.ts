import * as vscode from 'vscode';
import * as fs from 'fs';
import * as pluralize from 'pluralize'
import { Interface } from 'readline';

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

  
export default class LaravelModel {  
    editor!: vscode.TextEditor; 
    document!: vscode.TextDocument; 

    content : string = '';

    name : string = '';
    propertyStatements : IPropertyStatement[] = [];

    translatablePropertyStatement : IPropertyStatement | undefined;
    attributesPropertyStatement : IPropertyStatement | undefined;
    castsPropertyStatement : IPropertyStatement | undefined;

    attributes : IAttribute[] = [];
    has_times_stamp : boolean = true;
    


    constructor(editor: vscode.TextEditor) {
        this.editor = editor;
        this.document = editor.document; 
        this.content = this.document.getText();

        this.parse();
    }


    getPropertyStatement(name: string) : IPropertyStatement | undefined {
        return this.propertyStatements.find((statement : IPropertyStatement) => {
            return statement.properties.find((property : IProperty) => property.name.name === name);
        }); 
    }
    parse(){
        const programNode = parser.parseCode( this.content )  
        const namespaceNode = programNode.children.find((node : INode) => node.kind === 'namespace');
        const classNode = namespaceNode.children.find((node : INode) => node.kind === 'class');

        this.name = classNode.name.name;

        this.propertyStatements = classNode.body.filter((node : INode) => node.kind === 'propertystatement');


        this.translatablePropertyStatement = this.getPropertyStatement('translatable');
        this.attributesPropertyStatement = this.getPropertyStatement('attributes');
        this.castsPropertyStatement = this.getPropertyStatement('casts');
 


        this.parseTranslatable();
        this.parseAttributes();
        this.checkTimeStampActive();

         
 
    }

    parseTranslatable(){
        if(!this.translatablePropertyStatement) return 
        const translatableProperty = this.translatablePropertyStatement.properties[0];
        const translatableEntries = translatableProperty.value.items;
        translatableEntries.forEach((entry : IEntry) => {
            const attribute = { 
                castable : false,
                name : entry.value.value,
                value : '{}',
                type : 'array',
                description : 'Translatable ' + entry.value.value,
                properties : {
                    dbType : 'json',
                    default : '\'{}\''
                } as {[key:string] : string}
            } as IAttribute;
            this.attributes.push(attribute); 
        }); 
    }

    parseAttributes(){
        if(!this.attributesPropertyStatement) return;

        const attributesProperty = this.attributesPropertyStatement.properties[0];

        const attributeEntries = attributesProperty.value.items;
  
        for(let i = 1; i < attributeEntries.length; i++){
            const entry = attributeEntries[i];
            if(entry.leadingComments){
                const prevEntry = attributeEntries[i-1];
                prevEntry.leadingComments = entry.leadingComments;
                entry.leadingComments = undefined;
            }
            if(entry.trailingComments){
                entry.leadingComments = entry.trailingComments; 
            } 
        } 

        attributeEntries.forEach((entry : IEntry) => {
            const attribute = { 
                castable : true,
                name : entry.key.value,
                value : entry.value.raw || entry.value.value,
                type : entry.value.kind,
                description : '',
                properties : {} as {[key:string] : string}
            } as IAttribute;
            
            let comment = entry.leadingComments ? entry.leadingComments.map((comment : IComment) => comment.value.trim()).join('') : '';
            if(comment.length > 0){
                let matchs = comment.match(/((.*?)(\[(.*?)\])|)\s*(.*?)$/) 
       
                if(matchs == null || matchs.length < 6) return;
                let [, , , , _informations, _description] = matchs;
                
                if(_description) attribute.description = _description;
               
                if(_informations){  
                    [..._informations.matchAll(/(\s*(\w+)\s*:\s*(\w+))/g)].forEach(match => {
                        let [, , name, value] = match;    
                        attribute.properties[name] = value; 
                    })
                }
                if(attribute.properties.hasOwnProperty('type')){
                    attribute.type = attribute.properties.type; 
                }
            }

            this.attributes.push(attribute);
        })
    }

    checkTimeStampActive(){
        const propertyStatement = this.getPropertyStatement('timestamps');
        if(propertyStatement){ 
            this.has_times_stamp = propertyStatement.properties[0].value.value;
        }
    }



    writeCasts(){ 
        if(!this.castsPropertyStatement) return;
        const loc = this.castsPropertyStatement.loc as ILoc;  

        const range = new vscode.Range(loc.start.line - 1, loc.start.column, loc.end.line - 1, loc.end.column)


        let casts = `$casts = [\n` + this.attributes.filter((attribute : IAttribute) => attribute.castable).map((attribute : IAttribute) => `\t\t'${attribute.name}' => '${attribute.type}'`).join(',\n') + "\n\t]";
 

        this.editor.edit(function(editBuilder){
            editBuilder.replace(range, casts);
		}); 
    }
}