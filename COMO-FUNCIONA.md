# Como funciona o sistema de credenciais da IBtech

Este documento explica, do zero e sem pressupor conhecimento técnico, **o que é**
este sistema, **por que ele existe** e **como ele consegue provar** que um
certificado é verdadeiro.

---

## 1. O problema que estamos resolvendo

Um certificado em PDF tem três fraquezas:

1. **É fácil de falsificar.** Qualquer pessoa com um editor de imagem troca o nome
   e a data.
2. **Não dá para provar que é real.** Anos depois, um recrutador não tem como
   saber se aquele PDF foi mesmo emitido pela IBtech ou montado em casa.
3. **Depende do emissor existir.** Se a IBtech sair do ar, ou o e-mail de quem
   assinou mudar, não há mais para quem perguntar "isso é verdadeiro?".

Este sistema resolve os três. O certificado continua bonito e imprimível, mas
ganha uma camada de **prova matemática** que qualquer pessoa pode conferir
sozinha — sem precisar confiar na nossa palavra.

---

## 2. A ideia em uma frase

> Cada certificado vira um documento de dados, calculamos a sua **impressão
> digital**, e gravamos essa impressão **permanentemente numa blockchain
> pública**. Conferir o certificado depois é só recalcular a impressão digital e
> checar se ela bate com a que está registrada.

Se baterem, o certificado é **exatamente** o que a IBtech emitiu. Se alguém mudar
uma vírgula que seja, não bate mais.

---

## 3. Os quatro conceitos por trás disso

### 3.1 Credencial verificável (padrão Open Badges 3.0)

O certificado **não é uma imagem** — é um arquivo de **dados estruturados**
(um JSON) que diz, em campos separados: quem recebeu, o que foi reconhecido,
quem emitiu, quando, e quais critérios foram cumpridos.

Usar dados em vez de imagem é o que permite a máquina conferir tudo. E usamos um
**padrão internacional** (Open Badges 3.0, do consórcio 1EdTech) — o mesmo tipo
de credencial que LinkedIn, universidades e plataformas como a Credly entendem.

### 3.2 Hash — a "impressão digital" de um arquivo

Um **hash** é uma função matemática que transforma qualquer conteúdo num código
de tamanho fixo (usamos o **SHA-256**, que gera 64 caracteres).

Três propriedades fazem ele funcionar como impressão digital:

- O **mesmo conteúdo** sempre gera o **mesmo hash**.
- **Qualquer alteração** — uma letra, um espaço — gera um hash **completamente
  diferente**.
- É **impossível, na prática, voltar** do hash para o conteúdo, ou forjar dois
  conteúdos com o mesmo hash.

Então o hash de um certificado é uma "etiqueta" minúscula que representa aquele
certificado e **só** aquele certificado.

### 3.3 Árvore de Merkle — provar 32 certificados com 1 só registro

Gravar algo numa blockchain custa uma taxa. Gravar 32 hashes seriam 32 taxas.
A **árvore de Merkle** resolve isso.

Pegamos o hash de cada certificado (as "folhas"), juntamos de dois em dois e
calculamos o hash de cada par, e repetimos até sobrar **um único hash no topo**
— a **raiz de Merkle**:

```
        RAIZ  (1 hash representa o lote inteiro)
        /  \
      h12    h34
      / \    / \
    h1  h2 h3  h4   <- hash de cada certificado
```

Gravamos **só a raiz** na blockchain — **uma transação para o lote inteiro**.
E cada certificado guarda o seu "caminho" na árvore (o `merklePath`), que prova
matematicamente que aquela folha pertence àquela raiz — sem revelar os outros
certificados.

### 3.4 Blockchain — o registro público e imutável

Uma blockchain pública (usamos a rede **Ethereum**, na fase de testes a
**Sepolia**) é um livro-registro:

- **público** — qualquer um lê;
- **imutável** — o que entra não pode ser editado nem apagado;
- **datado** — cada registro tem data e hora confiáveis.

Gravamos a raiz de Merkle dentro de uma transação. A partir daí existe uma prova
pública e permanente de que **aquele lote de certificados existia naquela data e
não foi alterado desde então**.

> **Importante e honesto:** a blockchain **não guarda o certificado** — guarda só
> a raiz (a impressão digital do lote). O conteúdo dos certificados continua
> neste repositório. A blockchain prova *integridade e data*; o repositório
> guarda *o conteúdo*.

---

## 4. Como um certificado é emitido — o pipeline

São três comandos, nesta ordem:

