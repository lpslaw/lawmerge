/* ============================ STATE ============================ */
let S;
const $=id=>document.getElementById(id);
const CUR=()=>BOARDS[S.bi];
const free=()=>S.grid.findIndex(c=>c===null);
const sMult=()=>S.streak>=6?3:S.streak>=3?2:1;
/* what the NEXT right answer pays — sMult() reads the streak before it increments */
const nextMult=()=>{const s=S.streak+1;return s>=6?3:s>=3?2:1};
function newBoard(bi){
  const B=BOARDS[bi];
  return {bi,grid:new Array(B.cols*B.rows).fill(null),credits:20,streak:0,best:0,
          found:new Set([0]),mult:0,maxMult:0,stack:[],asked:[],claimed:new Set(),
          coach:0,merges:0,answers:0,right:0,won:false};
}
function applyTheme(){$('scene').className='bg-'+CUR().scene}
/* ============================ RENDER ============================ */
/* a longer message wraps to a second line and grows the page, so the one element the
   player must be able to read can slide back under the dock. Re-fit on every update —
   fit() is a no-op when there is nothing to clear, and never runs mid-drag. */
function say(m,cls){const t=$('ticker');t.className='ticker '+(cls||'');t.innerHTML=m;if(!drag)fit()}
const COACH=[
 'Tap <b>Answer</b> to earn your first credits.',
 'Now tap the <b>Buy</b> button to buy your first item.',
 'Buy <b>one more</b> — you need two the same to merge.',
 'Now <b>drag one item on top of the other</b>.',
];
function coach(){
  if(S.coach>=COACH.length) return;
  say(COACH[S.coach],'coach');
  $('answerBtn').classList.toggle('coachring',S.coach===0);
  $('buyBtn').classList.toggle('coachring',S.coach===1||S.coach===2);
}
function coachDone(){S.coach=COACH.length;
  $('answerBtn').classList.remove('coachring');$('buyBtn').classList.remove('coachring')}
function render(){
  const B=CUR();
  $('bdName').textContent=B.short;
  $('chainName').textContent=B.chain;
  $('chainCount').textContent=`${S.found.size} / ${B.items.length}`;
  $('rewards').innerHTML=REWARDS.map(r=>
    `<div class="rw glass${S.found.size>=r.at?' on':''}"><div class="ic">${r.ic}</div><div class="tx">${r.tx}</div></div>`).join('');
  $('rail').innerHTML=B.items.map((it,k)=>
    (k?'<span class="arw"></span>':'')+
    `<button class="sl${S.found.has(k)?' got':''}" id="sl${k}" onclick="info(${k})"
      aria-label="${S.found.has(k)?it.n:'Item '+(k+1)+', not found yet'}">${S.found.has(k)?IMG(it.ic,'railpic'):'?'}</button>`).join('');
  const bd=$('board');
  /* the grid is rebuilt wholesale, so remember which square had focus and give it back —
     otherwise every keyboard merge drops the user back to the top of the page */
  const af=document.activeElement;
  const keep=af&&af.classList&&af.classList.contains('it')?+af.dataset.i:null;
  bd.style.gridTemplateColumns=`repeat(${B.cols},1fr)`;
  bd.innerHTML='';
  S.grid.forEach((k,i)=>{
    const c=document.createElement('div');
    c.className='cell'; c.dataset.i=i;
    if(k!==null){
      const d=B.items[k], top=k===B.items.length-1;
      const n=document.createElement('button');
      n.type='button';
      n.className='it'+(top?' max':'')+(sel===i?' sel':'');
      n.setAttribute('aria-label',`${d.n}, level ${k+1}, square ${i+1}`);
      n.style.setProperty('--tier',TIER[k]||TIER[TIER.length-1]);
      n.innerHTML=`<span class="lv">${k+1}</span>${IMG(d.ic)}<span class="nm">${d.n}</span>`;
      n.dataset.i=i;
      c.appendChild(n);
    }
    bd.appendChild(c);
  });
  if(keep!==null){const n=bd.querySelector(`.it[data-i="${keep}"]`)||bd.querySelector('.it');if(n)n.focus()}
  $('cNum').textContent=S.credits;
  $('cFill').style.width=Math.min(100,S.credits/120*100)+'%';
  $('credLab').textContent=S.streak>=3?`Credits · streak ${S.streak}`:'Credits';
  $('earnLab').textContent='+'+(10*nextMult())+' credits';
  const cfg=MULT[S.mult], made=B.items[cfg.tier], cost=Math.round(B.base*cfg.mul);
  $('bIc').innerHTML=IMG(made.ic); $('bNm').textContent=made.n;
  $('bSub').textContent=`item ${cfg.tier+1} of ${B.items.length}`;
  $('bCost').textContent=cost+' credits';
  $('buyBtn').disabled=S.credits<cost;
  $('multBtn').textContent='×'+cfg.m;
  $('multBtn').disabled=S.maxMult===0;
  $('stackBtn').classList.toggle('hidden',!S.stack.length);
  $('stackN').textContent=S.stack.length;
  save();
}
/* ============================ EFFECTS ============================ */
function popAt(i){const c=$('board').querySelector(`.cell[data-i="${i}"]`),n=c&&c.firstChild;if(n&&n.classList)n.classList.add('pop')}
function nudgeAt(i){const c=$('board').querySelector(`.cell[data-i="${i}"]`),n=c&&c.firstChild;
  if(n&&n.classList){n.classList.remove('nudge');void n.offsetWidth;n.classList.add('nudge')}}
