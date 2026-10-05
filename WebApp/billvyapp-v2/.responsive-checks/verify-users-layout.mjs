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
  const user={id:'user',firstName:long,lastName:'Verification',email:'verylonguseremailaddress@verylongbusinessdomain.example.test',phone:'9876543210',role:{id:'manager',code:'MANAGER',name:'Salon Manager'},franchiseId:'franchise',salonId:'salon',isActive:true,lastLoginAt:'2026-10-01T10:00:00.000Z',createdAt:'2026-09-01T10:00:00.000Z',salary:'5000'};
  if(url.pathname.endsWith('/roles'))data=[{id:'manager',code:'MANAGER',name:'Salon Manager',isActive:true}];
  if(url.pathname.endsWith('/users'))data={data:[user],meta:{total:1,page:1,limit:10,totalPages:1}};
  if(url.pathname.endsWith('/users/user'))data=user;
  if(url.pathname.endsWith('/franchises/franchise'))data={id:'franchise',name:'A complete very long franchise business name for wrapping verification'};
  await route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'},body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.on('pageerror',e=>failures.push({error:e.message}));
 await page.goto(`${origin}/dashboard/super_admin/users`,{waitUntil:'networkidle'});
 await page.locator('.app-users-cards li,.app-users-table tbody tr').first().waitFor({state:'attached'});
 for(const width of widths){
  await page.setViewportSize({width,height:width===820?390:900});
  for(const collapsed of width>=1024?[false,true]:[false]){
   const toggle=page.getByRole('button',{name:collapsed?'Collapse sidebar':'Expand sidebar',exact:true});if(await toggle.isVisible())await toggle.click();
   await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(r));await Promise.all(document.querySelector('aside').getAnimations().map(a=>a.finished));});
   const result=await page.evaluate(()=>{
    const table=document.querySelector('.app-users-table'),cards=document.querySelector('.app-users-cards'),e=getComputedStyle(table).display==='none'?cards:table,r=e.getBoundingClientRect();
    return {mode:e===table?'table':'cards',width:r.width,overflow:e.scrollWidth>e.clientWidth+1,clipped:[...e.querySelectorAll('p,td,th,span,button,dd')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&getComputedStyle(n).position!=='absolute'&&(b.left<r.left-1||b.right>r.right+1||n.scrollWidth>n.clientWidth+2);}).map(n=>({tag:n.tagName,text:n.textContent,class:n.className})),fields:e.textContent,document:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   checks.push({width,collapsed,...result});if(result.overflow||result.clipped.length||result.document>result.viewport+1||![long+' Verification','verylonguseremailaddress@verylongbusinessdomain.example.test','A complete very long franchise business name for wrapping verification','Manager','Active','01 Oct 2026'].every(value=>result.fields.includes(value)))failures.push({width,collapsed,...result});
   const action=page.getByRole('button',{name:`View ${long} Verification`,exact:true});
   const status=page.getByRole('button',{name:`Deactivate ${long} Verification`,exact:true});
   if(!await action.isVisible()||!await status.isVisible())failures.push({width,collapsed,error:'Missing visible actions'});
   await action.click();await page.getByRole('dialog').waitFor();await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).first().click();await page.getByRole('dialog').waitFor({state:'hidden'});
   if([320,1920].includes(width))await page.locator('.app-panel.app-surface-card').screenshot({path:`.responsive-checks/users-${width}-${collapsed?'collapsed':'expanded'}.png`});
  }
 }
}finally{await browser.close();fs.writeFileSync('.responsive-checks/users-layout-results.json',JSON.stringify({checks,failures},null,2));}
console.log(JSON.stringify({checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1;

