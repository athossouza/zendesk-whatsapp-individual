// Referência V3: comportamentos e limitações. Nenhuma chamada externa ou escrita Zendesk.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const zip = resolve(root, 'reference/disparosWhatsappDoSolicitante-V3.zip');
assert.equal(createHash('sha256').update(readFileSync(zip)).digest('hex'), '7336850d42363389824898235ec0b8da12a18ae1eb2248d372fd6feff216dd24');
const html = execFileSync('unzip', ['-p', zip, 'assets/index.html'], {encoding:'utf8'});
const manifest = JSON.parse(execFileSync('unzip', ['-p', zip, 'manifest.json'], {encoding:'utf8'}));
function section(a,b) {
 const start=html.indexOf(a),end=html.indexOf(b,start+a.length);
 assert(start>=0&&end>start,`Trecho ausente: ${a}`);return html.slice(start,end);
}
const source=[section('var __defProp =','// vfs:index.jsx'),
 section('// vfs:constants.js','// vfs:utils/format.js'),
 section('// vfs:utils/format.js','// vfs:components/SummaryHeader.jsx'),
 section('// vfs:utils/filters.js','// vfs:components/Filters.jsx'),
 section('var STATUS_LABELS =','var DispatchCard ='),
 section('function statusTone(','var DispatchList ='),
 section('// vfs:utils/phone.js','// vfs:App.jsx')].join('\n');
