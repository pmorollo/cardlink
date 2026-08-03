const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Fallback template generator when NVIDIA_API_KEY is not set
function generateFallbackAI({ profession, skill = 'vendedora' }) {
  const p = (profession || 'Profissional').trim();
  
  const templates = {
    corporativa: {
      title: `Especialista em ${p}`,
      description: `Atendimento de excelência em ${p}. Foco em resultados, transparência e soluções sob medida para suas necessidades.`,
      message: `Entre em contato para agendar uma consulta ou solicitar um orçamento detalhado.`,
      site_button_text: `Conheça nossos serviços`,
      products: [
        { name: `Consultoria em ${p}`, price: '250,00', description: 'Atendimento personalizado com análise completa de necessidades.' },
        { name: `Projeto / Serviço Completo`, price: '500,00', description: 'Execução do serviço com acompanhamento do início ao fim.' },
        { name: `Assessoria Mensal`, price: '900,00', description: 'Acompanhamento contínuo e suporte dedicado.' }
      ]
    },
    criativa: {
      title: `Criativo & ${p}`,
      description: `Transformando ideias em realidade como ${p}. Trabalho autoral, inovação e atenção a cada detalhe para destacar sua marca.`,
      message: `Vamos criar algo incrível juntos? Mande uma mensagem no WhatsApp!`,
      site_button_text: `Ver meu portfólio`,
      products: [
        { name: `Projeto Autoral`, price: '300,00', description: 'Criação exclusiva pensada para o seu conceito.' },
        { name: `Pacote Criativo Premium`, price: '600,00', description: 'Solução visual completa com entregáveis personalizados.' },
        { name: `Sessão de Consultoria`, price: '200,00', description: 'Brainstorming e direcionamento criativo.' }
      ]
    },
    acolhedora: {
      title: `${p} humanizado(a)`,
      description: `Cuidado, dedicação e atenção integral. Ofereço um ambiente acolhedor focado no seu bem-estar e na sua melhor experiência.`,
      message: `Estou à disposição para cuidar de você. Agende seu horário com carinho.`,
      site_button_text: `Saiba mais sobre meu atendimento`,
      products: [
        { name: `Atendimento Inicial`, price: '180,00', description: 'Escuta atenta e avaliação completa das suas necessidades.' },
        { name: `Sessão de Acompanhamento`, price: '150,00', description: 'Cuidado contínuo para manter seu progresso e bem-estar.' },
        { name: `Pacote Cuidados Especiais`, price: '450,00', description: 'Programa completo com atendimento prioritário.' }
      ]
    },
    vendedora: {
      title: `${p} de Alta Performance`,
      description: `Soluções rápidas, eficientes e com o melhor custo-benefício em ${p}. Garanta o melhor atendimento hoje mesmo!`,
      message: `Aproveite as condições especiais desta semana! Fale comigo no WhatsApp.`,
      site_button_text: `Garantir minha vaga / serviço`,
      products: [
        { name: `Serviço Express`, price: '120,00', description: 'Atendimento rápido e eficiente com qualidade garantida.' },
        { name: `Pacote Completo VIP`, price: '350,00', description: 'O serviço mais pedido por nossos clientes com bônus inclusos.' },
        { name: `Plano Fidelidade`, price: '550,00', description: 'Economia máxima com atendimento garantido no mês.' }
      ]
    }
  };

  return templates[skill] || templates.vendedora;
}

router.post('/generate', authMiddleware, async (req, res) => {
  const { profession, skill = 'vendedora', mode = 'full', textToImprove } = req.body;

  if (!profession && !textToImprove) {
    return res.status(400).json({ error: 'Informe a profissão ou o texto para melhorar' });
  }

  const apiKey = process.env.NVIDIA_API_KEY;

  // Single field improvement mode
  if (mode === 'improve' && textToImprove) {
    if (!apiKey) {
      return res.json({ improvedText: `${textToImprove} — atendimento profissional e de alta qualidade.` });
    }

    try {
      const prompt = `Você é um especialista em marketing e redação comercial. Reescreva o seguinte texto para torná-lo mais profissional, atraente e persuasivo para um cartão de visita/landing page (tom de voz: ${skill}). Responda APENAS com o texto final melhorado, sem explicações ou aspas:\n\n"${textToImprove}"`;

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-70b-instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 300
        })
      });

      const data = await response.json();
      const result = data.choices?.[0]?.message?.content?.trim();
      return res.json({ improvedText: result || textToImprove });
    } catch (e) {
      console.error('NVIDIA API Error:', e.message);
      return res.json({ improvedText: `${textToImprove} — atendimento de alta qualidade.` });
    }
  }

  // Full Card & Landing Page generation mode
  if (!apiKey) {
    console.log('ℹ️ NVIDIA_API_KEY não configurada. Usando gerador de modelo rápido.');
    return res.json(generateFallbackAI({ profession, skill }));
  }

  try {
    const prompt = `Você é um assistente de inteligência artificial do aplicativo CardLink.
Gere o conteúdo completo de um cartão de visita digital e landing page para o profissional/negócio: "${profession}".
O tom de voz deve ser: ${skill} (corporativa = sério/autoridade, criativa = inovador/autoral, acolhedora = humano/empático, vendedora = persuasivo/ofertas).

Retorne ESTRITAMENTE um objeto JSON válido (sem código markdown, sem explicações fora do JSON) com a seguinte estrutura:
{
  "title": "cargo ou frase de impacto curta",
  "description": "uma apresentação profissional agradável em 2 a 3 frases",
  "message": "uma mensagem amigável convidando para contato no WhatsApp",
  "site_button_text": "texto para o botão do site",
  "products": [
    { "name": "nome do serviço 1", "price": "150,00", "description": "breve descrição" },
    { "name": "nome do serviço 2", "price": "300,00", "description": "breve descrição" },
    { "name": "nome do serviço 3", "price": "450,00", "description": "breve descrição" }
  ]
}`;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 800
      })
    });

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';

    // Remove code block backticks if AI included them
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    const json = JSON.parse(content);
    return res.json(json);
  } catch (err) {
    console.error('NVIDIA AI Generation Error:', err.message);
    // Fallback to template generator if API call fails
    return res.json(generateFallbackAI({ profession, skill }));
  }
});

