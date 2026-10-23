// Authored calibration semantics. Never presented as API responses.
import {fixture} from './quantity-fixtures.mjs';
import {benchmarks} from './scene-benchmarks.mjs';
export const claim=(evidence,basis='inferred')=>({basis,evidence:[evidence]});
export const group=(members,role,pattern,depth,quote)=>({members,role,pattern,depth,...claim(quote)});
export const action=(entity,state,pace,direction,quote,modality='asserted')=>({entity,state,pace,direction,modality,...claim(quote)});
export function asComposition(analysis,scene={}){
 return {...structuredClone(analysis),schema_version:'3.3',spatial:structuredClone(analysis.spatial||[]),scene:{setting:{kind:'unclear',basis:'inferred',evidence:[]},groups:[],supports:[],actions:[],atmosphere:{visibility:'unclear',illumination:'unclear',basis:'inferred',evidence:[]},...scene}};
}
export function slowScene(){
 const poem='漠漠帆来重，冥冥鸟去迟。';
 const a=asComposition(fixture(poem,[{text:'帆',kind:'object'},{text:'鸟'}]),{
  setting:{kind:'waterside',...claim(poem)},
  groups:[group(['i1'],'subject','single','middle','漠漠帆来重'),group(['i2'],'accent','flock','far','冥冥鸟去迟')],
  supports:[{entity:'i1',surface:'water',target:null,...claim('漠漠帆来重')}],
  actions:[action('i1','float','slow','approach','漠漠帆来重'),action('i2','fly','slow','recede','冥冥鸟去迟')],
  atmosphere:{visibility:'hazy',illumination:'twilight',...claim(poem)}
 });a.atmosphere.energy='low';a.atmosphere.openness='high';return a;
}
export function fisherScene(){
 const a=structuredClone(benchmarks[11].analysis),p=a.poem;
 return asComposition(a,{setting:{kind:'waterside',...claim(p)},groups:[group(['i1','i2'],'subject','single','middle',p),group(['i3'],'environment','field','middle',p),group(['i4'],'accent','field','unspecified',p)],supports:[{entity:'i1',surface:'water',target:'i3',...claim(p)},{entity:'i2',surface:'boat',target:'i1',...claim(p)}],actions:[action('i1','float','slow','unspecified',p),action('i2','still','unspecified','unspecified',p),action('i4','fall','slow','down',p)],atmosphere:{visibility:'hazy',illumination:'day',...claim(p)}});
}
export function forestScene(){
 const a=structuredClone(benchmarks[8].analysis),p=a.poem;
 return asComposition(a,{setting:{kind:'woodland',...claim(p)},groups:[group(['i1'],'accent','single','near',p),group(['i2'],'environment','grove','middle',p),group(['i3'],'accent','field','near',p)],supports:[{entity:'i2',surface:'ground',target:null,...claim(p)}],actions:[],atmosphere:{visibility:'clear',illumination:'twilight',...claim(p)}});
}
export function withoutScene(a){const b=structuredClone(a);b.schema_version='3.2';delete b.scene;return b;}
