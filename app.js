'use strict';
/* Discipline: dados salvos no navegador (localStorage). */
const $=(s,r=document)=>r.querySelector(s),
L=(k,d)=>{try{return JSON.parse(localStorage.getItem('dsc_'+k))??d}catch(e){return d}},
S=(k,v)=>localStorage.setItem('dsc_'+k,JSON.stringify(v)),
esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const SUBJ={matematica:'Matemática',geometria:'Geometria',biologia:'Biologia',fisica:'Física',quimica:'Química',gramatica:'Gramática',interpretacao:'Interpretação',literatura:'Literatura',historia:'História',geografia:'Geografia',filosofia:'Filosofia',ingles:'Inglês'};
const STEP=100000/49; // nível 50 = 1000 h de estudo (100 XP/h)
const TITLES=[[1,'Aluno burrinho'],[5,'Aluno decente'],[14,'Aluno dedicado'],[20,'Aluno inteligente'],[25,'Aluno nota 10'],[30,'Gabaritador de provas'],[35,'Aluno médio do ITA'],[40,'Mestre dos vestibulares'],[45,'Detentor do conhecimento']];
const ENEM={l:['Linguagens',[50,100,150]],h:['Humanas',[50,150,200]],n:['Natureza',[50,175,300]],e:['Exatas',[50,175,300]]};
const tier=(k,v)=>ENEM[k][1][v<=15?0:v<=30?1:2];
const ACH=[
[1,'Madrugador','Envie o formulário com 5 h ou mais de estudo antes das 8h',500,e=>e.h<8&&e.min>=300],
[2,'Maratona','Estude 3 h no mesmo dia',200,e=>e.min>=180],
[3,'Maratona 2','Estude 5 h no mesmo dia',400,e=>e.min>=300],
[4,'Maratona 3','Estude 10 h no mesmo dia',1000,e=>e.min>=600],
[5,'Maratona 4','Estude 14 h no mesmo dia',1200,e=>e.min>=840],
[6,'Polivalente','Estude ao menos 30 min de 5 matérias no mesmo dia',250,e=>Object.values(e.s).filter(m=>m>=30).length>=5],
[7,'Sequência semanal','Envie formulários por 7 dias seguidos',300,(e,c)=>c.cur>=7],
[8,'Sequência bissemanal','Envie formulários por 14 dias seguidos',400,(e,c)=>c.cur>=14],
[9,'Sequência mensal','Envie formulários por 30 dias seguidos',750,(e,c)=>c.cur>=30],
[10,'Máquina de questões','Faça 30 questões no mesmo dia',100,e=>e.q>=30],
[11,'Máquina de questões 2','Faça 50 questões no mesmo dia',200,e=>e.q>=50],
[12,'Máquina de simulados','Faça 90 questões no mesmo dia',250,e=>e.q>=90],
[13,'Máquina de simulados 2','Faça 180 questões no mesmo dia',450,e=>e.q>=180],
[14,'Máquina de simulados 3','Faça 360 questões no mesmo dia',1000,e=>e.q>=360],
[15,'Começando','Faça seu primeiro formulário',50,()=>true],
[16,'Pegando o jeito','Estude 2 h ou mais e faça 10 questões ou mais no mesmo dia',100,e=>e.min>=120&&e.q>=10]];

/* datas e formatação */
const pad=n=>String(n).padStart(2,'0'),
fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()),
today=()=>fmt(new Date()),
day=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return fmt(d)},
br=s=>s.split('-').reverse().join('/'),
fh=m=>Math.floor(m/60)+'h'+pad(m%60),
nf=n=>Math.round(n).toLocaleString('pt-BR');

async function hash(p){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('dsc:'+p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){let h=0;for(const c of p)h=(h*31+c.charCodeAt(0))|0;return'f'+h}}

/* dados */
const users=()=>L('users',{}),
me=()=>{const k=L('me',null);return k&&users()[k]||null},
save=u=>{const U=users();U[u.nick.toLowerCase()]=u;S('users',U)};

