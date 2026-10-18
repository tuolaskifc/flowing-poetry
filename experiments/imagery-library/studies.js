/* Local imagery studies. See THIRD_PARTY.md for source boundaries.
 * Tree and wave: adaptations of MIT NOC examples. Birds: MIT NOC Boid class.
 * Flower and mist: project-authored studies; no OpenProcessing code imported.
 * Each mount owns its time, seed and drawing state; no LLM calls occur here.
 */
window.PoemStudies = (() => {
  'use strict';
  const W = 640, H = 388;
  const palettes = {
    clear: {bg:'#EEF0E8',main:'#A3B7B0',ink:'#425E59',accent:'#CEBF8A'},
    tender: {bg:'#F6EAE1',main:'#CFA2A0',ink:'#9E91AB',accent:'#D8B77F'}
  };
  const definitions = [
    {id:'flower',name:'花',subtitle:'花瓣有形，风从茎上经过。',credit:'本项目试作 · 花瓣轮廓与细线',note:'先测试通用花形；尚不把它认定为梅、桃花或菊的准确画法。'},
    {id:'tree',name:'树',subtitle:'一根枝条，长出许多不同的树。',credit:'参考 NOC Recursive Tree · MIT',note:'试递归分枝、末梢细叶与局部摆动；主体位置固定，枝叶响应风。'},
    {id:'water',name:'水',subtitle:'让线条形成水面，而非填满画面。',credit:'参考 NOC Wave · MIT',note:'由单条正弦波改为多层水纹；风改变起伏，疏密改变水纹间距。'},
    {id:'mist',name:'云雾',subtitle:'边缘散开，形体仍然相连。',credit:'本项目试作 · 柔边色层与平移',note:'先试薄雾与留白；尚未实现云团遮蔽实体、消散或显露关系。'},
    {id:'birds',name:'鸟群',subtitle:'相互看见，然后一起改变方向。',credit:'改编 NOC Boids · Daniel Shiffman / Reynolds · MIT',note:'固定 22 只鸟，使用分离、对齐与聚合规则。通用鸟形不代表已区分雁、燕、莺等物种。'}
  ];
  const alpha = (p,c,a) => {const v=p.color(c);v.setAlpha(a);return v;};
  function mount(id, host, shared, initialSeed) {
    let pInstance, time=0, ticks=0, paused=false, seed=initialSeed, state={}, palette=palettes.clear;
    let reset, paint;
    const sketch = p => {
      function rebuild() {
        p.randomSeed(seed);p.noiseSeed(seed);time=0;ticks=0;
        if(id==='flower') {
          state.flowers=Array.from({length:7},(_,i)=>({x:70+i*82+p.random(-15,15),y:142+p.random(-34,56),size:p.random(23,40),phase:p.random(p.TWO_PI),petals:p.random([5,6,8]),lean:p.random(-25,25)}));
        } else if(id==='tree') {
          function branch(len,depth) {
            return {len,angle:p.random(-.12,.12),phase:p.random(p.TWO_PI),leaves:Array.from({length:5},()=>({angle:p.random(-1.4,1.4),r:p.random(4,10),chance:p.random()})),children:depth>0?[branch(len*p.random(.62,.74),depth-1),branch(len*p.random(.61,.73),depth-1)]:[]};
          }
          state.root=branch(86,6);
        } else if(id==='water') {
          state.phase=p.random(p.TWO_PI);
        } else if(id==='mist') {
          state.banks=Array.from({length:3},(_,i)=>({x:100+i*200,y:145+p.random(-35,60),phase:p.random(p.TWO_PI),puffs:Array.from({length:18},()=>({x:p.random(-130,130),y:p.random(-30,30),rx:p.random(55,120),ry:p.random(18,38)}))}));
        } else if(id==='birds') {
          const Base=window.createPoemBoidClass(p);
          class Bird extends Base {
            borders() {
              if(this.position.x < -18) this.position.x=W+18;
              if(this.position.x > W+18) this.position.x=-18;
              if(this.position.y < 35) this.applyForce(p.createVector(0,.07));
              if(this.position.y > H-45) this.applyForce(p.createVector(0,-.07));
              this.position.y=p.constrain(this.position.y,15,H-15);
            }
            render() {
              const flap=Math.sin(time*5+this.phase)*4;
              p.push();p.translate(this.position.x,this.position.y);p.rotate(this.velocity.heading());
              p.noFill();p.stroke(alpha(p,palette.ink,210));p.strokeWeight(1.5);
              p.bezier(-3,-9,3,-7,3,-3,flap+1,0);p.bezier(flap+1,0,3,3,3,7,-3,9);
              p.strokeWeight(.8);p.line(-5,0,4,0);p.pop();
            }
          }
          state.birds=Array.from({length:22},(_,i)=>{
            const b=new Bird(130+p.random(280),90+p.random(180));b.phase=i*.93;b.maxspeed=1.1;b.maxforce=.025;return b;
          });state.accumulator=0;
        }
      }
      reset=next=>{seed=next;rebuild();if(paused)p.redraw();};
      function flower() {
        for(const f of state.flowers) {
          const sway=Math.sin(time*.7+f.phase)*shared.wind*20;
          const x=f.x+sway,y=f.y+Math.cos(time*.6+f.phase)*shared.wind*2;
          p.noFill();p.stroke(alpha(p,palette.ink,155));p.strokeWeight(1.1);
          p.bezier(f.x,H+6,f.x+f.lean,H*.68,x-f.lean,y+70,x,y);
          p.push();p.translate(f.x+f.lean*.45,H*.7);p.rotate(-.65);
          p.fill(alpha(p,palette.main,95));p.noStroke();p.ellipse(0,0,40,10);p.pop();
          for(let k=0;k<f.petals;k++) {
            p.push();p.translate(x,y);p.rotate(k*p.TWO_PI/f.petals+f.phase*.13);
            p.fill(alpha(p,palette.main,52));p.stroke(alpha(p,palette.ink,65));p.strokeWeight(.65);
            const ctx=p.drawingContext;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-f.size*.7,-f.size*.7,-f.size*.45,-f.size*1.55,0,-f.size*1.55);ctx.bezierCurveTo(f.size*.6,-f.size*1.3,f.size*.65,-f.size*.5,0,0);ctx.closePath();ctx.fill();ctx.stroke();
            p.noFill();p.stroke(alpha(p,palette.ink,32));
            const lines=Math.round(3+shared.density*7);
            for(let j=0;j<lines;j++) {const bend=(j/(lines-1)-.5)*f.size*.7;p.bezier(0,-2,bend,-f.size*.5,bend,-f.size,0,-f.size*1.48);}
            p.pop();
          }
          p.noStroke();p.fill(palette.accent);p.circle(x,y,7);p.fill(alpha(p,palette.ink,160));p.circle(x,y,2);
        }
      }
      function tree() {
        function drawBranch(node,depth,side) {
          p.push();p.rotate(node.angle+side*.43+Math.sin(time*.65+node.phase)*shared.wind*.055*(7-depth)/5);
          p.stroke(alpha(p,palette.ink,190-depth*10));p.strokeWeight(Math.max(.6,depth*.52));p.noFill();
          p.bezier(0,0,node.len*.05,-node.len*.3,-node.len*.06,-node.len*.7,0,-node.len);
          p.translate(0,-node.len);
          if(depth<3) for(const leaf of node.leaves) if(leaf.chance<.24+shared.density*.76) {
            p.push();p.rotate(leaf.angle+Math.sin(time+node.phase)*shared.wind*.1);p.noStroke();p.fill(alpha(p,palette.main,110));p.ellipse(leaf.r*.5,-leaf.r*.5,leaf.r,leaf.r*.35);p.pop();
          }
          node.children.forEach((c,i)=>drawBranch(c,depth-1,i===0?-1:1));p.pop();
        }
        p.push();p.translate(W*.5,H+3);drawBranch(state.root,6,0);p.pop();
      }
      function water() {
        p.noFill();const rows=Math.round(15+shared.density*30);
        for(let j=0;j<rows;j++) {
          p.stroke(alpha(p,j%7===0?palette.accent:palette.ink,40+j/rows*65));p.strokeWeight(j%7===0?1.15:.7);
          p.beginShape();
          for(let x=-5;x<=W+5;x+=5) {
            const y=135+j*(230/rows)+Math.sin(x*.013+j*.24-time*.7+state.phase)*(2+shared.wind*6)+Math.sin(x*.027-j*.12+time*.28)*(1+shared.wind*2);
            p.vertex(x,y);
          }p.endShape();
        }
      }
      function mist() {
        const ctx=p.drawingContext;
        for(const b of state.banks) {
          const shift=Math.sin(time*.17+b.phase)*shared.wind*52;
          const count=Math.round(9+shared.density*9);
          for(const q of b.puffs.slice(0,count)) {
            const x=b.x+q.x+shift,y=b.y+q.y+Math.sin(time*.23+b.phase)*4;
            const c=p.color(palette.ink);ctx.save();ctx.translate(x,y);ctx.scale(q.rx,q.ry);
            const grad=ctx.createRadialGradient(0,0,0,0,0,1);
            grad.addColorStop(0,`rgba(${p.red(c)},${p.green(c)},${p.blue(c)},0.075)`);grad.addColorStop(1,`rgba(${p.red(c)},${p.green(c)},${p.blue(c)},0)`);
            ctx.fillStyle=grad;ctx.fillRect(-1,-1,2,2);ctx.restore();
          }
        }
        p.stroke(alpha(p,palette.main,70));p.strokeWeight(.6);p.line(55,H-65,W-55,H-65);
      }
      function birds(dt) {
        p.poemDensity=shared.density;
        state.accumulator=Math.min(state.accumulator+dt,1/10);
        while(state.accumulator>=1/60) {
          // Calculate all forces before moving any bird so order does not bias the flock.
          for(const b of state.birds) {b.flock(state.birds);b.applyForce(p.createVector(shared.wind*.0025,Math.sin(time*.4)*shared.wind*.001));}
          for(const b of state.birds) {b.update();b.borders();}
          state.accumulator-=1/60;
        }
        for(const b of state.birds)b.render();
      }
      paint=dt=>{
        palette=palettes[shared.palette];p.background(palette.bg);p.strokeCap(p.ROUND);p.strokeJoin(p.ROUND);
        ({flower,tree,water,mist,birds})[id](dt);
      };
      p.setup=()=>{p.createCanvas(W,H);p.pixelDensity(1);p.frameRate(30);rebuild();host.dataset.ready='true';};
      p.draw=()=>{const dt=paused?0:Math.min(p.deltaTime/1000,.1);time+=dt;ticks++;paint(dt);};
    };
    pInstance=new p5(sketch,host);
    return {
      pause(value){paused=value;if(value)pInstance.noLoop();else pInstance.loop();},
      refresh(){if(paused)pInstance.redraw();},
      reset,
      save(){pInstance.saveCanvas(`流动诗-${id}-${seed}`,'png');},
      inspect(){return {id,seed,time,ticks,paused,birdCount:state.birds?.length,finite:!state.birds||state.birds.every(b=>[b.position.x,b.position.y,b.velocity.x,b.velocity.y].every(Number.isFinite))};}
    };
  }
  return {definitions,mount};
})();
