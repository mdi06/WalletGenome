import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { processBatchScan } from '../../src/lib/services/batchScanService';
import { processWalletScan } from '../../src/lib/services/scanService';
import { sharedCache, scanResultCache } from '../../src/lib/cache';
import type { EtherscanTransaction, WalletAccountClassification } from '../../src/lib/types';
async function main(){
const originalFetch=globalThis.fetch;
globalThis.fetch=async input=>{const u=String(input);if(u.includes('api.web3.bio'))return Response.json([]);if(u.includes('llama.fi'))return Response.json({coins:{}});if(u.includes('coingecko.com'))return Response.json({prices:[]});return new Response('',{status:503});};
try{
const wallet='0x7777777777777777777777777777777777777777';
const transaction:EtherscanTransaction={blockNumber:'1',timeStamp:'1700000000',hash:'0xinflow',nonce:'0',blockHash:'0xblock',transactionIndex:'0',from:'0x8888888888888888888888888888888888888888',to:wallet,value:'1000000000000000000',gas:'21000',gasPrice:'1',isError:'0',txreceipt_status:'1',input:'0x',contractAddress:'',cumulativeGasUsed:'21000',gasUsed:'21000',confirmations:'1',methodId:'',functionName:''};
sharedCache.clearLocal();scanResultCache.clear();
for(const [dataset,data] of [['transactions',[transaction]],['tokenTransfers',[]],['internalTransactions',[]]] as const){await sharedCache.set(`wallet-analytics:v1:history:explorer:${wallet}:1:${dataset}`,{data,status:'complete',errors:[]},3600);}
const account:WalletAccountClassification={address:wallet,chainId:1,chainName:'Ethereum',type:'eoa',confidence:'verified',evidence:'test'};
const single=await processWalletScan(wallet,[1],'',false,{accountClassifications:[account]});
const batch=await processBatchScan([wallet],[1],{classifier:async()=>account});
assert.equal(single.metrics.inflowUSD,null);assert.equal(batch.wallets[0].totalInflowUSD,0);assert.equal(batch.status,'complete');
const result={single:{history:single.status,prices:single.availability[0].prices,inflowUSD:single.metrics.inflowUSD,coverage:single.metrics.capitalFlowCoverage},cluster:{status:batch.status,totalInflowUSD:batch.totalInflowUSD,walletInflowUSD:batch.wallets[0].totalInflowUSD,priceProvenancePresent:'priceProvenance' in batch.wallets[0]}};
writeFileSync('output/full-audit-2026-09-05/cluster-price-probe.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}finally{globalThis.fetch=originalFetch;}}
void main();
