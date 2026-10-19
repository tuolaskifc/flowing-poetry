/* Project-authored reusable ink ribbons and washes. Derived from the local
 * oriole study; no upstream brush library, image texture or random draw here.
 * Existing accepted studies retain their own renderer; new tools share this.
 */
window.PoemInkBrush=Object.freeze({
  create(ctx){
    const {p,alpha}=ctx;
    const point=(v,t)=>{const s=1-t;return {x:s*s*s*v[0]+3*s*s*t*v[2]+3*s*t*t*v[4]+t*t*t*v[6],y:s*s*s*v[1]+3*s*s*t*v[3]+3*s*t*t*v[5]+t*t*t*v[7]};};
    function stroke(v,width,color=ctx.palette.ink,opacity=150,salt=0,dry=false){
      const c=p.drawingContext,runs=[];let run=[];
      for(let i=0;i<=36;i++){
        const t=i/36,q=point(v,t),a=point(v,Math.max(0,t-.008)),b=point(v,Math.min(1,t+.008));
        const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1;
        if(dry&&(i+Math.floor(salt*3))%23===15){if(run.length>1)runs.push(run);run=[];continue;}
        const radius=width*(.08+.92*Math.pow(Math.sin(Math.PI*t),.7))*(.96+.03*Math.sin(i*.34+salt)+.02*Math.cos(i*.19+salt*1.7));
        run.push({x:q.x,y:q.y,nx:-dy/length*radius,ny:dx/length*radius});
      }
      if(run.length>1)runs.push(run);c.fillStyle=String(alpha(p,color,opacity));
      for(const points of runs){c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x+q.nx,q.y+q.ny):c.moveTo(q.x+q.nx,q.y+q.ny));for(const q of [...points].reverse())c.lineTo(q.x-q.nx,q.y-q.ny);c.closePath();c.fill();}
    }
    function wash(v,width,color,opacity=110,salt=0){stroke(v,width*1.2,color,opacity*.12,salt);stroke(v,width*1.08,color,opacity*.2,salt+.3);stroke(v,width,color,opacity*.62,salt+.6);}
    function fill(color,opacity,path){const c=p.drawingContext;c.beginPath();path(c);c.closePath();c.fillStyle=String(alpha(p,color,opacity));c.fill();}
    return Object.freeze({point,stroke,wash,fill});
  }
});
