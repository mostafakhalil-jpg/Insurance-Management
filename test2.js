const vm=require('vm'),fs=require('fs');
const store={};
globalThis.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>store[k]=String(v),removeItem:k=>{delete store[k]}};
globalThis.document={getElementById:()=>({style:{},classList:{toggle(){},add(){},remove(){}},textContent:'',innerHTML:'',scrollTop:0}),querySelectorAll:()=>[],createElement:()=>({classList:{},style:{},appendChild(){}})};
globalThis.window={};globalThis.XLSX={};
const ctx=vm.createContext(globalThis);
vm.runInContext(fs.readFileSync('core.js','utf8'),ctx);
function run(src){return vm.runInContext(src,ctx);}
function assert(c,msg){if(!c){console.log('FAIL:',msg);process.exitCode=1;}else console.log('ok  :',msg);}

run('SESSION={id:"x",username:"admin",name:"Admin",role:"Admin"}; seedAll();');
assert(run('can("policy.create")')===true,'admin can create policy');
assert(run('can("*")')===true,'admin has wildcard (delete)');
run('SESSION={role:"Viewer"}');
assert(run('can("policy.create")')===false && run('can("export")')===true,'viewer: export only');
assert(run('isAdmin()')===false,'viewer not admin');
run('SESSION={role:"Finance"}');
assert(run('can("policy.renew")')===true && run('can("employee.edit")')===false,'finance perms scoped');
assert(run('can("policy.cancel")')===true && run('can("policy.create")')===false,'finance: cancel yes, create no');
run('SESSION={role:"Manager"}');
assert(run('can("policy.create")')===true && run('can("policy.cancel")')===false,'manager: create yes, cancel no');
run('SESSION={role:"HR"}');
assert(run('can("employee.edit")')&&run('can("dependent.edit")')&&run('can("import")'),'HR can edit records + import');
console.log('\nPERMISSION CHECKS COMPLETE');
