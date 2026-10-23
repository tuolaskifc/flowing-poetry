// Fixed local replays: three raw-valid records and two source-range expansions.
import {readFile} from 'node:fs/promises';
import {buildPlan} from './planner.mjs';
import {expandSourceContext} from './source-context.mjs';
export async function loadLandscapeStudies(){
 const source=JSON.parse(await readFile(new URL('./semantic-live-cases.json',import.meta.url),'utf8'));
 const names={s02:'山溪',s03:'深林',s05:'村舍',s04:'江雪',s06:'水田'},palettes={s02:'mineral',s03:'mineral',s05:'cinnabar',s04:'indigo',s06:'mineral'},result=[];
 for(const id of Object.keys(names)){
  const c=source.cases.find(c=>c.id===id),r=JSON.parse(await readFile(new URL('../../poem-flow/verification/semantics/'+id+'-record.json',import.meta.url),'utf8')),context=expandSourceContext(r.analysis,r.poem),analysis=context.effectiveAnalysis||r.analysis;
  if(!(context.applied?context.validation:r.validation).valid)throw new Error('Unusable study '+id);
  const record={id:r.id,poem:r.poem,analysis:r.analysis,...(context.applied?{effectiveAnalysis:analysis,sourceContext:{applied:true,reviewRequired:true,changes:context.changes},rawValidation:r.validation}:{}),validation:context.applied?context.validation:r.validation,plan:buildPlan(analysis),cached:true,elapsed_seconds:r.elapsed_seconds,model:r.model,usage:r.usage,source:{provider:'既有回答 · 风景构图试看',author:c.author,title:c.title,dynasty:c.dynasty}};
  result.push({id,name:names[id],palette:palettes[id],source:c.source,record});
 }
 return result;
}
