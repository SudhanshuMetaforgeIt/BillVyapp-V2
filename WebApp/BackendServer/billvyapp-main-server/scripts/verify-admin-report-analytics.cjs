const {ConfigService}=require('@nestjs/config');
const {PrismaService}=require('../dist/prisma/prisma.service');
const {BusinessTimezoneService}=require('../dist/common/datetime/business-timezone.service');
const {AdminReportsService}=require('../dist/platform-reports/admin-reports.service');
process.loadEnvFile('.env');
const prisma=new PrismaService(new ConfigService({database:{url:process.env.DATABASE_URL}}));
const service=new AdminReportsService(prisma,new BusinessTimezoneService(prisma));
(async()=>{
 try {
  const admin=await prisma.user.findFirst({where:{role:{code:'ADMIN'},franchiseId:{not:null}},select:{id:true,email:true,franchiseId:true}});
  if(!admin)throw new Error('No Admin account available for read-only verification');
  const actor={userId:admin.id,email:admin.email,role:'ADMIN',franchiseId:admin.franchiseId,salonId:null,sessionId:null};
  const snapshot=await service.snapshot(actor,{dateFrom:'2026-01-01',dateTo:'2026-12-31',interval:'month'});
  const sum=rows=>rows.reduce((total,row)=>total+row.revenue,0);
  for(const rows of [snapshot.revenueSeries,snapshot.branchComparison,snapshot.customers])if(Math.abs(sum(rows)-snapshot.stats.totalRevenue)>.01)throw new Error('Revenue reconciliation failed');
  let scopes=0;
  if(snapshot.branches[0]){await service.analytics(actor,{dateFrom:'2026-01-01',dateTo:'2026-12-31',branchId:snapshot.branches[0].id});scopes++;}
  const foreign=await prisma.salon.findFirst({where:{franchiseId:{not:admin.franchiseId}},select:{id:true}});
  if(foreign){let denied=false;try{await service.snapshot(actor,{branchId:foreign.id});}catch(error){denied=error.getStatus?.()===403;}if(!denied)throw new Error('Foreign branch scope was not denied');scopes++;}
  console.log(JSON.stringify({readOnlyQueries:'passed',revenueConsistency:'passed',scopeChecks:scopes}));
 }catch(error){console.error(JSON.stringify({readOnlyQueries:'failed',error:error.message}));process.exitCode=1;}
 finally{await prisma.$disconnect();}
})();
