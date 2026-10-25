// Existing real answers only; never calls a provider or overwrites their records.
import{readFile,writeFile}from'node:fs/promises';
import assert from'node:assert/strict';
import{collectBatch,evaluateRecord}from'./batch-audit.mjs';
import{buildPlan}from'./planner.mjs';
import{sceneProjection}from'./expression-contract.mjs';
import{constrainRecoveredPlan}from'./generation-recovery.mjs';
const batch=await collectBatch(),sweep=JSON.parse(await readFile('poem-flow/verification/batch/current-api-sweep.json')),rows=[];
for(const x of sweep.rows){
 const record=batch.cases.flatMap(c=>c.versions).find(r=>r.id===x.id);assert(record,x.case);
 const result=evaluateRecord(record);assert(result.validation.valid,x.case);
 const p=constrainRecoveredPlan(buildPlan(sceneProjection(result.analysis)),result.recovery);
 assert.deepEqual(p.layers,result.plan.concretePlan?.layers||[],x.case+' routes');
 rows.push({case:x.case,id:x.id,quantityChanges:p.sourceResolution?.changes.length||0,identityGroups:p.sourceResolution?.identities.length||0,geometryErrors:p.scene?.organization?.audit.errors||0,actorRepairs:p.scene?.organization?.actorSpacing?.repairs.length||0});
}
const report={realRepliesReplayed:rows.length,routeMismatches:0,geometryErrors:rows.reduce((n,r)=>n+r.geometryErrors,0),providerCalls:0,rows};
await writeFile('poem-flow/verification/rules/replay.json',JSON.stringify(report,null,2)+'\n');
assert.equal(report.geometryErrors,0,JSON.stringify(rows.filter(r=>r.geometryErrors)));
console.log('Replayed '+rows.length+' real replies: identical routes, zero checked geometry errors; no provider calls.');
