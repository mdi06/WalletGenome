import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { processWalletScan } from '../../src/lib/services/scanService';
import { scanResultCache, sharedCache, domainRateLimiters } from '../../src/lib/cache';
import type { WalletAccountClassification } from '../../src/lib/types';
async function main(){
const originalFetch=globalThis.fetch;
let explorerCalls=0;
globalThis.fetch=async input=>{
 const url=String(input);
 if(url.includes('etherscan.io')||url.includes('blockscout.com')) {explorerCalls++;await new Promise<void>(resolve=>setImmediate(resolve));return Response.json({status:'0',message:'No transactions found',result:[]});}
 if(url.includes('api.web3.bio'))return Response.json([]);
 return new Response('',{status:503});
};
const output=[];
try{for(const signaled of [false,true]){
scanResultCache.clear();sharedCache.clearLocal();domainRateLimiters.clear();explorerCalls=0;
const wallet='0x8888888888888888888888888888888888888888';
const account:WalletAccountClassification={address:wallet,chainId:1,chainName:'Ethereum',type:'eoa',confidence:'verified',evidence:'test'};
const run=()=>processWalletScan(wallet,[1],'',false,{accountClassifications:[account],...(signaled?{signal:new AbortController().signal}:{})});
const results=await Promise.all([run(),run()]);
assert.equal(explorerCalls,signaled?6:3);
output.push({signaled,explorerCalls,statuses:results.map(r=>r.status)});
}}finally{globalThis.fetch=originalFetch;}
writeFileSync('output/full-audit-2026-09-05/coalescing-probe.json',JSON.stringify(output,null,2)+'\n');console.log(output);
}
void main();
