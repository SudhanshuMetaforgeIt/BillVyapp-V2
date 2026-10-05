import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fixture,widths,long} from '../scripts/verify-dashboard-responsive.mjs';
const loadRuntime=createRequire(import.meta.url);
const {chromium}=loadRuntime('C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://localhost:3001',checks=[],failures=[],requests=[];
let active=true,rejectStatus=false;
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin===origin&&!url.pathname.startsWith('/api'))return route.continue();
  let data=fixture(url.href,'SUPER_ADMIN');
  if(url.pathname.endsWith('/platform-plans'))data={data:[{id:'plan',name:long,description:'Full subscription plan description without truncation for all franchise locations',priceMonthly:'2499',billingCycle:'yearly',isCustom:false,iconKey:'professional',features:[],isActive:active,businessCount:24},{id:'custom',name:'Enterprise Custom',description:'Contact sales for pricing and custom dates',priceMonthly:null,billingCycle:'custom',isCustom:true,iconKey:'custom',features:[],isActive:false,businessCount:0}],meta:{total:2,page:1,limit:5,totalPages:1}};
  if(url.pathname.endsWith('/platform-plans/plan/status')){
   const payload=route.request().postDataJSON();requests.push({method:route.request().method(),payload});
   if(rejectStatus)return route.fulfill({status:500,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true'},body:JSON.stringify({message:'Status update failed for verification'})});
   active=payload.isActive;
   data={id:'plan',name:long,description:'Full subscription plan description without truncation for all franchise locations',priceMonthly:'2499',billingCycle:'yearly',isCustom:false,iconKey:'professional',features:[],isActive:active,businessCount:24};
  }
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'},body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.on('pageerror',e=>failures.push({error:e.message}));
 await page.goto(`${origin}/dashboard/super_admin/plans`,{waitUntil:'networkidle'});
 await page.locator('.app-plans-cards li,.app-plans-table tbody tr').first().waitFor({state:'attached'});
 for(const width of widths){
  await page.setViewportSize({width,height:width===820?390:900});
  for(const collapsed of width>=1024?[false,true]:[false]){
   const toggle=page.getByRole('button',{name:collapsed?'Collapse sidebar':'Expand sidebar',exact:true});if(await toggle.isVisible())await toggle.click();
   await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(r));await Promise.all(document.querySelector('aside').getAnimations().map(a=>a.finished));});
   const result=await page.evaluate(()=>{
    const table=document.querySelector('.app-plans-table'),cards=document.querySelector('.app-plans-cards'),e=getComputedStyle(table).display==='none'?cards:table,r=e.getBoundingClientRect();
    return {mode:e===table?'table':'cards',width:r.width,overflow:e.scrollWidth>e.clientWidth+1,clipped:[...e.querySelectorAll('p,td,th,span,button,dd')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&getComputedStyle(n).position!=='absolute'&&(b.left<r.left-1||b.right>r.right+1||n.scrollWidth>n.clientWidth+2);}).map(n=>({tag:n.tagName,text:n.textContent,class:n.className})),fields:e.textContent,document:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   checks.push({width,collapsed,...result});if(result.overflow||result.clipped.length||result.document>result.viewport+1||![long,'Full subscription plan description without truncation for all franchise locations','Yearly','₹2,499.00/month','Active','Custom/month','Inactive'].every(value=>result.fields.includes(value)))failures.push({width,collapsed,...result});
   const action=page.getByRole('button',{name:`Edit ${long}`,exact:true});
   const more=page.getByRole('button',{name:`More actions for ${long}`,exact:true});
   if(!await action.isVisible()||!await more.isVisible())failures.push({width,collapsed,error:'Missing visible actions'});
   await more.click();await page.getByRole('menu').waitFor();
   const menu=page.getByRole('menu');const rect=await menu.boundingBox();
   if(!rect||rect.x<0||rect.x+rect.width>width)failures.push({width,collapsed,error:'Menu outside viewport'});
   await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});
   await more.click();await page.getByRole('menuitem',{name:'Edit plan',exact:true}).click();await page.getByRole('dialog').waitFor();
   if(!await page.getByRole('dialog').locator('input').evaluateAll((inputs,name)=>inputs.some(input=>input.value===name),long))failures.push({width,collapsed,error:'Edit plan is not prefilled'});
   await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).first().click();await page.getByRole('dialog').waitFor({state:'hidden'});
   if([320,1920].includes(width))await page.locator('.app-panel.app-surface-card').screenshot({path:`.responsive-checks/plans-${width}-${collapsed?'collapsed':'expanded'}.png`});
  }
 }
 await page.setViewportSize({width:1920,height:900});
 const more=page.getByRole('button',{name:`More actions for ${long}`,exact:true});
 const visibleRows=page.locator('.app-plans-table:visible tbody tr,.app-plans-cards:visible li').first();
 await more.click();await page.getByRole('menuitem',{name:'Deactivate plan',exact:true}).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.app-plans-table tbody tr')][0]?.textContent.includes('Inactive'));
 if(!await visibleRows.getByText('Inactive',{exact:true}).isVisible())failures.push({error:'Deactivate did not refresh row'});
 await more.focus();await page.keyboard.press('ArrowDown');await page.getByRole('menu').waitFor();
 await page.getByRole('menuitem',{name:'Activate plan',exact:true}).focus();await page.keyboard.press('Enter');
 await page.waitForFunction(()=>[...document.querySelectorAll('.app-plans-table tbody tr')][0]?.textContent.includes('Active'));
 if(!await visibleRows.getByText('Active',{exact:true}).isVisible())failures.push({error:'Activate did not refresh row'});
 rejectStatus=true;await more.click();await page.getByRole('menuitem',{name:'Deactivate plan',exact:true}).click();
 await page.getByText('Status update failed for verification',{exact:true}).waitFor();
 if(!await visibleRows.getByText('Active',{exact:true}).isVisible())failures.push({error:'Failed mutation changed row'});
 if(JSON.stringify(requests)!==JSON.stringify([{method:'PATCH',payload:{isActive:false}},{method:'PATCH',payload:{isActive:true}},{method:'PATCH',payload:{isActive:false}}]))failures.push({error:'Unexpected status requests',requests});
 checks.push({statusActions:'deactivate, activate by keyboard, failed request preserves status',requests});
}finally{await browser.close();fs.writeFileSync('.responsive-checks/plans-layout-results.json',JSON.stringify({checks,failures},null,2));}
console.log(JSON.stringify({checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1;

