// Etapa 1 -- gera os certificados NAO assinados a partir de:
//   issuer/issuer.json  -> quem emite
//   data/badge.json     -> o que a credencial atesta
//   data/recipients.csv -> quem recebe (colunas: name,email)
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

mkdirSync('certs/unsigned', { recursive: true });
for (const f of readdirSync('certs/unsigned')) {
  if (f.endsWith('.json')) unlinkSync(`certs/unsigned/${f}`);
}

const now = new Date().toISOString();
const badgeId = issuer.id.replace(/issuer\/issuer\.json$/, 'badges/' + slug(badge.name));

for (const r of rows) {
  const cert = {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
    ],
    id: 'urn:uuid:' + randomUUID(),
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    name: badge.name,
    issuer,
    validFrom: now,
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
  };
  const file = `certs/unsigned/${slug(r.name)}.json`;
  writeFileSync(file, JSON.stringify(cert, null, 2) + '\n');
  console.log('gerado: ' + file);
}

console.log(`\n${rows.length} certificado(s) nao assinado(s). Proximo: npm run anchor`);
