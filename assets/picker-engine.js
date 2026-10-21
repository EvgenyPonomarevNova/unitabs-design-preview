'use strict';
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.UnitabsPicker = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  const labels = {coat:'Кожа и шерсть',immune:'Иммунитет и баланс витаминов',steril:'Кастрированные/стерилизованные',growth:'Рост и развитие',mother:'Беременность и лактация',hairball:'Выведение шерсти',digest:'Пищеварение и поддержка полезных бактерий кишечника',joints:'Суставы и связки',bones:'Кости и зубы',habit:'Поедание фекалий',weight:'Контроль веса'};
  function availableNeeds(answers, rules) {
    return [...new Set(rules.filter(row => row.animal === answers.animal && (row.age === answers.age || row.age === 'any')).map(row => row.need))].filter(need => {
      // Mirror only existing, confirmed age exclusions from select(); uncertain cases still lead to consultation.
      if(answers.animal==='cat'&&answers.age==='young') {
        const before6=['under4weeks','under6'].includes(answers.catStage);
        if(need==='hairball'&&before6)return false;
        if(need==='steril'&&(before6||answers.catStage==='sixSeven'))return false;
      }
      if(answers.animal==='dog'&&answers.age==='young'&&need==='joints'&&(answers.dogSize!=='large'||answers.puppyStage==='under3'))return false;
      return true;
    });
  }
  function select(answers, products, rules) {
    if (answers.special) return {items:[],consult:true,reason:'При заболеваниях и очень юном возрасте, приём других препаратов требует индивидуального решения. Мы не подбираем витамины автоматически — позвоните в службу заботы или покажите питомца ветеринарному специалисту.'};
    const rule = rules.find(row => row.animal === answers.animal && (row.age === answers.age || row.age === 'any') && row.need === answers.need);
    if (!rule) return {items:[],consult:true,reason:'Для этого сочетания возраста и потребности в таблице нет подтверждённого варианта. Обратитесь в службу заботы.'};
    if (rule.row === 18) return {items:[],consult:true,reason:'Для кошек старше 7 лет выбор комплекса для поддержки иммунитета требует индивидуального уточнения. Обратитесь в службу заботы.'};
    let ids = [...rule.skus];
    if (answers.animal === 'cat' && answers.age === 'young') {
      const stage = answers.catStage;
      const before6 = stage === 'under4weeks' || stage === 'under6';
      const before8 = before6 || stage === 'sixSeven';
      if (answers.need === 'hairball' && before6) return {items:[],consult:true,reason:'Malt+Vit применяется с 6 месяцев. Для более юного котёнка эта потребность в таблице не имеет подходящего продукта.'};
      if (answers.need === 'coat') ids = before6 ? ids.filter(id => ['U304','U3042','U313'].includes(id)) : ids.filter(id => !['U304','U3042'].includes(id));
      if (answers.need === 'steril' && before8) return {items:[],consult:true,reason:'SterilCat предназначен для питомцев старше 8 месяцев. Для более юного котёнка выбор следует обсудить со специалистом.'};
      if (answers.need === 'steril') ids = ids.filter(id => !['U304','U3042'].includes(id));
      if (stage === 'under4weeks') ids = ids.filter(id => !['U304','U3042','U308'].includes(id));
    }
    if (answers.animal === 'dog') {
      const large = answers.dogSize === 'large';
      ids = ids.filter(id => large ? !['U203','U2032','U206'].includes(id) : !['U202','U2022','U205'].includes(id));
      if (answers.age === 'young') {
        if (answers.puppyStage !== 'over6') ids = ids.filter(id => !['U202','U2022','U203','U2032'].includes(id));
        if (!large || answers.puppyStage === 'under3') ids = ids.filter(id => !['U201','U2012'].includes(id));
      }
      if (answers.age === 'adult' && answers.need === 'joints' && !large && !answers.overweight) return {items:[],consult:true,reason:'Для взрослой собаки мелкой породы без избыточного веса показания к ArthroActive в предоставленной инструкции прямо не указаны. Уточните выбор со специалистом.'};
      if (answers.age === 'adult' && answers.need === 'immune') ids = ids.filter(id => answers.adultStage === 'over18' ? !['U207','U2072'].includes(id) : !['U205','U206'].includes(id));
      if (answers.need === 'weight' && !answers.weightClear) return {items:[],consult:true,reason:'У SlimComplex есть ограничения для беременных и кормящих животных, при заболеваниях и приёме лекарств. До выбора продукта обсудите эти условия со специалистом.'};
    }
    const groups = new Map();
    for (const sku of ids) {
      const product = products.find(item => item.sku === sku); if (!product) continue;
      if (!groups.has(product.name)) groups.set(product.name,[]);
      groups.get(product.name).push(product);
    }
    const items = [...groups.values()].slice(0,3).map(variants => ({product:variants[0],variants}));
    return {items,consult:!items.length,reason:items.length ? '' : 'Для указанного возраста подтверждённого продукта не найдено. Уточните выбор в службе заботы.',conditions:rule.conditions,status:rule.status};
  }
  function dose(product, weight) {
    if (!Number.isFinite(weight) || weight <= 0) return null;
    if (product.form === 'Капли') return {table:true,text:'Суточная доза капель определяется по таблице инструкции. Границы диапазонов требуют подтверждения — автоматический расчёт не выполняется.'};
    let value, unit;
    if (product.sku === 'U310') {value = weight <= 5 ? 1 : weight / 5; unit = 'таб.';}
    else if (product.form === 'Паста' && ['U305','U306','U307','U308','U309'].includes(product.sku)) {value = weight; unit = 'г пасты';}
    else if (product.form === 'Таблетки' && product.dosePerKg) {value = weight / product.dosePerKg; unit = 'таб.';}
    else return {text:'Способ применения уточните в инструкции конкретного продукта.'};
    const displayed = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:6}).format(value);
    return {value,unit,text:unit==='г пасты'?`${displayed} г пасты в сутки — из расчёта 1 г на 1 кг. Способ применения проверьте в инструкции.`:`${displayed} ${unit} в сутки. Расчёт без округления до целой или половины таблетки; правило деления уточните у специалиста.`};
  }
  return {labels,availableNeeds,select,dose};
});