| Etapa | Comando | O que faz |
|---|---|---|
| 1. Gerar | `npm run build` | Lê a lista de membros e o modelo do certificado, e gera um arquivo JSON por pessoa em `certs/unsigned/`. |
| 2. Ancorar | `npm run anchor` | Calcula o hash de cada certificado, monta a árvore de Merkle e **grava a raiz numa única transação** na blockchain. Cada certificado recebe sua prova (`proof`) e vai para `certs/signed/`. |
| 3. Conferir | `npm run verify` | Roda as três checagens (abaixo) num certificado assinado, pela linha de comando. |

O navegador faz a mesma conferência da etapa 3 sozinho, ao abrir a página de
verificação.

---

## 5. Como a verificação prova que o certificado é autêntico

Ao abrir a página de um certificado, o navegador roda **três selos**:

1. **Integridade** — recalcula o hash do certificado e compara com o hash
   registrado (`targetHash`). Se bater, o conteúdo **não foi alterado** desde a
   emissão.
2. **Inclusão na árvore de Merkle** — percorre o `merklePath` da folha até a raiz.
   Se chegar na raiz registrada, aquele certificado **pertence mesmo ao lote**
   ancorado.
3. **Ancoragem on-chain** — busca a transação na blockchain e confere que ela
   carrega exatamente aquela raiz de Merkle. Se bater, o lote foi mesmo
   **registrado pela IBtech**, na data da transação.

**Os três selos verdes** significam: este certificado é, byte por byte, o que a
IBtech emitiu, e isso está provado de forma pública e permanente.

A conferência roda **inteira no navegador de quem está olhando** e consulta a
blockchain diretamente — não depende de nenhum servidor da IBtech estar no ar.

---

## 6. Como cada membro usa o certificado

Cada certificado tem um endereço próprio:

```
https://joshazze.github.io/ibtech-credenciais/verifier/?id=<nome-do-membro>
```

Nessa página o membro pode:

- **Ver o certificado** renderizado, com a verificação on-chain ao vivo.
- **Baixar em PDF** (`Cmd+P` → salvar como PDF) — sai um certificado A4 limpo.
- **Adicionar no LinkedIn**: na seção *Licenças e certificados*, colar esse
  endereço no campo **URL da credencial**. O LinkedIn passa a exibir o botão
  **"Mostrar credencial"**, que abre a verificação.

---

## 7. O que o sistema garante — e o que NÃO garante

**Garante:**

- Que o certificado não foi adulterado depois de emitido.
- Que ele foi registrado pela IBtech (pela conta emissora).
- A data em que isso aconteceu.

**Não garante (e é honesto deixar claro):**

- A blockchain **não julga o mérito**. Que o membro cumpriu os critérios é a
  palavra da IBtech — a blockchain só prova que a IBtech afirmou isso.
- Se a **chave privada da conta emissora** vazar, alguém poderia ancorar
  certificados falsos. Por isso a chave fica fora do repositório (`.env`).
- A blockchain guarda só a raiz. Se o **conteúdo dos certificados** (este
  repositório) for perdido, a prova continua existindo mas o certificado não se
  reconstrói. **Manter o repositório é parte do sistema.**

---

## 8. Operação — para quem administra

| Arquivo | Função |
|---|---|
| `data/badge.json` | Conteúdo comum: nome, período, critérios, presidente, vice. |
| `data/recipients.csv` | Lista de membros (`name,variante`). |
| `issuer/issuer.json` | Perfil da IBtech como emissora. |
| `src/build.js` · `anchor.js` · `verify.js` | As três etapas do pipeline. |
| `verifier/` | A página pública de verificação. |
| `.env` | Chave da conta emissora — **nunca** vai para o git. |

**Custo:** ancorar um lote é **uma única transação**, independente de ter 5 ou
500 certificados. Na fase de testes (rede Sepolia) é gratuito. Na rede de
produção (Polygon) custa centavos.

**Da testnet para a produção:** basta trocar a rede no `.env` (`CHAIN` e
`RPC_URL`) e ter um pouco de saldo na conta emissora para a taxa.

---

## 9. Por que não usamos a Brasil Open Badge

A Brasil Open Badge é uma boa plataforma, mas é **paga**, exige **contrato
institucional** e apenas **exibe** um hash — não reverifica nada na sua frente.

Este sistema usa **o mesmo mecanismo** (ancoragem de hash em blockchain), mas é
**aberto, sem custo de plataforma, sem CNPJ**, controlado pela IBtech, e faz a
**verificação criptográfica ao vivo** — provando a credencial, não só mostrando
um código.

---

*IBtech — Liga de Software · Ibmec BH*