function sparkle(i,count){
  if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  const c=$('board').querySelector(`.cell[data-i="${i}"]`); if(!c) return;
  const r=c.getBoundingClientRect(), cx=r.x+r.width/2, cy=r.y+r.height/2;
  for(let k=0;k<(count||9);k++){
    const s=document.createElement('div'); s.className='spark';
    s.style.left=cx+'px'; s.style.top=cy+'px';
    document.body.appendChild(s);
    const ang=Math.random()*Math.PI*2, dist=28+Math.random()*44;
    s.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},
      {transform:`translate(${Math.cos(ang)*dist-4}px,${Math.sin(ang)*dist-4}px) scale(0)`,opacity:0}],
      {duration:540+Math.random()*300,easing:'cubic-bezier(.2,.7,.4,1)'}).onfinish=()=>s.remove();
  }
}
/* ============================ ACTIONS ============================ */
function buy(){
  const B=CUR(),cfg=MULT[S.mult],cost=Math.round(B.base*cfg.mul);
  if(S.credits<cost){
    const p=$('purse');p.classList.remove('flash');void p.offsetWidth;p.classList.add('flash');
    say(`Not enough — <b>${cost} credits</b> needed. Tap Answer.`,'err'); return;
  }
  const f=free();
  if(f<0&&S.stack.length>=8){say('Board and stack are both full — merge something.','err');return}
  S.credits-=cost;
  if(f>=0){S.grid[f]=cfg.tier;render();popAt(f)}
  else{S.stack.push(cfg.tier);render();say('Board full — it went to the stack.')}
  if(S.coach===1){S.coach=2;coach();return}
  if(S.coach===2){S.coach=3;coach();return}
  if(S.coach>=COACH.length) say(`<b>${B.items[cfg.tier].n}</b> added to the board.`);
}
function cycleMult(){S.mult=(S.mult+1)%(S.maxMult+1);render()}
function drainStack(){while(S.stack.length){const f=free();if(f<0)break;S.grid[f]=S.stack.shift()}}
function tryMerge(a,b){
  const B=CUR(),A=S.grid[a],Bb=S.grid[b];
  if(A===null||Bb===null) return;
  if(A!==Bb){nudgeAt(b);say('Those are different. <b>Two of the same item</b> merge.','err');return}
  if(A===B.items.length-1){nudgeAt(b);say('Top of the chain — nothing merges above it.','err');return}
  S.grid[a]=null;S.grid[b]=A+1;S.merges++;
  const nk=A+1,isNew=!S.found.has(nk);
  S.found.add(nk);
  if(S.coach<COACH.length) coachDone();
  if(isNew){
    say(`<b>${B.items[nk].n}</b> — ${nk<B.items.length-1?`two of these make ${B.items[nk+1].n}.`:'the top of the chain.'}`,'ok');
    checkRewards();
  } else say(`<b>${B.items[nk].n}</b>`,'ok');
  drainStack();render();popAt(b);sparkle(b,isNew?18:8);
  if(isNew){const sl=$('sl'+nk);if(sl)sl.classList.add('flash')}
}
function checkRewards(){
  const n=S.found.size;
  REWARDS.forEach(r=>{
    if(n>=r.at&&!S.claimed.has(r.at)){
      S.claimed.add(r.at);
      if(r.at===2){S.maxMult=1;S.mult=1;say('Milestone — the Buy button now buys <b>item 2</b>.','ok')}
      if(r.at===3){S.maxMult=2;S.mult=2;say('Milestone — the Buy button now buys <b>item 3</b>.','ok')}
      if(r.at===5){S.credits+=60;say('Milestone — <b>+60 credits</b>.','ok')}
      if(r.at===7){S.won=true;const bi=S.bi;S.winTimer=setTimeout(()=>{if(S.bi===bi&&S.won)win()},700)}
    }
  });
}
/* ============================ DRAG ============================ */
let drag=null;
$('board').addEventListener('pointerdown',e=>{
  const n=e.target.closest('.it'); if(!n) return;
  if(drag) return;
  e.preventDefault();
  drag={i:+n.dataset.i,node:n,x0:e.clientX,y0:e.clientY,moved:false,ghost:null};
  n.setPointerCapture&&n.setPointerCapture(e.pointerId);
});
window.addEventListener('pointermove',e=>{
  if(!drag) return;
  if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<7) return;
  if(!drag.moved){
    drag.moved=true;drag.node.classList.add('drag');
    const k=S.grid[drag.i],d=CUR().items[k];
    const g=document.createElement('div');g.id='ghost';
    g.style.setProperty('--tier',TIER[k]||TIER[TIER.length-1]);
    g.innerHTML=`${IMG(d.ic)}<span class="nm">${d.n}</span>`;
    document.body.appendChild(g);drag.ghost=g;
  }
  drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
  document.querySelectorAll('.cell.hot,.cell.okdrop').forEach(c=>c.classList.remove('hot','okdrop'));
  const cell=hit(e.clientX,e.clientY);
  if(cell){
    const j=+cell.dataset.i;
    if(j!==drag.i){
      if(S.grid[j]===S.grid[drag.i]) cell.classList.add('hot');
      else if(S.grid[j]===null) cell.classList.add('okdrop');
    }
  }
},{passive:false});
/* select-then-place. One state variable and one helper, reusing tryMerge(); this is
   the only route to a merge for keyboard and switch users, who cannot drag. */
