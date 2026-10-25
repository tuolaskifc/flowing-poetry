// Colors are attached to an entity's own source words, never an unrelated noun.
const palette={红:'#D95860',朱:'#D95860',丹:'#D95860',赤:'#D95860',碧:'#328761',绿:'#328761',翠:'#328761',青:'#427E73',白:'#F8F7EB',素:'#F8F7EB',黄:'#D7AF50',金:'#D7AF50',紫:'#9168AF',黑:'#37404A'};
const colors=Object.keys(palette).join('');
const slash=String.fromCharCode(92),escape=s=>[...s].map(c=>'.*+?^$()[]{}|'.includes(c)||c===slash?slash+c:c).join('');
function entityColor(e,poem){
 for(const clause of poem.split(/[，。；！？\n]/))for(const m of e.mentions){
  if(!clause.includes(m))continue;
  const embedded=m.match(new RegExp('(['+colors+'])(?:色)?(?=梅|花|荷|莲|菊|叶|草|竹|松|树|林|山|水|江|溪|湖|鸟|鹭|鸥|鹤|云|雪|衣|旗|帆)'));
  const before=clause.match(new RegExp('(['+colors+'])(?:色)?'+escape(m)));
  const after=clause.match(new RegExp(escape(m)+'(?:无穷|别样|分外|更|愈|逾|尤|尽|皆|自|初|正|成|浓|淡){0,2}(['+colors+'])'));
  const word=(embedded||before||after)?.[1];if(word)return {word,evidence:clause};
 }
 return null;
}
export function sourceColorCue(a,l){
 const matches=a.entities.filter(e=>l.entities.includes(e.id)).map(e=>entityColor(e,a.poem)).filter(Boolean);
 if(matches.length&&new Set(matches.map(v=>v.word)).size===1){
  const {word}=matches[0],color=['绿','碧','翠'].includes(word)&&l.tool==='water'?'#288F90':word==='青'&&['water','cloud'].includes(l.tool)?'#4D8EAD':palette[word];
  return {color,word,evidence:matches.map(v=>v.evidence).join('／'),basis:'source-literal'};
 }
 if(l.tool==='bird'&&l.options.tone==='light')return {color:'#F8F7EB',word:'白',evidence:l.names.join('／'),basis:'source-literal'};
 if(l.tool==='flower'&&a.entities.some(e=>l.entities.includes(e.id)&&e.evidence.some(q=>q.includes('花欲燃'))))return {color:'#D95049',word:'燃',evidence:'花欲燃',basis:'local-color-interpretation'};
 return null;
}
