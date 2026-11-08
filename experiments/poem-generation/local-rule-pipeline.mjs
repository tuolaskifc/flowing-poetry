// Isolated, deliberately conservative experiment. Never calls a provider or
// reads saved model answers; the normal service does not import this module.
import recommendation from './recommendation.js';
import {validateExpression} from './expression-contract.mjs';
import {buildExpressionPlan} from './expression-plan.mjs';

const quantity=()=>({mode:'unspecified',min:null,max:null,unit:null,scope:'unspecified',extent:'unspecified',evidence:[]});
const unsafe=/(?:不|未|无|非|莫|勿|没|绝|灭|若|倘|假|如|似|犹|仿佛|好像|恐|欲|愿|梦|忆|思|想|盼|望|闻|听|声|香|杜鹃|人眼|眼前|眼底|泪|心|岁月|天涯|天下|星星)/;
const kind=tool=>({figure:'person',bird:'organism',oriole:'organism',horse:'organism',fish:'organism',flower:'organism',tree:'organism',willow:'organism',bamboo:'organism',lotus:'organism',orchid:'organism',water:'environment',rain:'environment',snow:'environment',cloud:'environment',mist:'environment',landscape:'environment',moon:'environment'})[tool]||'object';

export function analyzeLocally(poem){
 if(typeof poem!=='string'||!poem.trim()||[...poem].length>200)throw new Error('请输入 1–200 字诗句。');
 const hits=[],deferred=[],clauses=poem.match(/[^，。；！？、\n]+/g)||[];
 const globalAmbiguity=/(?:若|倘|假如|如果|假使|仿佛|好像)/.test(poem);
 for(const clause of clauses){
  const scan=recommendation.scorePoem(clause);
  if(globalAmbiguity||unsafe.test(clause)){deferred.push({text:clause,reason:'含否定、比喻、可能、感官或其他歧义线索，本地暂不判定'});continue;}
  for(const hit of scan.hits){if(hit.word.length===1){deferred.push({text:hit.word,reason:'单字容易属于复合词，暂不直接断定物象'});continue;}hits.push({...hit,clause});}
  if(scan.blocked.length)deferred.push({text:clause,reason:'包含未支持或有歧义的词：'+scan.blocked.join('、')});
  if(!scan.hits.length&&!scan.blocked.length)deferred.push({text:clause,reason:'未匹配到可确认的意象'});
 }
 const counts=new Map();for(const h of hits)counts.set(h.word,(counts.get(h.word)||0)+1);
 const usable=hits.filter(h=>{if(counts.get(h.word)>1){deferred.push({text:h.word,reason:'重复称谓可能同指，暂不判断主体数'});return false;}return true;});
 if(usable.length>6)deferred.push({text:poem,reason:'超过当前结构的六个主体上限，余项未纳入'});
 const entities=usable.slice(0,6).map((h,i)=>({id:'i'+(i+1),mentions:[h.word],concept:h.word,kind:kind(h.tool),role:'scene',presence:'present',evidence:[h.word],quantity:quantity()}));
 const analysis={schema_version:'expression-1.0',poem,reading:'本地试验只识别部分文字线索，未完成完整诗义分析。',entities,relations:[],atmosphere:{labels:[],valence:'unclear',energy:'unclear',tension:'unclear',openness:'unclear',evidence:[poem]},time:{markers:[],note:null},uncertainties:['本地词语匹配不能保证词义、在场、指代或句间关系正确。'],spatial:[],scene:{setting:{kind:'unclear',basis:'inferred',evidence:[]},groups:[],supports:[],actions:[],atmosphere:{visibility:'unclear',illumination:'unclear',basis:'inferred',evidence:[]}},expression:{relations:[],processes:[]}};
 const validation=validateExpression(analysis,poem);
 if(!validation.valid)return {source:'local-rule-experiment',poem,analysis,validation,deferred,plan:null};
 const plan=buildExpressionPlan(analysis);
 // In the absence of interpreted actions, do not imply that defaults were read from the poem.
 for(const p of [plan.concretePlan,...(plan.concretePlan?.compositions||[])])for(const layer of p?.layers||[]){layer.animate=false;delete layer.motion;}
 return {source:'local-rule-experiment',poem,analysis,validation,deferred,plan,limitations:['词语匹配是试验性猜测，不代表完整诗义；句法、复杂指代、动作与时序暂未解析。','没有模型调用，也没有读取保存的模型解读。']};
}
