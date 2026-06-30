// stubs for referenced helpers
function DBb(){} const DB={byId:()=>({}),all:()=>[],update:()=>{}};
function esc(s){return s} function num(n){return n} function money(n){return n}
function toast(){} function refreshBadges(){} function renderPolicyDetail(){}
function premiumLookup(){return 0} function relMemberType(){return ''}
const POLICIES={}; const CLASSES=[]; const MEMBER_TYPES=[];
function can(){return true}
const p={}, cfg={kind:'medical'};

// ===== task-9 additions (verbatim) =====
function classFromGrade(grade){if(!grade)return '';const g=String(grade).toUpperCase();if(g.includes('GEN.R')||g.includes('GENR')||g.includes('GEN R'))return 'GEN.R';const m=g.match(/(\d+)/);if(!m)return '';const n=+m[1];if(n>=19)return 'VIP';if(n>=16)return 'A';if(n>=13)return 'B';if(n>=9)return 'C';return 'GEN.R';}
function resolveClass(e){if(!e)return '';return e.insuranceClass||classFromGrade(e.grade)||'';}
function calcMedicalPremium(employeeId,coverageClass){const e=DB.byId('employees',employeeId);if(!e)return 0;const cls=resolveClass(e)||'B';let total=premiumLookup('Employee',cls);return total;}
function medPremiumVariance(p){
  const e=DB.byId('employees',p.employeeId);if(!e)return null;
  const cls=resolveClass(e);if(!cls)return {expected:0,actual:Number(p.annualPremium||0),diff:0,off:false,noClass:true};
  const expected=calcMedicalPremium(p.employeeId,p.coverageClass);
  const actual=Number(p.annualPremium||0);
  const diff=+(actual-expected).toFixed(2);
  return {expected,actual,diff,cls,off:Math.abs(diff)>0.5};
}
function offRateBadge(p){const v=medPremiumVariance(p);if(!v)return '';if(v.noClass)return ` <span class="pill grey" title="Employee has no grade/class — cannot price">no class</span>`;if(v.off)return ` <span class="pill red" title="Rate card expects ${num(v.expected)} (Δ ${v.diff>0?'+':''}${num(v.diff)})">⚠ off-rate</span>`;return '';}
function medVarianceBanner(cfg,p){const v=medPremiumVariance(p);if(!v)return '';
  if(v.noClass)return `<div class="card" style="border-left:4px solid var(--muted)"><div class="card-b"><b>⚠ Cannot verify premium</b> — no grade/class set.</div></div>`;
  if(v.off)return `<div class="card" style="border-left:4px solid var(--danger)"><div class="card-b"><b style="color:var(--danger)">⚠ Off-rate premium.</b> Entered <b>${money(v.actual)}</b> vs rate-card <b>${money(v.expected)}</b> for class ${esc(v.cls)} · ${esc(p.coverageClass||'Employee Only')} (Δ ${v.diff>0?'+':''}${num(v.diff)}). ${can('policy.edit')?`<button class="btn btn-xs btn-ghost" style="margin-left:6px" onclick="fixPolicyPremium('${cfg.kind}','${p.id}')">Set to rate-card</button>`:''}</div></div>`;
  return `<div class="card" style="border-left:4px solid var(--ok)"><div class="card-b"><b style="color:var(--ok)">✓ Premium matches the rate card</b> — ${money(v.expected)} for class ${esc(v.cls)} · ${esc(p.coverageClass||'Employee Only')}.</div></div>`;
}
function fixPolicyPremium(kind,id){const cfg=POLICIES[kind];const p=DB.byId(cfg.coll,id);const v=medPremiumVariance(p);if(!v||v.noClass){toast('Set the employee grade/class first.','err');return;}DB.update(cfg.coll,id,{annualPremium:v.expected});toast('Premium set.','ok');refreshBadges();renderPolicyDetail(kind,id,'details');}
const REPORT_ENTRY={key:'premiumVariance',name:'Premium vs Rate Card (Off-Rate)',build:()=>DB.all('medPolicies').map(p=>{const v=medPremiumVariance(p);return {'Policy No':p.policyNo,'Employee':'','Grade':(DB.byId('employees',p.employeeId)||{}).grade||'','Class':v?(v.cls||'—'):'—','Coverage':p.coverageClass||'','Entered SAR':Number(p.annualPremium||0),'Rate-Card SAR':v&&!v.noClass?v.expected:'','Variance SAR':v&&!v.noClass?v.diff:'','Status':!v?'—':v.noClass?'No class':v.off?'OFF-RATE':'On rate'};}).sort((a,b)=>(a.Status==='OFF-RATE'?0:1)-(b.Status==='OFF-RATE'?0:1))};

// functional spot-checks
const A=(c,m)=>console.log((c?'ok  : ':'FAIL: ')+m)||(c||(process.exitCode=1));
A(classFromGrade('GEN 19')==='VIP','GEN19->VIP');
A(classFromGrade('GEN 16')==='A','GEN16->A');
A(classFromGrade('GEN 13')==='B','GEN13->B');
A(classFromGrade('GEN 09')==='C','GEN09->C');
A(classFromGrade('GEN.R')==='GEN.R','GENR');
A(resolveClass({grade:'GEN 13'})==='B','resolve from grade');
A(resolveClass({insuranceClass:'A',grade:'GEN 09'})==='A','explicit class wins');
console.log('snippet syntax + logic OK');
