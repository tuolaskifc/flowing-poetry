/* Adapted roof geometry from Arch.hut (line 2542), roof (2840), and rail (2753),
 * Lingdong Huang / Shan, Shui, MIT. Original SVG and automatic people omitted.
 * Pillars, hatch strokes, controls, palette and anchors are local additions.
 */
window.PoemDrawing.register({
  id:'pavilion',name:'亭',subtitle:'一顶檐，一处可以望向远方的空隙。',
  credit:'屋顶与平面改编 Lingdong Huang / Shan, Shui · MIT',sources:['shan-pavilion','project'],reference:'drawing/README.md#石与亭',
  note:'固定一座空亭，茅顶与折檐可切换，栏杆可选；不自动添人，不将亭、楼、宫殿视为同一形体。',
  controls:[
    {id:'roof',label:'屋顶',default:'tiled',choices:[{value:'tiled',label:'折檐'},{value:'thatched',label:'茅顶'}]},
    {id:'railing',label:'栏杆',default:'open',choices:[{value:'open',label:'敞开'},{value:'rail',label:'有栏'}]}
  ],
  capabilities:['static','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={width:p.random(225,255),rise:p.random(55,68),height:p.random(82,95),texture:Array.from({length:37},()=>p.random(.92,1.06))};}
    function line(points,closed=false){p.beginShape();for(const [x,y] of points)p.vertex(x,y);p.endShape(closed?p.CLOSE:undefined);}
    function draw(){
      const w=state.width,h=state.rise,eave=190,base=eave+state.height,mid=w*.18,bmid=-w*.18;
      p.push();p.translate(W/2,0);p.strokeWeight(1);
      // Diamond platform and the four support locations are explicit, no figures.
      p.fill(alpha(p,ctx.palette.main,45));p.stroke(alpha(p,ctx.palette.ink,130));
      line([[-w*.42,base],[bmid,base-12],[w*.42,base],[mid,base+12]],true);
      p.stroke(alpha(p,ctx.palette.ink,180));p.strokeWeight(2.1);
      for(const [x,z] of [[-w*.32,0],[w*.32,0],[mid*.72,9],[bmid*.72,-9]])p.line(x,eave+z,x,base+z);
      if(ctx.options.railing==='rail'){
        p.strokeWeight(.85);const edges=[[[-w*.4,base],[mid,base+12]],[[mid,base+12],[w*.4,base]]];
        for(const [a,b] of edges){p.line(a[0],a[1]-20,b[0],b[1]-20);p.line(a[0],a[1]-10,b[0],b[1]-10);for(let i=0;i<=6;i++){const t=i/6,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;p.line(x,y,x,y-20);}}
      }
      p.fill(alpha(p,ctx.palette.main,100));p.stroke(alpha(p,ctx.palette.ink,195));p.strokeWeight(1.05);
      if(ctx.options.roof==='tiled'){
        window.PoemArchitecture.tiledRoof(ctx,w,h,eave);
      }else{
        // hut's x ~ t^.7 expansion, with seeded per-strand roof heights.
        const apex=eave-h;
        const roofEdge=side=>Array.from({length:25},(_,j)=>{const t=j/24;return [side*w*.5*Math.pow(t,.7),apex+h*t];});
        line([...roofEdge(-1).reverse(),...roofEdge(1)],true);
        p.stroke(alpha(p,ctx.palette.ink,65));p.strokeWeight(.65);
        const n=12+Math.round(ctx.settings.density*24);
        for(let i=0;i<=n;i++){const lane=i/n-.5;p.beginShape();for(let j=0;j<=16;j++){const t=j/16;p.vertex(w*lane*Math.pow(t,.7),apex+h*t*state.texture[i]);}p.endShape();}
      }
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'floor',x:W/2,y:190+state.height},{id:'roof',x:W/2,y:190-state.rise}],inspect:()=>({pavilionCount:1,personCount:0,roof:ctx.options.roof,railing:ctx.options.railing,finite:Number.isFinite(state.width+state.rise+state.height),geometryKey:ctx.fingerprint(state)})};
  }
});
