import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectIntent} from '../web/intent.js';
const job='07'.repeat(32), recipient='component_'+'42'.repeat(32);
function sample(){return {schema:'oncerail.intent.v1',network:'localnet',vault:'component_'+'31'.repeat(32),job,recipient,payer:'19'.repeat(32),amount_micro:'100',expiry_epoch:'5',message:`oncerail:v1|${job}|${recipient}|100|5`,args:[{Literal:'5820'+job},{Literal:'d8805820'+recipient.slice(10)},{Literal:'1864'},{Literal:'05'},{Literal:'81820081825820'+'11'.repeat(32)+'5820'+'22'.repeat(32)}]};}
test('matches metadata to actual encoded payment',()=>{assert.equal(inspectIntent(sample()).amount_micro,'100');});
test('rejects a forged amount displayed beside different actual arguments',()=>{const j=sample();j.amount_micro='999';assert.throws(()=>inspectIntent(j),/differ/);});
test('rejects a forged recipient',()=>{const j=sample();j.recipient='component_'+'aa'.repeat(32);assert.throws(()=>inspectIntent(j),/differ/);});
test('rejects an altered signed-message description',()=>{const j=sample();j.message+='extra';assert.throws(()=>inspectIntent(j),/description differs/);});
test('rejects unsafe numeric representations and values beyond u64',()=>{for(const value of [100,'1e2','-1','18446744073709551616']){const j=sample();j.amount_micro=value;assert.throws(()=>inspectIntent(j));}});
test('rejects a seed or unrelated JSON instead of interpreting it as an intent',()=>{assert.throws(()=>inspectIntent({seed:'unrelated test input'}),/not a OnceRail/);});