function stats(u){
 const E=Object.values(u.e),sum=f=>E.reduce((a,e)=>a+e[f],0),min=sum('min');
 const xp=u.base+sum('xp')+Object.keys(u.a).reduce((a,id)=>a+ACH.find(x=>x[0]==id)[3],0);
 const lv=Math.min(50,1+Math.floor(xp/STEP));
 let mx=0,run=0,prev=null;
 for(const d of Object.keys(u.e).sort()){run=prev&&day(prev,1)===d?run+1:1;mx=Math.max(mx,run);prev=d}
 let cur=0,d=today();if(!u.e[d])d=day(d,-1);while(u.e[d]){cur++;d=day(d,-1)}
 const sub={};E.forEach(e=>{for(const k in e.s)sub[k]=(sub[k]||0)+e.s[k]});
 const title=lv>=50&&u.title?u.title:[...TITLES].reverse().find(t=>lv>=t[0])[1];
 return{min,q:sum('q'),r:sum('r'),xp,lv,mx,cur,sub,title};
}
const ranking=()=>Object.values(users()).map(u=>({u,s:stats(u)})).sort((a,b)=>b.s.xp-a.s.xp);

function submitForm(u,f){
 const e={s:f.s,q:f.q,r:f.r,n:f.n,h:new Date().getHours(),min:Object.values(f.s).reduce((a,b)=>a+b,0)};
 e.xp=Math.round(Object.entries(f.s).reduce((a,[k,m])=>a+m/60*(u.worst.includes(k)?120:100),0)+e.q*5+e.r*150);
 u.e[today()]=e;
 const st=stats(u),got=[];
 ACH.forEach(a=>{if(!u.a[a[0]]&&a[4](e,st)){u.a[a[0]]=today();got.push(a)}});
 save(u);return{e,got};
}

/* estado de tela */
const app=$('#app');
let reg={step:1,d:{best:[],worst:[]}},fm=null,flash=null;

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3500)}

function nav(){
 const u=me(),h=location.hash.slice(1)||'rank';
 const it=u?[['rank','Ranking'],['form','Diário'],['ach','Conquistas'],['prof','Perfil']]:[['rank','Ranking'],['login','Entrar']];
 $('#nav').innerHTML=it.map(([k,t])=>`<a href="#${k}" ${h===k||(k==='login'&&h==='reg')?'aria-current="page"':''}>${t}</a>`).join('');
}

/* telas */
function vRank(){
 const u=me(),all=ranking();
 return `<h1>Ranking</h1>`+(u?'':`<div class="card cta"><p>Entre para registrar seus estudos e subir no ranking.</p><a class="btn" href="#login">Entrar</a> <a class="btn ghost" href="#reg">Criar conta</a></div>`)+
 (all.length?`<ol class="rank">`+all.map(({u:x,s},i)=>`<li class="${u&&u.nick===x.nick?'me':''}"><b class="pos">${i+1}º</b><div class="who"><strong>${esc(x.nick)}</strong><small>${esc(s.title)}</small></div><div class="num"><strong>Nível ${s.lv}</strong><small>${fh(s.min)} · ${nf(s.xp)} XP</small></div></li>`).join('')+`</ol>`:`<p class="empty">Ninguém se cadastrou ainda. Crie a primeira conta.</p>`);
}

function vLogin(){
 return `<h1>Entrar</h1><form id="login" class="card stack"><label>Nick ou e-mail<input name="who" required autocomplete="username"></label><label>Senha<input name="pw" type="password" required autocomplete="current-password"></label><p class="err" role="alert"></p><button class="btn">Entrar</button><p>Ainda não tem conta? <a href="#reg">Criar conta</a></p></form>`;
}

