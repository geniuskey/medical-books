const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),body=fs.readFileSync(path.join(root,'js/body.js'),'utf8'),ctx={};vm.runInNewContext(body,ctx);const BD=ctx.BD;
let inlineScripts=0;for(const name of fs.readdirSync(path.join(root,'chapters'))){const src=fs.readFileSync(path.join(root,'chapters',name),'utf8');for(const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(/src\s*=/.test(m[1])||!m[2].trim())continue;if(/application\/ld\+json/.test(m[1]))JSON.parse(m[2]);else{new vm.Script(m[2],{filename:name});inlineScripts++;}}}
let bloodPressureCases=0;
const SB=[89,90,119,120,129,130,139,140,159,160,179,180,181,200],DB=[59,60,79,80,89,90,99,100,109,110,119,120,121];
function refBP(s,d){const ranks=[s>=160?3:s>=140?2:s>=130?1:s>=120?.5:0,d>=100?3:d>=90?2:d>=80?1:0];const r=Math.max(...ranks);return r||((s<90||d<60)?.5:0);}
for(const s of SB)for(const d of DB){assert.equal(BD.bpClass(s,d).level,refBP(s,d));assert(!BD.bpClass(s,d).label.includes('3기'));bloodPressureCases++;}
assert.equal(BD.bpClass(180,110).key,'h2');assert.equal(BD.bpClass(128,82).key,'pre');
let renalCases=0;
for(const sd of [0,35,70])for(let g=0;g<=600;g++){const r=BD.renalGlucose(g,{sd});assert(r.reabsorbed>=0&&r.excreted>=0&&r.excreted<=r.filtered);assert(Math.abs(r.reabsorbed+r.excreted-r.filtered)<1e-10);if(sd===0)assert.equal(r.excreted,Math.max(0,1.25*g-375));renalCases++;}
// Independent Simpson integration of excess load over a Gaussian capacity distribution.
let integralCases=0;for(const sd of [35,70])for(const g of [100,180,200,250,300,350,400,500]){
 const F=1.25*g,lo=-12,hi=(F-375)/sd,n=20000,h=(hi-lo)/n;
 const integrand=z=>(F-375-sd*z)*Math.exp(-z*z/2)/Math.sqrt(2*Math.PI);
 let sum=integrand(lo)+integrand(hi);for(let i=1;i<n;i++)sum+=(i%2?4:2)*integrand(lo+i*h);
 assert(Math.abs(BD.renalGlucose(g,{sd}).excreted-sum*h/3)<1e-5);integralCases++;
}
assert.equal(BD.renalGlucose(0).reabsorbed,0);assert(Math.abs(BD.renalGlucose(300).reabsorbed-347.07404)<1e-5);
const lab=fs.readFileSync(path.join(root,'chapters/lab.html'),'utf8');const exact=72+.7*(208-.7*34-72);assert.equal(Math.round(exact),151);assert(lab.includes('data-correct>약 151 bpm'));
const gloss=fs.readFileSync(path.join(root,'chapters/glossary.html'),'utf8'),gctx={};
const gi=gloss.indexOf('    var ITEMS = ['),gj=gloss.indexOf('    var sel =',gi);
vm.runInNewContext(gloss.slice(gi,gj),gctx);const item=gctx.ITEMS.find(x=>x.k==='gfr');
let gfrCases=0;for(const [v,want] of [[0,'G5'],[14,'G5'],[15,'G4'],[29,'G4'],[30,'G3b'],[44,'G3b'],[45,'G3a'],[59,'G3a'],[60,'G2'],[89,'G2'],[90,'G1'],[140,'G1']]) {
 const zone=item.zones.find((z,i)=>v<z[1]||i===item.zones.length-1);assert(zone[3].startsWith(want));gfrCases++;
}
assert(item.note.includes('3개월')&&item.note.includes('신장 손상'));
console.log(JSON.stringify({gfrCases,inlineScripts,bloodPressureCases,renalCases,integralCases,heartRate:exact}));
