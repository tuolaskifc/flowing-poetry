// Physical scenery can be tagged as a place by the semantic model. Whitelist
// source mentions, never a normalized concept that could invent a building.
export function physicalPlace(entity){
  return entity.kind==='place'&&entity.mentions.some(mention=>{
    if(/^(?:墟里|渡头|高原)$/.test(mention))return true;
    const m=mention.replace(/(?:之)?(?:上|下|间|中|边|畔|旁|外|里|前|后|际)$/,'').replace(/^两岸(?=(?:青山|群山|山)$)/,'').replace(/^[一二两三四五六七八九十百千万数几]+(?:座|重|条|道)?(?=(?:青山|群山|山|径|水)$)/,'');
    if(/^(?:孤|荒|山|小|远|近)?村(?:庄|落)?$/.test(m)||/^(?:水?田|稻田|径)$/.test(m))return true;
    if(/^(?:寒|春|秋|清|碧|大|小|长|深|浅|野|幽)?(?:江|河|湖|溪|涧|泉|池|水)$/.test(m))return true;
    if(/(?:寺|庙|禅房|客舍|茅舍|茅屋|房舍)$/.test(m))return true;
    if(/^(?:小|高|危|层|重|孤|旧|古|画|红)?(?:楼|楼阁|楼台|亭|亭阁|房屋|屋舍)$/.test(m))return true;
    return /^(?:寒|春|秋|清|碧|大|小|长|深|浅)?(?:江|河|湖|溪|泉|池)$/.test(m)||/^(?:梧桐|芭蕉|木兰|松柏|柏|桃花|杏花|桂花|槐花|天空|青天|九天|天|水|细流|春潮|潮水|潮|江水|江面|溪水|湖水|湖面|池水|水面|清泉|泉水|河水|客舍|茅舍|茅屋|草堂|人家|村舍|房舍|房屋|屋舍|屋|房|禅房|禅院|寺院|寺庙|古寺|佛寺|山寺|庙|寺|水田|稻田|田畴|瀑布|飞瀑|飞流|深巷|小巷|巷|野渡|渡口|江岸|河岸|岸边|岸|沙洲|洲|远山|青山|群山|山|深林|树林|林|松|松林|竹|竹林|树|野|原野|平野|田野|地面|草地|曲径|野径|小径|石|岩石|石头|亭|船|舟|楼|楼阁|楼台|楼宇)$/.test(m);
  });
}