let sel=null;
function focusItem(i){const n=$('board').querySelector(`.it[data-i="${i}"]`);if(n)n.focus()}
function tapItem(i){
  if(S.grid[i]===null){if(sel!==null){const a=sel;sel=null;S.grid[i]=S.grid[a];S.grid[a]=null;render();popAt(i);focusItem(i)}return}
  if(sel===null){sel=i;render();return}
  if(sel===i){sel=null;render();info(S.grid[i]);return}
  const a=sel;sel=null;tryMerge(a,i);
}
$('board').addEventListener('keydown',e=>{
  const n=e.target.closest&&e.target.closest('.it');
  if(!n||(e.key!=='Enter'&&e.key!==' ')) return;
  e.preventDefault();          /* also stops the button firing a synthetic click */
  tapItem(+n.dataset.i);
});
function endDrag(e){
  if(!drag) return;
  const d=drag;drag=null;
  document.querySelectorAll('.cell.hot,.cell.okdrop').forEach(c=>c.classList.remove('hot','okdrop'));
  if(d.ghost) d.ghost.remove();
  d.node.classList.remove('drag');
  if(e.type==='pointercancel'){render();return}
  if(!d.moved){tapItem(d.i);return}
  sel=null;
  const cell=hit(e.clientX,e.clientY);
  if(!cell){render();return}
  const j=+cell.dataset.i;
  if(j===d.i){render();return}
  if(S.grid[j]!==null) tryMerge(d.i,j);
  else{S.grid[j]=S.grid[d.i];S.grid[d.i]=null;render()}
}
window.addEventListener('pointerup',endDrag);
window.addEventListener('pointercancel',endDrag);
function hit(x,y){
  const el=document.elementFromPoint(x,y),c=el?el.closest('.cell'):null;
  if(c) return c;
  /* on a short viewport the fixed dock can sit over the bottom row, and elementFromPoint
     then returns a dock button instead of the cell under the finger. Fall back to the
     board's own geometry so the drop still lands where the user aimed. */
  for(const cc of $('board').querySelectorAll('.cell')){
    const r=cc.getBoundingClientRect();
    if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom) return cc;
  }
  return null;
}
/* A 4x4 board, the chrome above it and a fixed dock do not all fit in 568 or 640 CSS
   pixels. The page has always scrolled far enough to clear them, but it opened at the
   top, so the bottom row of the board, the ticker and both tabs began underneath the
   dock — a drag on the bottom row hit the dock instead of the cell, and the ticker (the
   only feedback channel) was never seen. Scroll just enough to lift them clear. */
