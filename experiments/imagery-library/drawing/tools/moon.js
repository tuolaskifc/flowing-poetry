/* Project-authored projected moon silhouette, not a date/ephemeris model. */
window.PoemDrawing.register({
  id:'moon',name:'月',subtitle:'有时如钩，有时半轮，有时圆满。',
  credit:'本项目试作 · 月形与局部光感',sources:['project'],reference:'drawing/README.md#月',
  note:'月形与亮边方向分别选择；默认弯月，不从诗句或日期自动推断圆缺。暗月保留极淡的轮廓。',
  controls:[
    {id:'shape',label:'月形',default:'crescent',choices:[{value:'crescent',label:'弯月'},{value:'half',label:'半月'},{value:'gibbous',label:'凸月'},{value:'full',label:'满月'},{value:'dark',label:'暗月'}]},
    {id:'lightSide',label:'亮边',default:'right',choices:[{value:'right',label:'朝右'},{value:'left',label:'朝左'}]}
  ],
  capabilities:['static','phase-selection','light-direction','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    const fractions={dark:0,crescent:.16,half:.5,gibbous:.82,full:1};
    function reset(){state={x:W/2,y:175,radius:p.random(48,65)};}
    function draw(){
      const palette=ctx.palette,c=p.drawingContext,f=fractions[ctx.options.shape],r=state.radius;
      const light=p.color(palette.accent);
      c.save();
      const halo=c.createRadialGradient(state.x,state.y,r*.85,state.x,state.y,r*1.8);
      halo.addColorStop(0,`rgba(${p.red(light)},${p.green(light)},${p.blue(light)},${.12*f})`);halo.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=halo;c.fillRect(state.x-r*2,state.y-r*2,r*4,r*4);c.restore();
      p.noFill();p.stroke(alpha(p,palette.main,38));p.strokeWeight(.5);p.circle(state.x,state.y,r*2);
      if(!f)return;
      p.fill(alpha(p,palette.accent,155));p.stroke(alpha(p,palette.ink,150));p.strokeWeight(.6+ctx.settings.density*.45);
      // The illuminated region is bounded by a semicircle and an elliptical terminator.
      // At every height its width is 2*f*sqrt(r*r-y*y); mirroring flips the bright side.
      const side=ctx.options.lightSide==='left'?-1:1;
      c.save();c.translate(state.x,state.y);c.scale(side,1);c.beginPath();
      for(let i=0;i<=96;i++){const a=-Math.PI/2+Math.PI*i/96,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}
      for(let i=96;i>=0;i--){const a=-Math.PI/2+Math.PI*i/96;c.lineTo((1-2*f)*Math.cos(a)*r,Math.sin(a)*r);}
      c.closePath();c.fill();c.stroke();c.restore();
    }
    return {reset,draw,anchors:()=>[{id:'center',x:state.x,y:state.y}],inspect:()=>({moonCount:1,shape:ctx.options.shape,lightSide:ctx.options.lightSide,litFraction:fractions[ctx.options.shape],finite:Number.isFinite(state.radius),geometryKey:ctx.fingerprint(state)})};
  }
});
