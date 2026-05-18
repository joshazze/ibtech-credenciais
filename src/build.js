// Etapa 1 -- gera os certificados NAO assinados a partir de:
//   issuer/issuer.json  -> quem emite
//   data/badge.json     -> conteudo comum do certificado
//   data/recipients.csv -> quem recebe (colunas: name,email,variante)
// Rode: npm run build
import { mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const issuer = JSON.parse(readFileSync('issuer/issuer.json', 'utf8'));
const badge = JSON.parse(readFileSync('data/badge.json', 'utf8'));

const lines = readFileSync('data/recipients.csv', 'utf8').trim().split(/\r?\n/);
const header = lines[0].split(',').map((s) => s.trim());
const rows = lines.slice(1).map((line) => {
  const cells = line.split(',').map((s) => s.trim());
  return Object.fromEntries(header.map((h, i) => [h, cells[i]]));
});

// kebab-case sem acentos: decompoe (NFD) e descarta marcas combinantes U+0300-U+036F.
const slug = (s) => [...s.toLowerCase().normalize('NFD')]
  .filter((c) => c.charCodeAt(0) < 0x300 || c.charCodeAt(0) > 0x36f)
  .join('')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
function dateLabel(iso) {
  const d = new Date(iso + 'T12:00:00Z');
  return `${String(d.getUTCDate()).padStart(2, '0')} / ${MESES[d.getUTCMonth()]} / ${d.getUTCFullYear()}`;
}

// Corpo do certificado. Os **destaques** sao convertidos em negrito pelo verificador.
function composeBody(variant) {
  const ligas = variant === 'joint'
    ? 'das ligas **IBtech** e **IbBot** do Ibmec BH'
    : 'da **IBtech** — Liga de Software do Ibmec BH —';
  return `Pela participação ativa nas atividades ${ligas} durante o `
    + `**${badge.period}**, tendo cumprido os **requisitos de presença**, `
    + `desenvolvido e tido aprovado o **projeto de conclusão** dentro dos `
    + `critérios estabelecidos, e cumprido suas obrigações `
    + `**sem qualquer medida disciplinar**.`;
}

mkdirSync('certs/unsigned', { recursive: true });
for (const f of readdirSync('certs/unsigned')) {
  if (f.endsWith('.json')) unlinkSync(`certs/unsigned/${f}`);
}

const badgeId = issuer.id.replace(/issuer\/issuer\.json$/, 'badges/' + slug(badge.name));

rows.forEach((r, i) => {
  const variant = (r.variante || 'solo').toLowerCase();
  const reg = String(i + 1).padStart(3, '0') + '/2026';
  const cert = {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
    ],
    id: 'urn:uuid:' + randomUUID(),
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    name: badge.name,
    issuer,
    validFrom: badge.issueDate + 'T12:00:00.000Z',
    credentialSubject: {
      type: ['AchievementSubject'],
      name: r.name,
      identifier: r.email,
      achievement: {
        id: badgeId,
        type: ['Achievement'],
        name: badge.name,
        description: badge.description,
        criteria: { narrative: badge.criteria },
      },
    },
    // Extensao IbTech: dados de apresentacao do certificado (renderizados pelo verificador).
    ibtech: {
      variant,
      kicker: badge.kicker,
      leagueLabel: badge.leagueLabel,
      periodLabel: badge.periodLabel,
      reg,
      body: composeBody(variant),
      president: badge.president,
      vicePresident: badge.vicePresident,
      issueDateLabel: dateLabel(badge.issueDate),
    },
  };
  const file = `certs/unsigned/${slug(r.name)}.json`;
  writeFileSync(file, JSON.stringify(cert, null, 2) + '\n');
  console.log(`gerado: ${file}  [${variant}, REG ${reg}]`);
});

console.log(`\n${rows.length} certificado(s) não assinado(s). Próximo: npm run anchor`);
