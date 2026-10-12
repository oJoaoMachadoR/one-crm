const WEEKDAY_NAMES=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const DAYS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const STAGES=['prospect','negotiating','waiting','won','lost'];
const STAGE_LABELS={prospect:'Prospecção',negotiating:'Negociando',waiting:'Aguard. Decisão',won:'Ganha',lost:'Perdida',recycle:'Reciclagem'};
const STAGE_COLORS={prospect:'#4d8dff',negotiating:'#ffb800',waiting:'#b94dff',won:'#00e57a',lost:'#ff3c3c'};
const PCOLORS=['#ff5c35','#4d8dff','#00e57a','#ffb800','#b94dff','#ff4d8d','#00c8d4','#ff9500'];
const PICONS=['📦','💳','🏦','🔄','💰','📱','🎯','⚡','🛒','🏋️','💈','🍕','📚','🎓','🔧','💡'];
const PRIORITY_ORDER={high:0,medium:1,low:2};
const FB_KEYS={crm_products2:'_fbProducts',crm_leads2:'_fbLeads',crm_appts2:'_fbAppts',crm_ideas:'_fbIdeas'};

function load(k,d){
  // Check if Firebase already loaded this key
  const fbKey=FB_KEYS[k];
  if(fbKey && window[fbKey]) return window[fbKey];
  try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}
}
function save(k,v){
  localStorage.setItem(k,JSON.stringify(v));
  // keep window._fb* in sync so load() returns fresh data
  const fbKey=FB_KEYS[k];
  if(fbKey) window[fbKey]=v;
  if(window._fbSave) window._fbSave(k,v);
}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fixLeads(arr){
  return arr.map(l=>({
    ...l,
    stage: STAGES.includes(l.stage)?l.stage:'prospect',
    status: l.status||'active'
  }));
}
// "Conta" products never carry a value
const isContaProduct=p=>!!p&&p.name.toLowerCase().includes('conta');
function contaIds(){return new Set(products.filter(isContaProduct).map(p=>p.id));}

// ── APP STATE ─────────────────────────────────────────────────
let currentTab='agenda';
let selColor='#ff5c35';
let selIcon='💳';
let currentLeadId=null;
let editingProductId=null;
let editingLeadId=null;
let agendaView='week';
let monthOffset=0;
let selectedDate=today();
let weekExpanded=false;
let pipelinePid='all';
let pipelineFilter='all';
let pipelineView='list';
let _ideaModalCat='captação';

// ── NAVIGATION ────────────────────────────────────────────────
function switchTab(tab){
  currentTab=tab;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  const tabEl=document.getElementById('tab-'+tab);
  if(tabEl)tabEl.classList.add('active');
  renderContent();
}
function renderContent(){
  if(currentTab==='agenda')renderAgenda();
  else if(currentTab==='overview')renderOverview();
  else if(currentTab==='pipeline')renderPipeline();
  else if(currentTab==='ideas')renderIdeas();
  else if(currentTab==='management')renderManagement();
}

// ── DEFAULT DATA ──────────────────────────────────────────────
let products=load('crm_products2',[
  {id:1,name:'Crédito',icon:'💳',color:'#ff5c35'},
  {id:2,name:'Conta',icon:'🏦',color:'#4d8dff'},
  {id:3,name:'Consórcio',icon:'🔄',color:'#00e57a'},
]);
// Demo leads: [id, nome, produto, valor, prioridade, histórico de etapas]. A etapa atual é a última do histórico.
const _T=d=>d+'T10:00:00.000Z';
const _defaultLeads=[
  [1,'João Ferreira',1,15000,'high',[['prospect','2026-08-10'],['negotiating','2026-09-15']]],
  [2,'Maria Consultoria',2,null,'low',[['prospect','2026-09-15']]],
  [3,'Carlos & Irmãos',3,52000,'high',[['prospect','2026-07-20'],['negotiating','2026-08-10'],['waiting','2026-09-01']]],
  [4,'Ana Oliveira',1,8000,'medium',[['prospect','2025-12-05'],['negotiating','2025-12-20'],['won','2026-01-10']]],
  [5,'Pedro Souza',1,6000,'medium',[['prospect','2026-09-20'],['negotiating','2026-10-01']]],
  [6,'Beatriz Lima',2,null,'high',[['prospect','2026-09-28']]],
  [7,'Ricardo Alves',1,12000,'high',[['prospect','2026-01-20'],['negotiating','2026-02-05'],['won','2026-02-14']]],
  [8,'Fernanda Castro',3,38000,'high',[['prospect','2026-02-10'],['negotiating','2026-02-22'],['won','2026-03-05']]],
  [9,'Lucas Mendes',2,null,'medium',[['prospect','2026-03-20'],['negotiating','2026-04-05'],['won','2026-04-18']]],
  [10,'Camila Torres',1,9500,'medium',[['prospect','2026-04-10'],['negotiating','2026-04-25'],['waiting','2026-05-07']]],
  [11,'Bruno Ramos',3,27000,'high',[['prospect','2026-04-15'],['negotiating','2026-05-05'],['won','2026-05-22']]],
  [12,'Amanda Vieira',2,null,'low',[['prospect','2026-06-10']]],
  [13,'Rafael Souza',1,18000,'high',[['prospect','2026-05-20'],['negotiating','2026-06-08'],['won','2026-06-25']]],
  [14,'Juliana Neves',3,45000,'high',[['prospect','2026-06-15'],['negotiating','2026-07-03']]],
  [15,'Gabriel Pinto',2,null,'medium',[['prospect','2026-06-25'],['negotiating','2026-07-10'],['won','2026-07-19']]],
  [16,'Larissa Freitas',1,11000,'medium',[['prospect','2026-07-15'],['negotiating','2026-07-28'],['won','2026-08-08']]],
  [17,'Thiago Carvalho',3,61000,'high',[['prospect','2026-08-01'],['negotiating','2026-08-20'],['waiting','2026-09-05'],['won','2026-09-12']]],
  [18,'Priscila Martins',2,null,'medium',[['prospect','2026-08-15'],['negotiating','2026-08-30']]],
  [19,'Fernando Dias',1,22000,'high',[['prospect','2026-09-01'],['negotiating','2026-09-18'],['won','2026-10-02']]],
  [20,'Débora Lopes',2,null,'medium',[['prospect','2026-10-01'],['negotiating','2026-10-03']]],
  // Extra Crédito (pid:1) won leads — fills missing months
  [21,'Fábio Monteiro',1,7500,'medium',[['prospect','2026-02-12'],['negotiating','2026-03-05'],['won','2026-03-20']]],
  [22,'Tatiane Rocha',1,13500,'high',[['prospect','2026-03-10'],['negotiating','2026-04-01'],['won','2026-04-22']]],
  [23,'Renato Barbosa',1,10200,'medium',[['prospect','2026-04-08'],['negotiating','2026-05-01'],['won','2026-05-14']]],
  [24,'Simone Araújo',1,8800,'medium',[['prospect','2026-06-18'],['negotiating','2026-07-10'],['won','2026-07-25']]],
  [25,'Márcio Teixeira',1,16000,'high',[['prospect','2026-08-12'],['negotiating','2026-09-01'],['won','2026-09-18']]],
  // Extra Consórcio (pid:3) won leads — fills missing months
  [26,'Patrícia Cunha',3,32000,'high',[['prospect','2025-12-10'],['negotiating','2026-01-10'],['won','2026-01-28']]],
  [27,'Augusto Leal',3,48000,'high',[['prospect','2026-01-15'],['negotiating','2026-02-05'],['won','2026-02-20']]],
  [28,'Cristina Melo',3,55000,'high',[['prospect','2026-03-05'],['negotiating','2026-04-01'],['won','2026-04-15']]],
  [29,'Henrique Braga',3,41000,'medium',[['prospect','2026-05-10'],['negotiating','2026-06-03'],['won','2026-06-18']]],
  [30,'Vanessa Campos',3,67000,'high',[['prospect','2026-06-20'],['negotiating','2026-07-15'],['won','2026-07-30']]],
  [31,'Rodrigo Fonseca',3,39000,'medium',[['prospect','2026-07-08'],['negotiating','2026-08-05'],['won','2026-08-22']]],
  [32,'Elaine Santana',3,72000,'high',[['prospect','2026-09-05'],['negotiating','2026-09-20'],['won','2026-10-01']]],
  // Leads históricos ativos em negociação/aguardando — populam gráficos de meses anteriores
  [33,'Marcos Andrade',1,14000,'high',[['prospect','2026-01-08'],['negotiating','2026-01-20']]],
  [34,'Sônia Batista',2,null,'medium',[['prospect','2026-01-15'],['negotiating','2026-01-22'],['waiting','2026-01-28']]],
  [35,'Eduardo Pires',3,43000,'high',[['prospect','2026-02-05'],['negotiating','2026-02-18']]],
  [36,'Alessandra Cruz',1,9200,'medium',[['prospect','2026-03-02'],['negotiating','2026-03-10'],['waiting','2026-03-15']]],
  [37,'Nelson Gomes',2,null,'low',[['prospect','2026-03-18'],['negotiating','2026-03-25']]],
  [38,'Viviane Moura',1,11500,'high',[['prospect','2026-04-03'],['negotiating','2026-04-14']]],
  [39,'Cláudio Ribeiro',3,35000,'high',[['prospect','2026-04-20'],['negotiating','2026-04-28'],['waiting','2026-05-02']]],
  [40,'Ingrid Ferreira',2,null,'medium',[['prospect','2026-05-08'],['negotiating','2026-05-18']]],
  [41,'Osvaldo Nunes',1,17500,'medium',[['prospect','2026-06-05'],['negotiating','2026-06-12'],['waiting','2026-06-20']]],
  [42,'Tereza Nogueira',3,58000,'high',[['prospect','2026-06-28'],['negotiating','2026-07-08']]],
  [43,'Roberto Azevedo',1,13000,'medium',[['prospect','2026-07-10'],['negotiating','2026-07-22']]],
  [44,'Adriana Cavalcante',2,null,'low',[['prospect','2026-07-25'],['negotiating','2026-08-01'],['waiting','2026-08-05']]],
  [45,'Leandro Corrêa',3,47000,'high',[['prospect','2026-08-10'],['negotiating','2026-08-25']]],
  [46,'Mônica Silveira',1,8500,'medium',[['prospect','2026-09-02'],['negotiating','2026-09-07'],['waiting','2026-09-10']]],
  [47,'Diego Pacheco',2,null,'medium',[['prospect','2026-09-12'],['negotiating','2026-09-22']]],
].map(([id,name,productId,value,priority,hist])=>{
  const [stage,last]=hist[hist.length-1];
  const won=stage==='won';
  return {id,name,productId,value,stage,priority,status:won?'won':'active',notes:[],createdAt:_T(hist[0][1]),...(won?{wonAt:_T(last)}:{}),lastMoveAt:_T(last),lastMoveStage:stage,stageHistory:hist.map(([stage,date])=>({stage,date:_T(date)}))};
});
// Demo leads only seed an empty CRM; once there is saved data, deleted demo leads stay deleted
let leads=fixLeads(load('crm_leads2',_defaultLeads));
const _inDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().split('T')[0]};
let appointments=load('crm_appts2',[
  {id:1,name:'João Ferreira',detail:'Apresentação proposta',time:'09:00',date:_inDays(0),done:false,urgency:'high'},
  {id:2,name:'Reunião interna',detail:'Revisão metas do mês',time:'14:00',date:_inDays(0),done:true,urgency:'medium'},
  {id:3,name:'Maria Consultoria',detail:'Follow-up contrato',time:'10:30',date:_inDays(0),done:false,urgency:'medium'},
  {id:4,name:'Carlos & Irmãos',detail:'Negociação consórcio',time:'15:00',date:_inDays(1),done:false,urgency:'high'},
  {id:5,name:'Pedro Souza',detail:'Demo do produto',time:'11:00',date:_inDays(1),done:false,urgency:'low'},
  {id:6,name:'Beatriz Lima',detail:'Assinatura contrato',time:'16:00',date:_inDays(2),done:false,urgency:'high'},
  {id:7,name:'Almoço com parceiro',detail:'Discussão parceria',time:'12:00',date:_inDays(-1),done:true,urgency:'medium'},
  {id:8,name:'Thiago Carvalho',detail:'Revisão proposta consórcio',time:'09:30',date:_inDays(3),done:false,urgency:'medium'},
]);

