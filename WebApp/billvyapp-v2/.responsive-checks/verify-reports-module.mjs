import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fixture,widths,long} from '../scripts/verify-dashboard-responsive.mjs';
const loadRuntime=createRequire(import.meta.url);
const {chromium}=loadRuntime('C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://localhost:3001',checks=[],failures=[],requests=[];
let failRevenue=false, empty=false;
function analytics(q){
 const summary={totalRevenue:empty?'0.00':'1500.00',successfulPayments:empty?0:3,totalPayments:empty?0:4,failedPayments:empty?0:1,userCount:4,customerCount:2,franchiseCount:1,salonCount:1,paymentSuccessRate:empty?null:75,averageTransactionValue:empty?null:500};
 const row={id:'f',name:long,franchise:long,salons:1,transactions:3,revenue:1500,averageTransaction:500,customers:2,averageBill:750,memberships:1,servicesSold:3};
 return {scope:{dateFrom:q.dateFrom,dateTo:q.dateTo,franchiseId:q.franchiseId??null,franchiseName:q.franchiseId?long:null,salonId:q.salonId??null,salonName:q.salonId?long:null,timeZone:'Asia/Kolkata'},summary,
 revenue:{series:empty?[]:[{period:q.dateFrom,revenue:1500,transactions:3,averageTransaction:500}],methods:empty?[]:[{method:'UPI',attempts:4,successful:3,revenue:1500}],statuses:empty?[]:[{status:'SUCCESS',attempts:3},{status:'FAILED',attempts:1}]},
 business:{franchises:empty?[]:[row],salons:empty?[]:[row]},
 insights:{customers:empty?[{customersServed:0,newCustomers:0}]:[{customersServed:2,newCustomers:1,returningCustomers:1,billedRevenue:1500,averageCustomerSpend:750}],roles:[{role:'SUPER_ADMIN',users:1},{role:'MANAGER',users:3}],userFranchises:[{franchise:long,users:4}],userSalons:[{salon:long,users:4}]},
 details:{memberships:empty?[]:[{members:1,newMemberships:1,activeMemberships:1,expiredMemberships:0,membershipRevenue:100,redemptions:2,benefitVisits:1,benefitUnits:2,benefitSavings:500}],plans:empty?[]:[{id:'p',name:long,salon:long,members:1,revenue:100,activeMembers:1,redemptions:2}],services:empty?[]:[{id:'service',name:long,salon:long,transactions:3,quantity:3,revenue:1400,averagePrice:1400/3}]}};
}
const report=(q,id)=>({id,name:`Business Report ${long}`,description:long,type:'business',typeLabel:'Business',format:'excel',dateFrom:q.dateFrom,dateTo:q.dateTo,dateRangeLabel:`${q.dateFrom} – ${q.dateTo}`,franchiseId:q.franchiseId??null,franchiseName:q.franchiseId?long:null,generatedById:'user',generatedBy:long,generatedOn:'2026-10-04T12:00:00Z',snapshot:{metrics:analytics(q).summary,analytics:analytics(q),salonId:q.salonId??null,salonName:q.salonId?long:null},createdAt:'2026-10-04T12:00:00Z',updatedAt:'2026-10-04T12:00:00Z'});
let records=[report({dateFrom:'2026-10-01',dateTo:'2026-10-04'},'report')];
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1920,height:900},reducedMotion:'reduce'});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===origin&&!url.pathname.startsWith('/api'))return route.continue();
  const q=Object.fromEntries(url.searchParams),headers={'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
  let data=fixture(url.href,'SUPER_ADMIN');
  if(url.pathname.includes('/platform-reports')){
   requests.push({path:url.pathname,q,method:req.method()});
   if(url.pathname.endsWith('/filter-options'))data={franchises:[{id:'f',name:long},{id:'other',name:'Other franchise'}],salons:[{id:'s',name:long,franchiseId:'f'},{id:'other-s',name:'Other salon',franchiseId:'other'}]};
   else if(url.pathname.endsWith('/analytics')){
    if(failRevenue&&q.section==='revenue')return route.fulfill({status:500,headers,contentType:'application/json',body:JSON.stringify({message:'Revenue unavailable'})});
    const all=analytics(q);data={scope:all.scope,[q.section]:all[q.section]};
   }else if(url.pathname.endsWith('/generate')){const body=req.postDataJSON();requests.push({generation:body});data=report(body,'generated-'+records.length);records=[data,...records];}
   else if(url.pathname.endsWith('/download'))return route.fulfill({status:200,headers:{...headers,'content-disposition':'attachment; filename="report.csv"'},contentType:'text/csv',body:'field,value\ntotalRevenue,1500.00\nsuccessfulPayments,3\n'});
   else {const filtered=records.filter(r=>(!q.franchiseId||r.franchiseId===q.franchiseId)&&(!q.salonId||r.snapshot.salonId===q.salonId));data={data:filtered,meta:{page:1,limit:7,total:filtered.length,totalPages:1},summary:{total:filtered.length,byType:[{type:'business',count:filtered.length}]}};}
  }
  return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.on('pageerror',e=>failures.push({error:e.message}));
 await page.goto(`${origin}/dashboard/super_admin/reports`,{waitUntil:'networkidle'});
 await page.getByText('Total Revenue',{exact:true}).waitFor();
 async function select(name,label){await page.getByRole('button',{name,exact:true}).click();await page.getByRole('option',{name:label,exact:true}).click();await page.waitForLoadState('networkidle');}
 for(const width of widths){await page.setViewportSize({width,height:width===820?390:900});for(const collapsed of width>=1024?[false,true]:[false]){
  const toggle=page.getByRole('button',{name:collapsed?'Collapse sidebar':'Expand sidebar',exact:true});if(await toggle.isVisible())await toggle.click();
  await page.evaluate(async()=>{await new Promise(r=>requestAnimationFrame(r));await Promise.all(document.querySelector('aside').getAnimations().map(a=>a.finished));});
  const result=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,main:document.querySelector('main').scrollWidth,available:document.querySelector('main').clientWidth,clipped:[...document.querySelectorAll('main .app-report-table,main .app-report-cards')].filter(e=>e.getBoundingClientRect().width).flatMap(e=>[...e.querySelectorAll('td,dd,button,span')].filter(n=>n.getBoundingClientRect().width&&n.scrollWidth>n.clientWidth+2).map(n=>({tag:n.tagName,text:n.textContent}))) }));
  checks.push({width,collapsed,...result});if(result.document>width+1||result.main>result.available+1||result.clipped.length)failures.push({width,collapsed,...result});
  if([320,1920].includes(width))await page.screenshot({path:`.responsive-checks/reports-${width}-${collapsed?'collapsed':'expanded'}.png`,fullPage:true});
 }}
 await page.setViewportSize({width:1920,height:900});
 await select('Date range preset','Last 7 Days');
 const from=await page.getByLabel('Date from',{exact:true}).inputValue(),to=await page.getByLabel('Date to',{exact:true}).inputValue();
 await select('Filter by franchise',long);await select('Filter by salon',long);await select('Revenue interval','Week');
 for(const section of ['summary','revenue','business','insights','details'])if(!requests.some(r=>r.q?.section===section&&r.q.dateFrom===from&&r.q.dateTo===to&&r.q.franchiseId==='f'&&r.q.salonId==='s'))failures.push({error:'Section filters mismatch',section});
 await page.getByRole('button',{name:'Generate Report',exact:true}).click();await page.getByRole('dialog').waitFor();
 async function checkDialog(label){for(const width of widths){await page.setViewportSize({width,height:width===820?390:900});const result=await page.getByRole('dialog').evaluate(e=>{const r=e.getBoundingClientRect();return {viewport:innerWidth,height:innerHeight,left:r.left,right:r.right,top:r.top,bottom:r.bottom,overflow:e.scrollWidth>e.clientWidth+1};});checks.push({dialog:label,width,...result});if(result.left<0||result.right>width+1||result.top<0||result.bottom>result.height+1||result.overflow)failures.push({dialog:label,width,...result});}await page.setViewportSize({width:1920,height:900});}
 await checkDialog('generate');
 await page.getByRole('dialog').getByRole('button',{name:'Generate',exact:true}).click();await page.getByRole('dialog').getByText('Generated',{exact:true}).waitFor();
 const generated=requests.find(r=>r.generation)?.generation;if(!generated||generated.dateFrom!==from||generated.dateTo!==to||generated.franchiseId!=='f'||generated.salonId!=='s'||generated.interval!=='week')failures.push({error:'Generation filters mismatch',generated});
 await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();
 await page.getByRole('button',{name:'View',exact:true}).first().click();await page.getByRole('dialog').locator('dd').filter({hasText:/^1500\.00$/}).first().waitFor();
 await checkDialog('preview');
 const downloaded=page.waitForEvent('download');await page.getByRole('dialog').getByRole('button',{name:'Download',exact:true}).click();const file=await downloaded;if(file.suggestedFilename()!=='report.csv')failures.push({error:'Wrong download'});
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Regenerate',exact:true}).first().click();await page.waitForLoadState('networkidle');
 const regeneration=requests.filter(r=>r.generation)[1]?.generation;
 if(!regeneration||regeneration.dateFrom!==from||regeneration.dateTo!==to||regeneration.franchiseId!=='f'||regeneration.salonId!=='s')failures.push({error:'Regeneration did not preserve original scope',regeneration});
 await select('Filter by franchise','Other franchise');if(!await page.getByRole('button',{name:'Filter by salon',exact:true}).innerText().then(v=>v.includes('All Salons')))failures.push({error:'Salon did not reset'});
 await page.getByRole('button',{name:'Filter by salon',exact:true}).click();if(await page.getByRole('option',{name:long,exact:true}).count())failures.push({error:'Unrelated salon remains in options'});await page.keyboard.press('Escape');
 failRevenue=true;await select('Revenue interval','Day');await page.getByText('This analytics section could not be loaded.',{exact:true}).waitFor();if(!await page.getByText('Total Revenue',{exact:true}).isVisible())failures.push({error:'Section failure hid summary'});failRevenue=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await page.waitForLoadState('networkidle');
 empty=true;await select('Date range preset','Yesterday');await page.getByText('No revenue data',{exact:true}).waitFor();if(await page.getByText('No data',{exact:true}).count()<3)failures.push({error:'Empty states missing'});
 checks.push({interactions:'presets, scope hierarchy, intervals, generate, preview, regenerate, CSV, isolated failure, empty range'});
}finally{await browser.close();fs.writeFileSync('.responsive-checks/reports-module-results.json',JSON.stringify({checks,failures},null,2));}
console.log(JSON.stringify({checks:checks.length,failures},null,2));if(failures.length)process.exitCode=1;