const chips=(name,sel)=>Object.entries(SUBJ).map(([k,v])=>`<label class="chip"><input type="checkbox" name="${name}" value="${k}" ${sel.includes(k)?'checked':''}><span>${v}</span></label>`).join('');
function vReg(){
 const d=reg.d;
 if(reg.step===1)return `<h1>Criar conta</h1><form id="r1" class="card stack"><label>Nick<small>Único. Letras, números, _ . -</small><input name="nick" required minlength="3" maxlength="20" value="${esc(d.nick||'')}" autocomplete="username"></label><label>E-mail<input name="email" type="email" required value="${esc(d.email||'')}" autocomplete="email"></label><label>Senha<small>Mínimo de 6 caracteres.</small><input name="pw" type="password" required minlength="6" autocomplete="new-password"></label><p class="err" role="alert"></p><button class="btn">Continuar</button><p>Já tem conta? <a href="#login">Entrar</a></p></form>`;
 if(reg.step===2)return `<h1>Suas matérias</h1><form id="r2" class="card stack"><fieldset><legend>Em quais você é melhor? (até 3, opcional)</legend><div class="chips">${chips('best',d.best)}</div></fieldset><fieldset><legend>Em quais você é pior? (até 3, obrigatório)</legend><div class="chips">${chips('worst',d.worst)}</div></fieldset><p class="hint">Nas matérias em que você vai pior, cada hora de estudo vale 120 XP em vez de 100.</p><p class="err" role="alert"></p><div class="row"><button type="button" class="btn ghost" data-back>Voltar</button><button class="btn">Continuar</button></div></form>`;
 const en=d.enem||{};
 return `<h1>Seu ENEM 2026</h1><form id="r3" class="card stack"><p class="hint">Informe quantas questões você acertou em cada área. Isso define seu XP inicial.</p>${Object.entries(ENEM).map(([k,[n]])=>`<label>${n} (acertos, 0 a 45)<input name="${k}" type="number" min="0" max="45" required inputmode="numeric" value="${en[k]??''}"></label>`).join('')}<p class="err" role="alert"></p><div class="row"><button type="button" class="btn ghost" data-back>Voltar</button><button class="btn">Criar conta</button></div></form>`;
}

