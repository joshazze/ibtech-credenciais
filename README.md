# Credenciais Verificaveis On-Chain — IbTech

Emissao de certificados de participacao **verificaveis** e **ancorados em blockchain**,
no padrao **Open Badges 3.0 / Blockcerts**. Sem plataforma paga, sem CNPJ: o unico
custo e a taxa de uma transacao (centavos numa rede como a Polygon).

## Como funciona

1. Cada certificado vira um JSON no schema Open Badges 3.0.
2. Calcula-se o hash SHA-256 de cada certificado e monta-se uma **arvore de Merkle**.
3. A **raiz da arvore** e gravada numa **unica transacao** na blockchain — um tx para
   todos os certificados do lote.
4. Cada certificado recebe um bloco `proof` com seu caminho de Merkle e o hash da
   transacao.
5. Para verificar: recalcula-se o hash, caminha-se a arvore ate a raiz e confere-se
   que a raiz esta on-chain. Sem servidor, sem depender do emissor estar no ar.

## Estrutura

| Caminho | O que e |
|---|---|
| `issuer/issuer.json` | Perfil do emissor (IbTech) — padrao Open Badges |
| `data/badge.json` | Definicao da credencial: nome, descricao, criterio |
| `data/recipients.csv` | Lista de quem recebe (`name,email`) |
| `src/build.js` | Etapa 1 — gera os certificados nao assinados |
| `src/anchor.js` | Etapa 2 — assina e ancora na blockchain |
| `src/verify.js` | Verificacao via linha de comando |
| `verifier/index.html` | Pagina publica de verificacao (URL para o LinkedIn) |
| `certs/unsigned/` · `certs/signed/` | Certificados antes e depois da ancoragem |

## Pre-requisitos

- Node.js 20+ (`node --version`)
- Uma conta blockchain dedicada, com um pouco de saldo para a taxa da transacao

## Passo a passo

```bash
npm install

# 1. Gera a conta emissora (dedicada — nunca uma carteira pessoal)
npm run keygen

# 2. Copie .env.example para .env e cole a chave privada gerada
cp .env.example .env

# 3. Abasteca o endereco da conta com tokens de teste (ver "Faucet" abaixo)

# 4. Gera os certificados nao assinados a partir do CSV
npm run build

# 5. Assina e ancora na blockchain (uma transacao para todo o lote)
npm run anchor

# 6. Verifica um certificado assinado
npm run verify -- certs/signed/joshua-azze-distel.json
```

## Faucet (rede de teste)

A configuracao padrao usa a testnet **Ethereum Sepolia** — tokens de graca:

- https://cloud.google.com/application/web3/faucet — rede **Ethereum Sepolia** (login Google)
- Alternativa: qualquer faucet de **Sepolia ETH**

O verificador reconhece as redes `ethereum-sepolia`, `polygon-amoy` e `polygon`.
Para emitir de verdade, troque no `.env` para `CHAIN=polygon` e um RPC de mainnet.

## Verificacao publica e o botao do LinkedIn

A pagina `verifier/index.html`, publicada via **GitHub Pages**, e a URL publica de
cada credencial. No LinkedIn, em **Licencas e certificados**, o aluno preenche o
campo **URL da credencial** com:

```
https://joshazze.github.io/ibtech-credenciais/verifier/?id=<nome-da-credencial>
```

Isso faz o LinkedIn exibir o botao **"Mostrar credencial"**, que abre a pagina de
verificacao rodando as tres checagens ao vivo.

## Seguranca

- O `.env` (com a chave privada) **nunca** vai para o git — ja esta no `.gitignore`.
- A conta emissora e dedicada: nao guarda fundos alem da taxa das transacoes.