// ── AGENDA ────────────────────────────────────────────────────
function renderAgenda(){
  const now=new Date();
  const todayStr=today();
  const selStr=selectedDate||todayStr;
  const selAppts=appointments
    .filter(a=>(a.date||todayStr)===selStr&&!a.done)
    .sort((a,b)=>{const u=PRIORITY_ORDER[a.urgency||'medium']-PRIORITY_ORDER[b.urgency||'medium'];return u!==0?u:a.time.localeCompare(b.time);})
    .concat(appointments.filter(a=>(a.date||todayStr)===selStr&&a.done).sort((a,b)=>a.time.localeCompare(b.time)));
  const todayAppts=appointments.filter(a=>(a.date||todayStr)===todayStr);
  const _contaIds=contaIds();
  const activeVal=leads.filter(l=>l.status==='active'&&!_contaIds.has(l.productId)&&['prospect','negotiating','waiting'].includes(l.stage)).reduce((s,l)=>s+(l.value||0),0);
  const selD=new Date(selStr+'T12:00:00');
  const isToday=selStr===todayStr;
  const urgColor={high:'#ff3c3c',medium:'#ffb800',low:'#4d8dff'};
  const apptCards=selAppts.map(a=>`
    <div class="appointment ${a.done?'appt-done':''}">
      <div class="appt-check ${a.done?'done':''}" onclick="toggleApptDone(${a.id})"></div>
      <div class="appt-time">${a.time}</div>
      <div class="appt-bar" style="background:${urgColor[a.urgency||'medium']}"></div>
      <div class="appt-info" onclick="openEditApptModal(${a.id})" style="cursor:pointer">
        <div class="appt-name">${a.name}${a.urgency==='high'?' <span style="font-size:9px;background:rgba(255,60,60,.2);color:#ff3c3c;border-radius:4px;padding:1px 5px;font-weight:700">ALTA</span>':''}</div>
        <div class="appt-detail">${a.detail}</div>
      </div>
      <button class="appt-menu-btn" onclick="openCtxMenu(event,${a.id})">⋯</button>
    </div>`).join('');

  // week strip — build from scratch each time to avoid mutating 'now'
  const weekStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()-now.getDay());
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return d;});
  const weekHtml=`<div class="week-strip">${weekDays.map(d=>{
    const ds=d.toISOString().split('T')[0];
    const hasAppt=appointments.some(a=>(a.date||todayStr)===ds);
    const isSel=ds===selStr;const isTod=ds===todayStr;
    const cls=isTod?'today':(isSel?'selected-day':(hasAppt?'has-appt-hl':''));
    return `<div class="week-day ${cls}" onclick="selectDay('${ds}')">
      <div class="week-day-label">${DAYS[d.getDay()]}</div>
      <div class="week-day-num">${d.getDate()}</div>
      <div style="height:7px"></div>
    </div>`;}).join('')}</div>`;

  // expanded week
  const weekExpandedHtml=`<div class="week-expanded">${weekDays.map(d=>{
    const ds=d.toISOString().split('T')[0];
    const dayAppts=appointments.filter(a=>(a.date||todayStr)===ds).sort((a,b)=>a.time.localeCompare(b.time));
    const isTod=ds===todayStr;
    return `<div class="week-exp-day ${isTod?'today':''}">
      <div class="week-exp-day-head" onclick="selectDay('${ds}')">
        <span class="week-exp-day-label">${WEEKDAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}</span>
        ${isTod?'<span class="week-exp-today-tag">Hoje</span>':''}
      </div>
      ${dayAppts.length>0?dayAppts.map(a=>`<div class="week-exp-appt ${a.done?'done':''}" onclick="${a.leadId?'openLeadNotes('+a.leadId+')':''}"><span class="week-exp-appt-time">${a.time}</span><span class="week-exp-appt-name">${a.name}</span></div>`).join(''):'<div class="week-exp-empty">Sem compromissos</div>'}
    </div>`;}).join('')}</div>`;

  // month grid
  const mRef=new Date(now.getFullYear(),now.getMonth()+monthOffset,1);
  const mTitle=`${MONTHS[mRef.getMonth()]} ${mRef.getFullYear()}`;
  const firstDay=mRef.getDay();
  const daysInMonth=new Date(mRef.getFullYear(),mRef.getMonth()+1,0).getDate();
  let mgCells='';
  DAYS.forEach(d=>{mgCells+=`<div class="mgday-label">${d.slice(0,1)}</div>`;});
  for(let i=0;i<firstDay;i++)mgCells+=`<div class="mgday empty"></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const ds=`${mRef.getFullYear()}-${String(mRef.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isTod=ds===todayStr;const isSel=ds===selStr&&!isTod;
    const hasEvent=appointments.some(a=>(a.date||todayStr)===ds);
    const mgCls=isTod?'today':(isSel?'selected-day':(hasEvent?'has-appt-hl':''));
    mgCells+=`<div class="mgday ${mgCls}" onclick="selectDay('${ds}')"><span>${d}</span></div>`;
  }
  const monthHtml=`<div class="month-grid">
    <div class="month-header">
      <button class="month-nav" onclick="shiftMonth(-1)">‹</button>
      <div class="month-title">${mTitle}</div>
      <button class="month-nav" onclick="shiftMonth(1)">›</button>
    </div>
    <div class="month-grid-days">${mgCells}</div>
  </div>`;

  const selLabel=isToday?'Compromissos de hoje':`Compromissos — ${selD.getDate()} de ${MONTHS[selD.getMonth()]}`;
  document.getElementById('content').innerHTML=`
    <div class="agenda-view">
      <div class="day-hero">
        <div class="day-hero-label">Hoje</div>
        <div class="day-hero-date">${now.getDate()} de ${MONTHS[now.getMonth()]}</div>
        <div class="day-hero-weekday">${WEEKDAY_NAMES[now.getDay()]}</div>
        <div class="day-stats">
          <div class="day-stat"><div class="day-stat-num">${todayAppts.length}</div><div class="day-stat-label">Hoje</div></div>
          <div class="day-stat"><div class="day-stat-num" style="color:var(--green);font-size:14px">R$${activeVal.toLocaleString('pt-BR')}</div><div class="day-stat-label">Esteira</div></div>
        </div>
      </div>
      <div>
        <div class="section-title" style="margin-bottom:6px">Calendário
          <div style="display:flex;gap:6px;align-items:center">
            <button class="today-btn" onclick="selectDay('${todayStr}')">Hoje</button>
            <div class="agenda-view-toggle">
              <button class="view-btn ${agendaView==='week'?'active':''}" onclick="toggleWeekView()">Semana</button>
              <button class="view-btn ${agendaView==='month'?'active':''}" onclick="setAgendaView('month')">Mês</button>
            </div>
          </div>
        </div>
        ${agendaView==='week'?(weekExpanded?weekExpandedHtml:weekHtml):monthHtml}
      </div>
      <div>
        <div class="section-title">${selLabel}
          <button class="add-btn" onclick="openAddApptModal()">+ Compromisso</button>
        </div>
        ${apptCards||'<div class="empty-state">Nenhum compromisso 🎉</div>'}
      </div>
    </div>`;
}
function selectDay(ds){selectedDate=ds;if(ds===today())monthOffset=0;renderAgenda();}
function setAgendaView(v){agendaView=v;weekExpanded=false;renderAgenda();}
function toggleWeekView(){if(agendaView==='week'){weekExpanded=!weekExpanded;}else{agendaView='week';weekExpanded=false;}renderAgenda();}
function shiftMonth(d){monthOffset+=d;renderAgenda();}
function toggleApptDone(id){const a=appointments.find(x=>x.id===id);if(a){a.done=!a.done;save('crm_appts2',appointments);renderAgenda();}}
function openCtxMenu(e,id){
  e.stopPropagation();
  document.querySelectorAll('.ctx-menu').forEach(m=>m.remove());
  const menu=document.createElement('div');
  menu.className='ctx-menu';
  menu.style.cssText=`position:fixed;top:${e.clientY}px;left:${Math.min(e.clientX,window.innerWidth-180)}px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;overflow:hidden;z-index:999;min-width:170px;box-shadow:0 8px 24px rgba(0,0,0,.5)`;
  menu.innerHTML=`<button onclick="rescheduleAppt(${id})" style="display:block;width:100%;text-align:left;padding:11px 14px;font-size:13px;background:transparent;border:none;color:var(--text);cursor:pointer;font-family:'Inter',sans-serif">📅 Remarcar</button><button onclick="deleteAppt(${id})" style="display:block;width:100%;text-align:left;padding:11px 14px;font-size:13px;background:transparent;border:none;color:var(--hot);cursor:pointer;font-family:'Inter',sans-serif;border-top:1px solid var(--border)">🗑️ Remover</button>`;
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),0);
}
function saveReschedule(){
  const id=parseInt(document.getElementById('rsch-id').value);
  const date=document.getElementById('rsch-date').value;
  const time=document.getElementById('rsch-time').value;
  if(!date||!time)return;
  const a=appointments.find(x=>x.id===id);
  if(a){a.date=date;a.time=time;save('crm_appts2',appointments);}
  closeModalById('rescheduleModal');
  if(currentTab==='agenda')renderAgenda();
  showToast('Compromisso remarcado ✓');
}
function rescheduleAppt(id){const a=appointments.find(x=>x.id===id);if(!a)return;document.getElementById('rsch-date').value=a.date||today();document.getElementById('rsch-time').value=a.time;document.getElementById('rsch-id').value=id;openModal('rescheduleModal');}
function deleteAppt(id){appointments=appointments.filter(a=>a.id!==id);save('crm_appts2',appointments);renderAgenda();}

