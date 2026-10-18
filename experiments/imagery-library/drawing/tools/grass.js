/* Project-authored grass blades and surface marks. No external shape code. */
window.PoemDrawing.register({
  id:'grass',name:'草 · 露 · 霜',subtitle:'风经过草尖，露与霜留在叶上。',
  credit:'本项目试作 · 草叶曲线与附着层',sources:['project'],reference:'drawing/README.md#本轮植物与天气',
  note:'固定 9 簇、每簇 6 片草叶；露珠和霜线按选择附在叶面，不在空中降落。当前载体仅为草叶。',
  controls:[{id:'surface',label:'叶面',default:'plain',choices:[{value:'plain',label:'草叶'},{value:'dew',label:'带露'},{value:'frost',label:'覆霜'}]}],
  capabilities:['wind-response','surface-attachment','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let tufts=[];
    function reset(){tufts=Array.from({length:9},(_,i)=>({x:62+i*64+p.random(-9,9),y:p.random(290,325),blades:Array.from({length:6},()=>({length:p.random(60,135),lean:p.random(-43,43),width:p.random(2.5,5),phase:p.random(p.TWO_PI),dewAt:p.random(.6,.9)}))}));}
    function tip(t,b){return {x:t.x+b.lean+ctx.wind.offset(b.phase,18),y:t.y-b.length};}
    function curve(t,b,q){const end=tip(t,b);return {x:t.x+(end.x-t.x)*q*q,y:t.y-b.length*q};}
    function draw(){
      for(const t of tufts)for(const b of t.blades){
        const end=tip(t,b);p.fill(alpha(p,ctx.palette.main,145));p.stroke(alpha(p,ctx.palette.ink,105));p.strokeWeight(.6);
        const c=p.drawingContext;c.beginPath();c.moveTo(t.x-b.width/2,t.y);c.quadraticCurveTo(t.x-b.width,t.y-b.length*.55,end.x,end.y);c.quadraticCurveTo(t.x+b.width,t.y-b.length*.5,t.x+b.width/2,t.y);c.closePath();c.fill();c.stroke();
        if(ctx.settings.density>.3){p.noFill();p.stroke(alpha(p,ctx.palette.ink,55));p.bezier(t.x,t.y,t.x,t.y-b.length*.4,t.x+(end.x-t.x)*.5,end.y+b.length*.25,end.x,end.y);}
        if(ctx.options.surface==='dew'){
          const q=curve(t,b,b.dewAt);p.fill(alpha(p,ctx.palette.bg,235));p.stroke(alpha(p,ctx.palette.ink,145));p.circle(q.x,q.y,5.5);p.noStroke();p.fill(alpha(p,ctx.palette.accent,245));p.circle(q.x-.9,q.y-1,2);
        }else if(ctx.options.surface==='frost'){
          p.stroke(alpha(p,ctx.palette.bg,250));p.strokeWeight(1.6);p.beginShape();for(let i=5;i<=10;i++){const q=curve(t,b,i/10);p.vertex(q.x,q.y);}p.endShape();
          p.stroke(alpha(p,ctx.palette.ink,48));p.strokeWeight(.45);for(let i=6;i<=9;i++){const q=curve(t,b,i/10);p.line(q.x-2,q.y+1,q.x+2,q.y-1);}
        }
      }
    }
    return {reset,draw,anchors:()=>tufts.map((t,i)=>({id:'root-'+i,x:t.x,y:t.y})),inspect:()=>({tuftCount:9,bladeCount:54,surface:ctx.options.surface,dewCount:ctx.options.surface==='dew'?54:0,frostBladeCount:ctx.options.surface==='frost'?54:0,finite:tufts.every(t=>t.blades.every(b=>Number.isFinite(tip(t,b).x+tip(t,b).y))),geometryKey:ctx.fingerprint(tufts)})};
  }
});
