import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('C:/Users/Sudhanshu Yadav/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true});
try {
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  const hydrationErrors=[];
  page.on('pageerror',error=>{if(/hydration|server rendered HTML|didn't match/i.test(error.message))hydrationErrors.push(error.message)});
  page.on('console',message=>{if(message.type()==='error' && /hydration|server rendered HTML|didn't match/i.test(message.text()))hydrationErrors.push(message.text())});
  for(const route of ['login','register','otp']) {
    await page.goto('http://localhost:3001/auth/'+route,{waitUntil:'networkidle'});
    assert.equal(await page.locator('svg.lucide-phone').count(),0);
    const country=page.getByRole('button',{name:'Phone country',exact:true});
    await country.click();
    await page.getByRole('option',{name:'+1',exact:true}).click();
    assert.match(await country.innerText(),/\+1/);
    await page.locator('input[type="tel"]').fill('2125550123');
    assert.equal(await page.locator('input[type="tel"]').inputValue(),'2125550123');
    console.log(route+': current markup, selectable country code, no icon overlap');
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://localhost:3001/auth/login',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Phone country',exact:true}).click();
  const bounds=await page.getByRole('listbox').boundingBox();
  assert.ok(bounds && bounds.x>=0 && bounds.x+bounds.width<=390);
  await page.screenshot({path:path.resolve('../../outputs/phone-dropdown-login.png'),fullPage:true});
  assert.deepEqual(hydrationErrors,[]);
  console.log('All auth pages hydrated without errors; mobile dropdown fits the screen.');
} finally {await browser.close();}
