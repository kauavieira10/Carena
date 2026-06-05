# Deploy no Render — passo a passo

Tempo estimado: ~5 minutos. Plano **Free** serve.

## 1. Suba o código no GitHub

```bash
cd carena-dashboard
git init
git add .
git commit -m "Dashboard CARENA"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/carena-dashboard.git
git push -u origin main
```

> O `.gitignore` já evita subir `.env` e `node_modules`.

## 2. Crie o Web Service no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**.
2. Conecte o repositório `carena-dashboard`.
3. Configurações:
   - **Runtime**: Node
   - **Build Command**: *(deixe vazio)*
   - **Start Command**: `node server.js`
   - **Plan**: Free

> Se o Render detectar o `render.yaml`, ele já preenche quase tudo via **Blueprint**.

## 3. Configure as variáveis de ambiente

Em **Environment → Add Environment Variable**, adicione:

| Key | Value |
|---|---|
| `GOOGLE_SHEETS_API_KEY` | *sua chave* |
| `GOOGLE_SHEETS_ID` | `1YHv2hfxfqlr8Pl3awiClgkMzVqRIJXFYcBBE5HY--aI` |
| `GOOGLE_SHEETS_NAME` | `Diário Performance` |
| `GOOGLE_SHEETS_RANGE` | `A1:Z200` |
| `META_ACCESS_TOKEN` | *token (opcional)* |
| `META_AD_ACCOUNT_ID` | `act_XXXXXXXXX` *(opcional)* |

Salve. O Render reinicia o serviço automaticamente.

## 4. Pronto

Abra a URL gerada (algo como `https://carena-dashboard.onrender.com`). No console do navegador você verá os logs:

```
[Sheets] ✓ N linhas carregadas
[Meta]   ✓ N criativos · R$ X · N conversões   (se Meta configurado)
[App]    Boot OK · N dias
```

## Como obter as credenciais

### Google Sheets API Key
1. [console.cloud.google.com](https://console.cloud.google.com) → crie/escolha um projeto.
2. **APIs e serviços → Biblioteca →** ative **Google Sheets API**.
3. **Credenciais → Criar credencial → Chave de API**.
4. **Restrinja** a chave à Sheets API (e por referrer/IP, se possível).
5. Deixe a planilha acessível (compartilhada como "qualquer pessoa com o link pode ver" ou com a conta de serviço).

### Meta (opcional — aba Criativos)
1. **Business Manager → Configurações → Usuários do Sistema →** crie um System User.
2. Gere um token com escopos `ads_read`, `ads_management`, `business_management` (token de System User **não expira**).
3. **Ads Manager → Configurações da conta →** pegue o `act_XXXXXXXXX`.
4. Teste no [Graph API Explorer](https://developers.facebook.com/tools/explorer).

## Dicas

- O backend tem **cache de 5 min** — alterações na planilha aparecem em até 5 minutos (ou clique em **Atualizar**).
- Se a API falhar, o dashboard **não quebra**: cai no `dataset.js` e mostra "modo demonstração".
- Free tier do Render hiberna após inatividade; a primeira carga pode levar alguns segundos.
