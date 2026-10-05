// Isolated browser fixtures. No requests reach a live API or database.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const loadRuntime = createRequire(import.meta.url);
const { chromium } = loadRuntime(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin = process.env.RESPONSIVE_BASE_URL || 'http://localhost:3100';
const widths = [320,360,375,390,414,480,640,768,820,1024,1280,1440,1920,2560,600,960,1200];
const date = new Date().toISOString();
const long = 'A very long salon and customer name for responsive layout verification';
const common = {name:long,description:long,createdAt:date,updatedAt:date,isActive:true};
const customer = {...common,id:'customer',userId:'user',customerCode:'C-123',firstName:long,lastName:'Verification',phone:'9876543210',email:'responsive-verification@example.test',gender:'OTHER',dateOfBirth:null};
const salon = {...common,id:'salon',franchiseId:'franchise',code:'SALON',addressLine1:long,city:'Delhi',state:'Delhi',country:'India',phone:customer.phone,email:customer.email,managers:[],managerName:long,staffCount:10};
const service = {...common,id:'service',salonId:'salon',categoryId:'category',price:'1200.00',taxRate:'18.00',durationMinutes:30};
const plan = {...common,id:'plan',salonId:'salon',salonName:long,price:'100.00',durationDays:90,enrollmentThreshold:'0.00',benefits:long,termsAndConditions:long.repeat(5),couponUsageLimit:7,benefitType:'FREE_SERVICES',freeServicesPerVisit:true,freeServiceLimit:null,discountPercentage:null,eligibleServices:[service]};
const membership = {...common,id:'member',customerId:'customer',membershipPlanId:'plan',salonId:'salon',membershipName:long,customerName:long,couponCode:'FRANCHISE-7K4P9X',startDate:date.slice(0,10),endDate:'2099-12-31',status:'ACTIVE',planSnapshot:plan,qualifyingBillId:null};
const bill = {...common,id:'bill',salonId:'salon',customerId:'customer',billNumber:'B-123',billDate:date.slice(0,10),subtotal:'1200.00',discount:'0.00',tax:'216.00',roundOff:'0.00',total:'1416.00',paidAmount:'1416.00',dueAmount:'0.00',status:'COMPLETED',paymentStatus:'PAID',notes:null,createdBy:'user',customer,salon,items:[{id:'item',itemType:'SERVICE',serviceId:'service',productId:null,description:long,quantity:1,unitPrice:'1200.00',discount:'0.00',taxRate:'18.00',taxAmount:'216.00',total:'1416.00'}],payments:[]};
const paginated = data => ({data,meta:{page:1,limit:10,total:data.length,totalPages:1}});
function fixture(url,role) {
 const p=new URL(url).pathname.replace(/^\/api(?:\/v\d+)?/,'');
 const user={...customer,id:'user',role,franchiseId:role==='SUPER_ADMIN'?null:'franchise',salonId:['MANAGER','STAFF'].includes(role)?'salon':null,subscriptionActive:true,timezone:'Asia/Kolkata',profilePhoto:null,salonName:long,language:'en'};
 if(p.endsWith('/auth/refresh'))return {accessToken:'isolated-responsive-fixture',refreshToken:'unused'};
 if(p.endsWith('/auth/me'))return user;
 if(p==='/settings/security')return {passwordPolicy:{minLength:8},session:{timeoutMinutes:30,maxLoginAttempts:5,lockoutDurationMinutes:15}};
 if(['/settings/integrations','/settings/backups'].includes(p))return [];
 if(p==='/settings/general')return {platformName:'BillVyApp',adminEmail:customer.email,timezone:'Asia/Kolkata',dateFormat:'DD/MM/YYYY'};
 if(p==='/users/user')return {...user,role:{code:role,name:role}};
 if(p==='/salons/salon')return salon;
 if(p==='/salons/salon/photos')return [];
 if(p==='/memberships/member')return {...membership,customer:{...customer,user:customer,addresses:[]},plan,salon,enrollmentType:'Manual',redemptions:[],qualifyingBill:null};
 if(p==='/bills/bill')return bill;
 if(p==='/bills/membership-offers')return {qualifyingAmount:'1416.00',plans:[plan]};
 const rows={'/roles':[{id:'role',code:role,name:role}],'/customers':[customer],'/salons':[salon],'/franchises':[{...salon,id:'franchise',subscriptionActive:true,subscriptionStatus:'active',currentPlanName:'Example'}],'/membership-plans':[plan],'/memberships':[membership],'/services':[service],'/service-categories':[{id:'category',salonId:'salon',name:long,isActive:true}],'/bills':[bill],'/payments':[{id:'payment',billId:'bill',amount:'1416.00',status:'SUCCESS',paymentMethod:'CASH',paymentDate:date,createdAt:date}],'/users':[{...user,role:{code:'MANAGER',name:'Manager'},salary:'5000'}]};
 return paginated(rows[p]||[]);
}
export { fixture, origin, long, widths };
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) (async()=>{
 const output=path.resolve('.responsive-checks');fs.mkdirSync(output,{recursive:true});
 const browser=await chromium.launch({headless:true}); const failures=[],errors=[],checks=[];
 try{
  for(const role of process.env.RESPONSIVE_ROLE ? [process.env.RESPONSIVE_ROLE] : ["SUPER_ADMIN","ADMIN","MANAGER","STAFF"]){
   const context=await browser.newContext({viewport:{width:320,height:800},reducedMotion:'reduce'});
   await context.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.origin===origin&&!url.pathname.startsWith('/api'))return route.continue();
    if(['image','font','media'].includes(request.resourceType()))return route.abort();
    return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'},body:JSON.stringify(fixture(url.href,role))});
   });
   const page=await context.newPage();page.on('console', m => { if(m.type()==='error') console.log('Browser:',m.text().slice(0,180)); });page.on('pageerror',e=>errors.push({role,route:page.url(),message:e.message}));
   const segment=role.toLowerCase(),folder=path.join('app','dashboard',segment);
   const routes=process.argv.includes('--home') ? [''] : ['',...fs.readdirSync(folder,{withFileTypes:true}).filter(d=>d.isDirectory()&&fs.existsSync(path.join(folder,d.name,'page.tsx'))).map(d=>d.name)];
   for(const sub of routes){
    if(process.env.RESPONSIVE_ROUTE && sub!==process.env.RESPONSIVE_ROUTE)continue;
    await page.goto(`${origin}/dashboard/${segment}${sub?'/'+sub:''}`,{waitUntil:'networkidle'});
    try { await page.locator('main').waitFor({timeout:15000}); } catch { console.log('Failed route',role,sub,page.url(),(await page.locator('body').innerText()).slice(0,600)); await page.screenshot({path:path.join(output,'failed-route.png')}); errors.push({role,sub,message:'Route did not render main',details:errors.slice(-3)}); continue; }
    for(const width of widths){
     await page.setViewportSize({width,height:width===820?390:800});
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     const result=await page.evaluate(()=>{
      const main=document.querySelector('main'),header=document.querySelector('header');
      return {document:document.documentElement.scrollWidth,viewport:innerWidth,main:main?.scrollWidth,available:main?.clientWidth,header:header?.scrollWidth,headerAvailable:header?.clientWidth,offenders:[...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2&&!e.closest('.overflow-x-auto,.app-table-scroll,[aria-hidden="true"]')&&getComputedStyle(e).position!=='absolute';}).slice(0,5).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right,text:e.textContent?.slice(0,60)}))};
     });
     checks.push({role,sub,width});
     if(result.document>width+2||result.main>result.available+2||result.header>result.headerAvailable+2){
      const outside=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+2;}).slice(-10).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right,text:e.textContent?.slice(0,45),position:getComputedStyle(e).position,overflow:getComputedStyle(e).overflow,display:getComputedStyle(e).display})));
      failures.push({role,sub,width,...result,outside});
      if(width===320)await page.screenshot({path:path.join(output,`${segment}-${sub||'home'}-mobile.png`)});
     }
    }
    if(['','memberships','walk-in-billing','profile'].includes(sub))await page.screenshot({path:path.join(output,`${segment}-${sub||'home'}-wide.png`)});
   }
   console.log(`${role}: ${routes.length} routes x ${widths.length} widths checked`);await context.close();
  }
 }finally{await browser.close();fs.writeFileSync(path.join(output,process.argv.includes('--home') ? 'home-results.json' : 'results.json'),JSON.stringify({checks:checks.length,failures,errors},null,2));}
 console.log(JSON.stringify({checks:checks.length,failures:failures.length,errors:errors.length,firstFailures:failures.slice(0,3),firstErrors:errors.slice(0,3)},null,2));
 if(failures.length||errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});



