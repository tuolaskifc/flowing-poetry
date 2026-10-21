/* Project-authored terrain contours, layered washes and broken texture lines.
 * No upstream terrain code or bitmap textures. See drawing/README.md.
 */
window.PoemDrawing.register({
  id:'landscape',name:'山水 · 场景',subtitle:'先定远近，再留出风景之间的空。',sources:['project'],credit:'本项目 · 山势、地表与光影笔触',reference:'drawing/README.md',
  note:'山岸、原野、田面、瀑布、天空与光影的写意结构；只画明确选择的类型，不自动附加人物。',
  controls:[{id:'form',label:'场景',default:'mountain',choices:[{value:'mountain',label:'层山'},{value:'shore',label:'水岸'},{value:'ground',label:'原野'},{value:'path',label:'小径'},{value:'field',label:'水田'},{value:'waterfall',label:'瀑布'},{value:'sky',label:'天空'},{value:'stars',label:'星点'},{value:'sun',label:'日光'},{value:'glow',label:'灯火'},{value:'shadow',label:'疏影'},{value:'moss',label:'苔意'},{value:'lightwash',label:'返照'},{value:'dust',label:'轻尘'}]}],capabilities:['local-motion','density-detail','anchors'],
  create(ctx){
    const {p,alpha}=ctx;let ridges=[],marks=[],stars=[];
    function reset(){
      ridges=Array.from({length:3},(_,j)=>Array.from({length:25},(_,i)=>{const x=-30+i*700/24;return {x,y:210+j*43-100*Math.exp(-Math.pow((x-(160+j*155))/145,2))-p.noise(i*.23,j*6)*65};}));
      marks=Array.from({length:90},()=>({x:p.random(0,640),y:p.random(180,385),w:p.random(5,32),a:p.random(.3,1)}));
      stars=Array.from({length:22},()=>({x:p.random(25,615),y:p.random(25,195),r:p.random(.6,1.6),phase:p.random(p.TWO_PI)}));
    }
    const trace=points=>{p.beginShape();for(const q of points)p.vertex(q.x,q.y);p.endShape();};
    function draw(){
      const form=ctx.options.form,c=p.drawingContext;
      if(form==='sky'){const g=c.createLinearGradient(0,0,0,260);g.addColorStop(0,String(alpha(p,ctx.palette.main,65)));g.addColorStop(1,String(alpha(p,ctx.palette.main,0)));c.fillStyle=g;c.fillRect(0,0,640,260);return;}
      if(form==='dust'){for(const m of marks){p.noStroke();p.fill(alpha(p,ctx.palette.ink,18+m.a*14));p.ellipse(m.x,305+(m.y-180)*.25,1.2+m.a,1);}return;}
      if(form==='path'){
        c.beginPath();c.moveTo(310,255);c.bezierCurveTo(390,285,200,325,255,410);c.lineTo(338,410);c.bezierCurveTo(275,325,410,280,316,255);c.closePath();c.fillStyle=String(alpha(p,ctx.palette.bg,235));c.fill();
        p.noFill();p.stroke(alpha(p,ctx.palette.ink,65));p.strokeWeight(.7);p.bezier(310,255,390,285,200,325,255,410);p.stroke(alpha(p,ctx.palette.ink,35));p.bezier(316,255,410,280,275,325,338,410);return;
      }
      if(form==='shadow'){
        p.noFill();for(let i=0;i<7;i++){p.stroke(alpha(p,ctx.palette.ink,20+i*3));p.strokeWeight(1.5+(i%3));p.bezier(90+i*48,235+(i%3)*14,190+i*24,235,270+i*30,290,320+i*30,340);p.bezier(220+i*22,285,240+i*25,260,265+i*26,260,290+i*28,254);}return;
      }
      if(form==='moss'){for(const m of marks){p.noStroke();p.fill(alpha(p,ctx.palette.main,40+m.a*70));p.ellipse(100+m.x*.7,270+(m.y-180)*.35,6+m.w*.6,3+m.w*.15);}return;}
      if(form==='lightwash'){
        // Broken, filtered light pools rather than a theatrical solid beam.
        c.save();c.translate(320,275);c.scale(1,.34);
        for(let i=0;i<9;i++){const x=-100+i*26,y=Math.sin(i*2.1)*45,r=32+(i%3)*14,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,String(alpha(p,ctx.palette.accent,85)));g.addColorStop(.45,String(alpha(p,ctx.palette.accent,35)));g.addColorStop(1,String(alpha(p,ctx.palette.accent,0)));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}c.restore();
        for(const m of marks.slice(0,22)){p.noStroke();p.fill(alpha(p,ctx.palette.accent,30));p.ellipse(205+m.x*.32,190+(m.y-180)*.46,9+m.w*.5,3+m.w*.1);}return;
      }
      if(form==='stars'){
        const sky=c.createLinearGradient(0,0,0,240);sky.addColorStop(0,String(alpha(p,ctx.palette.ink,24)));sky.addColorStop(1,String(alpha(p,ctx.palette.main,0)));c.fillStyle=sky;c.fillRect(0,0,640,240);
        for(const s of stars){p.noStroke();p.fill(alpha(p,ctx.palette.accent,100));p.circle(s.x,s.y,s.r*5);p.fill(alpha(p,ctx.palette.ink,150));p.circle(s.x,s.y,s.r*1.5);}return;
      }
      if(form==='sun'||form==='glow'){
        const x=320,y=form==='sun'?95:210,r=form==='sun'?34:14,g=c.createRadialGradient(x,y,1,x,y,r*2.8);g.addColorStop(0,String(alpha(p,ctx.palette.accent,190)));g.addColorStop(.4,String(alpha(p,ctx.palette.accent,80)));g.addColorStop(1,String(alpha(p,ctx.palette.accent,0)));c.fillStyle=g;c.fillRect(x-r*3,y-r*3,r*6,r*6);p.noStroke();p.fill(alpha(p,ctx.palette.accent,form==='sun'?110:190));p.ellipse(x,y,r*1.6,r*1.6);return;
      }
      if(form==='waterfall'){
        // Broad, irregular cliff shoulders carry the narrow falling water.
        for(let side=0;side<2;side++){
          c.beginPath();c.moveTo(side?346:300,41);
          if(side){c.lineTo(371,27);c.lineTo(390,38);c.lineTo(400,67);c.lineTo(423,82);c.lineTo(431,105);c.bezierCurveTo(462,123,443,171,482,202);c.bezierCurveTo(510,249,504,302,569,365);c.lineTo(389,365);c.bezierCurveTo(344,247,375,122,346,41);}
          else{c.lineTo(277,23);c.lineTo(254,29);c.lineTo(245,53);c.lineTo(229,64);c.lineTo(221,110);c.bezierCurveTo(171,142,190,212,146,247);c.bezierCurveTo(120,289,137,318,85,365);c.lineTo(345,365);c.bezierCurveTo(291,248,344,113,300,41);}
          c.closePath();const wash=c.createLinearGradient(0,40,0,365);wash.addColorStop(0,String(alpha(p,ctx.palette.ink,75)));wash.addColorStop(.75,String(alpha(p,ctx.palette.main,62)));wash.addColorStop(1,String(alpha(p,ctx.palette.main,4)));c.fillStyle=String(alpha(p,ctx.palette.bg,220));c.fill();c.fillStyle=wash;c.fill();
        }
        p.noFill();for(let i=0;i<17;i++){const right=i%2,x=right?365+i*6:285-i*7;p.stroke(alpha(p,ctx.palette.ink,25+(i%4)*5));p.strokeWeight(.6);p.bezier(x,75+(i%3)*20,x+(right?30:-25),140,x+(right?20:-40),230,x+(right?65:-70),325);}
        const g=c.createLinearGradient(250,0,390,0);g.addColorStop(0,String(alpha(p,ctx.palette.main,0)));g.addColorStop(.5,String(alpha(p,ctx.palette.main,110)));g.addColorStop(1,String(alpha(p,ctx.palette.main,0)));c.fillStyle=g;
        c.beginPath();c.moveTo(300,40);c.bezierCurveTo(350,90,280,240,345,345);c.lineTo(389,345);c.bezierCurveTo(320,230,378,100,346,40);c.closePath();c.fillStyle=String(alpha(p,ctx.palette.bg,205));c.fill();c.fillStyle=g;c.fill();
        for(let i=0;i<18;i++){const x=304+i*2.5;p.noFill();p.stroke(alpha(p,ctx.palette.ink,22+(i%4)*10));p.strokeWeight(.5+(i%3)*.25);p.bezier(x,50,x+30,115,x-18,265,x+42,337);}
        for(let i=0;i<20;i++){const t=(ctx.time*.32+i/20)%1,x=315+(i%5)*5+Math.sin(t*8+i)*3,y=50+t*280;p.stroke(alpha(p,ctx.palette.bg,185));p.strokeWeight(1.3);p.line(x,y,x+2,y+17);}
        for(const m of marks.slice(0,35)){p.noStroke();p.fill(alpha(p,ctx.palette.main,40));p.ellipse(260+m.x*.26,337+(m.y-180)*.14,20+m.w,7+m.w*.2);}return;
      }
      if(form==='field'){
        // Perspective terraces fill the usable field plane, not five floating tiles.
        const edges=[152,175,205,244,294,354,410];
        for(let row=0;row<edges.length-1;row++){const y=edges[row],bottom=edges[row+1],bend=(row%2?1:-1)*8;
          p.fill(alpha(p,ctx.palette.main,28+row*5));p.stroke(alpha(p,ctx.palette.ink,65));p.strokeWeight(.65);p.quad(0,y,640,y-5,640,bottom-5,0,bottom);
          for(let j=0;j<7;j++){const x=35+j*100+(row%2)*28;p.stroke(alpha(p,ctx.palette.ink,70));p.line(x,y,x+bend-22,bottom);}
          for(let j=0;j<24;j++){const x=(j*61+row*17)%640,yy=y+(bottom-y)*.65;p.stroke(alpha(p,ctx.palette.main,110));p.line(x,yy,x+16+row*2,yy-1);if(row>2){p.stroke(alpha(p,ctx.palette.ink,65));p.line(x,yy,x-3,yy-7);p.line(x,yy,x+5,yy-6);}}
        }return;
      }
      if(form==='mountain'){
        for(const [j,points] of ridges.entries()){
          c.beginPath();c.moveTo(-40,388);points.forEach(q=>c.lineTo(q.x,q.y));c.lineTo(680,388);c.closePath();
          const wash=c.createLinearGradient(0,100+j*35,0,388);wash.addColorStop(0,String(alpha(p,ctx.palette.ink,30+j*13)));wash.addColorStop(1,String(alpha(p,ctx.palette.main,4)));c.fillStyle=wash;c.fill();
          p.noFill();p.stroke(alpha(p,ctx.palette.ink,55+j*18));p.strokeWeight(.7+j*.16);trace(points);
          for(let k=2;k<23;k+=2){const q=points[k];p.stroke(alpha(p,ctx.palette.ink,12+j*8));p.line(q.x,q.y+5,q.x-15,q.y+25+j*9);}
        }
      }else{
        const shore=form==='shore';
        c.beginPath();c.moveTo(0,shore?235:265);c.bezierCurveTo(170,shore?207:245,360,shore?325:275,640,shore?295:245);c.lineTo(640,388);c.lineTo(0,388);c.closePath();
        const wash=c.createLinearGradient(0,220,0,388);wash.addColorStop(0,String(alpha(p,ctx.palette.main,55)));wash.addColorStop(1,String(alpha(p,ctx.palette.ink,35)));c.fillStyle=wash;c.fill();
        p.noFill();p.stroke(alpha(p,ctx.palette.ink,115));p.strokeWeight(1);p.bezier(0,shore?235:265,170,shore?207:245,360,shore?325:275,640,shore?295:245);
        for(const m of marks)if(m.y>300&&m.a<.25+ctx.settings.density*.6){p.stroke(alpha(p,ctx.palette.ink,30*m.a));p.strokeWeight(.7);p.line(m.x,m.y,m.x+m.w,m.y-1);}
      }
    }
    return {reset,draw,anchors:()=>[{id:'ground',x:320,y:290}],inspect:()=>({form:ctx.options.form,finite:ridges.flat().every(q=>Number.isFinite(q.x+q.y)),geometryKey:ctx.fingerprint({ridges,marks,stars})})};
  }
});
