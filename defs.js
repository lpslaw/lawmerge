/* =====================================================================
   LawMerge v6 — scene boards.
   Every board is a place: the care home, the ward, the court.
   Answer -> credits -> buy -> drag two identical together -> find all 7.
   ===================================================================== */
const ITEMS=window.ART||{};
const IMG=(k,cls)=>`<img class="pic ${cls||''}" src="${ITEMS[k]}" alt="" draggable="false"
  onerror="this.remove();this.closest('.it')&&this.closest('.it').classList.add('noart')">`;
const TIER=['#C2BEB2','#A49F8F','#8A8578','#7E7A6E','#A89673','#8A7A5C','#6B5D42'];
const BOARDS=[
 {name:'The care home',short:'The care home',chain:'The paper trail',scene:'carehome',
  cols:4,rows:4,base:5,level:1,topic:'Mental Capacity Act and DoLS',
  items:[{ic:'c1',n:'Handover note'},{ic:'c2',n:'Care plan entry'},{ic:'c3',n:'Capacity assessment'},
   {ic:'c4',n:'Best interests'},{ic:'c5',n:'Urgent authorisation'},{ic:'c6',n:'Standard authorisation'},
   {ic:'c7',n:'Court of Protection order'}]},
 {name:'The ward',short:'The ward',chain:'From concern to discharge',scene:'ward',
  cols:4,rows:4,base:6,level:2,topic:'Mental Health Act',
  items:[{ic:'w1',n:'Concern raised'},{ic:'w2',n:'s.136 suite'},{ic:'w3',n:'AMHP assessment'},
   {ic:'w4',n:'s.2 admission'},{ic:'w5',n:'s.3 admission'},{ic:'w6',n:'Tribunal hearing'},{ic:'w7',n:'Discharge'}]},
 {name:'The court',short:'The court',chain:'Up to the Court of Appeal',scene:'court',
  cols:4,rows:4,base:7,level:3,topic:'Court of Protection',
  items:[{ic:'t1',n:'Letter of concern'},{ic:'t2',n:'COP1 application'},{ic:'t3',n:'COP3 evidence'},
   {ic:'t5',n:'s.21A challenge'},{ic:'t4',n:'Directions order'},{ic:'t6',n:'Final order'},
   {ic:'t7',n:'Court of Appeal judgment'}]},
];
const ICO={
 coin:'<svg width="24" height="22" viewBox="0 0 24 22" fill="none" stroke="currentColor" stroke-width="1.9"><ellipse cx="12" cy="6" rx="8" ry="3.3"/><path d="M4 6v5c0 1.8 3.6 3.3 8 3.3s8-1.5 8-3.3V6"/><path d="M4 11v5c0 1.8 3.6 3.3 8 3.3s8-1.5 8-3.3v-5"/></svg>',
 cup:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10v5a5 5 0 0 1-10 0V3z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/><path d="M12 13v4M8.5 21h7l-1-4h-5l-1 4z"/></svg>'};
const REWARDS=[{at:2,ic:'×2',tx:'buy item 2'},{at:3,ic:'×4',tx:'buy item 3'},
               {at:5,ic:ICO.coin,tx:'+60 credits'},{at:7,ic:ICO.cup,tx:'board won'}];
const MULT=[{m:1,tier:0,mul:1},{m:2,tier:1,mul:1.8},{m:4,tier:2,mul:3.4}];
/* ============================ QUESTIONS ============================
   Currency check: 26 July 2026. AGNI [2026] UKSC 16 applied throughout - see README.
   Correct answer is always index 0; options are shuffled at runtime.
   KEY CHANGE: Cheshire West and the "acid test" were set aside by
   AGNI [2026] UKSC 16 with effect from 2 June 2026. No grace period.
   ================================================================= */
