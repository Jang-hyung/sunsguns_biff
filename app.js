/* Public schedule page: renders data.json (uploaded by the extension) and re-checks it every minute. */
(() => {
 const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const day=d=>{const x=new Date(d+'T00:00:00+09:00');return `${x.getMonth()+1}월 ${x.getDate()}일 ${'일월화수목금토'[x.getDay()]}요일`;};
 const short=d=>{const x=new Date(d+'T00:00:00+09:00');return `${x.getMonth()+1}/${x.getDate()} ${'일월화수목금토'[x.getDay()]}`;};
 const seatText=labels=>{const p=labels.map(l=>/^(.*열)\s*(\d+)번$/.exec(l)||[l,l,'']);return p.every(x=>x[1]===p[0][1]&&x[2])?`${p[0][1]} ${p.map(x=>+x[2]).sort((a,b)=>a-b).join('·')}번`:labels.join(', ');};
 let data={films:[]},openId=null,last='';
 // Status is computed from the viewer's clock, so finished screenings change look without a new upload.
 const at=(f,t)=>Date.parse(`${f.date}T${t}:00+09:00`);
 const endAt=f=>f.runtime?at(f,f.start)+f.runtime*60000:at(f,f.start)+2*3600000;
 const split=labels=>{if(!labels||labels.length!==2)return false;const p=labels.map(l=>/^(.*열)\s*(\d+)번$/.exec(l));return !(p[0]&&p[1]&&p[0][1]===p[1][1]&&Math.abs(p[0][2]-p[1][2])===1);};
 const state=f=>{const now=Date.now(),past=now>endAt(f),started=now>=at(f,f.start);
  if(!f.seats)return {cls:started?'miss past':'wait',note:started?'못 구함':'표 구하는 중',past:started};
  const sep=split(f.seats),one=f.seats.length===1;
  return {cls:(sep||one?'part':'')+(past?' past':''),note:past?'관람 완료':one?'1석 확보':sep?'떨어진 자리':f.hint||'',past,sep:sep||one};};
 const row=(f,withDay)=>{const st=state(f);return `<button class="film ${st.cls}" data-id="${f.id}"><span class="time">${withDay?`<small>${short(f.date)}</small>`:''}${esc(f.start)}${f.end?`<small>~${esc(f.end)}</small>`:''}</span><span class="info"><span class="title">${esc(f.title)}</span><span class="venue">${esc(f.venue)}</span></span><span class="seat">${f.seats?`<span class="pill">${esc(seatText(f.seats))}</span>`:''}${st.note?`<span class="note">${esc(st.note)}</span>`:''}</span></button>`;};
 const dayHead=(d,n)=>{const x=new Date(d+'T00:00:00+09:00');return `<h2 class="day"><span class="num">${x.getDate()}</span><span class="dw">${'일월화수목금토'[x.getDay()]}요일<small>10월 · ${n}편</small></span></h2>`;};
 // Break between consecutive screenings of the day (needs both runtimes' end time).
 const mins=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
 const gap=(a,b)=>{if(!a?.end||!b)return '';let g=mins(b.start)-mins(a.end);if(mins(a.end)<mins(a.start))g-=1440;return `<div class="gap${g<0?' clash':''}">${g<0?`⚠ ${-g}분 겹침`:g<60?`쉬는 시간 ${g}분`:`쉬는 시간 ${Math.floor(g/60)}시간${g%60?` ${g%60}분`:''}`}</div>`;};
 let pastOpen=false;
 function render(){
  const films=data.films,byDay=new Map();for(const f of films){if(!byDay.has(f.date))byDay.set(f.date,[]);byDay.get(f.date).push(f);}
  const sts=new Map(films.map(f=>[f.id,state(f)]));
  // Only screenings still being worked on belong in the bottom sections.
  const improve=films.filter(f=>f.hint&&!sts.get(f.id).past),wait=films.filter(f=>!f.seats&&!sts.get(f.id).past);
  const ahead=films.filter(f=>f.seats&&!sts.get(f.id).past).length,done=films.filter(f=>f.seats&&sts.get(f.id).past).length,sep=films.filter(f=>sts.get(f.id).sep).length;
  $('summary').innerHTML=`<span>10.7 — 10.11 · ${films.filter(f=>f.seats).length}편 확보</span><span><i class="dot done"></i>앞으로<b>${ahead}</b></span><span><i class="dot gone"></i>관람 완료<b>${done}</b></span><span><i class="dot part"></i>떨어진 자리<b>${sep}</b></span><span><i class="dot wait"></i>구하는 중<b>${wait.length}</b></span>`;
  const block=([d,l])=>`<section class="dayblock">${dayHead(d,l.length)}<div class="list">${l.map((f,i)=>gap(l[i-1],f)+row(f,false)).join('')}</div></section>`;
  const days=[...byDay],gone=days.filter(([,l])=>l.every(f=>sts.get(f.id).past)),next=days.filter(x=>!gone.includes(x));
  $('days').innerHTML=(gone.length?`<details class="pastdays"${pastOpen?' open':''}><summary>지난 상영 ${gone.reduce((n,[,l])=>n+l.length,0)}편</summary>${gone.map(block).join('')}</details>`:'')
   +next.map(block).join('')
   +(improve.length?`<h2 class="sub">자리 개선 중</h2>`+'<div class="list">'+improve.map(f=>row(f,true)).join('')+'</div>':'')
   +(wait.length?`<h2 class="sub">아직 표를 구하는 중<small>${wait.length}편</small></h2>`+'<div class="list">'+wait.map(f=>row(f,true)).join('')+'</div>':'');
  $('days').querySelector('.pastdays')?.addEventListener('toggle',e=>{pastOpen=e.target.open;});
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
   <div class="seats">${f.seats?`<span class="chip new"><b>우리 자리</b>${esc(seatText(f.seats))}</span>`:'<span class="chip">구하는 중</span>'}${f.seats&&state(f).note?`<span class="chip">${esc(state(f).note)}</span>`:''}</div>
   ${f.map?svg(f.map):''}</div>`;
 }
 async function load(){
  try{const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const text=await r.text();if(text===last)return;last=text;data=JSON.parse(text);render();
   $('updated').textContent='최근 확인 '+new Date().toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});}catch{}
 }
 $('days').addEventListener('click',e=>{const b=e.target.closest('.film');if(!b)return;openId=b.dataset.id;detail();$('detail').showModal();});
 $('close').onclick=()=>$('detail').close();$('detail').addEventListener('close',()=>{openId=null;});
 $('detail').addEventListener('click',e=>{if(e.target===$('detail'))$('detail').close();});
 load();setInterval(load,60000);setInterval(()=>{if(data.films.length)render();},60000);
})();
