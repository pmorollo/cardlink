// Shared validation: identical behavior in create/upsert/update paths.
function extendedFields(input, previous = {}) {
  let documents = previous.documents || [];
  if (input.documents !== undefined) {
    if (!Array.isArray(input.documents) || input.documents.length > 20) throw Object.assign(new Error('Use até 20 documentos PDF.'), { status: 400 });
    documents = input.documents.map(doc => {
      if (!doc || typeof doc.title !== 'string' || !doc.title.trim() || doc.title.length > 120 || typeof doc.url !== 'string' || doc.url.length > 1000) throw Object.assign(new Error('Documento inválido.'), { status: 400 });
      const url = doc.url.trim();
      if (!/^\/uploads\/[a-zA-Z0-9_./-]+\.pdf$/i.test(url)) {
        let parsed; try { parsed = new URL(url); } catch { throw Object.assign(new Error('URL de PDF inválida.'), { status: 400 }); }
        if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || !parsed.pathname.toLowerCase().endsWith('.pdf')) throw Object.assign(new Error('Informe uma URL HTTP(S) de PDF.'), { status: 400 });
      }
      return { title: doc.title.trim(), url };
    });
  }
  const message = input.whatsapp_message === undefined ? (previous.whatsapp_message || '') : String(input.whatsapp_message).trim();
  if (message.length > 1000) throw Object.assign(new Error('Mensagem WhatsApp muito longa.'), { status: 400 });
  return { documents, whatsapp_message: message };
}
module.exports = { extendedFields };
