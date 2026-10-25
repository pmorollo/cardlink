process.env.NODE_ENV='test';process.env.DATABASE_URL='';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {JSDOM}=require('jsdom');
const app=require('../server'),{db}=require('../db/database');
let server,base,backup;const file=path.join(__dirname,'../db/data.json');
test.before(async()=>{backup=fs.existsSync(file)?fs.readFileSync(file):null;await new Promise(r=>{server=app.listen(0,r)});base='http://127.0.0.1:'+server.address().port});
test.after(()=>{server.close();backup?fs.writeFileSync(file,backup):fs.rmSync(file,{force:true})});
test.beforeEach(()=>{db.users=[];db.cards=[];db.contacts=[];db._counters.users=0;db._counters.cards=0;});
test('documents, independent layout/color, stable QR URL, and ownership survive save/reload',async()=>{
 const create=async(email)=>{const r=await fetch(base+'/api/onboarding/criar-cartao',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Nome',email,business_name:'Negócio '+email.split('@')[0],template_key:'comercial'})});return r.json()};
 const a=await create('a-improve@example.com'),b=await create('b-improve@example.com');assert.equal(a.user.email_verified_at,null);
 const update=async(token,data)=>fetch(base+'/api/cards/'+a.card.id,{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(data)});
 const r=await update(a.token,{name:'Novo nome',theme:'midnight',template_key:'comercial',documents:[{title:'Tabela',url:'https://example.com/tabela.pdf'}],whatsapp_message:'Quero o catálogo & preços'});assert.equal(r.status,200);const saved=await r.json();assert.equal(saved.theme,'midnight');assert.equal(saved.template_key,'comercial');assert.equal(saved.slug,a.card.slug);
 const again=await fetch(base+'/api/cards/'+a.card.id,{headers:{Authorization:'Bearer '+a.token}}).then(r=>r.json());assert.equal(again.documents[0].title,'Tabela');assert.equal(again.whatsapp_message,'Quero o catálogo & preços');
 assert.equal((await update(b.token,{documents:[]})).status,404);
 assert.equal((await update(a.token,{documents:[{title:'X',url:'javascript:alert(1)'}]})).status,400);
 const png=await fetch(base+'/api/qr/'+a.card.slug+'.png');assert.equal(png.status,200);const buffer=Buffer.from(await png.arrayBuffer());assert.equal(buffer.subarray(1,4).toString(),'PNG');
 const expected=await require('qrcode').toBuffer(base+'/site/'+a.card.slug+'/qr',{width:1024,margin:4,errorCorrectionLevel:'M'});assert.deepEqual(buffer,expected);
});
test('editor preserves layout on color change and detects restored/saved state',()=>{
 const dom=new JSDOM('<div id="settings-view"><input data-field="name" id="field-name" value="Meu site"><button id="generate-btn"></button><div id="preview-card"></div></div>',{url:'http://localhost/#settings',runScripts:'outside-only'});const w=dom.window;
 w.navigateTo=()=>{};w.escapeHtml=s=>String(s||'').replaceAll('<','&lt;');w.cleanWhatsapp=s=>String(s||'').replace(/\D/g,'');w.showToast=()=>{};w.currentTheme='comercial';
 w.eval(['app-builder.js','app-improvements.js'].map(f=>fs.readFileSync(path.join(__dirname,'../../frontend',f),'utf8')).join('\n')); 
 w.ensureBuilderTools();w.eval('currentTemplateKey="comercial";builderSavedState=JSON.stringify(getFormData())');assert.equal(w.isBuilderDirty(),false);
 w.selectTheme('midnight');assert.equal(w.getFormData().template_key,'comercial');assert.equal(w.isBuilderDirty(),true);
 w.addDocumentRow({title:'Ficha',url:'https://example.com/ficha.pdf'});assert.equal(w.getFormData().documents[0].title,'Ficha');
 assert.ok(w.renderCard(w.getFormData(),true).includes('Ficha'));
 dom.window.close();
});
