// Unseen authored combinations. Not quotations or real provider responses.
import{fixture,quantity}from'./quantity-fixtures.mjs';
import{asComposition,group,action,claim}from'./composition-fixtures.mjs';
const make=(id,poem,items,kind='mixed')=>{
 const a=asComposition(fixture(poem,items.map(e=>({...e,evidence:[poem]}))),{setting:{kind,...claim(poem)},atmosphere:{visibility:'clear',illumination:'day',...claim(poem)}});
 a.reading='手工校准语义，用来检验通用绘画规则，不是模型回答。';
 a.scene.groups=a.entities.filter(e=>e.role==='scene'&&e.presence==='present').map((e,i)=>group([e.id],i===0?'subject':'environment',e.quantity.mode==='many'?'cluster':'single',e.kind==='person'?'near':'middle',poem));
 return{id,poem,analysis:a};
};
export const ruleFixtures=[
 make('g01','两对白鹭掠过清溪。',[{text:'白鹭',quantity:quantity({mode:'exact',min:2,max:2,scope:'individual',evidence:['两对白鹭']})},{text:'清溪',kind:'environment'}],'waterside'),
 make('g02','二十三只归鸟飞过远山。',[{text:'归鸟',quantity:quantity({mode:'few',scope:'group',evidence:['二十三只归鸟']})},{text:'远山',kind:'environment'}],'open_land'),
 make('g03','三艘轻舟泊清江，岸边两匹马。',[{text:'轻舟',kind:'object'},{text:'清江',kind:'environment'},{text:'马'}],'waterside'),
 make('g04','吾乃旅人，旅人亦为归人。',[{text:'吾',kind:'person'},{text:'旅人',kind:'person'},{text:'归人',kind:'person'}],'open_land'),
 make('g05','客与旅人并立，未见归人。',[{text:'客',kind:'person'},{text:'旅人',kind:'person'},{text:'归人',kind:'person',presence:'absent'}],'open_land'),
 make('g06','茅舍间两面酒旗招展。',[{text:'茅舍',kind:'object',quantity:quantity({mode:'many',scope:'group',evidence:['茅舍间']})},{text:'酒旗',kind:'object',quantity:quantity({mode:'exact',min:1,max:1,unit:'面',scope:'individual',evidence:['两面酒旗']})}],'settlement'),
 make('g07','客持酒临水，岸边有长剑。',[{text:'客',kind:'person'},{text:'酒',kind:'object'},{text:'水',kind:'environment'},{text:'长剑',kind:'object'}],'waterside'),
 make('g08','红梅白菊映清溪。',[{text:'梅'},{text:'菊'},{text:'清溪',kind:'environment'}],'waterside'),
 make('g09','绿柳夹江，白云绕青山。',[{text:'柳'},{text:'江',kind:'environment'},{text:'云',kind:'environment'},{text:'山',kind:'environment'}],'waterside'),
 make('g10','不见旌旗，独舟横江。',[{text:'旌旗',kind:'object',presence:'absent'},{text:'独舟',kind:'object',quantity:quantity({mode:'exact',min:1,max:1,scope:'individual',evidence:['独舟']})},{text:'江',kind:'environment'}],'waterside'),
 make('g11','江水如长剑，夜色沉沉。',[{text:'江水',kind:'environment'},{text:'长剑',kind:'object',role:'reference',presence:'unclear'},{text:'夜色',kind:'environment'}],'waterside'),
 make('g12','三两枝桃花临水开。',[{text:'桃花',quantity:quantity({mode:'range',min:2,max:3,unit:'枝',scope:'part',evidence:['三两枝桃花']})},{text:'水',kind:'environment'}],'waterside')
];
for(const f of ruleFixtures){const birds=f.analysis.entities.filter(e=>/鸟|鹭/.test(e.mentions.join('')));f.analysis.scene.actions=birds.map(e=>action(e.id,'fly','normal','unspecified',f.poem));}
ruleFixtures.find(f=>f.id==='g11').analysis.scene.atmosphere.illumination='night';
