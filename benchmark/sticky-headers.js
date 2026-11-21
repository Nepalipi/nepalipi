// Keep the original semantic headers visible while the document scrolls.
// A horizontal overflow region traps CSS sticky positioning on the vertical axis,
// so translate each header inside its own full-height table instead.
const tables=[...document.querySelectorAll('.source-table,.word-grid')].map(table=>({
  table,head:table.tHead,offset:0
}));
let frame=0;
function update(){
  frame=0;
  const positions=tables.map(item=>{
    const bounds=item.head.getBoundingClientRect();
    const originalTop=bounds.top-item.offset;
    const maximum=Math.max(0,item.table.getBoundingClientRect().bottom-originalTop-bounds.height);
    return {...item,height:bounds.height,offset:Math.max(0,Math.min(-originalTop,maximum))};
  });
  positions.forEach(({head,height,offset},i)=>{
    tables[i].offset=offset;
    head.style.setProperty('--header-offset',offset+'px');
    tables[i].table.style.setProperty('--header-height',height+'px');
  });
}
function schedule(){if(!frame)frame=requestAnimationFrame(update);}
const sizes=new ResizeObserver(schedule);
const content=new MutationObserver(schedule);
for(const {table,head} of tables){
  sizes.observe(table);sizes.observe(head);
  content.observe(table,{childList:true,subtree:true});
}
window.addEventListener('scroll',schedule,{passive:true});
window.addEventListener('resize',schedule);
// Keyboard focus must remain below the header, including expanded alternatives.
document.addEventListener('focusin',event=>{
  const item=tables.find(({table})=>table.tBodies[0]?.contains(event.target));
  if(!item||!item.offset)return;
  const top=event.target.getBoundingClientRect().top;
  const edge=item.head.getBoundingClientRect().bottom+8;
  if(top<edge)window.scrollBy(0,top-edge);
});
schedule();
