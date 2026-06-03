/* js/config.js — Configuração central (sem segredos!)
 * Chaves/tokens ficam SOMENTE no backend (variáveis de ambiente). */
window.CONFIG = {
  cliente: 'CARENA',
  subtitulo: 'Performance de Marketing Digital',

  // Endpoints do proxy backend (Render ou Netlify). Relativos = mesmo host.
  api: {
    sheets:    '/api/sheets',
    creatives: '/api/meta-creatives'
  },

  // Mês de referência dos dados (usado p/ escalar metas proporcionalmente)
  monthDaysFallback: 31,

  // Metas padrão (substituídas pelas da planilha quando vierem do bloco PROJETADO)
  goals: {
    all:      { budget:14320, leads:885, cpl:16.18 },
    google:   { budget:13000, leads:765, cpl:16.99 },
    facebook: { budget:1320,  leads:120, cpl:11.00 }
  },

  // Tempo (ms) antes de desistir da API e cair no fallback offline
  fetchTimeout: 8000
};