function vForm(){
 const u=me(),t=today(),e=u.e[t];
 if(e){
  const st=Object.entries(e.s).map(([k,m])=>`${SUBJ[k]} (${fh(m)})`).join(', ');
  return `<h1>Diário de estudo</h1>`+(flash?`<div class="card"><strong>+${nf(flash.e.xp)} XP pelo formulário</strong>${flash.got.length?`<p>Conquistas desbloqueadas:</p><ul>${flash.got.map(a=>`<li>${a[1]} (+${a[3]} XP)</li>`).join('')}</ul>`:''}</div>`:'')+
  `<div class="card stack"><p><strong>Formulário de hoje enviado.</strong> Volte amanhã para registrar um novo dia.</p><p class="mut">${st}<br>${e.q} questões · ${e.r} redações · ${fh(e.min)} no total</p>${e.n?`<p class="mut">Nota: ${esc(e.n)}</p>`:''}</div>`;
 }
 if(!fm)fm={s:{},q:0,r:0,n:''};
 const free=Object.entries(SUBJ).filter(([k])=>!(k in fm.s));
 return `<h1>Diário de estudo</h1><form id="fm" class="card stack" novalidate>
 <fieldset><legend>Matérias estudadas</legend>${free.length?`<div class="row"><select id="sel" aria-label="Matéria">${free.map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><button type="button" class="btn ghost" id="add">Adicionar</button></div>`:''}
 <div id="rows">${Object.entries(fm.s).map(([k,m])=>`<div class="srow" data-k="${k}"><strong>${SUBJ[k]}</strong><label>horas<input type="number" data-t="h" min="0" max="20" value="${Math.floor(m/60)}"></label><label>min<input type="number" data-t="m" min="0" max="59" value="${m%60}"></label><button type="button" class="x" data-rm aria-label="Remover ${SUBJ[k]}">×</button></div>`).join('')}</div>
 <small>Mínimo de 30 min por matéria. Máximo de 20 h no total.</small></fieldset>
 <label>Quantas questões você fez? (0 a 1000)<input id="q" type="number" min="0" max="1000" value="${fm.q}"></label>
 <label>Quantas redações você fez? (0 a 10)<input id="r" type="number" min="0" max="10" value="${fm.r}"></label>
 <label>Nota (opcional)<textarea id="n" rows="2" maxlength="300">${esc(fm.n)}</textarea></label>
 <p id="prev" class="mut"></p><p class="err" role="alert"></p><button class="btn">Enviar formulário</button></form>`;
}
function prev(){
 const p=$('#prev');if(!p||!fm)return;const u=me();
 const min=Object.values(fm.s).reduce((a,b)=>a+b,0),
 xp=Object.entries(fm.s).reduce((a,[k,m])=>a+m/60*(u.worst.includes(k)?120:100),0)+fm.q*5+fm.r*150;
 p.textContent=`Total: ${fh(min)} · cerca de ${nf(xp)} XP (sem contar conquistas)`;
}

function vAch(){
 const u=me(),n=Object.keys(u.a).length;
 return `<h1>Conquistas</h1><p class="mut">${n} de ${ACH.length} desbloqueadas</p><ul class="ach">${ACH.map(a=>{const d=u.a[a[0]];return `<li class="${d?'on':''}"><b>+${a[3]}<br>XP</b><div><strong>${a[1]}</strong><p>${a[2]}</p>${d?`<small>Desbloqueada em ${br(d)}</small>`:''}</div></li>`}).join('')}</ul>`;
}

function vProf(){
 const u=me(),s=stats(u),pos=ranking().findIndex(x=>x.u.nick===u.nick)+1,
 pct=s.lv>=50?100:(s.xp-(s.lv-1)*STEP)/STEP*100,
 subs=Object.entries(s.sub).sort((a,b)=>b[1]-a[1]),top=subs[0]?subs[0][1]:1,
 nxt=TITLES.find(t=>t[0]>s.lv);
 return `<div class="card hero"><div class="lvl" aria-label="Nível ${s.lv}">${s.lv}</div><div><h1>${esc(u.nick)}</h1><p>${esc(s.title)}</p></div></div>
 <div class="card"><div class="bar" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><p class="mut" style="margin:.5rem 0 0">${nf(s.xp)} XP ${s.lv<50?`· faltam ${nf(s.lv*STEP-s.xp)} XP para o nível ${s.lv+1}`:'· nível máximo'}${nxt?` · próximo título no nível ${nxt[0]}: ${nxt[1]}`:''}</p></div>
 <div class="grid"><div><strong>${pos}º</strong>Ranking</div><div><strong>${fh(s.min)}</strong>Horas de estudo</div><div><strong>${s.cur}</strong>Sequência atual (dias)</div><div><strong>${s.mx}</strong>Sequência máxima</div><div><strong>${nf(s.q)}</strong>Questões</div><div><strong>${s.r}</strong>Redações</div><div><strong>${Object.keys(u.a).length}/${ACH.length}</strong>Conquistas</div></div>
 ${s.lv>=50?`<form id="tt" class="card stack"><label>Escolha seu título (nível 50)<input name="t" maxlength="40" value="${esc(u.title||'')}"></label><button class="btn">Salvar título</button></form>`:''}
 <div class="card"><h2 style="margin-top:0">Matérias estudadas</h2>${subs.length?subs.map(([k,m])=>`<div class="sub"><span>${SUBJ[k]}</span><div class="bar"><i style="width:${m/top*100}%"></i></div><span>${fh(m)}</span></div>`).join(''):'<p class="mut">Nada registrado ainda.</p>'}</div>
 <div class="card"><h2 style="margin-top:0">Conta</h2><p class="mut">E-mail: ${esc(u.email)}<br>Melhor em: ${u.best.length?u.best.map(k=>SUBJ[k]).join(', '):'não informado'}<br>Pior em: ${u.worst.map(k=>SUBJ[k]).join(', ')}<br>Conta criada em ${br(u.created)}</p></div>
 <div class="row"><button class="btn" id="exp">Exportar perfil</button><button class="btn ghost" id="out">Sair</button></div>`;
}

/* cartão do perfil (imagem PNG) */
function exportCard(){
 const u=me(),s=stats(u),pos=ranking().findIndex(x=>x.u.nick===u.nick)+1;
 const c=document.createElement('canvas');c.width=900;c.height=500;const g=c.getContext('2d');
 g.fillStyle='#0a1220';g.fillRect(0,0,900,500);g.fillStyle='#4b86ff';g.fillRect(0,0,10,500);
 g.save();g.translate(44,34);g.scale(1.3,1.3);g.fillStyle='#4b86ff';g.fill(new Path2D('M9 40C9 22 20 11 32 11s23 11 23 29zM5 40h54v5H5z'));
 g.strokeStyle='#fff';g.lineWidth=4;g.lineCap='round';g.lineJoin='round';g.stroke(new Path2D('M23 25l7 11 12-18'));g.restore();
 const T=(t,x,y,sz,col,w='600',al='left')=>{g.font=`${w} ${sz}px system-ui,Segoe UI,Roboto,sans-serif`;g.fillStyle=col;g.textAlign=al;g.fillText(t,x,y)};
 T('Discipline',140,82,32,'#e8eef9','800');
 T(u.nick,44,190,60,'#fff','800');
 T(s.title,44,232,26,'#93a5c4');
 T(String(s.lv),856,200,120,'#4b86ff','800','right');T('NÍVEL',856,232,20,'#93a5c4','600','right');
 [[pos+'º','Ranking'],[fh(s.min),'Horas'],[s.cur+' / '+s.mx,'Sequência (atual / máx.)'],[nf(s.xp),'XP total'],[Object.keys(u.a).length+'/'+ACH.length,'Conquistas']].forEach(([v,l],i)=>{const x=44+i*166;T(v,x,320,32,'#fff','800');T(l,x,348,15,'#93a5c4')});
 const subs=Object.entries(s.sub).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,m])=>`${SUBJ[k]} ${fh(m)}`).join('  ·  ');
 T('Mais estudadas',44,410,16,'#93a5c4');T(subs||'Nenhuma ainda',44,440,22,'#e8eef9');
 c.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='discipline-'+u.nick+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)});
}

