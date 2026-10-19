/* Project-authored ink suggestion of 莺: blended body/head wash, a few wing
 * and tail strokes, no outlined anatomy or engraved feather/eye/foot detail.
 * Pigment and gesture are local artistic choices, not species identification.
 */
window.PoemDrawing.register({
  id:'oriole',name:'莺形',subtitle:'淡黄一点，墨翼几笔，留住掠过的姿态。',
  credit:'本项目试作 · 淡墨莺意与收展翼姿',sources:['project'],reference:'drawing/README.md#莺形',
  note:'以淡黄墨面和几笔深翼、尾喙提示单只莺意，不刻画眼、足或逐根羽毛。收翅／展翅可选，不自动添树枝、同伴或鸣声。',
  controls:[
    {id:'pose',label:'翼姿',default:'folded',choices:[{value:'folded',label:'收翅'},{value:'spread',label:'展翅'}]},
    {id:'facing',label:'朝向',default:'right',choices:[{value:'right',label:'向右'},{value:'left',label:'向左'}]},
    {id:'motion',label:'微动',default:'still',choices:[{value:'still',label:'静止'},{value:'flap',label:'展翅微动'}]}
  ],
  capabilities:['shape-selection','imagery-accent','local-motion','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={scale:p.random(.96,1.04),tail:p.random(.94,1.07),gesture:p.random(-.06,.06),phase:p.random(p.TWO_PI)};}
    const point=(v,t)=>{const s=1-t;return {x:s*s*s*v[0]+3*s*s*t*v[2]+3*s*t*t*v[4]+t*t*t*v[6],y:s*s*s*v[1]+3*s*s*t*v[3]+3*s*t*t*v[5]+t*t*t*v[7]};};
    function stroke(v,weight,color,opacity,salt=0,dry=false){
      const c=p.drawingContext,runs=[];let run=[];
      for(let i=0;i<=40;i++){
        const t=i/40,q=point(v,t),a=point(v,Math.max(0,t-.008)),b=point(v,Math.min(1,t+.008));
        const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
        if(dry&&(i+Math.floor(salt*3))%23===15){if(run.length>1)runs.push(run);run=[];continue;}
        const w=weight*(.08+.92*Math.pow(Math.sin(Math.PI*t),.7))*(.96+.03*Math.sin(i*.34+salt)+.02*Math.cos(i*.19+salt*1.7));
        run.push({x:q.x,y:q.y,nx:-dy/l*w,ny:dx/l*w});
      }
      if(run.length>1)runs.push(run);c.fillStyle=String(alpha(p,color,opacity));
      for(const points of runs){c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x+q.nx,q.y+q.ny):c.moveTo(q.x+q.nx,q.y+q.ny));for(const q of [...points].reverse())c.lineTo(q.x-q.nx,q.y-q.ny);c.closePath();c.fill();}
    }
    function wash(v,width,color,opacity,salt){
      stroke(v,width*1.24,color,opacity*.12,salt);
      stroke(v,width*1.1,color,opacity*.2,salt+.3);
      stroke(v,width,color,opacity*.62,salt+.6);
    }
    function wing(flap,far=false){
      p.push();p.rotate(flap);
      if(far)wash([2,-8,15,-38,40,-65,65,-56],5.8,ctx.palette.ink,80,state.phase);
      else{
        wash([-5,-4,-34,-20,-53,-73,-88,-62],10.2,ctx.palette.ink,153,state.phase+1);
        stroke([-12,-9,-40,-32,-58,-67,-91,-63],1.05,ctx.palette.ink,105,state.phase+2,true);
      }
      p.pop();
    }
    function draw(){
      p.push();p.translate(W/2,200);p.scale(ctx.options.facing==='left'?-state.scale:state.scale,state.scale);p.rotate(state.gesture);
      const gold=ctx.settings.palette==='tender'?'#C4AB83':'#BDAE6B',ink=ctx.palette.ink;
      const moving=ctx.options.pose==='spread'&&ctx.options.motion==='flap',flap=moving?Math.sin(ctx.time*4+state.phase)*.2:0;
      // Tail tapers into paper rather than ending in two outlined rectangles.
      stroke([-24,9,-43,21,-64*state.tail,32,-83*state.tail,41],3.2,ink,140,state.phase,true);
      stroke([-24,16,-45,27,-62*state.tail,39,-75*state.tail,44],1.25,ink,96,state.phase+1,true);
      if(ctx.options.pose==='spread')wing(-flap*.6,true);
      // Head is implied by the rising end of the same wash, without a circle.
      wash([-35,12,-16,-17,11,-24,33,-15],19,gold,119,state.phase);
      wash([-22,14,1,27,25,10,33,-13],10,gold,55,state.phase+1);
      wash([16,-14,27,-34,43,-36,45,-20],9,gold,112,state.phase+2);
      if(ctx.options.pose==='spread')wing(flap);
      else{
        wash([4,-12,-8,-20,-27,-7,-34,7],7.5,ink,146,state.phase+2);
        stroke([1,-12,-11,-12,-24,-1,-32,9],1.3,ink,118,state.phase+3,true);
        if(ctx.settings.density>.65)stroke([-2,-13,-13,-10,-23,0,-31,6],.65,ink,58,state.phase+4,true);
      }
      stroke([43,-23,49,-24,54,-25,61,-25],1.1,ink,163,state.phase+3);
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'center',x:W/2,y:200},{id:'lower',x:W/2,y:230}],inspect:()=>({birdCount:1,perchCount:0,pose:ctx.options.pose,facing:ctx.options.facing,flapping:ctx.options.pose==='spread'&&ctx.options.motion==='flap',style:'suggested-ink',eyeDetailCount:0,footDetailCount:0,featherDetailCount:0,finite:Object.values(state).every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
