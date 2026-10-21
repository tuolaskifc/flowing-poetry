// Physical scenery can be tagged as a place by the semantic model. Whitelist
// source mentions, never a normalized concept that could invent a building.
export function physicalPlace(entity){
  return entity.kind==='place'&&entity.mentions.some(mention=>{
    const m=mention.replace(/(?:之)?(?:上|下|间|中|边|畔|旁|外|里|前|后)$/,'');
    return /^(?:寒|春|秋|清|碧|大|小|长|深|浅)?(?:江|河|湖|溪|泉|池)$/.test(m)||/^(?:春潮|潮水|潮|江水|江面|溪水|湖水|湖面|池水|水面|清泉|泉水|河水|野渡|渡口|江岸|河岸|岸边|岸|沙洲|洲|远山|青山|群山|山|深林|树林|林|松|松林|竹|竹林|树|野|原野|平野|田野|地面|草地|曲径|野径|小径|石|岩石|石头|亭|船|舟|楼|楼阁|楼台|楼宇)$/.test(m);
  });
}
