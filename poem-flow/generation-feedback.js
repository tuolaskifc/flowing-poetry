// Shared, plain-language generation states. No raw model output is injected as HTML.
window.PoemGenerationFeedback=(()=>{
 function failure(record,retained){
  if(record?.delivery?.reason==='drawing-gap')return record.delivery.message+(retained?' 当前保留的是上次画面。':'')+' 可换一句，或回看已有解读。';
  return (record?.delivery?.message||'这次解读尚未完成核验，未生成本句画面。')+(retained?' 当前保留的是上次画面。':'')+' 可点击“重试本句”，或回看已有解读。';
 }
 function success(record,suffix){return (record.provenance?.kind==='authored-calibration'?'手工语义校准重放；未调用模型。':record.delivery?.status==='partial'?record.delivery.message:record.recovery?.message||(record.cached?'已有真实解读重放':'本次真实解读'))+' '+suffix;}
 function notes(record){
  const r=record.recovery;if(!r)return [];
  const range=(r.changes||[]).some(c=>c.kind==='source-range-only')?['部分引用按同句或相邻原句展开，关联是否合理仍待复核。']:[];
  return [r.message,...range,...(r.omitted||[]).map(o=>o.claim.evidence?.length?'暂未采用“'+o.claim.evidence.join('／')+'”对应的联系或过程，保留其他已核验内容。':'有一部分联系或过程未返回，暂不执行，保留其他已核验内容。')];
 }
 function installReplay({mode,show,isBusy}){
  const button=document.createElement('button');button.id='replay-latest';button.type='button';button.textContent='回看最近生成';button.hidden=true;document.getElementById('generate').after(button);let recent=null;
  const remember=record=>{if(record?.validation?.valid&&record.plan&&record.plan.renderability?.status!=='unavailable'){recent=record;button.hidden=false;}};
  const load=async()=>{try{const r=await fetch('/api/latest?mode='+mode);if(r.ok)remember((await r.json()).record);}catch{}return recent;};
  const open=async()=>{if(isBusy()||!recent)return;button.disabled=true;try{await show({...recent,cached:true});}finally{button.disabled=false;}};
  button.onclick=()=>open().catch(()=>{document.getElementById('status').textContent='最近画面暂时未能载入，可以重试或选择已有样句。';});load();
  return {remember,load,open};
 }
 return Object.freeze({failure,success,notes,installReplay});
})();
