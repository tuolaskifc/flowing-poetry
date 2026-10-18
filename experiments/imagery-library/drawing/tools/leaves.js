/* Project-authored pointed leaf contours and veins. Color is an explicit
 * imagery accent; the rest of the drawing follows the selected palette.
 */
window.PoemDrawing.register({
  id:'leaves',name:'红叶 · 黄叶',subtitle:'先辨叶的形，再留一点季节的颜色。',
  credit:'本项目试作 · 叶缘、叶脉与局部色彩',sources:['project'],reference:'drawing/README.md#本轮植物与天气',
  note:'固定 5 片独立叶形；红、黄作为局部意象色，整体仍随配色变化。静止悬置用于看形，不自动解释成正在落叶。',
  controls:[{id:'color',label:'叶色',default:'red',choices:[{value:'red',label:'红叶'},{value:'yellow',label:'黄叶'}]}],
  capabilities:['static','imagery-accent','density-detail','fixed-count'],
  create(ctx){
    const {p,alpha}=ctx;let leaves=[];
    function reset(){leaves=Array.from({length:5},(_,i)=>({x:100+i*110,y:180+p.random(-30,30),length:p.random(63,85),width:p.random(20,28),rotation:p.random(-.7,.7)}));}
    function draw(){
      const red=ctx.settings.palette==='tender'?'#B36F6D':'#A86957',yellow=ctx.settings.palette==='tender'?'#C5A15F':'#BBA05F',color=ctx.options.color==='red'?red:yellow;
      for(const leaf of leaves){p.push();p.translate(leaf.x,leaf.y);p.rotate(leaf.rotation);p.stroke(alpha(p,ctx.palette.ink,150));p.strokeWeight(.7);p.fill(alpha(p,color,175));
        const c=p.drawingContext;c.beginPath();c.moveTo(0,leaf.length*.45);c.bezierCurveTo(-leaf.width,leaf.length*.15,-leaf.width*.85,-leaf.length*.3,0,-leaf.length*.55);c.bezierCurveTo(leaf.width*.85,-leaf.length*.3,leaf.width,leaf.length*.15,0,leaf.length*.45);c.closePath();c.fill();c.stroke();
        p.line(0,leaf.length*.57,0,-leaf.length*.5);const n=3+Math.round(ctx.settings.density*4);p.stroke(alpha(p,ctx.palette.ink,65));for(let i=0;i<n;i++){const y=-leaf.length*.35+i*leaf.length*.65/n,breadth=Math.sin((i+1)/(n+1)*Math.PI)*leaf.width*.75;p.line(0,y+8,-breadth,y);p.line(0,y+8,breadth,y);}p.pop();
      }
    }
    return {reset,draw,inspect:()=>({leafCount:5,color:ctx.options.color,finite:leaves.every(l=>Number.isFinite(l.x+l.y+l.length)),geometryKey:ctx.fingerprint(leaves)})};
  }
});
