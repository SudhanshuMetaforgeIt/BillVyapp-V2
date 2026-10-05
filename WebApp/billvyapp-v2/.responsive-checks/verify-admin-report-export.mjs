import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fixture,widths,long} from '../scripts/verify-dashboard-responsive.mjs';
const loadRuntime=createRequire(import.meta.url);
const {chromium}=loadRuntime('C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin='http://localhost:3001', checks=[], errors=[], requests=[];
let fail=false, empty=false, records=[], holdGenerate, generationStarted;
const xlsx=fs.readFileSync('../BackendServer/billvyapp-main-server/.report-checks/admin-overview.xlsx');
function data(q) { return {scope:{dateFrom:q.dateFrom || '2026-10-01',dateTo:q.dateTo || '2026-10-04',branchId:q.branchId || null,branch:q.branchId?long:'All Branches',interval:q.interval || 'day',timeZone:'Asia/Kolkata'},stats:{totalRevenue:empty?0:1000,totalBills:empty?0:1,totalCustomers:1,totalServices:2,totalStaff:3,totalRevenueChange:'Collected on completed bills',totalBillsChange:'Selected period',totalCustomersChange:'Current scoped customers',totalServicesChange:'Current catalogue',totalStaffChange:'Current scoped staff'},branches:[{id:'branch',name:long}],revenueSeries:empty?[]:[600,200,150,50].map((revenue,i)=>({date:`2026-10-0${i+1}`,revenue,bills:1,averageBillValue:revenue})),billsOverview:{total:empty?0:1,paid:0,paidPct:0,pending:empty?0:1,pendingPct:empty?0:100,overdue:0,overduePct:0,cancelled:0,cancelledPct:0},branchComparison:[{id:'branch',name:long,revenue:empty?0:1000,bills:12,customers:8,growth:'â€”',positive:false}],revenueByBranch:[{id:'branch',branchName:long,revenue:empty?0:1000}],topServicesByRevenue:empty?[]:[{id:'s1',name:'Cleanup (Basic Facial)',revenue:900},{id:'s2',name:'Cleanup (Basic Facial)',revenue:100}],topServicesByQuantity:empty?[]:[{id:'s1',name:'Cleanup (Basic Facial)',quantity:2},{id:'s2',name:'Cleanup (Basic Facial)',quantity:1}]}; }
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:1920,height:900},reducedMotion:'reduce'});
 await context.addInitScript(()=>{window.reportPrintCalls=0;window.print=()=>{window.reportPrintCalls++;};});
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());if(url.origin===origin&&!url.pathname.startsWith('/api'))return route.continue();
  const headers={'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'};
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
  let body=fixture(url.href,'ADMIN');
  if(url.pathname.includes('/admin-reports')) {
   const q=Object.fromEntries(url.searchParams); requests.push({path:url.pathname,method:req.method(),q});
   if(url.pathname.endsWith('/analytics'))body=data(q);
   else if(url.pathname.endsWith('/generate')) {
    const selected=req.postDataJSON();requests.push({generate:selected});generationStarted?.();if(holdGenerate)await holdGenerate;
    if(fail)return route.fulfill({status:500,headers,contentType:'application/json',body:JSON.stringify({message:'Unable to generate report'})});
    body={id:'r'+records.length,name:'Franchise Overview Report',status:'Ready',dateFrom:selected.dateFrom,dateTo:selected.dateTo,branch:selected.branchId?long:'All Branches',generatedOn:'2026-10-04T12:00:00Z',generatedBy:long,fileName:'BillVyApp_Overview_Report_2026-10-01_to_2026-10-04.xlsx',format:'xlsx'};records.unshift(body);
   }else if(url.pathname.endsWith('/download'))return route.fulfill({status:200,headers:{...headers,'content-disposition':'attachment; filename="BillVyApp_Overview_Report_2026-10-01_to_2026-10-04.xlsx"'},contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',body:xlsx});
   else body=records;
  }
  return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('same key'))errors.push(m.text());});
 await page.goto(origin+'/dashboard/admin/reports',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Download Report',exact:true}).waitFor();
 for(const width of widths){await page.setViewportSize({width,height:900});await page.getByRole('button',{name:'Download Report',exact:true}).click();await page.getByRole('menuitem',{name:/Excel/}).waitFor();
  const geometry=await page.evaluate(()=>{const menu=document.querySelector('[role="menu"]')?.getBoundingClientRect(),main=document.querySelector('main');return {width:innerWidth,document:document.documentElement.scrollWidth,main:main.scrollWidth,available:main.clientWidth,left:menu?.left,right:menu?.right};});
  if(geometry.document>width+1||geometry.main>geometry.available+1||geometry.left<0||geometry.right>width+1)errors.push(geometry);
  checks.push({width,...geometry});await page.keyboard.press('Escape');
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:'.responsive-checks/admin-reports-polished-desktop.png',fullPage:true});
 for(const width of [320,768,1280,1440,1920]) {
  await page.setViewportSize({width,height:1000});
  const expand=page.getByRole('button',{name:'Expand sidebar',exact:true});
  if(width>=1024 && await expand.isVisible()) await expand.click();
  await page.waitForTimeout(350);
  const geometry=await page.evaluate(()=>({document:document.documentElement.scrollWidth,width:innerWidth,main:document.querySelector('main').scrollWidth,available:document.querySelector('main').clientWidth}));
  if(geometry.document>width+1||geometry.main>geometry.available+1)errors.push({expanded:true,...geometry});
  checks.push({expanded:true,...geometry});
  if([320,1440].includes(width))await page.screenshot({path:`.responsive-checks/admin-reports-polished-${width}.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'Quantity',exact:true}).click();
 await page.getByText('2 sold',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Branch comparison metric',exact:true}).click();
 await page.getByRole('option',{name:'Bills',exact:true}).click();
 checks.push({interactive:'Service quantity and branch metric selectors'});
 await page.locator('main').evaluate(el=>el.scrollTop=750);
 await page.screenshot({path:'.responsive-checks/admin-reports-polished-lower.png'});
 await page.locator('main').evaluate(el=>el.scrollTop=0);
 await page.setViewportSize({width:1920,height:900});
 await page.getByTitle('Date from',{exact:true}).fill('2026-10-01');await page.getByTitle('Date to',{exact:true}).fill('2026-10-04');await page.waitForLoadState('networkidle');
 const selects=page.locator('main').getByRole('button').filter({hasText:'All Branches'});await selects.click();await page.getByRole('option',{name:long,exact:true}).click();await page.waitForLoadState('networkidle');
 await page.getByRole('button',{name:'Revenue interval',exact:true}).click();await page.getByRole('option',{name:'Weekly',exact:true}).click();await page.waitForLoadState('networkidle');
 let release;holdGenerate=new Promise(r=>release=r);const started=new Promise(r=>generationStarted=r);
 await page.getByRole('button',{name:'Download Report',exact:true}).click();await page.getByRole('menuitem',{name:/Excel/}).click();await started;
 if(!await page.getByRole('button',{name:'Generating report...',exact:true}).isDisabled())errors.push('Duplicate generation not disabled');
 const download=page.waitForEvent('download');release();holdGenerate=null;const file=await download;
 if(!file.suggestedFilename().endsWith('.xlsx'))errors.push('Incorrect filename');await file.saveAs('.responsive-checks/admin-downloaded.xlsx');await page.waitForLoadState('networkidle');
 if(requests.filter(r=>r.generate).length!==1)errors.push('Duplicate generation request');
 const generated=requests.find(r=>r.generate).generate;if(generated.branchId!=='branch'||generated.interval!=='week'||generated.dateFrom!=='2026-10-01'||generated.dateTo!=='2026-10-04')errors.push({filters:generated});
 await page.getByRole('heading',{name:'Generated reports',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'.responsive-checks/admin-reports-polished-history.png'});
 const originalCount=requests.filter(r=>r.generate).length;await page.getByTitle('Date from',{exact:true}).fill('2026-10-02');await page.waitForLoadState('networkidle');
 const historyDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download Excel',exact:true}).first().click();await historyDownload;
 if(requests.filter(r=>r.generate).length!==originalCount)errors.push('History regenerated with current scope');
 fail=true;await page.getByRole('button',{name:'Download Report',exact:true}).click();await page.getByRole('menuitem',{name:/Excel/}).click();await page.getByRole('alert').filter({hasText:'Unable to generate'}).waitFor();
 if(!await page.getByRole('button',{name:'Download Report',exact:true}).isEnabled())errors.push('Failure did not release lock');
 fail=false;empty=true;await page.getByTitle('Date from',{exact:true}).fill('2026-10-03');await page.waitForLoadState('networkidle');await page.getByText('No service usage data yet.',{exact:true}).waitFor();
 if(await page.evaluate(()=>window.reportPrintCalls)!==0)errors.push('Print was invoked');
 checks.push({workflow:'menu, shared filters, XLSX binary, generating state, duplicate prevention, history snapshot, failure, empty, no print'});
 fs.writeFileSync('.responsive-checks/admin-report-export-results.json',JSON.stringify({checks,errors,requests},null,2));
 console.log(JSON.stringify({checks:checks.length,errors}));if(errors.length)process.exitCode=1;
}finally{await browser.close();}
