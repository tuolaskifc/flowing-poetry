// Authored semantic fixtures, not model responses.
import examples from '../poem-semantics/contract-v3/examples.mjs';
export const quantity=(extra={})=>({mode:'unspecified',min:null,max:null,unit:null,scope:'unspecified',extent:'unspecified',evidence:[],...extra});
export function fixture(poem,items){return {...structuredClone(examples[0].analysis),schema_version:'3.1',poem,reading:'数量与分布测试',entities:items.map((e,i)=>({id:'i'+(i+1),mentions:[e.text],concept:e.text,kind:'organism',role:'scene',presence:'present',evidence:[e.text],...e,quantity:e.quantity||quantity()})).map(({text,...e})=>e),relations:[],atmosphere:{labels:[],valence:'neutral',energy:'low',tension:'low',openness:'high',evidence:[poem]},time:{markers:[],note:null},uncertainties:[]};}
export const lotusFixture=()=>fixture('接天莲叶无穷碧，映日荷花别样红。',[
  {text:'莲叶',quantity:quantity({mode:'many',scope:'individual',extent:'spread',evidence:['接天莲叶无穷碧']})},
  {text:'荷花',quantity:quantity({mode:'many',scope:'individual',extent:'spread',evidence:['映日荷花别样红']})}
]);
