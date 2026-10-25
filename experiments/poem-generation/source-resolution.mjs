// Source-backed depiction rules. Raw subjects and quantities never change.
const digits={零:0,〇:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9};
const countChars='零〇一二两三四五六七八九十百\\d';
const units='双|对|只|匹|艘|尾|位|人|个|座|栋|杆|面|棵|株';
const countPattern=new RegExp('(['+countChars+']+)('+units+')','g');
const stripPattern=new RegExp('['+countChars+']+(?:'+units+')','g');
const slash=String.fromCharCode(92),escape=s=>[...s].map(c=>'.*+?^$()[]{}|'.includes(c)||c===slash?slash+c:c).join('');
const uncertain=c=>/并非|不是|未见|不见|岂有|假如|倘若|若有|莫道/.test(c);
export function sourceInteger(s){
 if(/^\d+$/.test(s))return Number(s);
 if(Object.hasOwn(digits,s))return digits[s];
 const hundred=s.match(/^([一二两三四五六七八九])百(?:零)?(.*)$/);
 if(hundred){const rest=hundred[2]?sourceInteger(hundred[2]):0;return rest===null?null:digits[hundred[1]]*100+rest;}
 const ten=s.match(/^([一二两三四五六七八九]?)十([一二三四五六七八九]?)$/);
 return ten?(ten[1]?digits[ten[1]]:1)*10+(ten[2]?digits[ten[2]]:0):null;
}
export function resolveSource(a){
 const quantities={},identities=[],changes=[],clauses=a.poem.split(/[，。；！？\n]/);
 for(const e of a.entities){
  if(e.role!=='scene'||e.presence!=='present'||e.quantity?.scope==='part')continue;
  const names=e.mentions.map(m=>m.replace(stripPattern,'')).filter(Boolean),matches=[];
  for(const c of clauses.filter(c=>e.mentions.some(m=>c.includes(m))&&!uncertain(c))){
   for(const m of c.matchAll(countPattern)){
    const before=c.slice(0,m.index),after=c.slice(m.index+m[0].length);
    const attached=names.some(n=>before.endsWith(n)||after.startsWith(n)&&!/^的?(?:翅膀|羽翼|马蹄|脚|爪|花瓣|枝条|树枝|叶片|翅|翼|足|蹄|瓣)/.test(after.slice(n.length)))||m[2]==='人'&&names.includes('人');
    if(attached)matches.push({quote:c,count:sourceInteger(m[1]),unit:m[2]});
   }
  }
  if(matches.length!==1||!matches[0].count||matches[0].count>200)continue;
  const {quote,count,unit}=matches[0],paired=['双','对'].includes(unit),individuals=paired?count*2:count,q=e.quantity||{mode:'unspecified',min:null,max:null,unit:null,scope:'unspecified',extent:'unspecified',evidence:[]},scope=paired?'group':'individual';
  if(q.mode==='exact'&&q.scope==='individual'&&q.min===individuals&&q.max===individuals)continue;
  if(q.mode==='exact'&&q.scope===scope&&q.unit===unit&&q.min===count&&q.max===count)continue;
  quantities[e.id]={...q,mode:'exact',min:count,max:count,unit,scope,evidence:[quote]};
  changes.push({kind:paired?'paired-unit':'individual-unit',entity:e.id,evidence:[quote],original:e.quantity?structuredClone(q):null,resolved:quantities[e.id],individuals});
 }
 const people=a.entities.filter(e=>e.kind==='person'&&e.role==='scene'&&e.presence==='present'&&(!e.quantity||e.quantity.mode==='unspecified'));
 const parent=new Map(people.map(e=>[e.id,e.id])),links=[],find=id=>parent.get(id)===id?id:find(parent.get(id));
 for(const subject of people)for(const other of people){
  if(subject===other)continue;
  const quote=clauses.find(c=>!/不|未|非|若|如|假使|倘|岂|何尝/.test(c)&&subject.mentions.some(m=>other.mentions.some(n=>new RegExp(escape(m)+'(?:亦|也|本|正)?(?:是|乃|为)(?:一位|一个|一名)?'+escape(n)).test(c))));
  if(!quote)continue;
  parent.set(find(other.id),find(subject.id));links.push({members:[subject.id,other.id],quote});
 }
 const groups=new Map();for(const e of people){const root=find(e.id);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(e.id);}
 for(const [representative,members]of groups)if(members.length>1)identities.push({representative,members,evidence:[...new Set(links.filter(l=>l.members.every(id=>members.includes(id))).map(l=>l.quote))],basis:'source-affirmative-identity'});
 return {version:'source-depiction-1.1',quantities,identities,changes};
}