function fit(){
  const bd=$('board'),tk=$('ticker'),dk=$('dock');
  if(!bd||!tk||!dk) return;
  const need=Math.max(bd.getBoundingClientRect().bottom,tk.getBoundingClientRect().bottom)
             -dk.getBoundingClientRect().top;
  if(need>0) window.scrollBy(0,Math.ceil(need)+6);   /* scrollBy clamps to the document */
}
let fitT=null;
window.addEventListener('resize',()=>{clearTimeout(fitT);fitT=setTimeout(fit,180)});
window.addEventListener('orientationchange',()=>{clearTimeout(fitT);fitT=setTimeout(fit,320)});
/* ============================ SHEETS ============================ */
let lastFocus=null;
function openSheet(h){
  const v=$('veil'),sh=$('sheet');
  /* only capture the return target when the veil was actually closed, so a sheet
     replacing a sheet does not overwrite it with the sheet itself */
  if(v.classList.contains('hide')) lastFocus=document.activeElement;
  sh.innerHTML=h;
  const h2=sh.querySelector('h2');
  if(h2){h2.id='sheetTitle';v.setAttribute('aria-labelledby','sheetTitle')}
  else v.removeAttribute('aria-labelledby');
  v.classList.remove('hide');
  /* inert takes the whole background out of the tab order in one attribute —
     no focus-trap loop to write, and the dock is a sibling of #app so it needs it too */
  $('app').setAttribute('inert','');$('dock').setAttribute('inert','');
  sel=null;sh.scrollTop=0;sh.focus();
}
function closeSheet(){
  $('veil').classList.add('hide');fit();
  $('app').removeAttribute('inert');$('dock').removeAttribute('inert');
  const f=lastFocus;lastFocus=null;
  if(f&&f!==document.body&&document.contains(f)){try{f.focus()}catch(e){}}
}
/* Escape and a tap on the veil both dismiss. Safe on the quiz: answer() banks the
   credits before #cont is ever pressed, so on an answered question we press Continue
   for real and otherwise a dismissal only skips a ticker line. */
