const assert=require('assert');
const feeRate=0.03,feeGst=0.18,priceGst=0.18,usdInr=90;
function calc(price,apiReserve,infraReserve){const net=price/(1+priceGst);const gateway=price*feeRate*(1+feeGst);return {net,gateway,contribution:net-gateway-apiReserve-infraReserve};}
let pass=0;function t(name,fn){fn();pass++;console.log('PASS',name)}
t('Pro contribution exceeds ₹200 under the documented reserve assumptions',()=>{const x=calc(599,150,75);assert(x.contribution>200);assert(Math.abs(x.contribution-261.42)<0.02)});
t('Ultra contribution exceeds ₹500 under the documented reserve assumptions',()=>{const x=calc(1299,300,150);assert(x.contribution>500);assert(Math.abs(x.contribution-604.86)<0.02)});
t('AI budget scenarios cover 50 and 200 capped requests at $1/$5 per million tokens',()=>{const perRequest=(5500/1e6)*1+(1800/1e6)*5;assert(Math.round(50*perRequest*usdInr)<=150);assert(Math.round(200*perRequest*usdInr)<=300)});
console.log(`${pass} passed, 0 failed`);
