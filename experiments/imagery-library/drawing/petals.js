/* Adapted from petalPath(), Generative flower experiment #1, sxywu.
 * MIT is explicitly declared in code-research/flower/.block. Full original:
 * code-research/flower/index.html. The D3 scale and Lodash random calls are
 * replaced with numeric interpolation and seeded p5 methods. Return values are
 * numeric cubic control points (Y flipped), not SVG markup or executable text.
 */
window.PoemPetalGeometry = function(p,size){
  const bottomAngle=p.random(.65*Math.PI,.8*Math.PI);
  const bottomLength=size*(.75+.25*(bottomAngle-.65*Math.PI)/(.15*Math.PI));
  const end=[p.randomGaussian(0,5)*size/100,p.randomGaussian(.9*size,8*size/100)];
  let c1=[bottomLength*Math.cos(bottomAngle),bottomLength*Math.sin(bottomAngle)];
  const topAngle=p.random(1.4*Math.PI,1.6*Math.PI);
  const topLength=Math.max(.25*size,size-c1[1]);
  let c2=[topLength*Math.cos(topAngle)+end[0],topLength*Math.sin(topAngle)+end[1]];
  const first=[c1[0],-c1[1],c2[0],-c2[1],end[0],-end[1]];
  const returnAngle=p.randomGaussian(bottomAngle,.1),returnLength=p.randomGaussian(bottomLength,5*size/100);
  c2=[-returnLength*Math.cos(returnAngle),returnLength*Math.sin(returnAngle)];
  const nextAngle=p.random(1.4*Math.PI,1.6*Math.PI),nextLength=Math.max(.25*size,size-c2[1]);
  c1=[-nextLength*Math.cos(nextAngle)+end[0],nextLength*Math.sin(nextAngle)+end[1]];
  return {curves:[first,[c1[0],-c1[1],c2[0],-c2[1],0,0]]};
};
