import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fixture,widths} from '../scripts/verify-dashboard-responsive.mjs';
const loadRuntime=createRequire(import.meta.url);
const {chromium}=loadRuntime('C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://localhost:3001';
const browser=await chromium.launch({headless:true});
const checks=[],failures=[];
try {
 const context=await browser.newContext({reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin&&!url.pathname.startsWith('/api'))return route.continue();
  let data=fixture(url.href,'MANAGER');
  if(url.pathname.endsWith('/payments'))data={data:[['CASH','10051.00'],['CARD','4800.00'],['WALLET','800.00'],['BANK_TRANSFER','1200.00']].map(([paymentMethod,amount],i)=>({id:`p${i}`,billId:'bill',paymentMethod,amount,status:'SUCCESS',paymentDate:new Date().toISOString(),createdAt:new Date().toISOString()})),meta:{total:4,totalPages:1,page:1,limit:100}};
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'},body:JSON.stringify(data)});
 });
 const page=await context.newPage();
 page.on('pageerror',e=>failures.push({error:e.message}));
 await page.goto(`${origin}/dashboard/manager`,{waitUntil:'networkidle'});
 const card=page.locator('section').filter({has:page.getByRole('heading',{name:'Sales by Payment Method',exact:true})});
 await card.locator('li').first().waitFor();
 for(const width of widths){
  await page.setViewportSize({width,height:width===820?390:900});
  for(const collapsed of width>=1024?[false,true]:[false]){
   const toggle=page.getByRole('button',{name:collapsed?'Collapse sidebar':'Expand sidebar',exact:true});
   if(await toggle.isVisible())await toggle.click();
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const result=await card.evaluate(e=>{const r=e.getBoundingClientRect();return {cardWidth:r.width,rows:e.querySelectorAll('li').length,clipped:[...e.querySelectorAll('li,li span,svg,ul')].filter(n=>{const b=n.getBoundingClientRect();return b.left<r.left+1||b.right>r.right-1||n.scrollWidth>n.clientWidth+2;}).map(n=>({text:n.textContent,class:n.className})),labels:[...e.querySelectorAll('li')].map(n=>n.textContent)};});
   checks.push({width,collapsed,...result});if(result.rows!==4||result.clipped.length)failures.push({width,collapsed,...result});
   if([320,1920].includes(width))await card.screenshot({path:`.responsive-checks/payment-methods-${width}-${collapsed?'collapsed':'expanded'}.png`});
  }
 }
}finally{await browser.close();fs.writeFileSync('.responsive-checks/payment-methods-results.json',JSON.stringify({checks,failures},null,2));}
console.log(JSON.stringify({checks:checks.length,failures},null,2));
if(failures.length)process.exitCode=1;
