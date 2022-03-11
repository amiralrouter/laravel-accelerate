
interface IPosition{
    line : number;
    column : number;
}
interface IItem{
    key : string;
    value : any;
    type : string;
    castType : string;
    dbType : string;
    default : string;
    length : number;
    class : string;
    foreignId : string;
    foreignTable : string;
    cascade : boolean;
    nullable : boolean;
    index : boolean;
    unique : boolean;
    unsigned : boolean;

    is_belong_to : boolean;
    description : string;

    castable : boolean;
}
interface IProperty { 
    name : string; 
    outerFrom : IPosition;
    outerTo : IPosition;
    innerFrom : IPosition;
    innerTo : IPosition;
    items : Array<IItem>;
}