function runtime(){
 const c=vm.createContext({URLSearchParams,console:{log(){}},setTimeout(){throw Error('Timer real não permitido');},window:{zafClient:{request(){throw Error('Requisição sem mock');}}}});
 vm.runInContext(source,c);return c;
}
const plain=x=>JSON.parse(JSON.stringify(x));
let good=0,limits=0;
async function test(name,fn,known=false){await fn(runtime());if(known)limits++;else good++;console.log(`${known?'LIMITE CONFIRMADO':'OK'} ${name}`);}
const record=(id,fields={},date='2026-11-19T18:09:00Z')=>({id,created_at:date,custom_object_fields:fields});
await test('Manifesto ticket_sidebar, flexível, sem credenciais',c=>{
 assert.equal(manifest.location.support.ticket_sidebar.flexible,true);
 assert(!manifest.parameters||manifest.parameters.length===0);
});
await test('Quatro exemplos brasileiros incluem as duas variantes de celular',c=>{
 for(const p of ['(51) 99999-8888','5199998888','+55 51 9999-8888','555199998888']){
  const a=c.getPhoneCandidates([p]);assert(a.includes('+5551999998888'));assert(a.includes('+555199998888'));
 }
});
await test('Fixo brasileiro não recebe nono dígito',c=>{
 assert.deepEqual(plain(c.getPhoneVariations('55 (11) 3333-4444')),['551133334444']);
});
await test('Prefixo 00 e tronco/operadora brasileiros',c=>{
 for(const p of ['005551999998888','051999998888','02151999998888'])assert.equal(c.normalizeDigits(p),'5551999998888');
});
await test('Deduplica telefones e ignora vazios',c=>{
 assert.deepEqual(plain(c.uniquePhones(['','abc','+55 51 99999-8888','5551999998888'])),['+55 51 99999-8888']);
});
await test('Nome/BODY/HEADER/FOOTER vêm do JSON, sem idioma/categoria no modelo',c=>{
 const t=c.templateInfo(JSON.stringify({name:'teste',language:'pt_BR',category:'MARKETING',components:[
  {type:'HEADER',text:'Cabeçalho'}, {type:'BODY',text:'Oi {{1}} e {{nome}}'}, {type:'FOOTER',text:'Rodapé'}]}),'fallback');
 assert.equal(t.name,'teste');assert.equal(t.body,'Oi {{1}} e {{nome}}');assert.equal(t.header,'Cabeçalho');assert.equal(t.footer,'Rodapé');
 assert(!('language'in t)&&!('category'in t));
});
await test('JSON inválido usa fallback sem vazar JSON',c=>{
 assert.equal(c.templateInfo('{quebrado','Nome legível').name,'Nome legível');
 assert.equal(c.templateInfo('42','Nome legível').body,'');
});
await test('Status conhecidos são traduzidos e desconhecidos preservados',c=>{
 for(const [a,b]of [['sent','Enviado'],['DELIVERED','Entregue'],['read','Lido'],['failed','Falhou'],['pending','pending'],['','-']])assert.equal(c.labelStatus(a),b);
});
await test('Modelo do card não expõe IDs de notificação/conversa',c=>{
 const x=c.toViewModel(record('r',{template_id:'t',notification_id:'n',conversation_id:'c',agent_sender:'Agente'}),{t:{name:'Modelo',body:'Olá',header:'',footer:''}});
 assert.equal(x.template,'Modelo');assert.equal(x.agent,'Agente');assert(!('notificationId'in x)&&!('conversationId'in x));
});
await test('Busca remove acentos e consulta BODY e rodapé',c=>{
 const x=[{agent:'Júlia',template:'Teste',templateBody:'Ação',templateFooter:'Contato',status:'read'}];
 for(const query of ['julia','ACAO','contato'])assert.equal(c.applyFilters(x,{from:'',to:'',query}).length,1);
});
await test('Datas inclusivas, ordenação e grupo no fuso informado',c=>{
 const at=new Date(2026,10,19,23,59,59,999).toISOString();
 assert.equal(c.applyFilters([{createdAt:at}],{from:'2026-11-19',to:'2026-11-19',query:''}).length,1);
 assert.equal(c.formatDateTime('2026-12-01T01:30:00Z','America/Sao_Paulo'),'30/11/2026 22:30');
 assert.equal(c.monthKey('2026-12-01T01:30:00Z','America/Sao_Paulo'),'2026-11');
 assert.equal(c.sortByDateDesc([{id:'a',createdAt:'2026-11-18'},{id:'b',createdAt:'2026-11-19'}])[0].id,'b');
});
await test('POST é pesquisa, com filtro, sort e cursor corretos',async c=>{
 const calls=[];c.window.zafClient.request=async o=>{calls.push(o);return calls.length===1?{custom_object_records:[record('a')],meta:{has_more:true,after_cursor:'next/+'}}:{custom_object_records:[record('b')],meta:{has_more:false}};};
 const filter={'custom_object_fields.user_id':{$eq:'123'}};const r=await c.searchAll(filter,500);
 assert.equal(r.length,2);assert(calls.every(o=>o.type==='POST'&&o.url.includes('/records/search?')));
 assert.deepEqual(JSON.parse(calls[0].data),{filter});assert.equal(new URLSearchParams(calls[1].url.split('?')[1]).get('page[after]'),'next/+');
});
await test('Busca une telefones e usuário, removendo registros duplicados',async c=>{
 const calls=[];c.searchAll=async f=>{calls.push(plain(f));return calls.length===1?[record('a')]:[record('a'),record('b')];};
 const r=await c.fetchDispatches('123',['+5551999998888']);assert.equal(r.length,2);
 assert(calls[0].$or.length<=8);assert.equal(calls.at(-1)['custom_object_fields.user_id'].$eq,'123');
});
await test('Sem telefone ainda consulta por user_id',async c=>{
 const calls=[];c.searchAll=async f=>{calls.push(f);return[];};await c.fetchDispatches('123',[]);
 assert.equal(calls.length,1);assert.equal(calls[0]['custom_object_fields.user_id'].$eq,'123');
});
await test('Telefones são divididos em lotes de até oito candidatos',async c=>{
 const calls=[];c.searchAll=async f=>{calls.push(f);return[];};
 await c.fetchDispatches('123',['+5551999998888','+5511999998888','+5521999998888']);
 assert(calls.filter(x=>x.$or).length>=2);assert(calls.filter(x=>x.$or).every(x=>x.$or.length<=8));
});
await test('429 tem quatro retries explícitos; 403 não repete',async c=>{
 let calls=0;const waits=[];c.sleep=async ms=>waits.push(ms);
 c.window.zafClient.request=async()=>{calls++;throw{status:429};};await assert.rejects(c.zRequest({url:'/api/v2/example',type:'GET'}));
 assert.equal(calls,5);assert.deepEqual(waits,[1000,2000,4000,8000]);
 calls=0;c.window.zafClient.request=async()=>{calls++;throw{status:403};};await assert.rejects(c.zRequest({url:'/api/v2/example',type:'GET'}));assert.equal(calls,1);
});
await test('Template é resolvido uma vez por ID na sessão',async c=>{
 let calls=0;c.window.zafClient.request=async o=>{calls++;assert.equal(o.type,'GET');return{custom_object_record:{name:'Fallback',custom_object_fields:{template:'{"name":"Modelo","components":[]}'}}};};
 assert.equal((await c.fetchTemplateInfo('t')).name,'Modelo');await c.fetchTemplateInfo('t');assert.equal(calls,1);
});
await test('Leitura de telefones considera somente identidades phone_number',async c=>{
 const methods=[];c.window.zafClient.request=async o=>{methods.push(o.type);return o.url.endsWith('/identities.json')?{identities:[{type:'messaging',value:'opaque'},{type:'phone_number',value:'+551133334444'}]}:{user:{phone:'+5551999998888'}};};
 assert.equal((await c.fetchRequesterPhones('123')).length,2);assert(methods.every(x=>x==='GET'));
});
await test('Link absoluto e omissão de idioma/categoria estão no card',c=>{
 const card=section('var DispatchCard =','// vfs:components/DispatchList.jsx');
 assert(card.includes('"https://" + subdomain + ".zendesk.com/agent/custom-objects/"'));assert(card.includes('rel: "noopener noreferrer"'));
 assert(!card.includes('item.notificationId')&&!card.includes('item.conversationId')&&!card.includes('item.language')&&!card.includes('item.category'));
});
await test('Limites API/UI da referência: 500 e 10',c=>{
 assert.equal(c.MAX_RECORDS,500);assert.equal(c.UI_PAGE_SIZE,10);assert.equal(c.PHONE_BATCH_SIZE,8);
});
await test('V3 perde DDI explícito de internacional com 11 dígitos',c=>{
 assert.equal(c.normalizeDigits('+14155552671'),'5514155552671');
},true);
await test('Busca por Lido não encontra status bruto read',c=>{
 assert.equal(c.applyFilters([{status:'read'}],{query:'Lido',from:'',to:''}).length,0);
},true);
await test('V3 consulta apenas a primeira página de identidades',async c=>{
 let identityCalls=0;c.window.zafClient.request=async o=>o.url.includes('identities')?(identityCalls++,{identities:[],next_page:'/api/v2/mais',meta:{has_more:true},links:{next:'/api/v2/mais'}}):{user:{phone:''}};
 await c.fetchRequesterPhones('123');assert.equal(identityCalls,1);
},true);
await test('Erro de identidade interrompe o fluxo antes da busca por usuário',async c=>{
 c.window.zafClient.request=async o=>{if(o.url.includes('identities'))throw{status:403};return{user:{phone:'+551133334444'}};};
 await assert.rejects(c.fetchRequesterPhones('123'));
 const app=section('// vfs:App.jsx\n      var App =','// vfs:index.jsx');
 assert(app.indexOf('yield fetchRequesterPhones')<app.indexOf('yield fetchDispatches'));
},true);
await test('Falha transitória de template fica cacheada como fallback',async c=>{
 let calls=0;c.window.zafClient.request=async()=>{calls++;throw{status:503};};
 await c.fetchTemplateInfo('t');await c.fetchTemplateInfo('t');assert.equal(calls,1);
},true);
await test('V3 concatena dois telefones no mesmo campo',c=>{
 assert.equal(c.normalizeDigits('551133334444;552133334444'),'551133334444552133334444');
},true);
const md=readFileSync(resolve(root,'prompts/02-app-disparos-sidebar.md'),'utf8');
const block=[...md.matchAll(/```text\n([\s\S]*?)\n```/g)];assert.equal(block.length,1);
assert.equal(readFileSync(resolve(root,'prompts/02-app-disparos-sidebar.txt'),'utf8'),block[0][1]+'\n');
assert(block[0][1].includes('ticket.requester.id.changed'));
console.log(`${good} cenários de comportamento e ${limits} limitações da V3 conferidos; SHA-256 e prompt .txt válidos. Sem rede ou alterações no Zendesk.`);
