// Dry-run by default. --apply backs up and converts values in one transaction.
// No phone values or connection credentials are printed.
const {ConfigService}=require('@nestjs/config');
const {PrismaService}=require('../dist/prisma/prisma.service');
const {normalizePhone,phoneCountry}=require('../dist/common/phone');
process.loadEnvFile('.env');
const prisma=new PrismaService(new ConfigService({database:{url:process.env.DATABASE_URL}}));
async function main(){
 const groups=await Promise.all([
  prisma.user.findMany({select:{id:true,phone:true,franchise:{select:{preferences:true}},salon:{select:{franchise:{select:{preferences:true}}}}}}),
  prisma.franchise.findMany({select:{id:true,phone:true,preferences:true}}),
  prisma.salon.findMany({select:{id:true,phone:true,franchise:{select:{preferences:true}}}}),
  prisma.vendor.findMany({select:{id:true,phone:true}}),
  prisma.customer.findMany({select:{id:true,whatsappNumber:true,user:{select:{franchise:{select:{preferences:true}},phone:true}},bills:{take:1,orderBy:{createdAt:'desc'},select:{salon:{select:{franchise:{select:{preferences:true}}}}}}}}),
  prisma.notification.findMany({where:{channel:{in:['SMS','WHATSAPP']}},select:{id:true,recipient:true,salon:{select:{franchise:{select:{preferences:true}}}},user:{select:{franchise:{select:{preferences:true}},phone:true}}}}),
 ]);
 const tables=['users','franchises','salons','vendors','customers','notifications'],models=['user','franchise','salon','vendor','customer','notification'];
 const changes=[],invalid=[],phones=new Map();
 for(let i=0;i<groups.length;i++)for(const row of groups[i]){
  const field=i===4?'whatsappNumber':i===5?'recipient':'phone',raw=row[field];if(!raw)continue;
  const prefs=row.preferences ?? row.franchise?.preferences ?? row.salon?.franchise?.preferences ?? row.user?.franchise?.preferences ?? row.bills?.[0]?.salon?.franchise?.preferences;
  let country=phoneCountry(prefs);
  if(i===4 && !prefs && row.user?.phone?.startsWith('+1'))country='US';
  try{const normalized=normalizePhone(raw,country);
   if(i===0){if(phones.has(normalized))throw new Error('Canonical duplicate');phones.set(normalized,row.id);}
   if(normalized!==raw)changes.push({table:tables[i],model:models[i],id:row.id,field,old:raw,next:normalized});
  }catch{invalid.push({table:tables[i],id:row.id,reason:'Invalid or ambiguous legacy phone; resolve before migration'});}
 }
 console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',changes:changes.length,byTable:Object.fromEntries(tables.map(t=>[t,changes.filter(c=>c.table===t).length])),invalid},null,2));
 if(invalid.length)throw new Error('Migration stopped without changing data');
 if(!process.argv.includes('--apply'))return;
 await prisma.$transaction(async tx=>{
  for(const c of changes){
   await tx.$executeRaw`INSERT INTO phone_normalization_backup (entityTable,entityId,fieldName,oldPhone,newPhone) VALUES (${c.table},${c.id},${c.field},${c.old},${c.next})`;
   const result=await tx[c.model].updateMany({where:{id:c.id,[c.field]:c.old},data:{[c.field]:c.next}});
   if(result.count!==1)throw new Error('A phone changed during migration; transaction rolled back');
  }
 },{timeout:120000});
 console.log('Phone backfill complete; original values retained in phone_normalization_backup.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