// ============================================
// Public AI Assistant Chat for Card & Landing Page
// ============================================
router.post('/public/:slug/chat', async (req, res) => {
  const { slug } = req.params;
  const { message, history = [] } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Mensagem é obrigatória' });
  }

  const { query } = require('../db/database');
  const card = query('cards').findOne(c => c.slug === slug);
  if (!card) {
    return res.status(404).json({ error: 'Cartão não encontrado' });
  }

  const servicesList = (card.products || []).map((p, i) =>
    `${i+1}. ${p.name || 'Serviço'}${p.price ? ' (R$ ' + p.price + ')' : ''}${p.description ? ' - ' + p.description : ''}`
  ).join('\n') || 'Nenhum serviço cadastrado individualmente.';

  const systemPrompt = `Você é o Atendente Virtual IA de ${card.name}${card.business ? ' (' + card.business + ')' : ''}.
Seu objetivo é responder dúvidas de potenciais clientes sobre serviços, preços, atendimento e localização de forma educada, amigável e humana.

DADOS DO PROFISSIONAL:
- Nome: ${card.name}
- Cargo/Título: ${card.title || 'Profissional'}
- Empresa: ${card.business || 'N/A'}
- Descrição: ${card.description || 'N/A'}
- Telefone: ${card.phone || 'N/A'}
- WhatsApp: ${card.whatsapp || 'N/A'}
- E-mail: ${card.email || 'N/A'}
- Endereço: ${card.address || 'N/A'}

SERVIÇOS / PRODUTOS DISPONÍVEIS:
${servicesList}

REGRAS DE RESPOSTA:
1. Responda em português brasileiro de forma simpática, clara e objetiva.
2. Use as informações acima para responder. Se a informação não estiver disponível, responda educadamente e convide a conversar no WhatsApp.
3. Respostas curtas (no máximo 2 a 3 parágrafos).
4. Quando fizer sentido, convide o visitante a clicar no botão de WhatsApp para agendar.`;

  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    const msg = message.toLowerCase();
    let reply = `Olá! Sou o assistente virtual de ${card.name}. `;
    if (msg.includes('preço') || msg.includes('valor') || msg.includes('quanto') || msg.includes('serviço')) {
      reply += `Nossos serviços principais são:\n${servicesList}\n\nPara agendar ou tirar dúvidas específicas, fale conosco no WhatsApp!`;
    } else if (msg.includes('onde') || msg.includes('endereço') || msg.includes('local')) {
      reply += card.address ? `Estamos localizados em: ${card.address}.` : `Atendemos via WhatsApp e telefone. Entre em contato!`;
    } else if (msg.includes('contato') || msg.includes('telefone') || msg.includes('whatsapp')) {
      reply += `Você pode falar conosco pelo WhatsApp: ${card.whatsapp || card.phone || 'no botão abaixo'}.`;
    } else {
      reply += `Como posso te ajudar hoje? Para atendimento imediato, clique no botão de WhatsApp.`;
    }
    return res.json({ reply });
  }

  try {
    const messages = [
      { role: 'user', content: systemPrompt },
      { role: 'assistant', content: `Olá! Sou o assistente virtual de ${card.name}. Como posso te ajudar hoje?` }
    ];

    (history || []).slice(-4).forEach(h => {
      if (h.sender && h.text) {
        messages.push({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text });
      }
    });

    messages.push({ role: 'user', content: message });

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages,
        temperature: 0.5,
        max_tokens: 400
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || `Olá! Para um atendimento personalizado com ${card.name}, entre em contato pelo WhatsApp.`;
    return res.json({ reply });
  } catch (err) {
    console.error('NVIDIA Chat API Error:', err.message);
    return res.json({ reply: `Olá! Como posso te ajudar? Para falar diretamente com ${card.name}, clique no botão do WhatsApp.` });
  }
});

module.exports = router;