// ── OVERVIEW ──────────────────────────────────────────────────
function renderOverview(){
  const active=leads.filter(l=>l.status==='active');
  const won=leads.filter(l=>l.status==='won');
  const negotiating=active.filter(l=>l.stage==='negotiating').length;
  const waiting=active.filter(l=>l.stage==='waiting').length;

  const now=new Date();const thisMonth=now.getMonth();const thisYear=now.getFullYear();

  // Won this month only
  const wonThisMonth=won.filter(l=>{
    const d=new Date(l.wonAt||l.createdAt||0);
    return d.getMonth()===thisMonth&&d.getFullYear()===thisYear;
  });

  // Pipeline value: only active leads from non-Conta products with value set
  const _contaIds=contaIds();
  const activeVal=active.filter(l=>l.value!=null&&l.value>0&&!_contaIds.has(l.productId)&&['prospect','negotiating','waiting'].includes(l.stage))
    .reduce((s,l)=>s+l.value,0);

  const globalStats=`
    <div class="ov-global">
      <div class="section-title" style="margin-bottom:10px">📈 Resultados Gerais</div>
      <div class="ov-global-grid">
        <div class="ov-big-stat"><div class="ov-big-num">${active.length}</div><div class="ov-big-label">Leads na Esteira</div></div>
        <div class="ov-big-stat"><div class="ov-big-num" style="color:var(--warm)">${negotiating}</div><div class="ov-big-label">Negociando</div></div>
        <div class="ov-big-stat"><div class="ov-big-num" style="color:#b94dff">${waiting}</div><div class="ov-big-label">Aguard. Decisão</div></div>
      </div>
    </div>`;

  const productCards=products.map(p=>{
    const pl=active.filter(l=>l.productId===p.id);
    const pWon=won.filter(l=>l.productId===p.id);
    const maxL=Math.max(...STAGES.map(s=>pl.filter(l=>l.stage===s).length),1);
    const funnelRows=STAGES.map(s=>{
      const cnt=pl.filter(l=>l.stage===s).length;
      return `<div class="funnel-row"><div class="funnel-label">${STAGE_LABELS[s]}</div><div class="funnel-bar-wrap"><div class="funnel-bar-fill" style="width:${maxL>0?(cnt/maxL)*100:0}%;background:${STAGE_COLORS[s]}"></div></div><div class="funnel-count">${cnt}</div></div>`;
    }).join('');
    const leadsThisMonth=leads.filter(l=>{if(l.productId!==p.id)return false;const d=new Date(l.createdAt||0);return d.getMonth()===thisMonth&&d.getFullYear()===thisYear;}).length;
    const negotiatingCount=pl.filter(l=>l.stage==='negotiating').length;
    const isConta=isContaProduct(p);
    // Pipeline value: only for non-Conta products
    const pPipelineVal=isConta?0:pl.filter(l=>l.value!=null&&l.value>0).reduce((s,l)=>s+l.value,0);
    const statRight=isConta
      ?`<div style="text-align:right">
          <div class="poc-value" style="color:#4d8dff">${leadsThisMonth}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:2px">leads / mês</div>
          <div style="font-size:9px;color:var(--warm);margin-top:2px">${negotiatingCount} negociando</div>
        </div>`
      :`<div style="text-align:right">
          <div class="poc-value" style="color:var(--green);font-size:14px">R$&nbsp;${pPipelineVal>0?(pPipelineVal/1000).toFixed(0)+'k':'—'}</div>
          <div style="font-size:9px;color:var(--muted);margin-top:1px">na esteira</div>
          <div style="font-size:9px;color:var(--warm);margin-top:2px">${negotiatingCount} negociando</div>
        </div>`;
    return `<div class="product-overview-card" onclick="goToPipeline(${p.id})">
      <div class="poc-header">
        <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">${pl.length} ativos · ${pWon.length} vendas</div>
        <div class="poc-name" style="color:${p.color}">${p.icon} ${p.name}</div></div>
        ${statRight}
      </div>
      <div class="poc-funnel">${funnelRows}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div>${pl.length===0?'<span style="color:var(--muted);font-size:11px">Sem leads ativos</span>':''}</div>
        <button class="add-btn" onclick="event.stopPropagation();editProduct(${p.id})">✏️ Editar</button>
      </div>
    </div>`;
  }).join('');

  document.getElementById('content').innerHTML=`
    <div class="overview-view">
      <div class="overview-totals">
        <div class="ov-stat"><div class="ov-stat-num">${active.length}</div><div class="ov-stat-label">Ativos</div></div>
        <div class="ov-stat"><div class="ov-stat-num" style="color:#ffd700">${wonThisMonth.length}</div><div class="ov-stat-label">💰 Ganhos este mês</div></div>
        <div class="ov-stat"><div class="ov-stat-num" style="color:var(--green);font-size:13px">R$${activeVal.toLocaleString('pt-BR')}</div><div class="ov-stat-label">Esteira</div></div>
      </div>
      ${globalStats}
      <div class="section-title">Por Produto
        <button class="add-btn" onclick="resetProductForm();openModal('addProductModal')">+ Produto</button>
      </div>
      ${productCards||'<div class="empty-state">Nenhum produto criado ainda.</div>'}
    </div>`;
}
function goToPipeline(pid){pipelinePid=pid;pipelineFilter='all';pipelineView='kanban';switchTab('pipeline');}

// ── IDEAS ──────────────────────────────────────────────────────
let ideas=load('crm_ideas',[]);
function renderIdeas(){
  const cats=['captação','vendas','relacionamento','outro'];
  const catColors={captação:'#4d8dff',vendas:'#00e57a',relacionamento:'#ffb800',outro:'#6b6b85'};
  const catIcons={captação:'🎯',vendas:'💰',relacionamento:'🤝',outro:'💡'};
  const byCategory=cats.map(cat=>{
    const catIdeas=ideas.filter(i=>i.category===cat);
    if(catIdeas.length===0)return '';
    return `<div>
      <div class="section-title" style="margin-bottom:8px">
        <span style="color:${catColors[cat]}">${catIcons[cat]} ${cat.charAt(0).toUpperCase()+cat.slice(1)}</span>
        <span style="color:var(--muted);font-weight:400;font-size:10px">${catIdeas.length} ideia${catIdeas.length!==1?'s':''}</span>
      </div>
      ${catIdeas.map(i=>`<div class="idea-card" style="border-left:3px solid ${catColors[cat]}">
        <div class="idea-text">${i.text}</div>
        <div class="idea-foot"><span class="idea-cat" style="color:${catColors[cat]}">${catIcons[cat]} ${cat}</span><button class="idea-del" onclick="deleteIdea(${i.id})">✕</button></div>
      </div>`).join('')}
    </div>`;
  }).join('');
  document.getElementById('content').innerHTML=`<div class="ideas-view">${byCategory||'<div class="empty-state" style="margin-top:40px">Nenhuma ideia ainda.<br><br>Toque em <strong>+</strong> para adicionar!</div>'}</div>`;
}
function deleteIdea(id){ideas=ideas.filter(i=>i.id!==id);save('crm_ideas',ideas);renderIdeas();}

// ── MANAGEMENT ────────────────────────────────────────────────
function renderManagement(){
  const now=new Date();const yr=now.getFullYear();
  const MN=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  function getMonthlyData(pid){
    const months=Array.from({length:12},(_,i)=>({month:i,revenue:0,leads:0,won:0,lost:0,negotiating:0,waiting:0}));
    leads.forEach(l=>{
      if(pid&&l.productId!==pid)return;
      // leads gerados / lost by createdAt month
      const dc=new Date(l.createdAt||0);
      if(dc.getFullYear()===yr){
        months[dc.getMonth()].leads++;
        if(l.status==='trash'&&l.stage==='lost')months[dc.getMonth()].lost++;
      }
      // revenue/won by wonAt (fallback to createdAt)
      if(l.status==='won'){
        const dw=new Date(l.wonAt||l.createdAt||0);
        if(dw.getFullYear()===yr){const m=dw.getMonth();months[m].won++;months[m].revenue+=(l.value||0);}
      }
      // negociando/aguardando: conta em todos os meses desde que entrou na etapa até hoje
      if(l.status==='active'&&(l.stage==='negotiating'||l.stage==='waiting')){
        const dm=new Date(l.lastMoveAt||l.createdAt||0);
        const startM=dm.getFullYear()<yr ? 0 : (dm.getFullYear()===yr ? dm.getMonth() : now.getMonth());
        const endM=now.getMonth();
        for(let m=startM;m<=endM;m++){
          if(l.stage==='negotiating') months[m].negotiating++;
          else months[m].waiting++;
        }
      }
    });return months;
  }
  function buildChart(data,key,color,label,isCur,H=110){
    const W=320,PAD={t:18,r:12,b:28,l:isCur?44:28};
    const vals=data.map(d=>d[key]);const maxV=Math.max(...vals,1);
    const pts=vals.map((v,i)=>({x:PAD.l+(i/(vals.length-1))*(W-PAD.l-PAD.r),y:PAD.t+(1-v/maxV)*(H-PAD.t-PAD.b),v}));
    const area=`M${pts[0].x},${H-PAD.b} `+pts.map(p=>`L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')+` L${pts[pts.length-1].x},${H-PAD.b} Z`;
    const line=pts.map((p,i)=>(i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
    const grid=[.25,.5,.75,1].map(f=>{const gy=PAD.t+(1-f)*(H-PAD.t-PAD.b);const gv=f*maxV;const gl=isCur?(gv>=1000?'R$'+(gv/1000).toFixed(0)+'k':'R$'+gv.toFixed(0)):gv.toFixed(0);return `<line x1="${PAD.l}" y1="${gy.toFixed(1)}" x2="${W-PAD.r}" y2="${gy.toFixed(1)}" stroke="#2a2a3d" stroke-width="1"/><text x="${PAD.l-4}" y="${(gy+4).toFixed(1)}" fill="#6b6b85" font-size="8" text-anchor="end">${gl}</text>`;}).join('');
    const dots=pts.map((p,i)=>p.v>0?`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}" stroke="#0a0a0f" stroke-width="1.5"><title>${MN[i]}: ${isCur?'R$ '+p.v.toLocaleString('pt-BR'):p.v}</title></circle>`:'').join('');
    const labels=pts.map((p,i)=>i%2===0?`<text x="${p.x.toFixed(1)}" y="${H-PAD.b+11}" fill="#6b6b85" font-size="8" text-anchor="middle">${MN[i]}</text>`:'').join('');
    const gid='g'+Math.random().toString(36).slice(2,7);
    return `<div class="mgmt-chart-wrap"><div class="mgmt-chart-label">${label}</div>
      <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${H}px">
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.35"/><stop offset="100%" stop-color="${color}" stop-opacity="0.03"/></linearGradient></defs>
        ${grid}<path d="${area}" fill="url(#${gid})"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${dots}${labels}
      </svg></div>`;
  }
  const allData=getMonthlyData(null);
  const totalLeadsAll=leads.length;
  const totalWon=leads.filter(l=>l.status==='won').length;
  const totalLost=leads.filter(l=>l.status==='trash'&&l.stage==='lost').length;
  const totalRev=leads.filter(l=>l.status==='won').reduce((s,l)=>s+(l.value||0),0);
  const totalPot=leads.filter(l=>{const p=products.find(x=>x.id===l.productId);return !isContaProduct(p)&&l.status==='active'&&l.value&&['prospect','negotiating','waiting'].includes(l.stage);}).reduce((s,l)=>s+(l.value||0),0);
  const prodSections=products.map(p=>{
    const pd=getMonthlyData(p.id);
    const pLeads=leads.filter(l=>l.productId===p.id);
    const pWon=pLeads.filter(l=>l.status==='won');
    const pRev=pWon.reduce((s,l)=>s+(l.value||0),0);
    const pPot=isContaProduct(p)?0:pLeads.filter(l=>l.status==='active'&&l.value&&['prospect','negotiating','waiting'].includes(l.stage)).reduce((s,l)=>s+(l.value||0),0);
    return `<div class="mgmt-product-section">
      <div class="section-title" style="margin-bottom:12px">
        <span style="color:${p.color}">${p.icon} ${p.name}</span>
        <div style="display:flex;gap:12px;font-size:10px;color:var(--muted);font-weight:400"><span>${pLeads.length} leads</span><span style="color:#ffd700">${pWon.length} ganhos</span><span style="color:var(--green)">R$ ${pRev.toLocaleString('pt-BR')}</span></div>
      </div>
      <div class="mgmt-chart-wrap" style="margin-bottom:8px">
        <div class="mgmt-chart-label">Receita Potencial — leads ativos</div>
        <div style="padding:10px 4px 4px"><span style="font-family:'Space Grotesk',sans-serif;font-size:22px;font-weight:700;color:#00e57a">R$ ${pPot.toLocaleString('pt-BR')}</span></div>
      </div>
      ${buildChart(pd,'revenue',p.color,'Receita Gerada — por mês de fechamento (R$)',true)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        ${buildChart(pd,'leads','#4d8dff','Leads gerados',false,90)}
        ${buildChart(pd,'won','#ffd700','Qttd Leads Ganhos',false,90)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        ${buildChart(pd,'negotiating','#ffb800','Em Negociação / mês',false,90)}
        ${buildChart(pd,'waiting','#b94dff','Aguard. Decisão / mês',false,90)}
      </div>
    </div>`;
  }).join('');
  document.getElementById('content').innerHTML=`
    <div class="mgmt-view">
      <div class="section-title" style="margin-bottom:10px">📊 One CRM Management — ${yr}</div>
      <div class="mgmt-summary">
        <div class="mgmt-kpi"><div class="mgmt-kpi-num">${totalLeadsAll}</div><div class="mgmt-kpi-label">Total Leads cadastrados</div></div>
        <div class="mgmt-kpi"><div class="mgmt-kpi-num" style="color:#ffd700">${totalWon}</div><div class="mgmt-kpi-label">Quantidade Leads Ganhos</div></div>
        <div class="mgmt-kpi"><div class="mgmt-kpi-num" style="color:var(--hot)">${totalLost}</div><div class="mgmt-kpi-label">Perdidos</div></div>
        <div class="mgmt-kpi" style="position:relative">
          <div class="mgmt-kpi-num" style="color:var(--green);font-size:13px">R$${(totalRev/1000).toFixed(1)}k</div>
          <div class="mgmt-kpi-label">Receita Total <span class="kpi-info" title="Soma de todos os leads marcados como Ganhos (independente do mês)">ℹ</span></div>
        </div>

      </div>
      <div class="section-title" style="margin:16px 0 10px">Geral — todos os produtos</div>
      <div class="mgmt-chart-wrap" style="margin-bottom:8px">
        <div class="mgmt-chart-label">Receita Potencial — leads ativos</div>
        <div style="display:flex;align-items:baseline;gap:8px;padding:10px 4px 4px">
          <div style="font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;color:#00e57a">R$ ${totalPot.toLocaleString('pt-BR')}</div>
          <div style="font-size:11px;color:var(--muted)">soma dos leads em prospecção, negociação e aguardando</div>
        </div>
      </div>
      ${buildChart(allData,'revenue','var(--accent)','Receita Gerada (R$) — mês em que o lead foi ganho',true)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        ${buildChart(allData,'leads','#4d8dff','Leads gerados',false,90)}
        ${buildChart(allData,'won','#ffd700','Qttd Leads Ganhos / mês',false,90)}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        ${buildChart(allData,'negotiating','#ffb800','Em Negociação / mês',false,90)}
        ${buildChart(allData,'waiting','#b94dff','Aguard. Decisão / mês',false,90)}
      </div>
      <div style="margin-top:20px">${prodSections}</div>
    </div>`;
}

