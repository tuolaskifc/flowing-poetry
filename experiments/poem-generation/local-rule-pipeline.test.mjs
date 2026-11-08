import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeLocally} from './local-rule-pipeline.mjs';

test('offline source words pass through shared quantity and drawing policies',()=>{
 const x=analyzeLocally('两只白鹭临清泉。');assert(x.validation.valid);assert.equal(x.source,'local-rule-experiment');
 const p=x.plan.concretePlan,bird=p.layers.find(l=>l.names.includes('白鹭'));assert.equal(bird.instances.length,2);assert(p.drawingPolicy);assert(p.sourceResolution.changes.length);assert(p.layers.every(l=>!l.animate&&!l.motion));
});
test('negation, comparisons and cross-clause conditions do not manufacture subjects',()=>{
 for(const poem of ['不见白鹭。','江水如长剑。','若明月升起，清泉流。']){const x=analyzeLocally(poem);assert(x.validation.valid);assert.equal(x.analysis.entities.length,0);assert(!x.plan.concretePlan);assert(x.deferred.length);assert.equal(x.plan.expression.recommendation,'abstract');}
 const x=analyzeLocally('不见白鹭，明月照清泉。');assert(!x.analysis.entities.some(e=>e.mentions.includes('白鹭')));assert(x.analysis.entities.some(e=>e.mentions.includes('明月')));
});
test('unrecognized, repeated and ambiguous terms stay visible in the audit',()=>{
 for(const poem of ['杜鹃啼。','明月照明月。','心绪。']){const x=analyzeLocally(poem);assert(x.validation.valid);assert(x.deferred.length);assert.equal(x.analysis.entities.length,0);}
 assert.throws(()=>analyzeLocally(''));assert.throws(()=>analyzeLocally('字'.repeat(201)));
});
test('local analysis makes no network requests and uses common source colors',()=>{
 const previous=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('unexpected network');};
 try{const x=analyzeLocally('红梅映清泉。');assert(x.validation.valid);assert.equal(calls,0);const plum=x.plan.concretePlan.layers.find(l=>l.names.includes('红梅'));assert.equal(plum.colorCue.word,'红');assert.equal(plum.colorCue.basis,'source-literal');}
 finally{globalThis.fetch=previous;}
});