function dismissSheet(){
  const fb=$('sheet').querySelector('#fb');
  if(fb&&fb.style.display==='block'&&$('cont')){$('cont').click();return}
  closeSheet();
}
$('veil').addEventListener('click',e=>{if(e.target===$('veil'))dismissSheet()});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('veil').classList.contains('hide')){e.preventDefault();dismissSheet()}
});
function info(k){
  const B=CUR();
  if(!S.found.has(k)){
    openSheet(`<p class="kick"><span>Not found yet</span><span>item ${k+1} of ${B.items.length}</span></p>
     <div class="bigic" style="opacity:.28;filter:grayscale(1)">${IMG(B.items[k].ic)}</div><h2 style="text-align:center">Merge two of item ${k} to uncover it.</h2>
     <button class="ghostb" onclick="closeSheet()">Back to the board</button>`);return;
  }
  const d=B.items[k],top=k===B.items.length-1;
  openSheet(`<p class="kick"><span>Item ${k+1} of ${B.items.length}</span><span>${top?'Max level':''}</span></p>
   <div class="bigic">${IMG(d.ic)}</div><h2 style="text-align:center;margin-bottom:10px">${d.n}</h2>
   <div class="why" style="text-align:center">${top?'This is at <b>max level</b> — nothing merges above it.'
     :`Drag two of these together to make<br><b>${B.items[k+1].n}</b>.`}</div>
   <button class="ghostb" onclick="closeSheet()">Back to the board</button>`);
}
function openStack(){
  const B=CUR();
  openSheet(`<p class="kick"><span>The stack</span><span>${S.stack.length} of 8</span></p>
   <h2>Waiting for board space</h2>
   <div class="stacklist">${S.stack.map((k,n)=>
     `<button onclick="pull(${n})" style="--tier:${TIER[k]}">${IMG(B.items[k].ic)}<small>${B.items[k].n}</small></button>`).join('')}</div>
   <button class="ghostb" onclick="closeSheet()">Back to the board</button>`);
}
function pull(n){
  const f=free();
  if(f<0){say('No space on the board yet.','err');closeSheet();return}
  S.grid[f]=S.stack.splice(n,1)[0];render();popAt(f);closeSheet();
}
function showChain(){
  const B=CUR();
  openSheet(`<p class="kick"><span>${B.chain}</span><span>${S.found.size} of ${B.items.length}</span></p>
   <div class="scenecard bg-${B.scene}"></div>
   <h2>${B.name} — ${B.topic}</h2>
   <div class="chainlist">${B.items.map((it,k)=>S.found.has(k)
     ?`<div>${k+1}. <b>${it.n}</b></div>`:`<div class="q">${k+1}. — — —</div>`).join('')}</div>
   <button class="ghostb" onclick="closeSheet()">Back to the board</button>`);
}
function menu(){
  openSheet(`<p class="kick"><span>LawMerge</span><span>Three scenes</span></p>
   <h2>Four things, and that is all</h2>
   <div class="why" style="line-height:1.8;margin-bottom:16px">
   <b>1. Answer</b> — each right answer earns 10 credits. Three in a row doubles it, six trebles it.<br>
   <b>2. Buy</b> — the silver Buy button puts one item on the board, and says what it is and what it costs.<br>
   <b>3. Drag</b> — pull one item on top of an identical one to level it up.<br>
   <b>4. Find all seven</b> — and the scene is complete.
   <cite>×2 and ×4 unlock later and buy a higher item outright. The stack catches anything bought when the board is full.</cite>
   </div>
   <h2 style="font-size:15px">Change scene</h2>
   ${BOARDS.map((b,i)=>`<button class="opt" onclick="go(${i})" style="padding:0;overflow:hidden">
     <div class="scenecard bg-${b.scene}" style="height:76px;border-radius:12px 12px 0 0;margin:0;box-shadow:none"></div>
     <div style="padding:11px 13px 12px"><b class="ttl" style="font-size:16px;color:#2A2620">${b.name}</b><br>
     <span style="font-size:12px;color:#6E6656">${b.topic} · ${b.chain}</span></div></button>`).join('')}
   <button class="ghostb" onclick="startOver()">Start again from the beginning</button>
   <button class="ghostb" onclick="closeSheet()">Back to the board</button>`);
}
/* ============================ QUIZ ============================ */
function quiz(){
  const B=CUR();
  let pool=Q.filter(q=>q.lv===B.level&&!S.asked.includes(q.q));
  if(!pool.length){S.asked=[];pool=Q.filter(q=>q.lv===B.level)}
  const q=pool[Math.floor(Math.random()*pool.length)];
  S.asked.push(q.q);
  const order=shuffle(q.a.map((t,k)=>({t,k})));
  openSheet(`<p class="kick"><span>${B.short} · earn credits</span><span>+${10*nextMult()}</span></p>
   <h2>${q.q}</h2><div id="opts">${order.map(o=>`<button class="opt" data-k="${o.k}" onclick="answer(this)">${o.t}</button>`).join('')}</div>
   <div id="fb" style="display:none"><div class="why" id="fbwhy" tabindex="-1" role="status">${q.w}<cite>${q.c}</cite></div>
   <button class="go" id="cont">Continue</button></div>`);
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function answer(el){
  const right=el.dataset.k==='0';
  /* right / wrong is otherwise carried only by a class and a CSS ::before glyph */
  document.querySelectorAll('#opts .opt').forEach(b=>{b.disabled=true;b.onclick=null;
    if(b.dataset.k==='0'){b.classList.add('right');b.setAttribute('aria-label',b.textContent+' — correct answer')}});
  if(!right){el.classList.add('wrong');el.setAttribute('aria-label',el.textContent+' — your answer, incorrect')}
  S.answers++;
  if(right){S.streak++;S.right++;S.best=Math.max(S.best,S.streak)}
  const gain=right?10*sMult():0;
  if(!right) S.streak=0;
  S.credits+=gain;
  $('fb').style.display='block';
  $('cont').textContent='Continue';
  /* Revealing the explanation pushed Continue off the bottom on the longer questions.
     scrollIntoView is no good here: it will happily satisfy the request by scrolling the
     document instead, and the sheet sits in a position:fixed veil that does not move.
     #cont is the last thing in the sheet, so scrolling the sheet itself is exact. */
  const sh=$('sheet');
  if(sh.scrollHeight>sh.clientHeight) sh.scrollTop=sh.scrollHeight;
  $('fbwhy').focus({preventScroll:true});
  const vd=document.querySelector('#sheet .kick span:last-child');
  if(vd) vd.textContent=right?`Correct · +${gain}`:'No credits';
  $('cont').onclick=()=>{
    closeSheet();render();
    if(S.coach===0&&right){S.coach=1;coach();return}
    if(S.coach<COACH.length){coach();return}
    say(right?`<b>+${gain} credits</b>${S.streak>=3?` · streak ${S.streak}, earning ×${sMult()}`:''}`
             :'No credits this time — the streak resets.',right?'ok':'err');
  };
  render();
}
/* ============================ WIN / BOOT ============================ */
function win(){
  const B=CUR(),n=BOARDS[S.bi+1],top=B.items[B.items.length-1];
  const acc=S.answers?Math.round(S.right/S.answers*100):0;
  openSheet(`<p class="kick"><span>Scene complete</span><span>${B.short}</span></p>
   <div class="bigic">${IMG(top.ic)}</div><h2 style="text-align:center;margin-bottom:4px">${top.n}</h2>
   <p style="text-align:center;margin:0;font-size:13px;color:#6E6656">The full chain, found.</p>
   <div class="stat"><div><b>${S.answers}</b><span>questions</span></div><div><b>${acc}%</b><span>right</span></div>
   <div><b>${S.best}</b><span>best streak</span></div><div><b>${S.merges}</b><span>merges</span></div></div>
   ${n?`<div class="scenecard bg-${n.scene}" style="margin-top:14px"></div>
        <div class="why" style="margin-top:0">Next: <b>${n.name}</b> — ${n.topic}.</div>
        <button class="go" onclick="go(${S.bi+1})">Go to ${n.short}</button>`
      :`<div class="why" style="margin-top:14px">That is every scene in the prototype.</div>`}
   <button class="ghostb" onclick="go(${S.bi})">Play this scene again</button>`);
  sparkle(Math.floor(S.grid.length/2),34);
}
function go(i){clearTimeout(S&&S.winTimer);sel=null;S=newBoard(i);applyTheme();closeSheet();render();coach();fit()}
/* ---- save / resume ---- */
const SAVEKEY='lawmerge.v2';
function save(){try{localStorage.setItem(SAVEKEY,JSON.stringify(
  /* winTimer is a live setTimeout handle: saved and replayed it would clearTimeout an
     unrelated timer that happened to inherit the id in the fresh page */
  Object.assign({},S,{found:[...S.found],claimed:[...S.claimed],winTimer:undefined})))}catch(e){}}
function load(){try{
  const r=JSON.parse(localStorage.getItem(SAVEKEY));
  if(!r||typeof r.bi!=='number'||!BOARDS[r.bi]||!Array.isArray(r.grid)) return null;
  if(r.grid.length!==BOARDS[r.bi].cols*BOARDS[r.bi].rows) return null;
  r.found=new Set(r.found); r.claimed=new Set(r.claimed||[]); delete r.winTimer;
  r.stack=Array.isArray(r.stack)?r.stack:[];
  r.asked=Array.isArray(r.asked)?r.asked:[];
  r.mult=Number.isInteger(r.mult)?Math.min(Math.max(r.mult,0),MULT.length-1):0;
  r.maxMult=Number.isInteger(r.maxMult)?Math.min(Math.max(r.maxMult,0),MULT.length-1):0;
  r.grid=r.grid.map(v=>Number.isInteger(v)&&v>=0&&v<BOARDS[r.bi].items.length?v:null);
  return r;
}catch(e){return null}}
function wipe(){try{localStorage.removeItem(SAVEKEY)}catch(e){}}
function startOver(){wipe();go(0)}
try{
const SAVED=load();
if(SAVED&&(SAVED.found.size>1||SAVED.answers>0)){
  S=SAVED;applyTheme();render();coachDone();
  const B=CUR();
  /* a won board resumed onto the resume card was a soft dead end — show the win sheet,
     which is the only screen carrying the next scene and a replay */
  if(S.won&&S.found.size>=B.items.length){win();}else{
  openSheet(`<p class="kick"><span>Welcome back</span><span>${B.short}</span></p>
   <div class="scenecard bg-${B.scene}"></div>
   <h2 style="text-align:center">You were in ${B.name.toLowerCase()}</h2>
   <div class="why" style="text-align:center">${S.found.size} of ${B.items.length} items found ·
   ${S.credits} credits · ${S.answers} question${S.answers===1?'':'s'} answered</div>
   <button class="go" onclick="closeSheet();say('Picking up where you left off.')">Carry on</button>
   <button class="ghostb" onclick="startOver()">Start again from the beginning</button>`);}
}else{
  S=newBoard(0);applyTheme();render();
  openSheet(`<p class="kick"><span>LawMerge</span><span>Three scenes</span></p>
   <div class="scenecard bg-carehome" style="height:120px"></div>
   <h2 style="text-align:center">Answer questions to earn credits. Buy items. Drag two of the same together to level them up.</h2>
   <div class="why" style="text-align:center;margin-bottom:6px">
   Find all <b>seven</b> items in the chain and the board is won.<br>
   Each scene is a place, and its questions belong to it — the care home is the Mental Capacity Act,
   the ward is the Mental Health Act, the court is the Court of Protection.</div>
   <button class="go" onclick="go(0)">Start in the care home</button>
   <button class="ghostb" onclick="menu()">Pick a scene</button>`);
}
}catch(e){wipe();S=newBoard(0);applyTheme();render()}
requestAnimationFrame(()=>requestAnimationFrame(fit));
window.addEventListener('load',()=>setTimeout(fit,60));