// ── PIPELINE ──────────────────────────────────────────────────
function sortByPriority(arr){return arr.slice().sort((a,b)=>(PRIORITY_ORDER[a.priority||'medium']-PRIORITY_ORDER[b.priority||'medium']));}
function renderPipeline(){
  const baseLeads=leads.filter(l=>pipelinePid==='all'||l.productId==pipelinePid);

  let display;
  if(pipelineFilter==='trash'){
    display=baseLeads.filter(l=>l.status==='trash');
  } else if(pipelineFilter==='recycle'){
    display=baseLeads.filter(l=>l.status==='recycle');
  } else if(pipelineFilter==='won'){
    display=baseLeads.filter(l=>l.status==='won');
  } else {
    const active=baseLeads.filter(l=>l.status==='active');
    display=pipelineFilter==='all'?active:active.filter(l=>l.stage===pipelineFilter);
    display=sortByPriority(display);
  }

  const canKanban = pipelineFilter!=='trash' && pipelineFilter!=='recycle' && pipelineFilter!=='won';
  const trashCount=baseLeads.filter(l=>l.status==='trash').length;
  const recycleCount=baseLeads.filter(l=>l.status==='recycle').length;
  const wonCount=baseLeads.filter(l=>l.status==='won').length;
  const opts=`<option value="all" ${pipelinePid==='all'?'selected':''}>Todos os produtos</option>`+
    products.map(p=>`<option value="${p.id}" ${pipelinePid===p.id?'selected':''}>${p.icon} ${p.name}</option>`).join('');

  const viewToggle = canKanban ? `
    <div class="pipeline-view-toggle">
      <button class="pv-btn ${pipelineView==='list'?'active':''}" onclick="setPipelineView('list')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        Lista
      </button>
      <button class="pv-btn ${pipelineView==='kanban'?'active':''}" onclick="setPipelineView('kanban')">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="2" y="3" width="5" height="18" rx="1"/><rect x="9.5" y="3" width="5" height="13" rx="1"/><rect x="17" y="3" width="5" height="8" rx="1"/></svg>
        Kanban
      </button>
    </div>` : '';

  const showKanban = canKanban && pipelineView==='kanban';

  // Group won leads by month
  let listCards;
  if(showKanban){
    listCards='';
  } else if(pipelineFilter==='won'){
    const MN=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const byMonth={};
    display.forEach(l=>{
      const d=new Date(l.wonAt||l.createdAt||0); // wonAt preferred, createdAt fallback
      const key=`${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      const label=`${MN[d.getMonth()]} ${d.getFullYear()}`;
      if(!byMonth[key])byMonth[key]={label,leads:[]};
      byMonth[key].leads.push(l);
    });
    listCards=Object.keys(byMonth).sort((a,b)=>b.localeCompare(a)).map(key=>{
      const {label,leads:mLeads}=byMonth[key];
      const mRev=mLeads.reduce((s,l)=>s+(l.value||0),0);
      return `<div class="won-month-group">
        <div class="won-month-header">
          <span>${label}</span>
          <span style="color:var(--green);font-weight:600">R$ ${mRev.toLocaleString('pt-BR')}</span>
          <span style="color:var(--muted);font-size:11px">${mLeads.length} lead${mLeads.length!==1?'s':''}</span>
        </div>
        ${mLeads.map(l=>buildLeadCard(l)).join('')}
      </div>`;
    }).join('');
  } else {
    listCards=display.map(l=>buildLeadCard(l)).join('');
  }
  const kanbanBoard = showKanban ? buildKanban(display) : '';

  document.getElementById('content').innerHTML=`
    <div class="pipeline-view">
      <div class="pipeline-toolbar" style="flex-wrap:wrap;gap:6px">
        <div class="product-select-wrap">
          <select class="product-select" onchange="setPid(this.value)">${opts}</select>
          <span class="product-select-arrow">▾</span>
        </div>
        ${viewToggle}
      </div>
      <div class="filter-chips">
        <button class="filter-chip ${pipelineFilter==='all'?'active':''}" onclick="setF('all')">Todos (${baseLeads.filter(l=>l.status==='active').length})</button>
        <button class="filter-chip stage-chip ${pipelineFilter==='prospect'?'active':''}" onclick="setF('prospect')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Prospecção
        </button>
        <button class="filter-chip stage-chip ${pipelineFilter==='negotiating'?'active':''}" onclick="setF('negotiating')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
          Negociando
        </button>
        <button class="filter-chip stage-chip ${pipelineFilter==='waiting'?'active':''}" onclick="setF('waiting')">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Aguardando Decisão
        </button>
        <button class="filter-chip trash-chip ${pipelineFilter==='trash'?'active':''}" onclick="setF('trash')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> ${trashCount}</button>
        <button class="filter-chip recycle-chip ${pipelineFilter==='recycle'?'active':''}" onclick="setF('recycle')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> ${recycleCount}</button>
        <button class="filter-chip won-chip ${pipelineFilter==='won'?'active':''}" onclick="setF('won')"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> ${wonCount}</button>
      </div>
      ${showKanban ? kanbanBoard : (listCards||'<div class="empty-state">Nenhum lead aqui.</div>')}
    </div>`;
}

// "Criação dd/mm · Last Move dd/mm (etapa)"
function leadDatesText(l){
  return `${l.createdAt?'Criação '+new Date(l.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):''} · Last Move ${new Date(l.lastMoveAt||l.createdAt||0).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} (${STAGE_LABELS[l.lastMoveStage||l.stage]||l.stage})`;
}
// Quick menu (›) + inline note + inline schedule, shared by list and kanban cards
function leadQuickMenusHtml(l){
  return `
    <!-- QUICK MENU -->
    <div class="lead-quick-menu" id="lmenu-${l.id}">
      <button class="lead-quick-item" onclick="event.stopPropagation();showInlineNote(${l.id})">✏️ Registrar informação</button>
      <button class="lead-quick-item" onclick="event.stopPropagation();showInlineSched(${l.id})">📅 Agendar reunião</button>
      <button class="lead-quick-item lead-quick-item--has-sub" onclick="event.stopPropagation();toggleStageSubmenu(${l.id})">
        <span>⏩ Mover no funil</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="lead-stage-submenu" id="lstages-${l.id}">
        ${[...STAGES,{key:'recycle',label:'♻️ Reciclagem',color:'#00e57a'}].map(item=>{const key=item.key||item,label=item.label||(STAGE_LABELS[item]),color=item.color||(STAGE_COLORS[item]);return key!==l.stage?`<button class="lead-stage-option" onclick="event.stopPropagation();moveLeadStage(${l.id},'${key}')" style="color:${color}">${label}</button>`:''}).join('')}
      </div>
      <button class="lead-quick-item lead-quick-item--has-sub" onclick="event.stopPropagation();togglePrioritySubmenu(${l.id})">
        <span>🎯 Definir prioridade</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="lead-stage-submenu" id="lpriority-${l.id}">
        <button class="lead-stage-option" style="color:#ff5c35" onclick="event.stopPropagation();setLeadPriority(${l.id},'high')">Alta</button>
        <button class="lead-stage-option" style="color:#ffb800" onclick="event.stopPropagation();setLeadPriority(${l.id},'medium')">Média</button>
        <button class="lead-stage-option" style="color:#4d8dff" onclick="event.stopPropagation();setLeadPriority(${l.id},'low')">Baixa</button>
      </div>
    </div>

    <!-- INLINE NOTE -->
    <div class="lead-inline-note" id="lnote-${l.id}" onclick="event.stopPropagation()">
      <div class="lead-inline-row">
        <input class="lead-inline-input" id="lnote-input-${l.id}" placeholder="Digite a informação..." onkeydown="if(event.key==='Enter')saveInlineNote(${l.id})"/>
        <button class="lead-inline-send" onclick="saveInlineNote(${l.id})">Salvar</button>
      </div>
    </div>

    <!-- INLINE SCHEDULE -->
    <div class="lead-inline-sched" id="lsched-${l.id}" onclick="event.stopPropagation()">
      <div class="lead-sched-row">
        <input type="date" class="lead-sched-input" id="lsched-date-${l.id}" value="${today()}"/>
        <input type="time" class="lead-sched-input" id="lsched-time-${l.id}" value="09:00" style="flex:.7"/>
        <button class="lead-sched-confirm" onclick="saveInlineSched(${l.id})">✓</button>
      </div>
      <div class="nl-priority-pills" id="lsched-upills-${l.id}" style="margin-top:6px">
        <button class="nl-priority-pill" data-u="low" onclick="selectInlineSchedU(this,${l.id})">Baixa</button>
        <button class="nl-priority-pill active" data-u="medium" onclick="selectInlineSchedU(this,${l.id})">Média</button>
        <button class="nl-priority-pill" data-u="high" onclick="selectInlineSchedU(this,${l.id})">Alta</button>
      </div>
      <input type="hidden" id="lsched-urgency-${l.id}" value="medium"/>
    </div>`;
}

function buildLeadCard(l){
  const prod=products.find(p=>p.id===l.productId);
  const lastNote=l.notes&&l.notes.length>0?l.notes[l.notes.length-1]:null;
  const productRow=`<div class="lead-product-row">
      <span class="lead-product-name">${prod?prod.icon+' '+prod.name:'—'}</span>
      <span class="lead-product-dates">${leadDatesText(l)}</span>
    </div>`;
  const valueHtml=`<div class="lead-value">${l.value!=null?'R$ '+l.value.toLocaleString('pt-BR'):'—'}</div>`;

  // inactive lead (trash / recycle / won) — status banner + restore/delete
  const inactive={
    trash:['trashed','<div class="status-banner status-trash">🗑️ Sem interesse</div>'],
    recycle:['recycled','<div class="status-banner status-recycle">♻️ Para trabalhar depois</div>'],
    won:['gained','<div class="status-banner status-won">💰 Ganha!</div>'],
  }[l.status];
  if(inactive) return `<div class="lead-card ${inactive[0]}">
    ${inactive[1]}
    <div class="lead-top"><div class="lead-name">${l.name}</div></div>
    ${productRow}
    <div class="lead-meta">
      ${valueHtml}
    </div>
    <div class="lead-actions">
      <button class="lead-action-btn success" onclick="event.stopPropagation();restoreLead(${l.id})">↩️ Restaurar</button>
      <button class="lead-action-btn danger" onclick="event.stopPropagation();deleteLead(${l.id})">🗑️ Excluir</button>
    </div>
  </div>`;

  // active lead — clickable card + chevron
  return `<div class="lead-card stage-card-${l.stage}" id="lcard-${l.id}" onclick="openEditLeadModal(${l.id})">
    <button class="lead-chevron" onclick="event.stopPropagation();toggleLeadMenu(${l.id})">›</button>
    <div class="lead-top" style="padding-right:28px">
      <div class="lead-name">${l.name}</div>
    </div>
    ${productRow}
    <div class="lead-meta">
      <div class="lead-stage stage-${l.stage}">${STAGE_LABELS[l.stage]}</div>
      ${valueHtml}
    </div>
    ${lastNote?`<div class="lead-note-preview">💬 ${lastNote.text.substring(0,80)}${lastNote.text.length>80?'...':''}</div>`:''}
    ${leadQuickMenusHtml(l)}
  </div>`;
}

// ── QUICK MENU HELPERS ────────────────────────────────────────
function togglePrioritySubmenu(id){
  const sub=document.getElementById('lpriority-'+id);
  if(sub)sub.classList.toggle('open');
}
function setLeadPriority(id,priority){
  const l=leads.find(x=>x.id===id);
  if(!l)return;
  l.priority=priority;
  save('crm_leads2',leads);
  closeLeadMenu(id);
  renderContent();
  const labels={high:'Alta',medium:'Média',low:'Baixa'};
  showToast('Prioridade definida: '+labels[priority]);
}
function toggleStageSubmenu(id){
  const sub=document.getElementById('lstages-'+id);
  if(sub)sub.classList.toggle('open');
}
function recordStageMove(l, stage){
  if(!l.stageHistory) l.stageHistory=[];
  l.stageHistory.push({stage, date:new Date().toISOString()});
  l.lastMoveAt=new Date().toISOString();
  l.lastMoveStage=stage;
}
function moveLeadStage(id,stage){
  const l=leads.find(x=>x.id===id);
  if(!l)return;
  if(stage==='recycle'){
    l.status='recycle';recordStageMove(l,'recycle');
    l.stage='prospect';
  } else if(stage==='won'){
    l.stage='won';l.status='won';l.wonAt=new Date().toISOString();recordStageMove(l,'won');
  } else if(stage==='lost'){
    l.stage='lost';l.status='trash';recordStageMove(l,'lost');
  } else {
    l.stage=stage;l.status='active';recordStageMove(l,stage);
  }
  save('crm_leads2',leads);
  closeLeadMenu(id);
  renderContent();
  showToast('Lead movido para '+(STAGE_LABELS[stage]||stage));
}
function toggleLeadMenu(id){
  const menu=document.getElementById('lmenu-'+id);
  const isOpen=menu.classList.contains('open');
  document.querySelectorAll('.lead-quick-menu.open').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.lead-inline-note.open,.lead-inline-sched.open').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('.lead-chevron').forEach(c=>c.textContent='›');
  if(!isOpen){
    menu.classList.add('open');
    const chev=document.querySelector('#lcard-'+id+' .lead-chevron');
    if(chev)chev.textContent='‹';
  }
}
function closeLeadMenu(id){
  const menu=document.getElementById('lmenu-'+id);
  if(menu)menu.classList.remove('open');
  const chev=document.querySelector('#lcard-'+id+' .lead-chevron');
  if(chev)chev.textContent='›';
}
function showInlineNote(id){
  closeLeadMenu(id);
  const n=document.getElementById('lnote-'+id);
  const s=document.getElementById('lsched-'+id);
  if(s)s.classList.remove('open');
  if(n){n.classList.toggle('open');if(n.classList.contains('open'))document.getElementById('lnote-input-'+id).focus();}
}
function showInlineSched(id){
  closeLeadMenu(id);
  const n=document.getElementById('lnote-'+id);
  const s=document.getElementById('lsched-'+id);
  if(n)n.classList.remove('open');
  if(s)s.classList.toggle('open');
}
function saveInlineNote(id){
  const inp=document.getElementById('lnote-input-'+id);
  const text=inp?inp.value.trim():'';
  if(!text)return;
  const l=leads.find(x=>x.id===id);
  if(!l)return;
  if(!l.notes)l.notes=[];
  l.notes.push({text,date:new Date().toISOString(),tag:''});
  save('crm_leads2',leads);
  inp.value='';
  document.getElementById('lnote-'+id).classList.remove('open');
  showToast('Anotação salva ✓');
  renderContent();
}
function selectInlineSchedU(btn,id){
  document.querySelectorAll('#lsched-upills-'+id+' .nl-priority-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('lsched-urgency-'+id).value=btn.dataset.u;
}
function saveInlineSched(id){
  const date=document.getElementById('lsched-date-'+id).value;
  const time=document.getElementById('lsched-time-'+id).value;
  if(!date||!time)return;
  const l=leads.find(x=>x.id===id);
  if(!l)return;
  const urgency=document.getElementById('lsched-urgency-'+id).value||'medium';
  appointments.push({id:Date.now(),name:l.name,detail:'Reunião',time,date,done:false,leadId:id,urgency});
  save('crm_appts2',appointments);
  document.getElementById('lsched-'+id).classList.remove('open');
  showToast('Reunião agendada ✓');
  renderContent();
}

function buildKanban(activeLeads){
  activeLeads=sortByPriority(activeLeads);
  function makeCard(l){
    const prod=products.find(p=>p.id===l.productId);
    const val=l.value!=null?`R$ ${l.value.toLocaleString('pt-BR')}`:'—';
    return `<div class="kanban-card" id="lcard-${l.id}"
      draggable="true"
      ondragstart="kDragStart(event,${l.id})"
      ondragend="kDragEnd(event)"
      onclick="openEditLeadModal(${l.id})">
      <button class="lead-chevron" onclick="event.stopPropagation();toggleLeadMenu(${l.id})">›</button>
      <div class="kanban-card-name" style="padding-right:22px"><span class="lead-prio-dot" style="background:${({high:'#ff5c35',medium:'#ffb800',low:'#4d8dff'})[l.priority||'medium']}"></span>${l.name}</div>
      <div class="lead-product-dates" style="font-size:9px;color:var(--muted);margin:2px 0 4px">${prod?prod.icon+' '+prod.name:''}${l.createdAt?' · Criação '+new Date(l.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}):''} · Last Move ${new Date(l.lastMoveAt||l.createdAt||0).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} (${STAGE_LABELS[l.lastMoveStage||l.stage]||l.stage})</div>
      <div class="kanban-card-val">${val}</div>
      ${l.notes&&l.notes.length>0?`<div class="lead-note-preview" style="margin-bottom:4px">💬 ${l.notes[l.notes.length-1].text.substring(0,70)}${l.notes[l.notes.length-1].text.length>70?'...':''}</div>`:''}
      ${leadQuickMenusHtml(l)}
    </div>`;
  }

  // Main pipeline columns
  const stageCols = STAGES.map(s=>{
    const colLeads=activeLeads.filter(l=>l.stage===s);
    const colVal=colLeads.filter(l=>l.value!=null).reduce((sum,l)=>sum+(l.value||0),0);
    const color=STAGE_COLORS[s];
    const isEmpty=colLeads.length===0;
    return `<div class="kanban-col"
      ondragover="kDragOver(event,'${s}')"
      ondragleave="kDragLeave(event)"
      ondrop="kDrop(event,'${s}')">
      <div class="kanban-col-header" style="background:${color}22;border:1px solid ${color}44">
        <div class="kanban-col-title" style="color:${color}">${STAGE_LABELS[s]}</div>
        <div class="kanban-col-count" style="color:${color}">${colLeads.length}</div>
      </div>
      ${colLeads.map(makeCard).join('')}
      ${colVal>0?`<div style="text-align:center;font-size:10px;color:var(--muted);padding:4px 0;font-weight:600">R$ ${colVal.toLocaleString('pt-BR')}</div>`:''}
      ${isEmpty?`<div class="kanban-drop-zone" ondragover="kDragOver(event,'${s}')" ondrop="kDrop(event,'${s}')">Soltar aqui</div>`:''}
    </div>`;
  }).join('');

  // Recycle column (status-based, not stage)
  const recycleLeads=leads.filter(l=>(pipelinePid==='all'||l.productId===pipelinePid)&&l.status==='recycle');
  const recycleCards=recycleLeads.map(l=>{
    const prod=products.find(p=>p.id===l.productId);
    return `<div class="kanban-card" onclick="openEditLeadModal(${l.id})" style="opacity:.75">
      <div class="kanban-card-name">${l.name}</div>
      ${pipelinePid==='all'&&prod?`<div style="font-size:10px;color:var(--muted);margin-bottom:3px">${prod.icon} ${prod.name}</div>`:''}
      <div class="kanban-card-foot" style="margin-top:6px">
        <div class="kanban-card-actions">
          <button class="kanban-action" onclick="event.stopPropagation();restoreLead(${l.id})" style="color:var(--recycle);border-color:var(--recycle)">↩️ Restaurar</button>
        </div>
      </div>
    </div>`;
  }).join('');
  const recycleCol=`<div class="kanban-col">
    <div class="kanban-col-header" style="background:rgba(0,229,122,.08);border:1px solid rgba(0,229,122,.25)">
      <div class="kanban-col-title" style="color:var(--recycle)">♻️ Reciclagem</div>
      <div class="kanban-col-count" style="color:var(--recycle)">${recycleLeads.length}</div>
    </div>
    ${recycleCards}
    ${recycleLeads.length===0?'<div class="kanban-drop-zone">Sem leads</div>':''}
  </div>`;

  return `<div class="kanban-scroll" id="kanbanBoard">${stageCols}${recycleCol}</div>`;
}

// ── KANBAN DRAG & DROP ────────────────────────────────────────
let _dragLeadId=null;
function kDragStart(e,id){
  _dragLeadId=id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
}
function kDragEnd(e){
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.kanban-col').forEach(c=>c.classList.remove('drag-over'));
}
function kDragOver(e,stage){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  e.currentTarget.closest('.kanban-col').classList.add('drag-over');
}
function kDragLeave(e){
  if(!e.currentTarget.contains(e.relatedTarget)){
    e.currentTarget.classList.remove('drag-over');
  }
}
function kDrop(e,stage){
  e.preventDefault();
  e.currentTarget.closest('.kanban-col').classList.remove('drag-over');
  if(!_dragLeadId)return;
  const lid=_dragLeadId;
  _dragLeadId=null;
  moveLeadStage(lid,stage);
}

function setPipelineView(v){pipelineView=v;renderPipeline();}
function setPid(v){pipelinePid=v==='all'?'all':parseInt(v);pipelineFilter='all';renderPipeline();}
function setF(f){pipelineFilter=f;renderPipeline();}
function restoreLead(id){
  const l=leads.find(x=>x.id===id);
  if(l){l.status='active';l.stage='prospect';save('crm_leads2',leads);}
  renderContent();
}
function deleteLead(id){
  if(!confirm('Excluir permanentemente?'))return;
  leads=leads.filter(x=>x.id!==id);
  save('crm_leads2',leads);renderContent();
}

// ── NOTES ─────────────────────────────────────────────────────
function openLeadNotes(leadId){
  if(!leadId)return;
  currentLeadId=leadId;
  const l=leads.find(x=>x.id===leadId);if(!l)return;
  const prod=products.find(p=>p.id===l.productId);
  document.getElementById('notesTitle').textContent=l.name;
  let sub=(prod?prod.icon+' '+prod.name:'')+'  ·  '+STAGE_LABELS[l.stage];
  let extras=[];
  if(l.contact)extras.push('👤 '+l.contact);
  if(l.phone)extras.push('📞 '+l.phone);
  if(l.origin)extras.push(l.origin);
  if(extras.length)sub+='<br><span style="font-size:11px;color:var(--muted)">'+extras.join('  ·  ')+'</span>';
  if(l.description)sub+='<br><span style="font-size:12px;opacity:.7;font-style:italic">'+l.description+'</span>';
  // Add dates info
  const _moveDate=new Date(l.lastMoveAt||l.createdAt||0).toLocaleDateString('pt-BR');
  const _moveStage=STAGE_LABELS[l.lastMoveStage||l.stage]||l.stage;
  const _createDate=l.createdAt?new Date(l.createdAt).toLocaleDateString('pt-BR'):'—';
  sub+=`<div style="display:flex;gap:16px;margin-top:6px;flex-wrap:wrap"><span style="font-size:10px;color:var(--muted)">📅 Criação: ${_createDate}</span><span style="font-size:10px;color:var(--muted)">Last Move: ${_moveDate} · ${_moveStage}</span></div>`;
  document.getElementById('notesSub').innerHTML=sub;
  document.getElementById('noteText').value='';
  renderNotesHistory(l);
  openModal('notesModal');
}
function renderNotesHistory(l){
  const hist=document.getElementById('notesHistory');
  if(!l.notes||l.notes.length===0){hist.innerHTML='<div style="color:var(--muted);font-size:12px">Nenhuma anotação ainda.</div>';return;}
  hist.innerHTML=[...l.notes].reverse().map(n=>`
    <div class="note-item">
      <div class="note-item-date">${new Date(n.date).toLocaleString('pt-BR')}${n.tags&&n.tags.length?' · '+n.tags.join(' '):''}</div>
      ${n.text}
    </div>`).join('');
}
function saveNote(){
  const l=leads.find(x=>x.id===currentLeadId);if(!l)return;
  const text=document.getElementById('noteText').value.trim();
  if(text){
    if(!l.notes)l.notes=[];
    l.notes.push({date:new Date().toISOString(),text,tags:[]});
  }
  save('crm_leads2',leads);
  renderNotesHistory(l);
  document.getElementById('noteText').value='';
  const btn=document.getElementById('noteSaveBtn');
  btn.textContent='✅ Salvo!';
  setTimeout(()=>btn.textContent='💾 Salvar',1400);
  if(currentTab!=='agenda')renderContent();
}

// ── ADD LEAD ──────────────────────────────────────────────────
function openAddLeadModal(){
  // populate product dropdown
  const pdList=document.getElementById('dd-product-list');
  if(pdList){
    pdList.innerHTML=products.map(p=>`<div class="nl-dropdown-item" onclick="pickDropdown('product','${p.id}','${p.icon} ${p.name}',event)">${p.icon} ${p.name}</div>`).join('');
  }
  if(products.length>0){
    document.getElementById('nl-product').value=products[0].id;
    const lbl=document.getElementById('dd-product-label');
    if(lbl)lbl.textContent=products[0].icon+' '+products[0].name;
  }
  ['nl-name','nl-value','nl-appt-date','nl-appt-time','nl-appt-desc','nl-phone','nl-cpf','nl-email','nl-desc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('nl-appt-date').value=today();
  document.getElementById('nl-stage').value='prospect';
  document.getElementById('nl-priority').value='medium';
  const stageLbl=document.getElementById('dd-stage-label');if(stageLbl)stageLbl.textContent='Prospecção';
  document.querySelectorAll('#dd-stage-list .nl-dropdown-item').forEach((el,i)=>el.classList.toggle('selected',i===0));
  document.getElementById('agendaSection').style.display='none';
  const arrow=document.getElementById('nl-agenda-arrow');if(arrow)arrow.classList.remove('open');
  document.getElementById('nl-appt-urgency').value='medium';
  document.querySelectorAll('#nl-appt-urgency-pills .nl-priority-pill').forEach(b=>b.classList.toggle('active',b.dataset.u==='medium'));
  _noValue=false;
  const nvBtn=document.getElementById('nl-no-value-btn');if(nvBtn)nvBtn.classList.remove('active');
  const nvInp=document.getElementById('nl-value');if(nvInp){nvInp.disabled=false;nvInp.placeholder='Valor estimado (R$)';}
  editingLeadId=null;
  const nlSec=document.getElementById('nl-notes-section');if(nlSec)nlSec.style.display='none';
  const titleEl=document.querySelector('#addLeadModal .nl-title');
  if(titleEl)titleEl.textContent='Novo Lead';
  const saveBtn=document.getElementById('nl-save-btn');
  if(saveBtn)saveBtn.textContent='Adicionar Lead';
  const delBtn=document.getElementById('nl-delete-btn');
  if(delBtn)delBtn.style.display='none';
  openModal('addLeadModal');
}
function openEditLeadModal(id){
  const l=leads.find(x=>x.id===id);
  if(!l)return;
  // first open clean modal
  openAddLeadModal();
  editingLeadId=id;
  // update title & button
  const titleEl=document.querySelector('#addLeadModal .nl-title');
  if(titleEl)titleEl.textContent='Editar Lead';
  const saveBtn=document.getElementById('nl-save-btn');
  if(saveBtn)saveBtn.textContent='Salvar Alterações';
  const delBtn=document.getElementById('nl-delete-btn');
  if(delBtn)delBtn.style.display='block';
  // fill fields
  document.getElementById('nl-name').value=l.name||'';
  // product dropdown
  document.getElementById('nl-product').value=l.productId;
  const prod=products.find(p=>p.id===l.productId);
  const lbl=document.getElementById('dd-product-label');
  if(lbl&&prod)lbl.textContent=prod.icon+' '+prod.name;
  // disable value for Conta product
  // value
  if(isContaProduct(prod)){
    _noValue=true;
    const nvBtn=document.getElementById('nl-no-value-btn');if(nvBtn){nvBtn.classList.add('active');nvBtn.disabled=true;}
    const nvInp=document.getElementById('nl-value');if(nvInp){nvInp.disabled=true;nvInp.value='';nvInp.placeholder='Conta — sem valor';}
  } else if(l.value!=null&&l.value!==0){
    _noValue=false;
    const nvBtn=document.getElementById('nl-no-value-btn');if(nvBtn){nvBtn.classList.remove('active');nvBtn.disabled=false;}
    const nvInp=document.getElementById('nl-value');
    if(nvInp){nvInp.disabled=false;nvInp.value=l.value.toLocaleString('pt-BR');nvInp.placeholder='Valor estimado (R$)';}
  } else if(l.value==null){
    _noValue=true;
    const nvBtn=document.getElementById('nl-no-value-btn');if(nvBtn){nvBtn.classList.add('active');nvBtn.disabled=false;}
    const nvInp=document.getElementById('nl-value');if(nvInp){nvInp.disabled=true;nvInp.value='';nvInp.placeholder='Valor estimado (R$)';}
  }
  // stage
  const stageMap={prospect:'Prospecção',negotiating:'Negociando',waiting:'Aguardando Decisão'};
  document.getElementById('nl-stage').value=l.stage||'prospect';
  const stageLbl=document.getElementById('dd-stage-label');
  if(stageLbl)stageLbl.textContent=stageMap[l.stage]||'Prospecção';
  // priority
  document.getElementById('nl-priority').value=l.priority||'medium';
  // other fields
  document.getElementById('nl-phone').value=l.phone||'';
  const cpfEl=document.getElementById('nl-cpf');if(cpfEl)cpfEl.value=l.cpf||'';
  document.getElementById('nl-email').value=l.email||'';
  document.getElementById('nl-desc').value=l.description||'';
  // show notes/history section
  const nlSec=document.getElementById('nl-notes-section');
  if(nlSec)nlSec.style.display='block';
  // reset to notes tab
  switchNlTab('notes');
  document.getElementById('nl-note-text').value='';
  renderNlNotes(l);
  renderNlStageHistory(l);
}
function deleteEditingLead(){
  if(!editingLeadId)return;
  if(!confirm('Excluir este lead permanentemente?'))return;
  leads=leads.filter(l=>l.id!==editingLeadId);
  save('crm_leads2',leads);
  editingLeadId=null;
  closeModalById('addLeadModal');
  renderContent();
}
function switchNlTab(tab){
  ['notes','history'].forEach(t=>{
    document.getElementById('nltab-'+t).classList.toggle('active',t===tab);
    document.getElementById('nlpanel-'+t).style.display=t===tab?'block':'none';
  });
}
function renderNlNotes(l){
  const el=document.getElementById('nl-notes-history');
  if(!el)return;
  if(!l.notes||l.notes.length===0){el.innerHTML='<div style="color:var(--muted);font-size:12px;padding:4px">Nenhuma anotação ainda.</div>';return;}
  const realIdxMap=[...l.notes].map((_,i)=>i).reverse();
  el.innerHTML=realIdxMap.map((realIdx,i)=>{
    const n=l.notes[realIdx];
    return `<div class="note-item" style="position:relative">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="note-item-date">${new Date(n.date).toLocaleString('pt-BR')}${n.tags&&n.tags.length?' · '+n.tags.join(' '):''}</div>
        <div style="position:relative">
          <button class="nl-dots-btn" onclick="event.stopPropagation();toggleNlMenu('nlnm-${realIdx}')" title="Opções">⋯</button>
          <div class="nl-ctx-menu" id="nlnm-${realIdx}">
            <button onclick="event.stopPropagation();editNoteEntry(${l.id},${realIdx})">✏️ Editar</button>
            <button onclick="event.stopPropagation();deleteNoteEntry(${l.id},${realIdx})" style="color:#ff5c35">🗑️ Excluir</button>
          </div>
        </div>
      </div>
      <div id="nlntxt-${realIdx}" style="white-space:pre-wrap;word-break:break-word;font-size:12px;color:var(--text);margin-top:2px">${n.text}</div>
    </div>`;
  }).join('');
}
function renderNlStageHistory(l){
  const el=document.getElementById('nl-stage-history');
  if(!el)return;
  const history=l.stageHistory&&l.stageHistory.length>0?l.stageHistory:
    [{stage:l.stage,date:l.createdAt||new Date().toISOString()}];
  const stageColors={...STAGE_COLORS,recycle:'#00e57a'};
  const stageLabelsExt={...STAGE_LABELS,won:'💰 Ganho',lost:'❌ Perdido',recycle:'♻️ Reciclagem'};
  const realIdxMap=[...history].map((_,i)=>i).reverse();
  el.innerHTML=realIdxMap.map((realIdx)=>{
    const h=history[realIdx];
    const color=stageColors[h.stage]||'#6b6b85';
    const label=stageLabelsExt[h.stage]||h.stage;
    const dt=new Date(h.date).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
    return `<div class="nl-stage-entry" style="position:relative">
      <div class="nl-stage-entry-dot" style="background:${color}"></div>
      <div style="flex:1"><div class="nl-stage-entry-label" style="color:${color}">${label}</div><div class="nl-stage-entry-date">${dt}</div></div>
      <div style="position:relative">
        <button class="nl-dots-btn" onclick="event.stopPropagation();toggleNlMenu('nlhm-${realIdx}')" title="Opções">⋯</button>
        <div class="nl-ctx-menu" id="nlhm-${realIdx}">
          <button onclick="event.stopPropagation();deleteStageEntry(${l.id},${realIdx})" style="color:#ff5c35">🗑️ Excluir</button>
        </div>
      </div>
    </div>`;
  }).join('');
}
function toggleNlMenu(id){
  document.querySelectorAll('.nl-ctx-menu').forEach(m=>{if(m.id!==id)m.classList.remove('open');});
  const m=document.getElementById(id);if(m)m.classList.toggle('open');
}
document.addEventListener('click',()=>document.querySelectorAll('.nl-ctx-menu').forEach(m=>m.classList.remove('open')));
function editNoteEntry(leadId,idx){
  const l=leads.find(x=>x.id===leadId);if(!l||!l.notes||!l.notes[idx])return;
  const txtEl=document.getElementById('nlntxt-'+idx);if(!txtEl)return;
  const orig=l.notes[idx].text;
  txtEl.innerHTML=`<textarea style="width:100%;box-sizing:border-box;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;color:var(--text);font-size:12px;font-family:inherit;resize:vertical;min-height:60px" id="nledit-${idx}">${orig}</textarea>
    <div style="display:flex;gap:6px;margin-top:6px">
      <button onclick="confirmEditNote(${leadId},${idx})" style="flex:1;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:5px 0;font-size:11px;font-weight:700;cursor:pointer">✅ Salvar</button>
      <button onclick="cancelEditNote(${leadId},${idx},'${orig.replace(/'/g,"\\'")}'" style="flex:1;background:var(--surface2);color:var(--muted);border:1px solid var(--border);border-radius:8px;padding:5px 0;font-size:11px;cursor:pointer">✖ Cancelar</button>
    </div>`;
}
function confirmEditNote(leadId,idx){
  const l=leads.find(x=>x.id===leadId);if(!l||!l.notes||!l.notes[idx])return;
  const ta=document.getElementById('nledit-'+idx);if(!ta)return;
  const newText=ta.value.trim();if(!newText)return;
  l.notes[idx].text=newText;
  save('crm_leads2',leads);
  renderNlNotes(l);
}
function cancelEditNote(leadId,idx,orig){
  const l=leads.find(x=>x.id===leadId);if(!l)return;
  const txtEl=document.getElementById('nlntxt-'+idx);
  if(txtEl){txtEl.style.whiteSpace='pre-wrap';txtEl.style.wordBreak='break-word';txtEl.style.fontSize='12px';txtEl.style.color='var(--text)';txtEl.style.marginTop='2px';txtEl.textContent=l.notes[idx]?l.notes[idx].text:orig;}
}
function deleteNoteEntry(leadId,idx){
  const l=leads.find(x=>x.id===leadId);if(!l||!l.notes)return;
  if(!confirm('Excluir esta anotação?'))return;
  l.notes.splice(idx,1);
  save('crm_leads2',leads);
  renderNlNotes(l);
}
function deleteStageEntry(leadId,idx){
  const l=leads.find(x=>x.id===leadId);if(!l||!l.stageHistory)return;
  if(!confirm('Excluir este registro de histórico?'))return;
  l.stageHistory.splice(idx,1);
  save('crm_leads2',leads);
  renderNlStageHistory(l);
}
function saveNoteFromEdit(){
  if(!editingLeadId)return;
  const l=leads.find(x=>x.id===editingLeadId);if(!l)return;
  const text=document.getElementById('nl-note-text').value.trim();
  if(!text)return;
  if(!l.notes)l.notes=[];
  l.notes.push({date:new Date().toISOString(),text,tags:[]});
  save('crm_leads2',leads);
  document.getElementById('nl-note-text').value='';
  renderNlNotes(l);
  const btn=document.getElementById('nl-note-save-btn');
  btn.textContent='✅ Salvo!';
  setTimeout(()=>btn.textContent='💾 Salvar anotação',1400);
  if(currentTab!=='agenda')renderContent();
}
function fmtValInput(inp){
  // preserve cursor: only reformat if there's a real value
  const pos=inp.selectionStart;
  const raw=inp.value.replace(/\./g,''); // remove existing dots
  // allow partial typing: don't reformat while user is deleting
  if(raw===''||raw==='-'){return;}
  const num=parseInt(raw.replace(/\D/g,''),10);
  if(isNaN(num)){inp.value=raw.replace(/[^\d]/g,'');return;}
  const formatted=num.toLocaleString('pt-BR');
  if(inp.value!==formatted){
    inp.value=formatted;
    // restore cursor accounting for added dots
    const diff=formatted.length-raw.length;
    try{inp.setSelectionRange(pos+diff,pos+diff);}catch(e){}
  }
}
function fmtValBlur(inp){
  const raw=inp.value.replace(/\./g,'').replace(/\D/g,'');
  if(!raw){inp.value='';return;}
  inp.value=parseInt(raw,10).toLocaleString('pt-BR');
}
let _noValue=false;
function selectNlApptUrgency(btn){
  document.querySelectorAll('#nl-appt-urgency-pills .nl-priority-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('nl-appt-urgency').value=btn.dataset.u;
}
function selectApptUrgency(btn){
  document.querySelectorAll('#ap-urgency-pills .nl-priority-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ap-urgency').value=btn.dataset.u;
}
function toggleDropdown(name){
  const dd=document.getElementById('dd-'+name);
  if(!dd)return;
  // close others
  document.querySelectorAll('.nl-dropdown.open').forEach(d=>{if(d!==dd)d.classList.remove('open');});
  dd.classList.toggle('open');
}
function pickDropdown(name,value,label,e){
  e.stopPropagation();
  document.getElementById('nl-'+name).value=value;
  const lbl=document.getElementById('dd-'+name+'-label');
  if(lbl)lbl.textContent=label;
  document.querySelectorAll('#dd-'+name+'-list .nl-dropdown-item').forEach(el=>el.classList.remove('selected'));
  if(e.target.classList.contains('nl-dropdown-item'))e.target.classList.add('selected');
  document.getElementById('dd-'+name).classList.remove('open');
  // If selecting product, check if it's Conta → disable value field
  if(name==='product'){
    const p=products.find(x=>String(x.id)===String(value));
    const vInp=document.getElementById('nl-value');
    const vWrap=document.getElementById('nl-no-value-btn');
    if(isContaProduct(p)){
      _noValue=true;
      if(vInp){vInp.disabled=true;vInp.value='';vInp.placeholder='Conta — sem valor';}
      if(vWrap)vWrap.disabled=true;
    } else {
      _noValue=false;
      if(vInp){vInp.disabled=false;vInp.placeholder='Valor estimado (R$)';}
      if(vWrap)vWrap.disabled=false;
    }
  }
}
// close dropdowns when clicking outside
document.addEventListener('click',function(e){
  if(!e.target.closest('.nl-dropdown'))
    document.querySelectorAll('.nl-dropdown.open').forEach(d=>d.classList.remove('open'));
});
function toggleNoValue(){
  _noValue=!_noValue;
  const btn=document.getElementById('nl-no-value-btn');
  const inp=document.getElementById('nl-value');
  if(btn)btn.classList.toggle('active',_noValue);
  if(inp){inp.disabled=_noValue;inp.value='';inp.placeholder=_noValue?'—':'Valor estimado (R$)';}
}
function toggleAgendaSection(){
  const sec=document.getElementById('agendaSection');
  const arrow=document.getElementById('nl-agenda-arrow');
  const open=sec.style.display==='none';
  sec.style.display=open?'block':'none';
  if(arrow)arrow.classList.toggle('open',open);
}
function saveLead(){
  const name=document.getElementById('nl-name').value.trim();
  if(!name){document.getElementById('nl-name').focus();return;}
  const pid=parseInt(document.getElementById('nl-product').value);
  const newStage=document.getElementById('nl-stage').value||'prospect';
  const newStatus = newStage==='lost'?'trash': newStage==='won'?'won':'active';
  const rawVal=document.getElementById('nl-value').value.replace(/\./g,'').replace(',','.');
  const parsedVal=_noValue?null:(parseFloat(rawVal)||0);

  if(editingLeadId){
    // EDIT MODE
    const idx=leads.findIndex(l=>l.id===editingLeadId);
    if(idx>=0){
      const old=leads[idx];
      const stageChanged=newStage!==old.stage;
      leads[idx]={...old,name,productId:pid,value:parsedVal,
        priority:document.getElementById('nl-priority').value||'medium',
        stage:newStage,status:newStatus,
        phone:document.getElementById('nl-phone').value.trim(),
        cpf:document.getElementById('nl-cpf').value.trim(),
        email:document.getElementById('nl-email').value.trim(),
        description:document.getElementById('nl-desc').value.trim(),
        wonAt:(newStatus==='won'&&!old.wonAt?new Date().toISOString():old.wonAt)
      };
      if(stageChanged)recordStageMove(leads[idx],newStage);
    }
    save('crm_leads2',leads);
    editingLeadId=null;
    closeModalById('addLeadModal');renderContent();
    return;
  }

  // NEW LEAD MODE
  const newId=Date.now();
  leads.push({
    id:newId,name,productId:pid,
    value:parsedVal,
    priority:document.getElementById('nl-priority').value||'medium',
    stage:newStage,
    status:newStatus,notes:[],wonAt:(newStatus==='won'?new Date().toISOString():null),
    phone:document.getElementById('nl-phone').value.trim(),
    cpf:document.getElementById('nl-cpf').value.trim(),
    email:document.getElementById('nl-email').value.trim(),
    description:document.getElementById('nl-desc').value.trim(),
    createdAt:new Date().toISOString(),
    lastMoveAt:new Date().toISOString(),
    lastMoveStage:newStage,
    stageHistory:[{stage:newStage,date:new Date().toISOString()}]
  });
  const agendaOpen=document.getElementById('agendaSection').style.display!=='none';
  const t=document.getElementById('nl-appt-time').value;
  if(agendaOpen&&t){
    const d=document.getElementById('nl-appt-date').value||today();
    const apptUrgency=document.getElementById('nl-appt-urgency').value||'medium';
    appointments.push({id:Date.now()+1,time:t,name,detail:document.getElementById('nl-appt-desc').value.trim()||'Compromisso',leadId:newId,date:d,done:false,urgency:apptUrgency});
    save('crm_appts2',appointments);
  }
  save('crm_leads2',leads);
  closeModalById('addLeadModal');renderContent();
}

// ── ADD APPT ──────────────────────────────────────────────────
function openAddApptModal(){
  ['ap-name','ap-desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ap-urgency').value='medium';
  document.querySelectorAll('#ap-urgency-pills .nl-priority-pill').forEach(b=>b.classList.toggle('active',b.dataset.u==='medium'));
  document.getElementById('ap-date').value=today();
  document.getElementById('ap-time').value='';
  openModal('addApptModal');
}
function saveAppt(){
  const name=document.getElementById('ap-name').value.trim();
  const time=document.getElementById('ap-time').value;
  if(!name||!time)return;
  const d=document.getElementById('ap-date').value||today();
  const urgency=document.getElementById('ap-urgency').value||'medium';
  appointments.push({id:Date.now(),time,name,detail:document.getElementById('ap-desc').value.trim()||'Compromisso',leadId:null,date:d,done:false,urgency});
  save('crm_appts2',appointments);closeModalById('addApptModal');renderContent();
}

// ── EDIT APPT ────────────────────────────────────────────────
function selectEaUrgency(btn){
  document.querySelectorAll('#ea-urgency-pills .nl-priority-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('ea-urgency').value=btn.dataset.u;
}
function openEditApptModal(id){
  const a=appointments.find(x=>x.id===id);if(!a)return;
  document.getElementById('ea-id').value=id;
  document.getElementById('ea-name').value=a.name||'';
  document.getElementById('ea-date').value=a.date||today();
  document.getElementById('ea-time').value=a.time||'';
  document.getElementById('ea-desc').value=a.detail||'';
  const u=a.urgency||'medium';
  document.getElementById('ea-urgency').value=u;
  document.querySelectorAll('#ea-urgency-pills .nl-priority-pill').forEach(b=>b.classList.toggle('active',b.dataset.u===u));
  openModal('editApptModal');
}
function saveEditAppt(){
  const id=parseInt(document.getElementById('ea-id').value);
  const name=document.getElementById('ea-name').value.trim();
  const time=document.getElementById('ea-time').value;
  if(!name||!time)return;
  const a=appointments.find(x=>x.id===id);if(!a)return;
  a.name=name;
  a.date=document.getElementById('ea-date').value||today();
  a.time=time;
  a.detail=document.getElementById('ea-desc').value.trim()||'Compromisso';
  a.urgency=document.getElementById('ea-urgency').value||'medium';
  save('crm_appts2',appointments);
  closeModalById('editApptModal');
  renderContent();
  showToast('Compromisso atualizado ✓');
}

// ── PRODUCTS ──────────────────────────────────────────────────
function resetProductForm(){
  editingProductId=null;
  document.getElementById('productModalTitle').textContent='Novo Produto';
  document.getElementById('productModalSub').textContent='Criar esteira dedicada';
  document.getElementById('p-name').value='';
  document.getElementById('productDeleteWrap').innerHTML='';
  selColor=PCOLORS[0];selIcon=PICONS[0];
  buildColorPicker();buildIconPicker();
}
function editProduct(id){
  const p=products.find(x=>x.id===id);if(!p)return;
  editingProductId=id;
  document.getElementById('productModalTitle').textContent='Editar Produto';
  document.getElementById('productModalSub').textContent=p.name;
  document.getElementById('p-name').value=p.name;
  selColor=p.color;selIcon=p.icon;
  buildColorPicker();buildIconPicker();
  document.getElementById('productDeleteWrap').innerHTML=`<button class="delete-btn" onclick="deleteProduct(${id})">🗑️ Excluir produto</button>`;
  openModal('addProductModal');
}
function deleteProduct(id){
  if(!confirm('Excluir produto? Os leads vinculados não serão deletados.'))return;
  products=products.filter(p=>p.id!==id);
  save('crm_products2',products);closeModalById('addProductModal');renderContent();
}
function saveProduct(){
  const name=document.getElementById('p-name').value.trim();
  if(!name){document.getElementById('p-name').focus();return;}
  if(editingProductId){const p=products.find(x=>x.id===editingProductId);if(p){p.name=name;p.color=selColor;p.icon=selIcon;}}
  else products.push({id:Date.now(),name,icon:selIcon,color:selColor});
  save('crm_products2',products);closeModalById('addProductModal');renderContent();
}
function buildColorPicker(){
  document.getElementById('colorPicker').innerHTML=PCOLORS.map(c=>`<div class="color-dot ${c===selColor?'selected':''}" style="background:${c}" onclick="pickColor('${c}')"></div>`).join('');
}
function pickColor(c){selColor=c;buildColorPicker();}
function buildIconPicker(){
  document.getElementById('iconPicker').innerHTML=PICONS.map(ic=>`<div class="icon-opt ${ic===selIcon?'selected':''}" onclick="pickIcon('${ic}')">${ic}</div>`).join('');
}
function pickIcon(ic){selIcon=ic;buildIconPicker();}

// ── CPF ───────────────────────────────────────────────────────
function fmtCPF(el){
  let v=el.value.replace(/\D/g,'').slice(0,11);
  if(v.length>9) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6,9)+'-'+v.slice(9);
  else if(v.length>6) v=v.slice(0,3)+'.'+v.slice(3,6)+'.'+v.slice(6);
  else if(v.length>3) v=v.slice(0,3)+'.'+v.slice(3);
  el.value=v;
}

// ── MODALS ────────────────────────────────────────────────────
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModalById(id){
  document.getElementById(id).classList.remove('open');
  document.querySelectorAll('.nl-dropdown.open').forEach(d=>d.classList.remove('open'));
}
function closeModal(id,e){if(e.target===document.getElementById(id))closeModalById(id)}

// ── FAB CONTEXT-AWARE ─────────────────────────────────────────
function openFabMenu(){
  if(currentTab==='management'){return;}
  const content=document.getElementById('fabMenuContent');
  const items={
    agenda:`<button class="fab-sheet-item" onclick="closeFabOpen('addApptModal')">
      <div class="fab-sheet-icon" style="background:rgba(77,141,255,.15);color:#4d8dff">📅</div>
      <div class="fab-sheet-text"><span class="fab-sheet-label">Novo Compromisso</span><span class="fab-sheet-desc">Agendar uma atividade</span></div>
    </button>`,
    pipeline:`<button class="fab-sheet-item" onclick="closeFabOpen('addLeadModal')">
      <div class="fab-sheet-icon" style="background:rgba(255,92,53,.15);color:var(--accent)">🔥</div>
      <div class="fab-sheet-text"><span class="fab-sheet-label">Novo Lead</span><span class="fab-sheet-desc">Adicionar um novo contato</span></div>
    </button>`,
    ideas:`<button class="fab-sheet-item" onclick="closeFabOpen('addIdeaModal')">
      <div class="fab-sheet-icon" style="background:rgba(255,184,0,.15);color:#ffb800">💡</div>
      <div class="fab-sheet-text"><span class="fab-sheet-label">Nova Ideia</span><span class="fab-sheet-desc">Registrar uma ideia</span></div>
    </button>`,
    overview:`<button class="fab-sheet-item" onclick="resetProductForm();closeFabOpen('addProductModal')">
      <div class="fab-sheet-icon" style="background:rgba(255,92,53,.15);color:var(--accent)">📦</div>
      <div class="fab-sheet-text"><span class="fab-sheet-label">Novo Produto</span><span class="fab-sheet-desc">Adicionar produto ou serviço</span></div>
    </button>`
  };
  content.innerHTML=items[currentTab]||'';
  openModal('fabMenu');
}
function closeFabOpen(id){
  closeModalById('fabMenu');
  if(id==='addLeadModal')openAddLeadModal();
  else if(id==='addApptModal')openAddApptModal();
  else if(id==='addIdeaModal')openAddIdeaModal();
  else{if(id==='addProductModal')resetProductForm();openModal(id);}
}

// ── IDEA MODAL ────────────────────────────────────────────────
function openAddIdeaModal(){
  document.getElementById('ideaModalText').value='';
  _ideaModalCat='captação';
  document.querySelectorAll('#ideaModalCatBtns .quick-tag').forEach((b,i)=>{
    b.classList.toggle('selected',i===0);
  });
  openModal('addIdeaModal');
}
function selectIdeaModalCat(cat,btn){
  _ideaModalCat=cat;
  document.querySelectorAll('#ideaModalCatBtns .quick-tag').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}
function saveIdeaModal(){
  const text=document.getElementById('ideaModalText').value.trim();
  if(!text)return;
  ideas.push({id:Date.now(),text,category:_ideaModalCat,createdAt:new Date().toISOString()});
  save('crm_ideas',ideas);
  closeModalById('addIdeaModal');
  if(currentTab==='ideas')renderIdeas();
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg){
  const t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:82px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:10px 18px;border-radius:10px;font-size:13px;font-weight:600;z-index:200;animation:slideUp .2s ease;white-space:nowrap';
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(()=>t.remove(),2200);
}

// ── INIT ──────────────────────────────────────────────────────
renderContent();
let _appInited=false;
function appInit(){
  if(_appInited)return;
  _appInited=true;
  const p=window._fbProducts,l=window._fbLeads,a=window._fbAppts,i=window._fbIdeas;
  if(p){products.length=0;products.push(...p);}
  if(l){
    const loaded=fixLeads(l);
    // merge: for each loaded lead, keep the in-memory version if it has a newer lastMoveAt
    const inMemById=new Map(leads.map(x=>[x.id,x]));
    const merged=loaded.map(fbLead=>{
      const mem=inMemById.get(fbLead.id);
      if(mem&&mem.lastMoveAt&&fbLead.lastMoveAt&&mem.lastMoveAt>fbLead.lastMoveAt) return mem;
      return fbLead;
    });
    leads.length=0;leads.push(...merged);
    // fix: Conta product leads must not have value
    const _contaFix=contaIds();
    let _fixedConta=false;
    leads.forEach(l=>{if(_contaFix.has(l.productId)&&l.value!=null){l.value=null;_fixedConta=true;}});
    if(_fixedConta)save('crm_leads2',leads);
  }
  if(a){appointments.length=0;appointments.push(...a);}
  if(i){ideas.length=0;ideas.push(...i);}
  renderContent();
}
if(window._fbReady){ appInit(); }
else { window.addEventListener('fb-ready', appInit, {once:true}); }
