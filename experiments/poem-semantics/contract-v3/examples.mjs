// Authored contract examples, not fresh API outputs or rewritten API records.
const entity = (id, mentions, concept, kind = 'object', role = 'scene', presence = 'present') =>
  ({ id, mentions, concept, kind, role, presence, evidence: [mentions[0]] });
const relation = (type, source, target, meaning, evidence, modality = 'asserted', basis = 'explicit') =>
  ({ type, source, target, meaning, modality, basis, evidence });
function example(name, poem, reading, entities, relations, labels, levels, time = {}, uncertainties = [], original = null) {
  return { name, origin: '手工编写的协议示例，不是本轮 API 输出', observed_result: original && `../results/structured-v2/${original}.result.json`, analysis: {
    schema_version: '3.0', poem, reading, entities, relations,
    atmosphere: { labels, valence: levels[3] ?? 'unclear', energy: levels[0], tension: levels[1], openness: levels[2], evidence: [poem] },
    time: { markers: time.markers ?? [], note: time.note ?? null }, uncertainties
  } };
}

export default [
  example('秋日街市', '西风酒旗市，细雨菊花天', '秋风、酒旗、市井与细雨菊花构成并置的秋景。', [
    entity('i1', ['西风'], '秋风', 'environment'), entity('i2', ['酒旗'], '酒家的招幌'), entity('i3', ['市'], '街市', 'place'), entity('i4', ['细雨'], '细密的小雨', 'environment'), entity('i5', ['菊花'], '菊花', 'organism')
  ], [
    relation('acts_on', 'i1', 'i2', '秋风吹动酒旗', ['西风酒旗'], 'asserted', 'inferred'), relation('located_in', 'i2', 'i3', '酒旗位于街市', ['酒旗市'])
  ], ['清冷', '平静'], ['low', 'low', 'unclear'], { note: '西风与菊花提示秋日背景，没有明确时间顺序。' }, ['菊花天以时令理解为主，暂不建立花与天空的空间关系。'], '01-autumn-town'),

  example('兵器与比喻参照', '十月到幽州，戈鋋若罗星', '十月抵达幽州，兵器密布，仿佛罗列的星。', [
    entity('i1', ['幽州'], '幽州', 'place'), entity('i2', ['戈鋋'], '兵器'), entity('i3', ['罗星'], '罗列的群星', 'environment', 'reference', 'unclear')
  ], [
    relation('located_in', 'i2', 'i1', '兵器出现在幽州', ['幽州', '戈鋋']), relation('compared_to', 'i2', 'i3', '以群星的罗列描写兵器的密布', ['戈鋋若罗星'])
  ], ['森严'], ['medium', 'medium', 'unclear'], { markers: [{ surface: '十月', meaning: '叙述抵达的月份，不作为独立实体。' }] }, [], '02-spears-stars'),

  example('吹送与可能发生的酣饮', '长风万里送秋雁，对此可以酣高楼', '长风吹送秋雁，空间开阔，面对此景可以在高楼畅饮。', [
    entity('i1', ['长风'], '远来的长风', 'environment'), entity('i2', ['秋雁'], '秋日的雁群', 'organism'), entity('i3', ['高楼'], '高楼', 'place')
  ], [
    relation('acts_on', 'i1', 'i2', '长风吹送雁群', ['长风万里送秋雁']), relation('other', null, 'i3', '未明说的人可以在高楼上畅饮', ['可以酣高楼'], 'possible')
  ], ['豪迈', '开阔'], ['high', 'low', 'high', 'positive'], { markers: [{ surface: '秋', meaning: '秋日季节背景。' }] }, ['酣饮主体没有明说；other 保留含义，待确认后再决定是否扩展关系类型。'], '03-wind-geese'),

  example('目睹与推进', '坐见幽州骑，长驱河洛昏', '目睹幽州骑兵长驱深入河洛，河洛呈现昏暗动荡。', [
    entity('i1', ['幽州骑'], '幽州骑兵', 'person'), entity('i2', ['河洛'], '河洛地区', 'place')
  ], [
    relation('observes', null, 'i1', '未明说的观看者目睹骑兵', ['坐见幽州骑']), relation('moves_toward', 'i1', 'i2', '骑兵长驱深入河洛', ['幽州骑', '长驱河洛']), relation('changes', 'i2', null, '河洛呈现昏暗或局势动荡', ['河洛昏'])
  ], ['动荡', '压抑'], ['high', 'high', 'unclear', 'negative'], {}, ['坐见不据字面确定坐姿，其古义需结合原诗核对。', '昏的具体成因没有明说，不强制补充扬尘。'], '04-cavalry-darkness'),

  example('花期与白发', '黄华自与西风约，白发先从远客生', '花与秋风相应，远客白发早生；花期与人的衰老形成对照。', [
    entity('i1', ['黄华'], '秋日菊花', 'organism'), entity('i2', ['西风'], '秋风', 'environment'), entity('i3', ['白发'], '白头发'), entity('i4', ['远客'], '客居远方的人', 'person')
  ], [
    relation('corresponds_with', 'i1', 'i2', '花与秋风仿佛相约呼应', ['黄华自与西风约']), relation('grows_from', 'i3', 'i4', '白发从远客身上长出', ['白发先从远客生']), relation('contrasts_with', 'i1', 'i3', '花应时而开与人的白发早生相对照', ['黄华自与西风约', '白发先从远客生'])
  ], ['感伤', '客愁'], ['low', 'medium', 'unclear', 'negative'], { markers: [{ surface: '先', meaning: '白发早生或先于某种预期，比较参照未明。' }], note: '保留先的提示，不补成确定的先后链或循环。' }, ['先的比较参照需要更多语境。'], '05-flowers-grey-hair'),

  example('缺席是消失的结果', '千山鸟飞绝，万径人踪灭', '山间没有飞鸟，路径无人迹，呈现空寂。', [
    entity('i1', ['千山'], '群山', 'place'), entity('i2', ['鸟'], '飞鸟', 'organism', 'scene', 'absent'), entity('i3', ['万径'], '众多小径', 'place'), entity('i4', ['人踪'], '人的踪迹', 'object', 'scene', 'absent')
  ], [
    relation('disappears', 'i2', null, '飞鸟活动绝迹', ['鸟飞绝']), relation('disappears', 'i4', null, '人的踪迹消失', ['人踪灭'])
  ], ['空寂'], ['low', 'low', 'high'], { markers: [{ surface: '绝', meaning: '活动已断绝的结果状态。' }, { surface: '灭', meaning: '踪迹已不在的结果状态。' }] }, [], '06-heldout-negation'),

  example('同一条船的复指', '风送归舟，舟载归人', '风吹送返回的船，这条船承载返回的人。', [
    entity('i1', ['风'], '风', 'environment'), entity('i2', ['归舟', '舟'], '归舟'), entity('i3', ['归人'], '返回的人', 'person')
  ], [
    relation('acts_on', 'i1', 'i2', '风送归舟', ['风送归舟']), relation('carries', 'i2', 'i3', '同一条舟承载归人', ['舟载归人'])
  ], [], ['medium', 'low', 'unclear'], {}, [], '07-heldout-roles'),

  example('动作被否定，主体不一定缺席', '鸟不飞', '鸟没有飞行，动作被否定。', [entity('i1', ['鸟'], '鸟', 'organism')], [
    relation('moves', 'i1', null, '飞行被否定，没有明说移动参照', ['不飞'], 'negated')
  ], [], ['low', 'unclear', 'unclear']),

  example('假设未被当成已发生', '若风起，舟便行', '假设风起，舟才随之行进。', [
    entity('i1', ['风'], '风', 'environment', 'scene', 'unclear'), entity('i2', ['舟'], '舟', 'object', 'scene', 'unclear')
  ], [
    relation('changes', 'i1', null, '在假设条件下风起', ['若风起'], 'conditional'), relation('moves', 'i2', null, '舟行以风起为条件', ['若风起，舟便行'], 'conditional')
  ], [], ['unclear', 'unclear', 'unclear'], {}, ['只是条件句，不能确认风起或舟行已发生；画面是否趋近或完成由视觉设计决定。'])
];