/* roteamento */
function render(){
 nav();
 let v=location.hash.slice(1)||'rank';const u=me();
 if(['form','ach','prof'].includes(v)&&!u)v='login';
 if(['login','reg'].includes(v)&&u)v='rank';
 app.innerHTML=({rank:vRank,login:vLogin,reg:vReg,form:vForm,ach:vAch,prof:vProf}[v]||vRank)();
 if(v==='form')prev();
}
addEventListener('hashchange',()=>{flash=null;render();scrollTo(0,0)});

/* eventos */
app.addEventListener('submit',async ev=>{
 ev.preventDefault();const f=ev.target,id=f.id,err=m=>{$('.err',f).textContent=m};
 if(id==='login'){
  const v=f.who.value.trim().toLowerCase(),U=users(),u=U[v]||Object.values(U).find(x=>x.email===v);
  if(!u||u.pw!==await hash(f.pw.value))return err('Nick, e-mail ou senha incorretos.');
  S('me',u.nick.toLowerCase());location.hash='#rank';render();toast('Bem-vindo de volta, '+u.nick+'.');
 }
 if(id==='r1'){
  const nick=f.nick.value.trim(),email=f.email.value.trim().toLowerCase(),U=users();
  if(!/^[\w.-]{3,20}$/.test(nick))return err('Nick: 3 a 20 caracteres (letras, números, _ . -).');
  if(U[nick.toLowerCase()])return err('Esse nick já está em uso. Escolha outro.');
  if(Object.values(U).some(x=>x.email===email))return err('Esse e-mail já está cadastrado.');
  if(f.pw.value.length<6)return err('A senha precisa ter pelo menos 6 caracteres.');
  Object.assign(reg.d,{nick,email,pw:await hash(f.pw.value)});reg.step=2;render();
 }
 if(id==='r2'){
  const g=n=>[...f.querySelectorAll(`[name=${n}]:checked`)].map(x=>x.value),best=g('best'),worst=g('worst');
  if(!worst.length)return err('Escolha pelo menos 1 matéria em que você vai pior.');
  if(best.length>3||worst.length>3)return err('Escolha no máximo 3 matérias em cada lista.');
  if(best.some(x=>worst.includes(x)))return err('Uma matéria não pode estar nas duas listas.');
  Object.assign(reg.d,{best,worst});reg.step=3;render();
 }
 if(id==='r3'){
  const en={};let base=0;
  for(const k in ENEM){const v=+f[k].value;if(!Number.isInteger(v)||v<0||v>45)return err(`${ENEM[k][0]}: informe um número de 0 a 45.`);en[k]=v;base+=tier(k,v)}
  const d=reg.d,U=users();
  if(U[d.nick.toLowerCase()])return err('Esse nick acabou de ser ocupado. Volte e escolha outro.');
  save({nick:d.nick,email:d.email,pw:d.pw,best:d.best,worst:d.worst,enem:en,base,e:{},a:{},title:'',created:today()});
  S('me',d.nick.toLowerCase());reg={step:1,d:{best:[],worst:[]}};location.hash='#rank';render();toast(`Conta criada! Você começa com ${base} XP.`);
 }
 if(id==='fm'){
  const ks=Object.keys(fm.s),total=Object.values(fm.s).reduce((a,b)=>a+b,0);
  if(!ks.length)return err('Adicione pelo menos uma matéria.');
  const low=ks.find(k=>fm.s[k]<30);if(low)return err(`${SUBJ[low]}: o mínimo é 30 minutos.`);
  if(total>1200)return err('O total de estudo não pode passar de 20 horas.');
  if(!Number.isInteger(fm.q)||fm.q<0||fm.q>1000)return err('Questões: informe um número inteiro de 0 a 1000.');
  if(!Number.isInteger(fm.r)||fm.r<0||fm.r>10)return err('Redações: informe um número inteiro de 0 a 10.');
  flash=submitForm(me(),{s:fm.s,q:fm.q,r:fm.r,n:fm.n.trim()});fm=null;render();
  toast(flash.got.length?'Formulário enviado! Você desbloqueou '+flash.got.length+' conquista(s).':'Formulário enviado!');
 }
 if(id==='tt'){const u=me();u.title=f.t.value.trim();save(u);render();toast('Título salvo.')}
});

