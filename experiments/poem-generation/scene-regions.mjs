// Reusable scene grammar: infer supporting terrain locally, never ask the model
// for coordinates. Exact semantic counts remain separate from habitat density.
const frac=n=>n-Math.floor(n);
export function organizeRegions(analysis,layers,scene){
 const get=(tool,form)=>layers.find(l=>l.tool===tool&&(!form||l.options.form===form));
 const water=get('water'),pine=get('tree','pine'),blossom=get('tree','blossom'),forest=layers.find(l=>l.tool==='tree'&&l.options.form!=='blossom'),willow=get('willow'),bamboo=get('bamboo'),house=get('dwelling'),building=get('building'),boat=get('boat'),figure=get('figure'),field=get('landscape','field'),fall=get('landscape','waterfall'),light=get('landscape','lightwash'),path=get('landscape','path'),rock=get('rock');
 const mountain=get('landscape','mountain'),sun=get('landscape','sun'),mist=get('mist'),grass=get('grass');
 const village=house?.names.some(m=>/^(?:(?:孤|荒|山|小|远|近)?村(?:庄|落)?|墟里)$/.test(m));
 const opposing=mountain?.names.some(m=>/两岸/.test(m));
 const setting=fall?'mountain-waterfall':field&&water?'field-river':field?'paddy-woodland':pine&&rock&&water?'mountain-stream':light&&forest?'forest-light':house?.options.kind==='temple'&&forest?'woodland-retreat':blossom&&bamboo&&water?'blossom-river':(house&&willow)||(building&&blossom)?'settlement':village?'village':opposing&&boat?'mountain-channel':bamboo&&mountain&&sun?'bamboo-hillside':bamboo&&forest?'mixed-woodland':water&&grass?.options.form==='reed'?'reed-bank':water&&forest&&grass?'wooded-creek':blossom&&!water?'flowering-grove':mountain&&path?'mountain-trails':boat&&get('snow')?'winter-fishing':figure&&water?'riverside-view':null;
 if(!setting)return;
 scene.kind=setting;scene.basis='local-context';scene.regions={};scene.supports=[];
 scene.notes.push('先划分承托地形、群落与主体活动区域；场景密度和背景依托是本地构图推断，不冒充原文明示意象。');
 const region=(name,polygon)=>{scene.regions[name]=polygon;return polygon;};
 const place=(l,placements,z)=>{if(!l)return;for(const [i,v] of l.instances.entries()){Object.assign(v.placement,placements(i,l.instances.length));v.depth=i/l.instances.length*.6;}l.placement={...l.placement,at:[...l.instances[0].placement.at]};if(z!==undefined)l.z=z;};
 const density=(l,n)=>{if(!l||l.quantity.exact||l.quantity.items.some(q=>q.mode==='exact'&&q.scope==='individual'))return;const source=structuredClone(l.instances);l.instances=Array.from({length:n},(_,i)=>({...structuredClone(source[i%source.length]),variant:i%Math.min(3,n)}));l.quantity.rendered=n;l.quantity.exact=false;l.quantityLabel=`依场景疏密试画 ${n} 个单元；原文未给精确个体数`;};
 const support=(form,at,scale,z,reason,clip)=>{
  if(get('landscape',form))return get('landscape',form);
  const placement={anchor:[320,194],at,scale},l={tool:'landscape',names:[`构图依托·${form==='mountain'?'山势':'地面'}`],entities:[],projectedEntities:[],options:{form},animate:false,placement:structuredClone(placement),instances:[{placement:structuredClone(placement),variant:0,depth:0,opacity:1}],singleUnit:false,inferred:true,provenance:{basis:'local-context',reason},quantity:{rendered:1,exact:false,items:[]},quantityLabel:'背景依托，不计入意象覆盖',z,...(clip?{clip}:{})};layers.push(l);scene.supports.push({form,reason});return l;
 };
 const ground=(reason)=>support('ground',[.5,.48],1.6,-18,reason);
 if(setting==='mountain-stream'){
  support('mountain',[.5,.45],1.7,-32,'松、石与清泉共同指向山间溪景');ground('溪岸承托松根与石块');
  const stream=region('stream',[[.57,.48],[.70,.48],[.64,.66],[.79,.82],[1.1,1.1],[.74,1.1],[.48,.73],[.49,.61]]);water.clip=stream;water.surface={top:.48,bottom:1};
  density(pine,6);place(pine,(i,n)=>{const split=Math.ceil(n/2),left=i<split,t=left?i/Math.max(1,split-1):(i-split)/Math.max(1,n-split-1);return {at:left?[.1+t*.26,.72+t*.14]:[.80+t*.18,.66+t*.2],scale:left?.9+t*.24:.65+t*.16};},8);
  density(rock,5);place(rock,(i,n)=>({at:n<=5?[[.50,.68],[.67,.76],[.61,.87],[.85,.95],[.43,.77]][i]:[.48+frac(i*.618)*.38,.64+i/n*.33],scale:(n>5?.35:.48)+(i%3)*.13}),12);
  const moon=get('moon');place(moon,()=>({at:[.60,.21],scale:.65}),-5);
  if(light)place(light,()=>({anchor:[320,275],at:[.58,.76],scale:.9}),18);
 }
 if(setting==='village'){
  ground('村落房舍和环村树木共同落地');region('village',[[.32,.58],[.75,.58],[.82,.85],[.28,.85]]);
  place(house,(i,n)=>({at:[.38+(i+.5)/n*.37,.70+Math.sin(i*2.3)*.04],scale:.60+(i%2)*.12}),6);
  if(forest){density(forest,12);place(forest,(i,n)=>({anchor:[320,388],at:i<n/2?[.04+i/(n/2)*.23,.72+frac(i*.618)*.24]:[.79+frac(i*.618)*.19,.68+frac(i*.4)*.27],scale:.72+frac(i*.41)*.43}),9);forest.regionalRelation='outside';}
  if(sun)place(sun,()=>({anchor:[320,95],at:[.66,.30],scale:.8}),-25);
  if(mist)place(mist,()=>({at:[.5,.45],scale:1.4}),-5);
 }
 if(setting==='flowering-grove'){
  ground('疏花树的树根与地表相接');region('grove',[[.15,.6],[.85,.6],[1,1],[0,1]]);
  place(blossom,(i,n)=>({anchor:[320,388],at:n===1?[.50,.93]:[.16+(i+.5)/n*.72,.78+frac(i*.618)*.17],scale:n===1?1.6:.85}),10);
 }
 if(setting==='mixed-woodland'){
  ground('竹深树密共同组成林地');region('woodland',[[0,.2],[1,.2],[1,1],[0,1]]);
  density(forest,17);place(forest,(i,n)=>({anchor:[320,388],at:[frac(i*.618+.04),.66+i/n*.35],scale:.85+i/n*.72+Math.sin(i*2.1)*.33}),7);
  density(bamboo,14);place(bamboo,(i,n)=>({at:[.03+frac(i*.618)*.49,.76+i/n*.25],scale:.8+frac(i*.31)*.4}),12);
 }
 if(setting==='wooded-creek'){
  ground('树根与幽草生于溪岸，溪流另分水域');region('bank',[[0,.6],[.43,.6],[.58,1],[0,1]]);
  water.clip=region('water',[[.48,.46],[.66,.46],[.55,.67],[.83,1.1],[.48,1.1],[.37,.70]]);
  density(forest,12);place(forest,(i,n)=>({anchor:[320,388],at:i<n/2?[.03+frac(i*.618)*.28,.66+i/n*.35]:[.8+frac(i*.618)*.19,.73+frac(i*.31)*.24],scale:.9+frac(i*.4)*.48}),8);
  place(grass,(i,n)=>({at:[.08+frac(i*.618)*.35,.74+i/n*.24],scale:.38+i/n*.32}),13);
  for(const birds of layers.filter(l=>['bird','oriole'].includes(l.tool))){if(birds.tool==='bird'&&!/飞|翔/.test(analysis.poem))birds.options.pose='resting';place(birds,(i,n)=>({at:[.12+i/n*.17,.43+frac(i*.618)*.16],scale:.43+i/n*.15}),16);}
 }
 if(setting==='reed-bank'){
  const bank=region('bank',[[0,.62],[.25,.62],[.40,.83],[.28,1.1],[0,1.1]]);const g=ground('芦穗与人影位于近岸，水域留给惊起的鸟');g.clip=bank;
  water.clip=region('water',[[.25,.46],[1.1,.46],[1.1,1.1],[.28,1.1],[.40,.83],[.25,.62]]);
  density(grass,14);place(grass,(i,n)=>({at:[.04+frac(i*.618)*.31,.75+i/n*.26],scale:.76+frac(i*.31)*.4}),13);
  for(const birds of layers.filter(l=>l.tool==='bird'))place(birds,(i,n)=>({at:[.50+(i+.5)/n*.29,.60-i/n*.12],scale:.65}),20);
  if(figure)place(figure,()=>({at:[.19,.84],scale:.55}),22);
  scene.notes.push('本次鸟姿取惊起后的飞态；从临水站立到飞入芦丛的时间编排尚未实现。');
 }
 if(setting==='bamboo-hillside'){
  ground('山间竹林有共同坡面');region('bamboo',[[.4,.5],[1,.5],[1,1],[.4,1]]);
  place(bamboo,(i,n)=>({at:[.43+frac(i*.618)*.55,.74+i/n*.26],scale:.88+frac(i*.31)*.42}),8);
  place(sun,()=>({anchor:[320,95],at:[.63,.45],scale:.85}),-20);sun.regionalRelation='among';
  if(mist){place(mist,()=>({at:[.43,.42],scale:1.4}),-15);mist.regionalRelation='outside';}
 }
 if(setting==='mountain-channel'){
  ground('两岸间留出水路，作为孤帆所指舟身的依托');
  mountain.options.relief='single';density(mountain,2);place(mountain,(i,n)=>({anchor:[320,330],at:[.20+i/Math.max(1,n-1)*.6,.61],scale:1.18}),-30);
  const placement={anchor:[320,135],at:[.5,.46],scale:1.6};const inferred={tool:'water',entities:[],projectedEntities:[],names:['构图依托·两岸间水域'],options:{form:'plane'},animate:false,placement:structuredClone(placement),instances:[{placement:structuredClone(placement),variant:0,depth:0,opacity:1}],quantity:{rendered:1,exact:false,items:[]},quantityLabel:'由两岸及帆的场景推断，不计入意象覆盖',inferred:true,provenance:{basis:'local-context',reason:'两岸与帆共同暗示水路'},surface:{top:.46,bottom:1},clip:region('channel',[[.46,.46],[.58,.46],[.61,.65],[.72,.84],[.90,1.1],[.38,1.1],[.43,.77],[.44,.6]]),z:-10};layers.push(inferred);
  place(boat,()=>({at:[.51,.70],scale:.70}),20);if(sun)place(sun,()=>({anchor:[320,95],at:[.55,.34],scale:.55}),-25);
 }
 if(setting==='mountain-trails'){
  ground('山势下方承托路径');region('trails',[[0,.6],[1,.6],[1,1],[0,1]]);
  density(path,3);place(path,(i,n)=>({anchor:[310,255],at:[.12+(i+.5)/n*.76,.68-(i%2)*.05],scale:1.1+(i%2)*.3}),2);
 }
 if(setting==='field-river'){
  ground('田面和绕田水道之外仍有连贯地表');
  region('field',[[0,.44],[.62,.44],[.59,.66],[.33,1.1],[0,1.1]]);field.clip=scene.regions.field;
  place(field,()=>({anchor:[320,194],at:[.40,.47],scale:1.9}),-12);
  water.clip=region('river',[[.66,.43],[.81,.43],[.74,.63],[.57,.85],[.23,1.1],[-.05,1.1],[.40,.83],[.59,.61]]);
  if(mountain)place(mountain,(i,n)=>({anchor:[320,330],at:[.22+i/Math.max(1,n-1)*.55,.46],scale:.94}),-30);
 }
 if(setting==='settlement'){
  ground('屋舍、巷道与树根共享可见地面');region('land',[[0,.55],[1,.55],[1,1],[0,1]]);
  if(house)place(house,(i,n)=>({at:n===1?[.64,.70]:[.42+(i+.5)/n*.48,.66+frac(i*.618)*.12],scale:n===1?1.05:.65}),6);
  if(building)place(building,()=>({at:[.23,.76],scale:1.07}),5);
  if(willow){density(willow,4);place(willow,(i,n)=>({at:n<=4?[[.12,.87],[.30,.79],[.84,.78],[.96,.88]][i]:[.05+(i+.5)/n*.9,.72+frac(i*.618)*.23],scale:n<=4?[.86,.62,.65,.83][i]:.42+frac(i*.41)*.26}),9);}
  if(blossom)place(blossom,(i,n)=>({anchor:[320,388],at:n===1?[.72,.91]:[.57+i/n*.35,.79+frac(i*.618)*.17],scale:n===1?1.25:.74}),13);
  if(path)place(path,()=>({anchor:[320,194],at:[.5,.55],scale:1.6}),-12);
 }
 if(setting==='blossom-river'){
  const bank=region('bank',[[-.1,.4],[.25,.4],[.34,.52],[.53,.62],[.59,.70],[.44,.83],[.12,.92],[-.1,.98]]);
  support('ground',[.5,.43],1.8,1,'竹丛与桃花树沿同一岸面生长',bank);
  water.surface={top:.45,bottom:1};
  water.clip=region('water',[[.25,.4],[1.1,.4],[1.1,1.1],[-.1,1.1],[-.1,.98],[.12,.92],[.44,.83],[.59,.70],[.53,.62],[.34,.52]]);
  place(bamboo,(i,n)=>({at:[.04+frac(i*.618)*.23,.69+(i/n)*.17],scale:.75+frac(i*.37)*.35}),7);
  place(blossom,(i,n)=>({anchor:[320,388],at:n===1?[.43,.78]:[.34+i/n*.25,.71+frac(i*.618)*.10],scale:n===1?1.2:.72}),10);blossom.regionalRelation='outside';
  const ducks=get('bird');if(ducks)place(ducks,(i,n)=>({at:[.61+i/n*.27,.74+frac(i*.6)*.13],scale:.47+i/n*.18}),20);
 }
 if(setting==='forest-light'||setting==='woodland-retreat'){
  ground('林下地表承接树根、苔意和小径');region('forest',[[0,.2],[1,.2],[1,1],[0,1]]);
  density(forest,setting==='woodland-retreat'?23:20);
  place(forest,(i,n)=>{
   const t=(i+.5)/n,x=frac(i*.618+.07),opening=setting==='woodland-retreat'&&x>.39&&x<.76;
   return {anchor:[320,388],at:[opening?(i%2?.85:.15):x,.61+t*.43],scale:.75+t*.95+.24*Math.sin(i*2.3)};
  },5);
  forest.instances.forEach((v,i)=>{v.opacity=.43+.53*i/forest.instances.length;});
  if(house)place(house,()=>({at:[.59,.64],scale:.85}),6);
  if(path){place(path,()=>({anchor:[310,255],at:[.59,.64],scale:2.4}),4);region('path',[[.54,.63],[.65,.63],[.54,.80],[.60,1.1],[.28,1.1],[.34,.8]]);}
  const flowers=get('flower');if(flowers)place(flowers,(i,n)=>({at:[i%2?.77+frac(i*.42)*.2:.04+frac(i*.31)*.29,.70+i/n*.27],scale:.22+i/n*.28}),12);
  if(light){place(light,()=>({at:[.58,.80],anchor:[320,275],scale:1.12}),18);}
  const moss=get('landscape','moss');if(moss)place(moss,()=>({at:[.57,.86],anchor:[320,290],scale:1.1}),14);
 }
 if(setting==='winter-fishing'){
  // A distant bank is inferred scenery, never additional trees or people.
  const distant=support('mountain',[.5,.35],1.7,-32,'寒江远岸的淡山势承托水面');distant.instances[0].opacity=.25;
  place(boat,()=>({at:[.57,.76],scale:1.02}),20);
 }
 if(setting==='riverside-view'){
  const bank=region('bank',[[0,.68],[.24,.68],[.39,1],[0,1]]);const g=ground('近岸承托观看江月的人影');g.clip=bank;
  place(figure,()=>({at:[.18,.86],scale:.55}),22);
 }
 if(figure){
  if(boat){const deck=boat.instances[0].placement;place(figure,()=>({anchor:[320,310],at:[deck.at[0]-.018,deck.at[1]-.012],scale:deck.scale*.72}),22);figure.attachment={target:boat.entities[0],anchor:'deck',basis:'local-context'};scene.notes.push('钓者衣影落在舟身中段，笠沿与钓线仅作姿态提示。');}
 }
 if(setting==='mountain-waterfall'){
  support('mountain',[.5,.43],1.9,-32,'瀑布必须依托山体与落差');
  place(fall,()=>({anchor:[320,194],at:[.53,.49],scale:1.62}),4);region('cliff',[[.2,.12],[.75,.10],[.88,.89],[.21,.92]]);
 }
 if(setting==='paddy-woodland'){
  region('field',[[0,.39],[.75,.39],[.89,.62],[.81,1],[0,1]]);
  place(field,()=>({anchor:[320,194],at:[.43,.39],scale:1.95}),-12);field.clip=scene.regions.field;
  if(forest){density(forest,16);place(forest,(i,n)=>{
   const split=Math.ceil(n*.56),far=i<split,t=far?i/Math.max(1,split-1):(i-split)/Math.max(1,n-split-1);return {anchor:[320,388],at:far?[.03+t*.71+Math.sin(i*2.1)*.014,.47+Math.sin(i*1.6)*.018]:[.86+frac(i*.618)*.15,.62+t*.38],scale:far?.43+(i%3)*.06:.8+t*.46};
  },8);}
  for(const birds of layers.filter(l=>l.tool==='bird'))place(birds,(i,n)=>({at:birds.options.tone==='light'?[.15+i/n*.52,.50+Math.sin(i*1.7)*.13]:[.86+frac(i*.618)*.1,.28+frac(i*.41)*.25],scale:birds.options.tone==='light'?.46+(i/n)*.18:.38+(i/n)*.16}),20);
 }
 // Backgrounds have no semantic entity IDs and cannot improve coverage counts.
}
