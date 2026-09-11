import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { analyzeApprovals } from '../../src/lib/analysis/approvals';
import { parseJsonBody, enforceRequestRateLimit, resetRequestPolicyForTests, validateBatchRequest } from '../../src/lib/api/requestPolicy';
import { processBatchScan } from '../../src/lib/services/batchScanService';
import type { ProcessedTransaction, EtherscanTokenTransfer } from '../../src/lib/types';

async function main() {
const wallet = '0x1234567890123456789012345678901234567890';
const spender = '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45';
const token = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const tx: ProcessedTransaction = {hash:'0xapproval',timestamp:100,date:'2026-09-05',from:wallet,to:token,value:'0',valueFormatted:0,valueUSD:0,valueUSDProvenance:'historical',gasUsed:50000,gasPrice:1,gasCostETH:0.0001,gasCostUSD:0.3,gasCostUSDProvenance:'historical',isError:false,methodId:'0x095ea7b3',functionName:'approve',input:`0x095ea7b3${'0'.repeat(24)}${spender.slice(2)}${'f'.repeat(64)}`,category:'approval',chainId:1};
const transfer = (from:string,to:string,value:string,decimals='6'): EtherscanTokenTransfer => ({blockNumber:'1',timeStamp:'1700000000',hash:'0xtransfer'+value,nonce:'0',blockHash:'0xblock',from,contractAddress:token,to,value,tokenName:'Test',tokenSymbol:'TEST',tokenDecimal:decimals,transactionIndex:'0',gas:'0',gasPrice:'0',gasUsed:'0',cumulativeGasUsed:'0',input:'0x',confirmations:'1'});
const self = analyzeApprovals([tx],[transfer(spender,wallet,'100000000'),transfer(wallet,wallet,'100000000')],wallet,1).activeApprovals[0];
assert.equal(self.estimatedTokenBalance,0);
const zeroDecimals = analyzeApprovals([tx],[transfer(spender,wallet,'100','0')],wallet,1).activeApprovals[0];
assert.equal(zeroDecimals.estimatedTokenBalance,1e-16);
let bytesProduced=0;
const body = new ReadableStream<Uint8Array>({pull(controller){if(bytesProduced>=65536){controller.close();return;} bytesProduced+=4096;controller.enqueue(new Uint8Array(4096).fill(32));}});
const request = new Request('http://localhost/api/scan',{method:'POST',body,duplex:'half'} as RequestInit);
let bodyCode='';try{await parseJsonBody(request,'scan');}catch(e){bodyCode=(e as {code:string}).code;}
assert.equal(bodyCode,'body_too_large');assert.equal(bytesProduced,65536);
resetRequestPolicyForTests(); let accepted=0;for(let i=0;i<24;i++){enforceRequestRateLimit(new Request('http://localhost',{headers:{'x-forwarded-for':`192.0.2.${i}`}}),'scan');accepted++;}
const valid=validateBatchRequest({addresses:['vitalik.eth'],chainIds:[1]});
const ens=await processBatchScan(valid.addresses,valid.chainIds);
assert.equal(ens.failedWallets[0].reasons[0].code,'unsupported_target');
const findings={approvalSelfTransfer:{expectedBalance:100,actualBalance:self.estimatedTokenBalance,exposureStatus:self.exposureStatus,exposureUSD:self.estimatedExposureUSD},zeroDecimalBalance:{expected:100,actual:zeroDecimals.estimatedTokenBalance,note:'Synthetic token metadata isolates decimal parsing, not a claim about USDC decimals.'},bodyLimit:{configuredBytes:8192,bytesProducedBeforeRejection:bytesProduced,code:bodyCode},forwardedIdentity:{accepted,scope:'Direct helper reproduction; deployed proxy header trust unverified'},batchEns:{validatorAccepted:valid.addresses,failure:ens.failedWallets[0]}};
writeFileSync('output/full-audit-2026-09-05/probes.json',JSON.stringify(findings,null,2)+'\n');console.log(JSON.stringify(findings,null,2));
}
void main();
