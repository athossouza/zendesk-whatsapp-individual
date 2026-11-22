// Executa trechos reais do bundle V17 em VM, com todas as requisições substituídas.
// Não carrega React/CDNs, não abre Zendesk e não envia mensagens.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const zip = resolve(root, 'reference/whatsappIndividual-V17.zip');
assert.equal(createHash('sha256').update(readFileSync(zip)).digest('hex'),
  'fd52a30a996db23347feb3498bf6cc44376d9298fee95aa31648ddc00c556375');
const html = execFileSync('unzip', ['-p', zip, 'assets/index.html'], { encoding: 'utf8' });
const manifest = JSON.parse(execFileSync('unzip', ['-p', zip, 'manifest.json'], { encoding: 'utf8' }));
function segment(start, end) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Trecho ausente: ${start}`);
  return html.slice(a, b);
}
const code = [
  segment('var __async =', '// vfs:index.jsx'),
  segment('// vfs:constants.js', '// vfs:utils/sunshine.js'),
  segment('// vfs:utils/sunshine.js', '// vfs:utils/errors.js'),
  segment('// vfs:utils/template.js', '// vfs:utils/phone.js'),
  segment('// vfs:utils/phone.js', '// vfs:utils/urls.js'),
  segment('// vfs:utils/urls.js', '// vfs:utils/validation.js'),
  segment('// vfs:utils/validation.js', '// vfs:utils/enrich/api.js'),
  segment('// vfs:utils/enrich/api.js', '// vfs:components/InitStatus.jsx')
].join('\n');
function runtime() {
  const c = vm.createContext({ URL, URLSearchParams,
    console: { log() {} },
    setTimeout() { throw Error('Timer real não permitido nos testes'); },
    window: { zafClient: { request() { throw Error('Requisição sem mock'); } } }
  });
  vm.runInContext(code, c);
  return c;
}
const plain = value => JSON.parse(JSON.stringify(value));
const template = components => ({ name: 'teste', language: 'pt_BR', components });
const body = text => ({ type: 'BODY', text });
const schemaFields = [
  ['notification_id', 'Notification ID', 'text'], ['phone_number', 'Phone Number', 'text'],
  ['user_name', 'User Name', 'text'], ['agent_sender', 'Agente remetente', 'text'],
  ['status', 'Status', 'text'], ['conversation_id', 'Conversation ID', 'text']
].map(([key, title, type]) => ({ key, title, type }));
schemaFields.push({ key: 'user_id', title: 'User ID', type: 'lookup', relationship_target_type: 'zen:user' });
schemaFields.push({ key: 'template_id', title: 'Campaign Template ID', type: 'lookup',
  relationship_target_type: 'zen:custom_object:zendesk_labs_notifications_template' });
let passed = 0;
async function test(name, fn) {
  await fn(runtime());
  passed++;
  console.log(`OK ${name}`);
}

await test('HEADER e BODY mantêm valores independentes', c => {
  const a = c.analyzeTemplate(template([{ type: 'HEADER', format: 'TEXT', text: '{{1}}' }, body('{{1}}')]));
  assert(a.supported);
  const p = c.buildPayload(a, { 'header:1': 'A', 'body:1': 'B' }, 'canal', '+5511999999999');
  assert.equal(p.message.template.components[0].parameters[0].text, 'A');
  assert.equal(p.message.template.components[1].parameters[0].text, 'B');
});
await test('parameter_name também no HEADER nomeado', c => {
  const a = c.analyzeTemplate(template([{ type: 'HEADER', format: 'TEXT', text: '{{titulo}}' }, body('{{nome}}')]));
  const p = c.buildPayload(a, { 'header:titulo': 'A', 'body:nome': 'B' }, 'canal', '+5511999999999');
  assert.equal(p.message.template.components[0].parameters[0].parameter_name, 'titulo');
  assert.equal(p.message.template.components[1].parameters[0].parameter_name, 'nome');
});
await test('botões preservam índices e URL dinâmica sem url_type', c => {
  const a = c.analyzeTemplate(template([body('Olá'), { type: 'BUTTONS', buttons: [
    { type: 'URL', text: 'Fixo', url: 'https://example.com/' },
    { type: 'QUICK_REPLY', text: 'Resposta' },
    { type: 'URL', text: 'Link', url: 'https://example.com/{{1}}' }
  ] }]));
  const p = c.buildPayload(a, { 'button:1:payload': 'ok', 'button:2:url': 'a$&' }, 'canal', '+5511999999999');
  assert.deepEqual(plain(p.message.template.components.map(x => x.index)), ['1', '2']);
  assert.equal(c.resolveButtonUrl(a.buttons[2], { 'button:2:url': 'a$&' }), 'https://example.com/a$&');
});
await test('template fixo omite components vazios', c => {
  const p = c.buildPayload(c.analyzeTemplate(template([body('Olá')])), {}, 'canal', '+5511999999999');
  assert(!('components' in p.message.template));
  assert.equal(p.destination.destinationId, '+5511999999999');
});
await test('mídia DOCUMENT inclui link e filename', c => {
  const a = c.analyzeTemplate(template([{ type: 'HEADER', format: 'DOCUMENT' }, body('Olá')]));
  const p = c.buildPayload(a, { 'header:media': 'https://example.com/a.pdf', 'header:filename': 'a.pdf' }, 'canal', '+5511999999999');
  assert.equal(p.message.template.components[0].parameters[0].document.filename, 'a.pdf');
});
await test('bloqueia formatos incompatíveis e lacunas', c => {
  for (const t of [
    template([body('{{1}} {{3}}')]), template([body('{{1}} {{nome}}')]),
    template([body('Olá {{')]), template([body('Oi'), { type: 'CAROUSEL' }]),
    { ...template([body('Código')]), category: 'AUTHENTICATION' },
    template([body('Oi'), { type: 'HEADER', format: 'LOCATION' }])
  ]) assert.equal(c.analyzeTemplate(t).supported, false);
});
await test('valores com dólar são literais na substituição', c => {
  assert.equal(c.renderTemplateText('Oi {{1}}', 'body', { 'body:1': '$& $$ $1' }), 'Oi $& $$ $1');
});
await test('telefone manual exige +, cadastro só adiciona sinal', c => {
  for (const [raw, expected] of [
    ['55 (51) 98063-5211', '+5551980635211'], ['555192563778', '+555192563778'],
    ['55 (11) 48717600', '+551148717600']
  ]) {
    assert.equal(c.normalizePhone(raw).ok, false);
    assert.equal(c.normalizeZendeskPhone(raw).value, expected);
  }
  for (const raw of ['051995445802', '51999998888', '551012345678', 'abc'])
    assert.equal(c.normalizeZendeskPhone(raw).ok, false);
});
await test('telefones deduplicam cadastro e identidade', c => {
  const r = c.collectPhoneCandidates('55 (11) 48717600; +5511999999999', [
    { type: 'phone_number', value: '+551148717600' }, { type: 'messaging', value: '5511888888888' }
  ]);
  assert.equal(r.candidates.length, 2);
  assert.match(r.candidates[0].source, /identidade/i);
});
await test('URLs incompletas, privadas e com credenciais são rejeitadas', c => {
  for (const url of ['https://', 'http://example.com/a', 'https://127.0.0.1/a', 'https://10.0.0.1/a',
    'https://u:p@example.com/a', 'https://localhost/a', 'https://[::1]/a'])
    assert.equal(c.validateHttpsUrl(url).ok, false);
  assert(c.validateHttpsUrl('https://example.com/a.pdf').ok);
});
await test('schema exige título e destino corretos; não adivinha key', c => {
  const r = c.mapFields(schemaFields, c.CAMPAIGN_USER_SPEC);
  assert.equal(r.warnings.length, 0);
  assert.equal(r.map.userId.type, 'lookup');
  const wrong = schemaFields.map(f => f.key === 'user_id' ? { ...f, title: 'ID User' } : f);
  assert(!c.mapFields(wrong, c.CAMPAIGN_USER_SPEC).map.userId);
  const target = schemaFields.map(f => f.key === 'user_id' ? { ...f, relationship_target_type: 'zen:ticket' } : f);
  assert(!c.mapFields(target, c.CAMPAIGN_USER_SPEC).map.userId);
});
await test('campo agent_sender aceita key e recusa ambiguidade', c => {
  const fields = schemaFields.map(f => f.key === 'agent_sender' ? { ...f, title: 'Remetente' } : f);
  assert(c.mapFields(fields, c.CAMPAIGN_USER_SPEC).map.agentSender);
  assert(!c.mapFields([...fields, { key: 'outro', title: 'Agente remetente', type: 'text' }], c.CAMPAIGN_USER_SPEC).map.agentSender);
});
await test('template privilegia canal e recusa candidato ambíguo/truncado', async c => {
  c.getTemplateSchema = async () => ({ map: { jsonTemplate: { key: 't' }, jsonChannels: { key: 'ch' } } });
  const rec = (id, channel) => ({ id, custom_object_fields: {
    t: JSON.stringify({ name: 'teste', language: 'pt_BR' }), ch: JSON.stringify(channel)
  } });
  c.listPaged = async () => ({ items: [rec('certo', [{ integrationId: 'canal' }]), rec('sem', [])], truncated: false });
  assert.equal((await c.resolveTemplateRecord({ name: 'teste', language: 'pt-BR' }, 'canal', () => false)).id, 'certo');
  c.resolved = {};
  c.listPaged = async () => ({ items: [rec('a', []), rec('b', [])], truncated: false });
  assert(!(await c.resolveTemplateRecord({ name: 'teste', language: 'pt_BR' }, 'canal', () => false)).id);
  c.listPaged = async () => ({ items: [rec('a', [])], truncated: true });
  assert(!(await c.resolveTemplateRecord({ name: 'teste', language: 'pt_BR' }, 'canal', () => false)).id);
});
const job = { notificationId: 'notificacao/teste', phone: '+5511999999999', integrationId: 'canal',
  template: { name: 'teste', language: 'pt_BR' }, user: { id: '123', name: 'Destinatário' },
  agent: { name: 'Agente Teste', email: 'agente@example.com' } };
await test('campos de registro preservam os campos do serviço', async c => {
  c.resolveTemplateRecord = async () => ({ id: 'registro-template' });
  const map = c.mapFields(schemaFields, c.CAMPAIGN_USER_SPEC).map;
  const fields = await c.buildAppFields(job, map, [], () => false);
  assert.deepEqual(Object.keys(fields).sort(), ['agent_sender', 'notification_id', 'phone_number', 'template_id', 'user_id', 'user_name']);
  assert.equal(fields.agent_sender, 'Agente Teste (agente@example.com)');
  const manual = await c.buildAppFields({ ...job, user: null }, map, [], () => false);
  assert(!('user_id' in manual) && !('user_name' in manual));
});
await test('upsert e fallback usam PATCH, não POST', async c => {
  const calls = [];
  c.window.zafClient.request = async options => { calls.push(options); return {}; };
  await c.upsertRecord(job.notificationId, { phone_number: job.phone });
  await c.patchRecord('registro', { agent_sender: 'Teste' });
  assert(calls.every(x => x.type === 'PATCH'));
  assert.match(calls[0].url, /external_id=notificacao%2Fteste$/);
  assert.equal(JSON.parse(calls[0].data).custom_object_record.external_id, job.notificationId);
  assert(!('external_id' in JSON.parse(calls[1].data).custom_object_record));
});
await test('registro aceito e watcher não reenviam WhatsApp', async c => {
  const requests = [];
  c.getCampaignUserSchema = async () => c.mapFields(schemaFields, c.CAMPAIGN_USER_SPEC);
  c.resolveTemplateRecord = async () => ({ id: 'registro-template' });
  c.sleep = async () => {};
  c.window.zafClient.request = async options => {
    requests.push(options);
    if (options.type === 'PATCH') return { custom_object_record: { id: 'registro' } };
    return { custom_object_records: [{ id: 'registro', external_id: job.notificationId, custom_object_fields: { status: 'sent' } }] };
  };
  const updates = [];
  const result = await c.runEnrichment(job, () => false, x => updates.push(x));
  assert.equal(result.status, 'done');
  assert(updates.some(x => x.status === 'done'));
  assert(updates.some(x => x.notify?.kind === 'confirmed'));
  assert(requests.every(x => x.url.startsWith('/api/v2/custom_objects/') && ['GET', 'PATCH'].includes(x.type)));
});
await test('falha no upsert recupera registro existente sem reenviar', async c => {
  c.getCampaignUserSchema = async () => c.mapFields(schemaFields, c.CAMPAIGN_USER_SPEC);
  c.resolveTemplateRecord = async () => ({ id: 'registro-template' });
  c.upsertRecord = async () => { throw { status: 403 }; };
  c.waitForRecord = async () => ({ id: 'registro-existente', custom_object_fields: {} });
  let patched;
  c.patchRecord = async (id, fields) => { patched = { id, fields }; };
  const result = await c.runEnrichment(job, () => false);
  assert.equal(result.status, 'done');
  assert.equal(patched.id, 'registro-existente');
  assert(!('notes' in patched.fields) && !('status' in patched.fields));
});
await test('watcher para em duplicidade e ignora trabalho obsoleto', async c => {
  c.sleep = async () => {};
  c.lookupRecords = async () => [{}, {}];
  const updates = [];
  await c.watchNotifications(job, {}, () => false, x => updates.push(x));
  assert.equal(updates[0].notify.kind, 'duplicate');
  await c.watchNotifications(job, {}, () => true, () => assert.fail('Callback obsoleto'));
});
await test('transporte mantém segredo como placeholder e desliga retry', async c => {
  let request;
  c.window.zafClient.request = async options => { request = options; return {}; };
  await c.sendNotification({ appId: 'app', keyId: 'key', region: 'EU' }, { teste: true });
  assert.equal(request.headers.Authorization, 'Basic {{basic_auth.token}}');
  assert.equal(request.basic_auth.password, '{{setting.scKeySecret}}');
  assert.equal(request.autoRetry, false);
  assert.equal(request.cors, false);
  assert.match(request.url, /^https:\/\/api\.eu-1\.smooch\.io\/v1\.1\/apps\/app\/notifications$/);
});
await test('limitações do ZIP estão preservadas para auditoria', c => {
  assert.equal(manifest.parameters.find(x => x.name === 'scKeySecret').secure, true);
  assert.equal(manifest.parameters.find(x => x.name === 'scKeySecret').scopes, undefined);
  assert.deepEqual(manifest.domainWhitelist, []);
  assert.equal(c.TOTAL_MS, 30000);
  assert.equal(c.WATCH_TOTAL_MS, 90000);
});

// Exportação canônica para copiar sem cabeçalhos Markdown.
const markdownPath = resolve(root, 'prompts/01-app-whatsapp-individual.md');
const markdown = readFileSync(markdownPath, 'utf8');
const blocks = [...markdown.matchAll(/```text\n([\s\S]*?)\n```/g)];
assert.equal(blocks.length, 1);
const canonical = blocks[0][1] + '\n';
const textPath = resolve(root, 'prompts/01-app-whatsapp-individual.txt');
if (process.argv.includes('--exportar-prompt')) writeFileSync(textPath, canonical);
assert.equal(readFileSync(textPath, 'utf8'), canonical, 'Atualize o .txt com --exportar-prompt');
assert(canonical.includes('basic_auth_password'));
function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    if (['analise-fontes', '.git'].includes(name)) return [];
    const p = resolve(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
for (const file of walk(root).filter(p => p.endsWith('.md'))) {
  for (const match of readFileSync(file, 'utf8').matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    assert(statSync(resolve(dirname(file), target)).isFile(), `Link local inválido: ${file} → ${target}`);
  }
}
console.log(`${passed} cenários V17 aprovados; hash, prompt .txt e links locais conferidos. Sem chamadas externas.`);
