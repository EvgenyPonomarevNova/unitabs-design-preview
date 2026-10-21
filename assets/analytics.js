'use strict';
// Local, consent-neutral event contract. No tracker, cookie, storage or network calls.
(() => {
  const events=new Set(['page_view','navigation','picker_start','picker_step','picker_result','catalog_filter','catalog_more','variant_change','product_details','buy_open','retailer_click','pdf_open','care_success','season_change']);
  const products=JSON.parse(document.querySelector('#catalog-data').textContent);const skus=new Set(products.map(p=>p.sku));
  function track(event,params={}){
    if(!events.has(event))return;
    const clean={page:document.body.dataset.page};
    if(skus.has(params.sku))clean.sku=params.sku;
    if(Number.isInteger(params.step)&&params.step>=0&&params.step<=3)clean.step=params.step;
    if(typeof params.consult==='boolean')clean.consult=params.consult;
    if(['animal','need','form','age','stage','pack','q'].includes(params.filter))clean.filter=params.filter;
    if(['podbor','products','care','about','articles','faq','where-to-buy','seasons','privacy-policy','terms'].includes(params.target))clean.target=params.target;
    document.dispatchEvent(new CustomEvent('unitabs:analytics',{detail:{event,params:clean}}));
  }
  window.UnitabsAnalytics=Object.freeze({track});
  track('page_view');
  document.addEventListener('click',event=>{
    const link=event.target.closest('a');const button=event.target.closest('button');
    if(button?.id==='show-more')track('catalog_more');
    if(button?.matches('[data-hero-season-go],[data-season-prev],[data-season-next]'))track('season_change');
    if(!link)return;
    if(link.dataset.buy){track('buy_open',{sku:link.dataset.buy});return;}
    const url=new URL(link.href,location.href);
    if(url.protocol==='http:'||url.protocol==='https:'){
      if(url.origin!==location.origin){if(link.closest('#buy-dialog,#purchase-options,.direct-market-links,#where-to-buy'))track('retailer_click',{sku:document.querySelector('#buy-dialog[open]')?.dataset.sku});return;}
      if(url.pathname.endsWith('.pdf'))track('pdf_open');
      else if(url.pathname.startsWith('/unitabs-design-preview/products/'))track('product_details',{sku:link.closest('[data-card]')?.dataset.sku});
      else track('navigation',{target:url.hash.slice(1)||url.pathname.split('/unitabs-design-preview/')[1]});
    }
  });
  document.querySelector('#catalog-filters')?.addEventListener('change',event=>track('catalog_filter',{filter:event.target.name}));
  document.querySelector('#catalog-filters [name=q]')?.addEventListener('change',()=>track('catalog_filter',{filter:'q'}));
  document.querySelector('#advanced-filters')?.addEventListener('change',event=>track('catalog_filter',{filter:event.target.name}));
  document.addEventListener('change',event=>{if(event.target.matches('[data-pack-select]'))track('variant_change',{sku:event.target.value});});
})();
