// One local vocabulary for candidate screening and semantic-to-tool mapping.
// Matching words alone never establishes presence, metaphor or movement.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PoemImageryLexicon=factory();})(globalThis,()=>{
const rules=[
  {words:['松树','松林','松间','松'],tool:'tree',options:{form:'pine'},exclude:['松柏','松江','松花江']},
  {words:['深林','树林','林','树','木'],tool:'tree',options:{form:'broadleaf'},exclude:['树影','树阴','树荫','木兰','木舟','木船','林逋','木兰舟']},
  {words:['远山','青山','群山','山'],tool:'landscape',options:{form:'mountain'},exclude:['山居','山园','山西','山东','山城']},
  {words:['野渡','渡口','江岸','河岸','岸边','岸','沙洲'],tool:'landscape',options:{form:'shore'}},
  {words:['原野','平野','田野','地面','草地'],tool:'landscape',options:{form:'ground'}},
  {words:['曲径','野径','小径'],tool:'landscape',options:{form:'path'}},
  {words:['柳絮'],tool:'catkins'},
  {words:['落花'],tool:'falling-petals'},
  {words:['菊花','黄华','菊'],tool:'flower-forms',options:{kind:'chrysanthemum'}},
  {words:['梅花','梅枝','寒梅','红梅','白梅','梅'],tool:'plum-branch',exclude:['梅子','梅雨']},
  {words:['酒杯','酒盏','杯中酒'],tool:'wine',options:{form:'cup'}},
  {words:['酒壶','酒坛'],tool:'wine',options:{form:'jar'}},
  {words:['酒液','清酒','浊酒','美酒','酒'],tool:'wine',options:{form:'liquid'},exclude:['饮酒','饮','劝酒','醉酒','沽酒','买酒']},
  {words:['楼阁','楼台','楼宇','楼'],tool:'building'},
  {words:['兰花','兰草','兰'],tool:'orchid',exclude:['木兰','兰桡','兰舟','兰陵','兰台','兰亭']},
  {words:['马'],tool:'horse',exclude:['司马','驸马','马蹄','马鞍','马车','马嵬','竹马']},
  {words:['荷叶','莲叶'],tool:'lotus',options:{form:'leaf'}},
  {words:['莲花','荷花','荷苞','莲苞','莲'],tool:'lotus',options:{form:'flower'},exclude:['莲子','莲蓬','莲步','金莲','莲座']},
  {words:['红叶'],tool:'leaves',options:{color:'red'}},
  {words:['黄叶'],tool:'leaves',options:{color:'yellow'}},
  {words:['竹'],tool:'bamboo'}, {words:['柳'],tool:'willow',exclude:['柳絮','杨柳絮']},
  {words:['草'],tool:'grass'},
  {words:['露珠','露水','露'],tool:'surface-weather',options:{surface:'dew',carrier:'detail'},exclude:['露出','显露','露面','露宿']},
  {words:['霜'],tool:'surface-weather',options:{surface:'frost',carrier:'detail'}},
  {words:['黄莺','莺'],tool:'oriole',exclude:['夜莺']},
  {words:['雪'],tool:'snow',options:{state:'fall'}},
  {words:['明月','月亮','月'],tool:'moon'},
  {words:['烟雾','薄雾','雾'],tool:'mist'}, {words:['云'],tool:'cloud'},
  {words:['舟','船'],tool:'boat'},
  {words:['雨'],tool:'rain'}, {words:['江水','流水','清泉','泉水','春潮','潮水','潮','水','泉','江','溪','湖','河'],tool:'water'},
  {words:['舟','船'],tool:'boat'}, {words:['长亭','亭'],tool:'pavilion'},
  {words:['石','岩'],tool:'rock'}, {words:['鱼'],tool:'fish'},
  {words:['花'],tool:'flower',exclude:['桃花','兰花','杜鹃','杨花','桂花','槐花','梅子','菊花','莲花','荷花']}
];
const unsupportedTerms=['松柏','柏','梧桐','芭蕉','桃花','木兰','兰桡','莲子','莲蓬','杜鹃','杨花','梅子','燕','雁','鸦','夜莺','鸳鸯','沙鸥','青鸟','鹧鸪','桂花'];
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
return freeze({rules,unsupportedTerms});
});
