// Browser-only fixtures: this check never contacts the live API or submits a real bill.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fixture, origin, long, widths } from './verify-dashboard-responsive.mjs';
const loadRuntime = createRequire(import.meta.url);
const { chromium } = loadRuntime(process.env.PLAYWRIGHT_MODULE || 'C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = path.resolve('.responsive-checks');
const checks = [], failures = [], errors = [];
async function bounds(page, label, selector) {
  await page.locator(selector).evaluate(async e => {await new Promise(resolve=>requestAnimationFrame(resolve));await Promise.all(e.getAnimations().map(a=>a.finished));});
  const result = await page.evaluate(selector => {
    const e = document.querySelector(selector), r = e?.getBoundingClientRect();
    const content = selector.startsWith('aside') ? e?.querySelector('nav') : e;
    return {width: innerWidth, height: innerHeight, document: document.documentElement.scrollWidth, left: r?.left, right: r?.right, top: r?.top, bottom: r?.bottom, scroll: content?.scrollWidth, available: content?.clientWidth};
  }, selector);
  checks.push({label, ...result});
  if(!result.available || result.document > result.width + 2 || result.left < -2 || result.right > result.width + 2 || result.scroll > result.available + 2 || ((selector === '[role="dialog"]' || selector === 'dialog' || selector === '[role="listbox"]') && (result.top < -2 || result.bottom > result.height + 2))) failures.push({label, ...result});
}
(async () => {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({headless:true});
  try {
    for(const role of ['SUPER_ADMIN','ADMIN','MANAGER','STAFF']) {
      const context = await browser.newContext({viewport:{width:320,height:800},hasTouch:true,reducedMotion:'reduce'});
      await context.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url());
        if(url.origin === origin && !url.pathname.startsWith('/api')) return route.continue();
        if(['image','font','media'].includes(request.resourceType()))return route.abort();
        let data = fixture(url.href,role);
        if(url.pathname.endsWith('/bills/validate-coupon'))data = {couponCode:'FRANCHISE-7K4P9X',membershipName:long,benefits:long,eligibleServices:[{id:'service-0',name:long}],startDate:'2026-01-01',endDate:'2099-12-31',termsAndConditions:long.repeat(5),couponUsageLimit:7,usedVisits:1,remainingVisits:6,benefitType:'FREE_SERVICES',freeServicesPerVisit:true,usedUnits:0,remainingUnits:null};
        if(url.pathname.endsWith('/services'))data = {...data,data:Array.from({length:25},(_,i)=>({...data.data[0],id:`service-${i}`,name:`${long} ${i+1}`}))};
        return route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':origin,'access-control-allow-credentials':'true','access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, PUT, PATCH, DELETE, OPTIONS'},body:JSON.stringify(data)});
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push({role,message:e.message}));
      const base=`${origin}/dashboard/${role.toLowerCase()}`;
      await page.goto(base,{waitUntil:'networkidle'});
      await page.getByRole('button',{name:'Open navigation',exact:true}).click();
      await bounds(page,`${role} mobile navigation`, 'aside[aria-hidden="false"]');
      await page.getByRole('button',{name:'Close navigation',exact:true}).click();
      const inert=await page.locator('aside[aria-hidden="true"]').evaluate(e=>Boolean(e.closest('[inert]')));
      if(!inert)failures.push({role,label:'Closed navigation must be inert'});
      await page.getByRole('button',{name:/account menu/}).click();
      await bounds(page,`${role} account menu`, '[role="menu"]');
      await page.keyboard.press('Escape');
      await page.screenshot({path:path.join(output,`${role.toLowerCase()}-home-mobile.png`)});
      if(role!=='STAFF') {
        await page.goto(`${base}/memberships`,{waitUntil:'networkidle'});
        await page.getByRole('button',{name:/^View /}).first().click();
        for(const width of widths){await page.setViewportSize({width,height:width===820?390:800});await bounds(page,`${role} membership details ${width}`,'dialog');}
        await page.keyboard.press('Escape');
        await page.getByRole('button',{name:'Membership Plans',exact:true}).click();
        await page.getByRole('button',{name:'Add Plan',exact:true}).click();
        for(const width of widths){await page.setViewportSize({width,height:width===820?390:800});await bounds(page,`${role} create membership plan ${width}`,'[role="dialog"]');}
        await page.getByRole('button',{name:'Close',exact:true}).click();
        await page.getByRole('button',{name:/^Edit /}).first().click();
        for(const width of widths){await page.setViewportSize({width,height:width===820?390:800});await bounds(page,`${role} edit membership plan ${width}`,'[role="dialog"]');}
        await page.setViewportSize({width:320,height:800});
        await page.screenshot({path:path.join(output,`${role.toLowerCase()}-plan-mobile.png`)});
        await page.getByRole('button',{name:'Close',exact:true}).click();
      }
      if(role==='MANAGER'||role==='STAFF'){
        await page.goto(`${base}/walk-in-billing`,{waitUntil:'networkidle'});
        await page.getByRole('textbox',{name:'Search customer by phone'}).fill('987');
        await page.getByRole('button').filter({hasText:'Select'}).filter({hasText:long}).first().click();
        await page.getByRole('button').filter({hasText:long}).filter({hasText:/1,?200/}).first().click();
        await page.locator('input[name="billing-membership"]').nth(1).check();
        await page.getByText('Read Terms & Conditions',{exact:true}).click();
        for(const width of widths){await page.setViewportSize({width,height:width===820?390:800});await bounds(page,`${role} populated billing ${width}`,'main');}
        await page.setViewportSize({width:320,height:800});
        await page.locator('summary').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(output,`${role.toLowerCase()}-billing-enrollment-mobile.png`)});
        await page.getByRole('button',{name:'Service category',exact:true}).click();
        await bounds(page,`${role} service dropdown mobile`,'[role="listbox"]');
        await page.keyboard.press('Escape');
        await page.getByLabel('Coupon code',{exact:true}).fill('FRANCHISE-7K4P9X');
        await page.getByRole('button',{name:'Validate',exact:true}).click();
        await page.getByText(`${long} coupon attached`,{exact:true}).waitFor();
        for(const width of widths){await page.setViewportSize({width,height:width===820?390:800});await bounds(page,`${role} attached coupon billing ${width}`,'main');}
      }
      console.log(`${role}: interactive checks complete`);
      await context.close();
    }
  }finally {
    await browser.close();
    fs.writeFileSync(path.join(output,'interactions.json'),JSON.stringify({checks:checks.length,failures,errors},null,2));
  }
  console.log(JSON.stringify({checks:checks.length,failures,errors},null,2));
  if(failures.length||errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
