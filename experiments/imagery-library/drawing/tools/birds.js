/* Extracted from the first local study; provenance is declared by source id. */
window.PoemDrawing.register({
"id":"birds","name":"鸟群","subtitle":"相互看见，然后一起改变方向。","credit":"改编 NOC Boids · Daniel Shiffman / Reynolds · MIT","note":"固定 22 只鸟；分离、对齐、聚合不等于已区分物种。","sources":["noc-boids", "project"],"reference":"ref-birds",
capabilities:["wind-response", "density-spacing", "fixed-count", "fixed-step"],
create(ctx) {
 const {p,width:W,height:H,alpha}=ctx; const shared=ctx.settings;
 let state={},time=0,palette=ctx.palette;
 function reset() {
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
          });state.accumulator=0;state.initial=state.birds.map(b=>[b.position.x,b.position.y,b.velocity.x,b.velocity.y]);
 }
function birds() { for(const b of state.birds)b.render(); }
function update(dt) {
 time=ctx.time;
p.poemDensity=shared.density;
        state.accumulator=Math.min(state.accumulator+dt,1/10);
        while(state.accumulator>=1/60) {
          // Calculate all forces before moving any bird so order does not bias the flock.
          for(const b of state.birds) {b.flock(state.birds);b.applyForce(p.createVector(shared.wind*.0025,Math.sin(time*.4)*shared.wind*.001));}
          for(const b of state.birds) {b.update();b.borders();}
          state.accumulator-=1/60;
        }
}
return {reset,update,draw(){time=ctx.time;palette=ctx.palette;birds();},inspect(){return {birdCount:state.birds.length,finite:state.birds.every(b=>[b.position.x,b.position.y,b.velocity.x,b.velocity.y].every(Number.isFinite)),geometryKey:ctx.fingerprint(state.initial)};}};
}
});
