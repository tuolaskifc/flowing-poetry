/* Project-authored ink gestures, no portrait or upstream figure code. */
window.PoemDrawing.register({
 id:'figure',name:'人意',subtitle:'一抹衣影，几笔见人。',sources:['project'],credit:'本项目 · 淡墨人物',reference:'drawing/README.md#人意',
 note:'以衣形、头部笔点和笠沿提示人物；钓者只加一根疏线，不刻画五官。',capabilities:['anchors'],
 controls:[{id:'pose',label:'姿态',default:'fisher',choices:[{value:'fisher',label:'蓑笠钓者'},{value:'standing',label:'立人'}]}],
 create(ctx){const {p,alpha}=ctx;let lean=0;return {
  reset(){lean=p.random(-7,7);},
  draw(){const b=window.PoemInkBrush.create(ctx),ink=ctx.palette.ink,main=ctx.palette.main,fisher=ctx.options.pose==='fisher';
   p.push();p.translate(lean,0);p.noStroke();p.fill(alpha(p,ink,120));p.ellipse(316,232,9,11);
   b.stroke([315,242,300,260,304,283,296,302],6,main,110,1,true);
   p.noStroke();p.fill(alpha(p,ink,85));p.beginShape();for(const [x,y] of (fisher?[[314,243],[292,264],[286,294],[329,300],[333,274],[323,250]]:[[314,243],[300,265],[293,307],[331,309],[329,266]]))p.vertex(x,y);p.endShape(p.CLOSE);
   b.stroke([315,246,316,270,330,282,343,283],2,ink,145,3,true);
   b.stroke([302,300,316,303,325,306,340,307],2,ink,135,4,true);
   if(fisher){b.stroke([288,236,309,224,326,225,340,234],2,ink,180,2,true);b.stroke([290,237,308,234,326,237,340,234],1,ink,155,5,true);b.stroke([338,283,370,257,403,250,432,255],1,ink,135,6,true);p.noFill();p.stroke(alpha(p,ink,80));p.strokeWeight(.55);p.bezier(432,255,439,278,438,305,441,326);}
   p.pop();
  },anchors:()=>[{id:'feet',x:320+lean,y:310}],inspect:()=>({finite:Number.isFinite(lean),personCount:1,geometryKey:ctx.fingerprint({lean})})
 };}
});
