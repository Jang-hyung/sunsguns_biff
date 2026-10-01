/* Public schedule page: renders data.json (uploaded by the extension) and re-checks it every minute. */
(() => {
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const day=d=>{const x=new Date(d+'T00:00:00+09:00');return `${x.getMonth()+1}월 ${x.getDate()}일 ${'일월화수목금토'[x.getDay()]}요일`;};
 const short=d=>{const x=new Date(d+'T00:00:00+09:00');return `${x.getMonth()+1}/${x.getDate()} ${'일월화수목금토'[x.getDay()]}`;};
 const seatText=labels=>{const p=labels.map(l=>/^(.*열)\s*(\d+)번$/.exec(l)||[l,l,'']);return p.every(x=>x[1]===p[0][1]&&x[2])?`${p[0][1]} ${p.map(x=>x[2]).join('·')}번`:labels.join(', ');};
 let data={films:[]},openId=null,last='';
 const row=(f,withDay)=>`<button class="film ${f.seats?(f.note?'part':''):'wait'}" data-id="${f.id}"><span class="time">${withDay?`<small>${short(f.date)}</small>`:''}${esc(f.start)}</span><span class="info"><span class="title">${esc(f.title)}</span><span class="venue">${esc(f.venue)}</span></span><span class="seat">${f.seats?`<span class="pill">${esc(seatText(f.seats))}</span>`:''}${f.note?`<span class="note">${esc(f.note)}</span>`:''}</span></button>`;
 const dayHead=(d,n)=>{const x=new Date(d+'T00:00:00+09:00');return `<h2 class="day"><span class="num">${x.getDate()}</span><span class="dw">${'일월화수목금토'[x.getDay()]}요일<small>10월 · ${n}편</small></span></h2>`;};
 function render(){
  const films=data.films,byDay=new Map();for(const f of films){if(!byDay.has(f.date))byDay.set(f.date,[]);byDay.get(f.date).push(f);}
  const improve=films.filter(f=>f.group==='improve'),wait=films.filter(f=>f.group==='wait');
  const n=k=>films.filter(f=>k==='done'?f.seats&&!f.note:k==='part'?f.seats&&f.note:!f.seats).length;
  $('summary').innerHTML=`<span>10.7 — 10.11 · ${films.length}편</span><span><i class="dot done"></i>확보<b>${n('done')}</b></span><span><i class="dot part"></i>1석·떨어진 자리<b>${n('part')}</b></span><span><i class="dot wait"></i>구하는 중<b>${n('wait')}</b></span>`;
  $('days').innerHTML=[...byDay].map(([d,l])=>`<section class="dayblock">${dayHead(d,l.length)}<div class="list">${l.map(f=>row(f,false)).join('')}</div></section>`).join('')
   +(improve.length?`<h2 class="sub">자리 개선 중</h2>`+'<div class="list">'+improve.map(f=>row(f,true)).join('')+'</div>':'')
   +(wait.length?`<h2 class="sub">아직 표를 구하는 중<small>${wait.length}편</small></h2>`+'<div class="list">'+wait.map(f=>row(f,true)).join('')+'</div>':'');
  if(openId)detail();
 }
 function svg(m){
  const xs=[...new Set(m.s.map(s=>Math.round(s[0])))].sort((a,b)=>a-b),gaps=xs.slice(1).map((x,i)=>x-xs[i]).filter(g=>g>2).sort((a,b)=>a-b),pitch=gaps[Math.floor(gaps.length/2)]||20,cap=pitch*0.85;
  const pad=12,W=m.w+pad*2,H=m.h+pad*2+18;
  const rects=m.s.map(([x,y,w,h,mine])=>{w=Math.min(w||cap,cap);h=Math.min(h||cap,cap);return `<rect x="${x-w/2+pad}" y="${y-h/2+pad+18}" width="${w}" height="${h}" rx="2" fill="${mine?'var(--new)':'var(--sold)'}"${mine?' stroke="var(--ink)" stroke-width="1.5"':''}/>`;}).join('');
  return `<svg class="map" viewBox="0 0 ${W} ${H}" role="img" aria-label="좌석 배치도"><rect class="screen" x="${W*0.25}" y="4" width="${W*0.5}" height="5" rx="2"/><text x="${W/2}" y="17" text-anchor="middle" font-size="9" fill="var(--mute)">SCREEN</text>${rects}</svg>`;
 }
 function detail(){
  const f=data.films.find(x=>x.id===openId);if(!f)return;
  $('detailBody').innerHTML=`<div class="detail"><h3>${esc(f.title)}</h3><p>${day(f.date)} ${esc(f.start)} · ${esc(f.venue)}</p>
   <div class="seats">${f.seats?`<span class="chip new"><b>우리 자리</b>${esc(seatText(f.seats))}</span>`:'<span class="chip">구하는 중</span>'}${f.note&&f.seats?`<span class="chip">${esc(f.note)}</span>`:''}</div>
   ${f.map?svg(f.map):''}</div>`;
 }
 async function load(){
  try{const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const text=await r.text();if(text===last)return;last=text;data=JSON.parse(text);render();
   $('updated').textContent='최근 확인 '+new Date().toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}catch{}
 }
 $('days').addEventListener('click',e=>{const b=e.target.closest('.film');if(!b)return;openId=b.dataset.id;detail();$('detail').showModal();});
 $('close').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>{openId=null;});
 $('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close();});
 load();setInterval(load,60000);
})();
