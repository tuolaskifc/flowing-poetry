// Local space proposals. Shapes describe whole surfaces before objects are placed.
const band=path=>{
 const left=path.map(([x,y,w])=>[x-w,y]),right=path.map(([x,y,w])=>[x+w,y]);
 return {water:[...left,...right.toReversed()],land:[[-.04,.43],[1.04,.43],[1.04,1.04],...right.toReversed(),...left,[-.04,1.04]]};
};
export function worldLayout(analysis,layers,index,landNeeded){
 const water=layers.find(l=>l.tool==='water');if(!water)return {name:['疏林前后','林隙展开','远近错落'][index],land:landNeeded?[[0,.5],[1,.5],[1,1.04],[0,1.04]]:undefined};
 const mentions=water.names.join(' '),stream=analysis.scene.setting.kind==='mountain_stream'||/泉|溪|涧|细流/.test(mentions),pond=/池|塘/.test(mentions),open=!landNeeded;
 if(open)return {name:['阔水远天','水面横展','近水远照'][index],water:[[0,.42+index*.055],[1,.42+index*.055],[1,1.04],[0,1.04]]};
 if(stream){
  const paths=[[[.55,.48,.035],[.48,.64,.07],[.66,.83,.11],[.42,1.04,.18]],[[.35,.48,.04],[.56,.67,.075],[.43,.85,.12],[.78,1.04,.20]],[[.73,.48,.035],[.64,.66,.06],[.39,.82,.10],[.20,1.04,.17]]];
  return {name:['曲溪穿林','溪向远山','斜涧近石'][index],...band(paths[index])};
 }
 if(pond&&index!==2){
  const cx=index===0?.52:.60,rx=index===0?.36:.30,cy=.66,ry=index===0?.19:.22;
  const water=Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return [cx+Math.cos(a)*rx,cy+Math.sin(a)*ry];});
  // A narrow bridge connects the outer and inner contours to represent dry land
  // around the pond without treating the water as a rooting surface.
  const hole=[...water.toReversed(),water.at(-1)];
  return {name:index===0?'环池疏岸':'池深林近',water,land:[[-.04,.43],[1.04,.43],[1.04,1.04],[-.04,1.04],[-.04,.43],...hole,[-.04,.43]]};
 }
 if(index===0)return {name:'横江远岸',water:[[-.04,.49],[.34,.46],[.73,.49],[1.04,.46],[1.04,.78],[.67,.75],[.30,.82],[-.04,.77]],land:[[-.04,.77],[.30,.82],[.67,.75],[1.04,.78],[1.04,1.04],[-.04,1.04]]};
 if(index===1)return {name:'曲岸开阔',water:[[-.04,.46],[1.04,.46],[1.04,.98],[.74,.87],[.55,.79],[.22,.86],[-.04,.99]],land:[[-.04,.99],[.22,.86],[.55,.79],[.74,.87],[1.04,.98],[1.04,1.04],[-.04,1.04]]};
 return {name:pond?'近岸池曲':'斜江入远',...band([[.76,.48,.13],[.64,.65,.21],[.40,.82,.28],[.24,1.04,.34]])};
}
export function compositionScore(plan){
 const metric=plan.scene.organization.audit.metrics;
 // A geometric preference, not an aesthetic verdict. No reward for extra objects.
 return +(plan.scene.organization.audit.cost+metric.overlapPenalty*18+metric.balancePenalty*14).toFixed(3);
}
