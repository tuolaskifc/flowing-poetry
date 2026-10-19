import test from 'node:test';
import assert from 'node:assert/strict';
import recommendation from './recommendation.js';
const {scorePoem,rankCandidates,collectCandidates}=recommendation;
const result=poem=>({status:'success',data:{content:poem,origin:{author:'测试作者',title:'测试篇目'},token:'not-to-be-retained'},token:'not-to-be-retained',ipAddress:'not-to-be-retained'});
const fast={intervalMs:0,wait:async()=>{}};

test('longest compounds win, supported species survive generic exclusions, repeats count once',()=>{
  assert.deepEqual(scorePoem('柳絮落花荷叶梅花菊花兰花').hits.map(h=>h.tool),['catkins','falling-petals','lotus','plum-branch','flower-forms','orchid']);
  assert.equal(scorePoem('花花花，明月月月').toolCount,2);
  assert.equal(scorePoem('荷叶荷花莲花').toolCount,1);
  assert.deepEqual(scorePoem('露水清泉水').hits.map(h=>h.tool),['surface-weather','water','water']);
});
test('months, named places and unsupported compounds do not become drawable substrings',()=>{
  for(const poem of ['十月二月2026年10月','提剑出燕京','木兰兰桡莲子莲蓬桃花桂花夜莺','风流风骨岁月'])assert.equal(scorePoem(poem).toolCount,0,poem);
  assert.equal(scorePoem('三月明月').toolCount,1);
  assert.deepEqual(scorePoem('兰舟梅雨').hits.map(h=>h.tool),['boat','rain']);
  assert.equal(scorePoem('只有风').score,0);
});
test('ranking deduplicates poems and rewards drawable diversity instead of repetition or metadata',()=>{
  const ranked=rankCandidates([{poem:'花花花花花',source:{title:'明月清泉柳絮'}},{poem:'提剑出燕京'},{poem:'月照水，柳含烟。'},{poem:'月照水柳含烟'}]);
  assert.equal(ranked.length,3);assert.equal(ranked[0].selection.toolCount,3);assert.equal(ranked[1].selection.toolCount,1);assert.equal(ranked[2].selection.toolCount,0);
  assert.equal(scorePoem('花花花花花').score,scorePoem('花').score);
  assert.equal(scorePoem('月水柳竹草').score,scorePoem('月水柳竹').score);
});
test('five bounded calls rank and deduplicate candidates without retaining SDK credentials',async()=>{
  let calls=0;const poems=['提剑出燕京','花','月水柳','花','风'];
  const batch=await collectCandidates(async()=>result(poems[calls++]),{...fast,limit:100});
  assert.equal(calls,5);assert.equal(batch.attempts,5);assert.equal(batch.received,5);assert.equal(batch.duplicates,1);assert.equal(batch.candidates[0].poem,'月水柳');assert.equal(batch.error,null);
  assert(!JSON.stringify(batch).includes('not-to-be-retained'));
});
test('a failed or timed out call stops the batch, preserving earlier candidates without retries',async()=>{
  let calls=0;
  const partial=await collectCandidates(async()=>{if(calls++===0)return result('月水');throw new Error('接口失败');},fast);
  assert.equal(calls,2);assert.equal(partial.candidates[0].poem,'月水');assert.equal(partial.error,'接口失败');
  let late;
  const timeout=await collectCandidates(()=>new Promise(resolve=>{late=resolve;}),{...fast,timeoutMs:8});
  assert.equal(timeout.attempts,1);assert.equal(timeout.candidates.length,0);assert.match(timeout.error,/超时/);late(result('迟到的月'));
  await new Promise(resolve=>setTimeout(resolve,5));assert.equal(timeout.candidates.length,0);
});
test('invalid length and an entirely unsupported batch never inject a fallback poem',async()=>{
  const bad=await collectCandidates(async()=>result('月'.repeat(201)),fast);assert.equal(bad.candidates.length,0);assert.equal(bad.attempts,1);
  const empty=await collectCandidates(async()=>result('君子死知己，提剑出燕京。'),fast);assert.equal(empty.attempts,5);assert.equal(empty.candidates.length,1);assert.equal(empty.candidates[0].selection.toolCount,0);
});
