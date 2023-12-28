import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getFriend (userLogin){
    try {
        const get = await prisma.user.findMany({
            where:{
                    id:{not:userLogin}
            }
        })
        return get;
    } catch (error) {
        console.error(error);
    }
} 