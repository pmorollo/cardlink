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
- **Fallback:** Automatic built-in template generator when API key is unconfigured or offline.
