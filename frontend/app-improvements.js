// Editor enhancements reuse the existing builder, fields, upload and public URLs.
function getDocumentRows() {
  return Array.from(document.querySelectorAll('#extra-document-rows .document-row')).map(row => ({title:row.querySelector('input').value.trim(),url:row.querySelector('input[type=url]').value.trim()})).filter(d=>d.title||d.url);
}
function loadDocumentRows(docs) {
  ensureBuilderTools();
  const box=document.getElementById('extra-document-rows');if(!box)return;box.replaceChildren();
  for(const doc of docs)addDocumentRow(doc);
}
function addDocumentRow(doc={}) {
  const box=document.getElementById('extra-document-rows');if(!box)return;
  const row=document.createElement('div');row.className='document-row';
  const title=document.createElement('input'),url=document.createElement('input');title.placeholder='Título do documento';title.setAttribute('aria-label','Título do PDF');title.maxLength=120;title.value=doc.title||'';url.type='url';url.placeholder='https://…/documento.pdf ou /uploads/…';url.setAttribute('aria-label','URL do PDF');url.value=doc.url||'';
  const remove=document.createElement('button');remove.type='button';remove.textContent='Remover';remove.onclick=()=>{row.remove();updatePreview()};
  const up=document.createElement('button');up.type='button';up.textContent='↑';up.setAttribute('aria-label','Mover documento para cima');up.onclick=()=>{if(row.previousElementSibling)box.insertBefore(row,row.previousElementSibling);updatePreview()};
  const upload=document.createElement('input');upload.type='file';upload.accept='application/pdf';upload.setAttribute('aria-label','Enviar documento PDF');upload.onchange=async()=>{const file=upload.files?.[0];if(!file)return;if(file.size>10*1024*1024){showToast('⚠️','Use PDF até 10 MB.');return;}upload.disabled=true;try{url.value=await uploadFile(file);if(!title.value)title.value=file.name.replace(/\.pdf$/i,'');updatePreview();}catch(error){showToast('❌',error.message);}finally{upload.disabled=false;upload.value='';}};
  row.append(title,url,upload,up,remove);box.append(row);updateBuilderSaveState();
}
function isBuilderDirty(){return builderSavedState!==null && JSON.stringify(getFormData())!==builderSavedState;}
function updateBuilderSaveState(){
  if(typeof document==='undefined')return;
  const btn=document.getElementById('generate-btn');if(!btn||builderSaving)return;
  btn.disabled=false;btn.textContent=builderSavedState===null?'Salvar e publicar':isBuilderDirty()?'Salvar alterações pendentes':'Tudo salvo';
}
function ensureBuilderTools(){
  if(document.getElementById('extra-builder-tools'))return;
  const btn=document.getElementById('generate-btn');if(!btn)return;
  const tools=document.createElement('section');tools.id='extra-builder-tools';tools.className='form-section';
  tools.innerHTML='<h3>Modelo e aparência independentes</h3><label>Estrutura da página<select id="layout-choice"><option value="">Padrão</option><option value="pessoal">Pessoal</option><option value="institucional">Institucional</option><option value="profissional">Profissional</option><option value="comercial">Comercial</option></select></label><p>Escolher a cor mantém a estrutura e o conteúdo.</p><label>Mensagem inicial no WhatsApp<input id="field-whatsapp-message" maxlength="1000" placeholder="Olá! Gostaria de saber mais…"></label><h3>Documentos PDF</h3><p>Envie o PDF ou informe a URL de um documento já publicado. Remover um link não apaga o arquivo de origem.</p><div id="extra-document-rows"></div><button type="button" id="add-extra-document">Adicionar documento</button><button type="button" id="mobile-preview">Prévia de celular</button><button type="button" id="export-own-content">Exportar conteúdo</button>';
  btn.parentElement.before(tools);
  const choice=document.getElementById('layout-choice');choice.value=currentTemplateKey;choice.onchange=()=>{currentTemplateKey=choice.value;updatePreview()};
  document.getElementById('add-extra-document').onclick=()=>addDocumentRow();
  document.getElementById('mobile-preview').onclick=()=>{const d=document.createElement('dialog');d.style.cssText='width:min(410px,94vw);max-height:90vh;overflow:auto';const close=document.createElement('button');close.textContent='Fechar prévia';close.onclick=()=>d.close();const preview=document.createElement('div');preview.setAttribute('data-theme',currentTheme);preview.innerHTML=renderCard(getFormData(),true);d.append(close,preview);d.addEventListener('close',()=>d.remove());document.body.append(d);d.showModal()};
  document.getElementById('export-own-content').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'cardlink-content-v1',content:getFormData()},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='cardlink-conteudo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
}
function renderCompletionSteps(card){
  const checks=[['Foto',card.photo_url],['Descrição',card.description],['WhatsApp ou telefone',card.whatsapp||card.phone],['E-mail de contato',card.email],['Produtos ou serviços',(card.products||[]).length||card.services_image_url],['Galeria',(card.gallery||[]).length]];
  const missing=checks.filter(([,value])=>!value);if(!missing.length)return '';
  return '<section class="dash-card-full"><h3>Próximos passos</h3><p>'+missing.map(([name])=>escapeHtml(name)).join(' · ')+'</p><button class="btn btn-secondary" onclick="editCard('+Number(card.id)+')">Completar página</button></section>';
}
window.addEventListener('beforeunload',event=>{if(isBuilderDirty()){event.preventDefault();event.returnValue=''}});
document.addEventListener('input',event=>{if(event.target.closest('#settings-view'))updateBuilderSaveState()});
const originalNavigateTo=navigateTo;
navigateTo=function(route){if(!['settings','builder'].includes(route)&&location.hash==='#settings'&&isBuilderDirty()&&!confirm('Há alterações não salvas. Sair sem salvar?'))return;return originalNavigateTo(route)};
document.addEventListener('DOMContentLoaded',ensureBuilderTools);
window.addEventListener('hashchange',()=>{ensureBuilderTools();const choice=document.getElementById('layout-choice');if(choice)choice.value=currentTemplateKey});
