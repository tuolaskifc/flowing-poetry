/* Project-authored liquid detail and vessel silhouettes. No external outlines.
 * A free liquid study is an explicit abstraction, not an inferred wine cup.
 */
window.PoemDrawing.register({
  id:'wine',name:'酒液与酒器',subtitle:'酒液先有自己的形状，器物另作选择。',
  credit:'本项目试作 · 酒液局部与杯壶轮廓',sources:['project'],reference:'drawing/README.md#酒液与酒器',
  note:'默认只看酒液局部的抽象示意；杯、壶需明确选择。不自动添人物、桌面或饮酒动作，器型不作历史复原。',
  controls:[{id:'form',label:'呈现',default:'liquid',choices:[{value:'liquid',label:'酒液局部'},{value:'cup',label:'杯中酒'},{value:'jar',label:'酒壶'}]}],
  capabilities:['shape-selection','density-detail','anchors','fixed-count','wind-response'],
  create(ctx){
    const {p,alpha,width:W}=ctx;let state;
    function reset(){state={width:p.random(226,246),depth:p.random(58,68),lines:Array.from({length:18},()=>({a:p.random(-2,2),phase:p.random(p.TWO_PI)}))};}
    function liquid(cx,cy,w,h){
      p.fill(alpha(p,ctx.palette.accent,92));p.stroke(alpha(p,ctx.palette.ink,120));p.strokeWeight(.9);p.ellipse(cx,cy,w,h);
      // Clip all small ripples to the liquid outline; never spill over a cup.
      const c=p.drawingContext;c.save();c.beginPath();c.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2);c.clip();
      p.noFill();p.stroke(alpha(p,ctx.palette.ink,40));p.strokeWeight(.6);
      const n=5+Math.round(ctx.settings.density*12);
      for(let i=0;i<n;i++){
        const y=cy-h*.45+h*.9*i/(n-1),s=state.lines[i];p.beginShape();
        for(let j=0;j<=24;j++){const x=cx-w*.53+w*1.06*j/24;p.vertex(x,y+Math.sin(j*.22+s.phase+ctx.time*.7)*ctx.settings.wind*1.5+s.a*.15);}p.endShape();
      }
      c.restore();
    }
    function draw(){
      const form=ctx.options.form,c=p.drawingContext; p.push();p.translate(W/2,0);
      if(form==='liquid')liquid(0,210,state.width,state.depth);
      else if(form==='cup'){
        p.fill(alpha(p,ctx.palette.main,65));p.stroke(alpha(p,ctx.palette.ink,190));p.strokeWeight(1.2);
        c.beginPath();c.moveTo(-83,188);c.bezierCurveTo(-77,230,-57,265,0,268);c.bezierCurveTo(57,265,77,230,83,188);c.closePath();c.fill();c.stroke();
        p.line(-20,268,-27,280);p.line(-27,280,27,280);p.line(27,280,20,268);
        p.ellipse(0,188,166,44);liquid(0,188,151,33);
      }else{
        // A stylized jar with a separate neck, shoulder and single handle.
        p.noFill();p.stroke(alpha(p,ctx.palette.ink,165));p.strokeWeight(1.1);
        c.beginPath();c.moveTo(63,166);c.bezierCurveTo(135,130,143,243,70,249);c.stroke();
        p.fill(alpha(p,ctx.palette.main,75));p.stroke(alpha(p,ctx.palette.ink,200));
        c.beginPath();c.moveTo(-30,111);c.bezierCurveTo(-27,146,-24,149,-54,175);c.bezierCurveTo(-106,225,-82,291,-25,297);c.lineTo(32,297);c.bezierCurveTo(89,288,111,223,60,177);c.bezierCurveTo(27,148,27,143,30,111);c.closePath();c.fill();c.stroke();
        p.fill(alpha(p,ctx.palette.main,100));p.ellipse(0,110,64,17);
        p.noFill();p.stroke(alpha(p,ctx.palette.ink,60));p.arc(2,228,135,85,0,Math.PI);
        p.strokeWeight(.6);const n=4+Math.round(ctx.settings.density*10);
        for(let i=0;i<n;i++){const y=193+i*6;p.line(-55,y,-43,y-5);}
      }
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:ctx.options.form==='jar'?'mouth':'liquid',x:W/2,y:{liquid:210,cup:188,jar:110}[ctx.options.form]},{id:'base',x:W/2,y:{liquid:244,cup:280,jar:297}[ctx.options.form]}],inspect:()=>({form:ctx.options.form,liquidStudy:ctx.options.form==='liquid',vesselCount:ctx.options.form==='liquid'?0:1,personCount:0,finite:Number.isFinite(state.width+state.depth),geometryKey:ctx.fingerprint(state)})};
  }
});