app.addEventListener('click',ev=>{
 const t=ev.target;
 if(t.matches('[data-back]')){reg.step--;render()}
 if(t.id==='add'){const k=$('#sel').value;if(k){fm.s[k]=30;render()}}
 if(t.matches('[data-rm]')){delete fm.s[t.closest('.srow').dataset.k];render()}
 if(t.id==='exp')exportCard();
 if(t.id==='out'){S('me',null);fm=null;location.hash='#rank';render()}
});

app.addEventListener('input',ev=>{
 const t=ev.target,row=t.closest('.srow');
 if(row){fm.s[row.dataset.k]=(+$('[data-t=h]',row).value||0)*60+(+$('[data-t=m]',row).value||0)}
 else if(t.id==='q')fm.q=t.value===''?NaN:Number(t.value);
 else if(t.id==='r')fm.r=t.value===''?NaN:Number(t.value);
 else if(t.id==='n')fm.n=t.value;
 else return;
 prev();
});

app.addEventListener('change',ev=>{ // preferências: máx. 3 e sem repetir entre as listas
 const t=ev.target;if(t.type!=='checkbox'||!t.closest('#r2'))return;
 const f=t.closest('form');
 if(t.checked){
  if(f.querySelectorAll(`[name=${t.name}]:checked`).length>3){t.checked=false;return toast('Escolha no máximo 3 matérias.')}
  const o=f.querySelector(`[name=${t.name==='best'?'worst':'best'}][value=${t.value}]`);if(o)o.checked=false;
 }
});

/* tema e tamanho da fonte */
const root=document.documentElement,FS={p:'Pequena',m:'Média',g:'Grande'};
function tools(){$('#th').textContent=root.dataset.theme==='dark'?'Tema claro':'Tema escuro';$('#fs').textContent='Fonte: '+FS[root.dataset.fs];}
$('#th').onclick=()=>{const t=root.dataset.theme==='dark'?'light':'dark';root.dataset.theme=t;localStorage.dsc_theme=t;tools()};
$('#fs').onclick=()=>{const o=['p','m','g'],n=o[(o.indexOf(root.dataset.fs)+1)%3];root.dataset.fs=n;localStorage.dsc_fs=n;tools()};

tools();render();
