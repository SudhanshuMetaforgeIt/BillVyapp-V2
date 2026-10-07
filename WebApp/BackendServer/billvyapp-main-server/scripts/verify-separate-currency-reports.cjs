const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {ConfigService}=require('@nestjs/config');
const {PrismaService}=require('../dist/prisma/prisma.service');
const {BusinessTimezoneService}=require('../dist/common/datetime/business-timezone.service');
const {ReportAnalyticsService}=require('../dist/platform-reports/report-analytics.service');
const {buildPlatformWorkbook}=require('../dist/platform-reports/platform-report-workbook');
const ExcelJS=require('exceljs');
process.loadEnvFile('.env');
const db=new PrismaService(new ConfigService({database:{url:process.env.DATABASE_URL}}));
const rollback=new Error('verification rollback');
(async()=>{
  await db.$transaction(async tx=>{
    for(const currency of ['INR','USD'])await tx.franchise.create({data:{name:'Currency verification',code:'VERIFY'+randomUUID().replaceAll('-',''),preferences:{currency}}});
    const client={franchise:tx.franchise,salon:tx.salon,platformSettings:tx.platformSettings,$transaction:fn=>fn(tx)};
    const service=new ReportAnalyticsService(client,new BusinessTimezoneService(client));
    const actor={userId:'verification',email:'verification@example.test',role:'SUPER_ADMIN',franchiseId:null,salonId:null,sessionId:null};
    const analytics=await service.query(actor,{dateFrom:'2026-10-01',dateTo:'2026-10-07'},true);
    assert.deepEqual(analytics.currencyGroups.map(g=>g.scope.currency),['INR','USD']);
    assert.equal(analytics.summary,undefined);
    for(const g of analytics.currencyGroups)assert.ok(g.summary && g.revenue && g.business && g.insights && g.details);
    const snapshot=JSON.parse(JSON.stringify({analytics}));
    const book=new ExcelJS.Workbook();
    await book.xlsx.load(await buildPlatformWorkbook({name:'Currency verification',typeLabel:'Financial',dateFrom:'2026-10-01',dateTo:'2026-10-07',generatedOn:new Date(),generatedBy:'Verification',franchiseName:null,snapshot}));
    assert.equal(book.worksheets.length,15);
    console.log({currencies:analytics.currencyGroups.map(g=>g.scope.currency),sheets:book.worksheets.length,summary:analytics.currencyGroups.map(g=>({currency:g.scope.currency,revenue:g.summary.totalRevenue}))});
    throw rollback;
  },{timeout:120000});
})().catch(e=>{if(e!==rollback){console.error(e.message);process.exitCode=1;}else console.log('Verification passed; temporary franchises rolled back.');}).finally(()=>db.$disconnect());
