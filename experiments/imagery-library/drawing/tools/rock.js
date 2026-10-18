/* Adapted from Mount.rock, Lingdong Huang / Shan, Shui (MIT), original line 2433.
 * Elliptic radial profile, flattened base and nested contours are retained.
 * Periodic p5 noise, seeded geometry and Canvas rendering replace SVG helpers.
 */
window.PoemDrawing.register({
  id:'rock',name:'石',subtitle:'有棱有皴，安静地落在地面上。',
  credit:'轮廓改编 Lingdong Huang / Shan, Shui · MIT',sources:['shan-rock','project'],reference:'drawing/README.md#石与亭',
  note:'固定一块石；可选横卧或立石，疏密调整皴线。石体不随风摆动，尚未实现山脉或石上附着。',
  controls:[{id:'profile',label:'石形',default:'low',choices:[{value:'low',label:'横卧'},{value:'tall',label:'立石'}]}],
  capabilities:['static','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){
      const phase=p.random(20,500);
      state={width:p.random(140,165),height:p.random(92,115),rings:Array.from({length:9},(_,i)=>Array.from({length:97},(_,j)=>{
        const a=j/96*Math.PI*2-Math.PI/2;
        // Circular noise coordinates close the seam without loopNoise mutation.
        const rough=.74+.26*p.noise(Math.cos(a)*1.4+phase,Math.sin(a)*1.4+phase,i*.17);
        return {a,rough,scale:1-i/12};
      }))};
    }
    function points(ring){
      const tall=ctx.options.profile==='tall',w=state.width*(tall?.65:1),h=state.height*(tall?1.65:1);
      return ring.map(q=>{
        const r=w*h/Math.hypot(h*Math.cos(q.a),w*Math.sin(q.a))*q.rough*q.scale;
        const x=Math.cos(q.a)*r,y=-Math.sin(q.a)*r;
        return {x:W/2+x,y:245+(y<0?y:y*.2)+(1-q.scale)*h*.2};
      });
    }
    function path(points,close=false){p.beginShape();for(const q of points)p.vertex(q.x,q.y);p.endShape(close?p.CLOSE:undefined);}
    function draw(){
      p.fill(alpha(p,ctx.palette.main,65));p.stroke(alpha(p,ctx.palette.ink,170));p.strokeWeight(1.1);path(points(state.rings[0]),true);
      p.noFill();const count=2+Math.round(ctx.settings.density*6);
      for(let i=1;i<=count;i++){
        p.stroke(alpha(p,ctx.palette.ink,25+(i%3)*13));p.strokeWeight(.6);
        const ring=points(state.rings[i]);
        // Interrupted contours leave breathing room instead of concentric bands.
        path(ring.slice(8+i*2,34+i*3));path(ring.slice(58-i,82+i));
      }
    }
    return {reset,draw,anchors:()=>[{id:'base',x:W/2,y:245},{id:'top',...points(state.rings[0]).reduce((a,b)=>a.y<b.y?a:b)}],inspect:()=>({rockCount:1,profile:ctx.options.profile,finite:points(state.rings[0]).every(q=>Number.isFinite(q.x+q.y)),geometryKey:ctx.fingerprint(state)})};
  }
});
