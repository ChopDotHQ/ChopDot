import { prisma } from './src/lib/prisma';
prisma.potMember.findMany().then(console.log).catch(console.error).finally(() => prisma.$disconnect());
