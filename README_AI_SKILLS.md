# 🤖 CardLink NVIDIA AI Assistant & Skill Tones

## Overview
This skill defines the AI Content Generation architecture for CardLink using the NVIDIA NIM / NVIDIA Build API (`meta/llama-3.1-70b-instruct`) and skill-based tone customization.

---

## 🎨 Skill Tones Matrix

| Skill ID | Name | Tone & Style | Target Professions |
|---|---|---|---|
| `vendedora` | ⚡ Skill Vendedora | Direct, persuasive, call-to-action focused, high conversion | E-commerce, Salons, Personal Trainers, Sales |
| `corporativa` | 💼 Skill Corporativa | Formal, elegant, authority-building, executive | Lawyers, Accountants, Doctors, Engineers, Consultants |
| `criativa` | 🎨 Skill Criativa | Innovative, artistic, conceptual, modern | Designers, Photographers, Content Creators, Artists |
| `acolhedora` | 🌿 Skill Acolhedora | Empathetic, warm, humanized, caring | Therapists, Psychologists, Nutritionists, Pet Care |

---

## ⚙️ Backend Integration
- **Endpoint:** `POST /api/ai/generate`
- **Environment Variable:** `NVIDIA_API_KEY` (configured on Railway / .env)
- **Model Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions` (`meta/llama-3.1-70b-instruct`)
- **Fallback:** modelo básico identificado claramente ao usuário quando a API está indisponível.
- **Safety:** preços nunca são gerados; respostas são validadas e limitadas antes de chegar ao painel.
- **Review:** o usuário confere todos os campos e escolhe aplicar apenas textos, acrescentar serviços ou substituir serviços.
- **Operational controls:** timeout configurável por `AI_TIMEOUT_MS` e limite por usuário configurável por `AI_REQUESTS_PER_HOUR`.
