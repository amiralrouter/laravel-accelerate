
interface IPosition{
    line : number;
    column : number;
    offset : number;
}
interface ILoc{
    start : IPosition;
    end : IPosition;
    source : any;
}
interface IName{
    kind : string;
    name : string;
    loc : ILoc;
}
interface IBlob{
    kind : string; 
    loc : ILoc;
    raw : string;
    value : string;
}
interface INode{
    kind : string;
    loc : ILoc;
    name : IName;
    children : Array<INode>;
}
interface IComment{
    kind : string;
    loc : ILoc;
    offset : number;
    value : string;
}
interface IEntry{
    kind : string;
    loc : ILoc;
    value : IBlob;
    key : IBlob;
    leadingComments ?: Array<IComment>;
    trailingComments ?: Array<IComment>;
}
interface IProperty{
    kind : string; 
    loc : ILoc;
    name : IName;
    value : {
        items : Array<IEntry>,
        kind : string,
        loc : ILoc,
        value : any
    }
}
interface IPropertyStatement{
    kind: string;  
    loc : ILoc; 
    properties : Array<IProperty>
}
interface IAttributeProperties{[key:string] : string}
interface IAttribute{
    castable : boolean;
    name : string;
    type : string;
    value : string;
    description : string;
    properties : IAttributeProperties;
}