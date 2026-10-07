const {ConfigService}=require('@nestjs/config');
const {PrismaService}=require('../dist/prisma/prisma.service');
process.loadEnvFile('.env');
const db=new PrismaService(new ConfigService({database:{url:process.env.DATABASE_URL}}));
(async()=>{
 const row=await db.user.findFirst({where:{phone:{not:null}},select:{phone:true}});
 if(!row)throw new Error('No phone available to verify the query plan');
 const result=await db.$queryRaw`EXPLAIN SELECT id FROM users WHERE phone=${row.phone}`;
 console.log(result.map(r=>({access:r.type,index:r.key,estimatedRows:String(r.rows)})));
 if(!result.some(r=>r.key==='users_phone_key' && r.type==='const'))throw new Error('Expected the unique phone index');
 const backup=await db.$queryRaw`SELECT COUNT(*) AS total FROM phone_normalization_backup`;
 console.log({backedUpPhoneValues:String(backup[0].total)});
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
