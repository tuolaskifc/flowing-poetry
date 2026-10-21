/* Project-authored terrain contours, layered washes and broken texture lines.
 * No upstream terrain code or bitmap textures. See drawing/README.md.
 */
window.PoemDrawing.register({
  id:'landscape',name:'山岸 · 地面',subtitle:'先定远近，再留出风景之间的空。',sources:['project'],credit:'本项目 · 山势与地表墨面',reference:'drawing/README.md',
  note:'山、岸、原野与小径的局部写意结构；只画明确选择的类型，不自动附加树、房屋或人物。',
  controls:[{id:'form',label:'地形',default:'mountain',choices:[{value:'mountain',label:'层山'},{value:'shore',label:'水岸'},{value:'ground',label:'原野'},{value:'path',label:'小径'}]}],capabilities:['static','density-detail','anchors'],
  create(ctx){
    const {p,alpha}=ctx;let ridges=[],marks=[];
    function reset(){
      ridges=Array.from({length:3},(_,j)=>Array.from({length:25},(_,i)=>{const x=-30+i*700/24;return {x,y:210+j*43-100*Math.exp(-Math.pow((x-(160+j*155))/145,2))-p.noise(i*.23,j*6)*65};}));
      marks=Array.from({length:90},()=>({x:p.random(0,640),y:p.random(180,385),w:p.random(5,32),a:p.random(.3,1)}));
    }
    const trace=points=>{p.beginShape();for(const q of points)p.vertex(q.x,q.y);p.endShape();};
    function draw(){
      const form=ctx.options.form,c=p.drawingContext;
      if(form==='mountain'){
        for(const [j,points] of ridges.entries()){
          c.beginPath();c.moveTo(-40,388);points.forEach(q=>c.lineTo(q.x,q.y));c.lineTo(680,388);c.closePath();
          const wash=c.createLinearGradient(0,100+j*35,0,388);wash.addColorStop(0,String(alpha(p,ctx.palette.ink,30+j*13)));wash.addColorStop(1,String(alpha(p,ctx.palette.main,4)));c.fillStyle=wash;c.fill();
          p.noFill();p.stroke(alpha(p,ctx.palette.ink,55+j*18));p.strokeWeight(.7+j*.16);trace(points);
          for(let k=2;k<23;k+=2){const q=points[k];p.stroke(alpha(p,ctx.palette.ink,12+j*8));p.line(q.x,q.y+5,q.x-15,q.y+25+j*9);}
        }
      }else{
        const shore=form==='shore',path=form==='path';
        c.beginPath();c.moveTo(0,shore?235:265);c.bezierCurveTo(170,shore?207:245,360,shore?325:275,640,shore?295:245);c.lineTo(640,388);c.lineTo(0,388);c.closePath();
        const wash=c.createLinearGradient(0,220,0,388);wash.addColorStop(0,String(alpha(p,ctx.palette.main,55)));wash.addColorStop(1,String(alpha(p,ctx.palette.ink,35)));c.fillStyle=wash;c.fill();
        p.noFill();p.stroke(alpha(p,ctx.palette.ink,115));p.strokeWeight(1);p.bezier(0,shore?235:265,170,shore?207:245,360,shore?325:275,640,shore?295:245);
        for(const m of marks)if(m.y>300&&m.a<.25+ctx.settings.density*.6){p.stroke(alpha(p,ctx.palette.ink,30*m.a));p.strokeWeight(.7);p.line(m.x,m.y,m.x+m.w,m.y-1);}
        if(path){c.beginPath();c.moveTo(310,255);c.bezierCurveTo(390,285,200,325,255,388);c.lineTo(330,388);c.bezierCurveTo(275,325,410,280,316,255);c.closePath();c.fillStyle=String(alpha(p,ctx.palette.bg,220));c.fill();p.stroke(alpha(p,ctx.palette.ink,90));p.bezier(310,255,390,285,200,325,255,388);}
      }
    }
    return {reset,draw,anchors:()=>[{id:'ground',x:320,y:290}],inspect:()=>({form:ctx.options.form,finite:ridges.flat().every(q=>Number.isFinite(q.x+q.y)),geometryKey:ctx.fingerprint({ridges,marks})})};
  }
});
