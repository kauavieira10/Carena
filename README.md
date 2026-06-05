# Dashboard de Performance — CARENA

Dashboard de marketing digital com visual **glassmorphism** (estilo Apple/iOS), integrado a **Google Sheets** e **Meta Ads**. Frontend em HTML/CSS/JS puro + Chart.js; backend em Node puro (sem Express). Feito pela **acesso**.

## ✨ O que tem

- **Visão geral**: KPIs (Orçamento, Leads, CPL) com metas e barras de progresso, gráfico de leads acumulados, cards por plataforma (Google × Facebook), distribuição de verba (doughnut), tendência de CPL e tabela diária.
- **Filtro de plataforma** (Todas / Google / Facebook) recalculando tudo na hora.
- **Seletor de período**: atalhos (Hoje, Ontem, 7d, 30d, Este mês) + **calendário popup** com modo dia único ou período.
- **Top campanhas — Google Ads**: tabela com as campanhas ativas (investimento, cliques, conversões, CPA). Snapshot estático de mai/2026 puxado direto da conta Google Ads (ID `6554312523`) via MCC. Some quando o filtro está em "Facebook".
- **Aba de Criativos** (Meta Ads): grid de cards com investimento, conversões, CPL, cliques, CTR e impressões; filtros de status (Todos/Ativos/Pausados).
- **Tema claro/escuro** persistente, sem flash.
- **Fallback offline**: se a API não responder, usa `data/dataset.js` (dados reais de maio/2026) e mostra o modo demonstração.

## 📁 Estrutura

```
carena-dashboard/
├── index.html
├── assets/            acesso.png (logo agência, branca) · carena.png (logo cliente, branca)
├── css/               variables · base · components · dashboard
├── js/                config · utils · theme · sheets · meta · charts · campaigns · collapse · platform-toggle · date-filter · report · app
├── data/dataset.js    fallback offline (dados reais) + GOOGLE_CAMPAIGNS (snapshot Google Ads)
├── netlify/functions/ sheets-proxy · meta-creatives-proxy
├── server.js          proxy Node p/ Render
├── netlify.toml · render.yaml · package.json · .env.example
```

## ▶️ Rodar localmente

Pré-requisito: **Node 18+**.

```bash
cd carena-dashboard
cp .env.example .env      # preencha as variáveis
node server.js            # http://localhost:3000
```

Sem `.env`, o dashboard abre normalmente em **modo demonstração** (dados de `dataset.js`).

> Obs.: abrir o `index.html` direto no navegador (file://) mostra o visual, mas as chamadas `/api/*` só funcionam pelo `server.js` (ou hospedado). Sem servidor, ele cai no fallback offline — que já traz os dados reais.

## 🔑 Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `GOOGLE_SHEETS_API_KEY` | Chave da API do Google Cloud (restrinja à Sheets API) |
| `GOOGLE_SHEETS_ID` | ID da planilha (da URL) |
| `GOOGLE_SHEETS_NAME` | Nome da aba (ex.: `Diário Performance`) |
| `GOOGLE_SHEETS_RANGE` | Intervalo (ex.: `A1:Z200`) |
| `META_ACCESS_TOKEN` | Token de System User do Meta (opcional, p/ Criativos) |
| `META_AD_ACCOUNT_ID` | ID da conta de anúncios (`act_XXXXXXXXX`) |

## 🚀 Deploy

Veja **DEPLOY-RENDER.md** para o passo a passo no Render. Para Netlify, suba o repositório, configure as variáveis em *Site settings → Environment* e o `netlify.toml` já redireciona `/api/*` para as funções.

## 📊 Estrutura da planilha

O `sheets.js` localiza automaticamente o cabeçalho `DATA | DIA | VERBA GOOGLE | …` e lê as colunas por posição, além de capturar as metas do bloco `PROJETADO` (linhas Google / Facebook / TOTAL). Se a estrutura mudar muito, ajuste o parser em `js/sheets.js`.

## 🔒 Segurança

A `GOOGLE_SHEETS_API_KEY` deve ficar **só no backend** (variável de ambiente). O frontend nunca chama o Google direto. Restrinja a chave no Google Cloud (por API e por referrer/IP).

## 🔄 Atualizar o snapshot de campanhas Google

A seção **Top campanhas — Google Ads** é um *snapshot estático* (Opção A): os dados
ficam em `window.GOOGLE_CAMPAIGNS`, dentro de `data/dataset.js`. Não há integração ao
vivo nem env vars de Google Ads — por isso o app no Render não busca essas campanhas
sozinho. Para atualizar os números, basta editar esse array (ou pedir ao Claude:
"atualizar campanhas Google da Carena", que ele re-puxa da conta e regenera).

Quando quiser migrar para **integração ao vivo** (Opção B), aí sim será preciso
montar o fluxo OAuth no `server.js` (Developer Token aprovado + Refresh Token +
Client ID/Secret + Customer ID `6554312523`) e um endpoint `/api/google-ads-campaigns`.
