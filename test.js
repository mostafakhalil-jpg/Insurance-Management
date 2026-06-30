const vm=require('vm'),fs=require('fs');
const store={};
globalThis.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>{delete store[k]}};
globalThis.document={getElementById:()=>({style:{},classList:{toggle(){},add(){},remove(){}},textContent:'',innerHTML:'',scrollTop:0}),querySelectorAll:()=>[],createElement:()=>({classList:{},style:{},appendChild(){}})};
globalThis.window={};globalThis.XLSX={};
vm.runInThisContext(fs.readFileSync('core.js','utf8'));

globalThis.SESSION={id:'x',username:'admin',name:'Admin',role:'Admin'};
seedAll();
function assert(c,msg){if(!c){console.log('FAIL:',msg);process.exitCode=1;}else console.log('ok  :',msg);}

assert(DB.all('employees').length===8,'8 employees seeded');
assert(DB.all('dependents').length===6,'6 dependents seeded');
assert(DB.all('medPolicies').length===6,'6 medical policies seeded');
assert(DB.all('lifePolicies').length===4,'4 life policies seeded');
assert(DB.all('insuranceCompanies').length===4,'4 insurers seeded');

const e1=DB.all('employees')[0];
assert(iqamaClash(e1.iqama,'employees',null)!==null,'duplicate employee iqama detected');
assert(iqamaClash(e1.iqama,'employees',e1.id)===null,'same record excluded from clash');
const dep=DB.all('dependents')[0];
assert(iqamaClash(dep.iqama,'dependents',null)!==null,'dependent iqama unique across system');
assert(iqamaClash('999NONEXIST',null,null)===null,'novel iqama is unique');

assert(policyEff(DB.all('medPolicies').find(p=>p.policyNo==='MED-2026-0003'))==='Expired','past-expiry active -> Expired');
assert(policyEff(DB.all('medPolicies').find(p=>p.status==='Suspended'))==='Suspended','suspended stays suspended');

let repCount=0;REPORTS.forEach(r=>repCount+=r.build().length);
assert(REPORTS.length===10,'10 reports defined');
assert(repCount>0,'reports produce rows');

const cd=REPORTS.find(r=>r.key==='costDivision').build();
const totalDiv=cd.reduce((s,r)=>s+r['Annual Cost SAR'],0);
const am=DB.all('medPolicies').filter(p=>policyEff(p)==='Active').reduce((s,p)=>s+Number(p.annualPremium||0),0);
const al=DB.all('lifePolicies').filter(p=>policyEff(p)==='Active').reduce((s,p)=>s+Number(p.premium||0),0);
assert(Math.abs(totalDiv-(am+al))<0.01,'cost-by-division total = active premium ('+totalDiv+' vs '+(am+al)+')');

const notes=computeNotifications();
assert(notes.length>0,'notifications computed ('+notes.length+')');
assert(notes.some(n=>/expired/i.test(n.title)),'has expired-policy alert');
assert(notes.some(n=>/Iqama/i.test(n.title)),'has Iqama expiry alert');
assert(notes.some(n=>/Missing documents/i.test(n.title)),'has missing-docs alert');

const inactive=DB.all('employees').filter(e=>e.status!=='Active').length;
assert(empOptions(null).length===8-inactive,'empOptions excludes inactive ('+inactive+' inactive)');

assert(/^E-/.test(autoEmpNo()),'autoEmpNo format');
assert(/^MED-\d{4}-\d{4}$/.test(autoPolicyNo(POLICIES.medical)),'autoPolicyNo medical format');
assert(/^LIF-\d{4}-\d{4}$/.test(autoPolicyNo(POLICIES.life)),'autoPolicyNo life format');

assert(can('policy.create')===true,'admin can create policy');
globalThis.SESSION={role:'Viewer'};
assert(can('policy.create')===false&&can('export')===true,'viewer: export only');
globalThis.SESSION={role:'Finance'};
assert(can('policy.renew')&&!can('employee.edit'),'finance perms scoped');
globalThis.SESSION={role:'Manager'};
assert(can('policy.create')&&!can('policy.cancel'),'manager perms scoped');

// audit log captured create events during seed? seed uses silent, but user actions log. Verify audit infra works:
globalThis.SESSION={id:'x',username:'admin',name:'Admin',role:'Admin'};
const before=DB.all('audit').length;
const ne=DB.insert('employees',{empNo:'E-9999',name:'Test User',iqama:'TEST123',status:'Active'});
assert(DB.all('audit').length===before+1,'insert writes an audit entry');
DB.update('employees',ne.id,{jobTitle:'QA'});
const last=DB.all('audit').slice(-1)[0];
assert(last.action==='UPDATE'&&last.changes.some(c=>c.field==='jobTitle'),'update audited with field diff');

console.log('\nALL CHECKS COMPLETE');
