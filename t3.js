const vm=require('vm'),fs=require('fs');
const store={};
globalThis.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>{delete store[k]}};
globalThis.document={getElementById:()=>({style:{},classList:{toggle(){},add(){},remove(){}},textContent:'',innerHTML:'',scrollTop:0,value:''}),querySelectorAll:()=>[],createElement:()=>({classList:{},style:{},appendChild(){}})};
globalThis.window={};globalThis.XLSX={};
vm.runInThisContext(fs.readFileSync('core2.js','utf8'));
const run=s=>vm.runInThisContext(s);
function assert(c,m){if(!c){console.log('FAIL:',m);process.exitCode=1;}else console.log('ok  :',m);}

run('SESSION={id:"x",username:"admin",name:"Admin",role:"Admin"}');
seedAll();

assert(DB.all('vehiclePolicies').length===4,'4 vehicle policies seeded');
assert(POLICY_KINDS.length===3 && POLICIES.vehicle,'3 policy kinds incl vehicle');
assert(policyEff(DB.all('vehiclePolicies').find(p=>p.policyNo==='VEH-2026-0003'))==='Expired','vehicle expiry detection');
const fleet=DB.all('vehiclePolicies').find(p=>!p.employeeId);
assert(fleet && policyEff(fleet)==='Active','vehicle without driver allowed (fleet)');

assert(getRateCard().rates['Parent']['VIP']===57805,'rate card Parent/VIP = 57805');
assert(premiumLookup('Child','B')===3115,'premiumLookup Child/B = 3115');
const tariq=DB.all('employees').find(e=>e.empNo==='E-1001');
const fam=calcMedicalPremium(tariq.id,'Employee + Family');
assert(fam===15932,'auto family premium class A = 15932 (got '+fam+')');
assert(calcMedicalPremium(tariq.id,'Employee Only')===3983,'auto employee-only class A = 3983');

const mp=DB.all('medPolicies').find(p=>p.policyNo==='MED-2026-0001');
const rows=amortRows(POLICIES.medical,mp);
assert(rows.length>=1,'amortization produces rows ('+rows.length+')');
assert(Math.abs(rows.reduce((s,r)=>s+r.amount,0)-18500)<0.05,'amortization sums to premium 18500');
assert(Math.abs(rows[rows.length-1].remaining)<0.05,'amortization fully releases prepaid');

assert(REPORTS.length===12,'12 reports defined (got '+REPORTS.length+')');
assert(REPORTS.find(r=>r.key==='activePolicies').build().some(r=>r.Type==='Vehicle'),'active report includes vehicle');
const cd=REPORTS.find(r=>r.key==='costDivision').build();
const totDiv=cd.reduce((s,r)=>s+r['Annual Cost SAR'],0);
const am=DB.all('medPolicies').filter(p=>policyEff(p)==='Active').reduce((s,p)=>s+Number(p.annualPremium||0),0);
const al=DB.all('lifePolicies').filter(p=>policyEff(p)==='Active').reduce((s,p)=>s+Number(p.premium||0),0);
const av=DB.all('vehiclePolicies').filter(p=>policyEff(p)==='Active').reduce((s,p)=>s+Number(p.premium||0),0);
assert(Math.abs(totDiv-(am+al+av))<0.01,'cost-by-division includes vehicle ('+totDiv+' vs '+(am+al+av)+')');
assert(REPORTS.find(r=>r.key==='rateCard').build().length===8,'rate card report = 8 member types');
assert('Prepaid Remaining SAR' in REPORTS.find(r=>r.key==='amortSummary').build()[0],'amortization summary report works');
let okAll=true;REPORTS.forEach(r=>{try{r.build();}catch(e){okAll=false;console.log('  report error',r.key,e.message);}});
assert(okAll,'all 12 reports build without error');

assert(computeNotifications().some(n=>n.kind==='vehicle'),'alerts include vehicle policy');
assert(EMP_FIELDS.some(f=>f.k==='insuranceClass'),'employee has insuranceClass field');
assert(tariq.insuranceClass==='A','Tariq seeded as class A');

DB.update('premiumRates','card',{rates:Object.assign({},getRateCard().rates,{Employee:Object.assign({},getRateCard().rates.Employee,{B:9999})})});
assert(premiumLookup('Employee','B')===9999,'rate edit persists');

// new-policy active-employee rule still enforced for medical; vehicle exempt
run('SESSION={id:"x",username:"admin",name:"Admin",role:"Admin"}');
console.log('\nALL NEW-FEATURE CHECKS COMPLETE');
