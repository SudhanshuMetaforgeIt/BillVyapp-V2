import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fixture} from '../scripts/verify-dashboard-responsive.mjs';
const loadRuntime=createRequire(import.meta.url);
const {chromium}=loadRuntime('C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://localhost:3001', checks=[],failures=[];
const browser=await chromium.launch({headless:true});
async function check(locator,label,axis){
 const result=await locator.evaluate((e,axis)=>{const style=getComputedStyle(e);e[axis==='x'?'scrollLeft':'scrollTop']=80;return {hidden:style.scrollbarWidth==='none'&&getComputedStyle(e,'::-webkit-scrollbar').display==='none',gutter:style.scrollbarGutter,position:e[axis==='x'?'scrollLeft':'scrollTop'],hasOverflow:axis==='x'?e.scrollWidth>e.clientWidth:e.scrollHeight>e.clientHeight};},axis);
 checks.push({label,...result});if(!result.hidden||result.gutter!=='auto'||(result.hasOverflow&&result.position===0))failures.push({label,...result});
}
try{
 for(const role of ['SUPER_ADMIN','ADMIN','MANAGER','STAFF']){
  const context=await browser.newContext({viewport:{width:320,height:700},reducedMotion:'reduce'});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin&&!url.pathname.startsWith('/api'))return route.continue();return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'},body:JSON.stringify(fixture(url.href,role))});});
  const page=await context.newPage(),base=`${origin}/dashboard/${role.toLowerCase()}`;
  await page.goto(base,{waitUntil:'networkidle'});await check(page.locator('main'),`${role} main vertical`,'y');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();await check(page.locator('aside[aria-hidden="false"] nav'),`${role} navigation vertical`,'y');await page.getByRole('button',{name:'Close navigation',exact:true}).click();
  if(role!=='STAFF'){
   await page.goto(`${base}/memberships`,{waitUntil:'networkidle'});await check(page.locator('.app-table-scroll').first(),`${role} table horizontal`,'x');
   await page.locator('button[aria-haspopup="listbox"]').first().click();await check(page.getByRole('listbox'),`${role} portalled dropdown`,'y');
  }
  await context.close();
 }
}finally{await browser.close();fs.writeFileSync('.responsive-checks/hidden-scrollbars-results.json',JSON.stringify({checks,failures},null,2));}
console.log(JSON.stringify({checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1;
