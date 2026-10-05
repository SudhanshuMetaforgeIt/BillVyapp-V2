import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fixture,widths,long} from '../scripts/verify-dashboard-responsive.mjs';
const loadRuntime=createRequire(import.meta.url);
const {chromium}=loadRuntime('C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://localhost:3001',checks=[],failures=[];
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.origin===origin&&!url.pathname.startsWith('/api'))return route.continue();
  let data=fixture(url.href,'SUPER_ADMIN');
  if(url.pathname.endsWith('/franchises'))data={data:[{id:'business',name:long,code:'VERY-LONG-BUSINESS-CODE-1234567890',email:'verylongowneremailaddress@verylongbusinessdomain.example.test',phone:'9876543210',isActive:true,currentPlanName:'Professional membership for all franchise branches',subscriptionActive:true,createdAt:new Date().toISOString()}],meta:{total:1,page:1,limit:10,totalPages:1}};
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'},body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.on('pageerror',e=>failures.push({error:e.message}));
 await page.goto(`${origin}/dashboard/super_admin/businesses`,{waitUntil:'networkidle'});
 await page.locator('.app-businesses-cards li,.app-businesses-table tbody tr').first().waitFor({state:'attached'});
 for(const width of widths){
  await page.setViewportSize({width,height:width===820?390:900});
  for(const collapsed of width>=1024?[false,true]:[false]){
   const toggle=page.getByRole('button',{name:collapsed?'Collapse sidebar':'Expand sidebar',exact:true});if(await toggle.isVisible())await toggle.click();
   await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(r));await Promise.all(document.querySelector('aside').getAnimations().map(a=>a.finished));});
   const result=await page.evaluate(()=>{
    const table=document.querySelector('.app-businesses-table'),cards=document.querySelector('.app-businesses-cards'),e=getComputedStyle(table).display==='none'?cards:table,r=e.getBoundingClientRect();
    return {mode:e===table?'table':'cards',width:r.width,overflow:e.scrollWidth>e.clientWidth+1,clipped:[...e.querySelectorAll('p,td,th,span,button')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&getComputedStyle(n).position!=='absolute'&&(b.left<r.left-1||b.right>r.right+1||n.scrollWidth>n.clientWidth+2);}).map(n=>({tag:n.tagName,text:n.textContent,class:n.className})),fields:e.textContent,document:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   checks.push({width,collapsed,...result});if(result.overflow||result.clipped.length||result.document>result.viewport+1||!['VERY-LONG-BUSINESS-CODE-1234567890','verylongowneremailaddress@verylongbusinessdomain.example.test','Professional membership for all franchise branches','Active'].every(value=>result.fields.includes(value)))failures.push({width,collapsed,...result});
   const action=page.getByRole('button',{name:`More actions for ${long}`,exact:true});await action.click();await page.getByRole('menu').waitFor();await page.keyboard.press('Escape');
   if([320,1920].includes(width))await page.locator('.app-panel.app-surface-card').screenshot({path:`.responsive-checks/business-${width}-${collapsed?'collapsed':'expanded'}.png`});
  }
 }
}finally{await browser.close();fs.writeFileSync('.responsive-checks/business-layout-results.json',JSON.stringify({checks,failures},null,2));}
console.log(JSON.stringify({checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1;
