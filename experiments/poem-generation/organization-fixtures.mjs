// Deliberately authored combination exercises, not poems attributed to authors
// and not AI responses. Used only for local layout and fault-injection tests.
import {fixture,quantity} from './quantity-fixtures.mjs';
const exact=n=>quantity({mode:'exact',min:n,max:n,scope:'individual'});
const many=()=>quantity({mode:'many',extent:'spread'});
const relation=(type,source,target,poem)=>({type,source,target,modality:'asserted',basis:'explicit',evidence:[poem]});
const make=(id,poem,items,spatial=[])=>({id,poem,basis:'authored-semantic-exercise',analysis:{...fixture(poem,items),schema_version:'3.2',spatial}});
export const organizationFixtures=[
 make('o01','柳岸停两舟，远处见山。',[{text:'柳'},{text:'舟',kind:'object',quantity:exact(2)},{text:'山',kind:'place'}]),
 make('o02','草地上两匹马，树木围着房舍。',[{text:'草',quantity:many()},{text:'马',quantity:exact(2)},{text:'树',quantity:many()},{text:'房舍',kind:'place'}]),
 make('o03','鱼出水面，双燕斜飞。',[{text:'鱼'},{text:'燕',quantity:exact(2)}]),
 make('o04','竹旁有人，远山有月。',[{text:'竹',quantity:many()},{text:'人',kind:'person'},{text:'山',kind:'place'},{text:'月',kind:'environment'}]),
 make('o05','深林围着亭子，鸟栖树间。',[{text:'深林',kind:'place',quantity:many()},{text:'亭',kind:'object'},{text:'鸟',quantity:exact(2)}],[relation('on','i3','i1','深林围着亭子，鸟栖树间。')]),
 make('o06','两树在屋外，草地留有小径。',[{text:'树',quantity:exact(2)},{text:'屋',kind:'place'},{text:'草',quantity:many()},{text:'小径',kind:'place'}],[relation('outside','i1','i2','两树在屋外，草地留有小径。')]),
 make('o07','柳与舟，水不见。',[{text:'柳'},{text:'舟',kind:'object'},{text:'水',kind:'environment',presence:'absent'}]),
 make('o08','一片荷叶，一朵莲花，空中有月。',[{text:'荷叶',quantity:exact(1)},{text:'莲花',quantity:exact(1)},{text:'月',kind:'environment'}])
];
