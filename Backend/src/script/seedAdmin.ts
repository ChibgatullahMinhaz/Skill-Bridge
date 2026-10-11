import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { env } from "@/config/env";
import { Role } from "@/prisma/generated/prisma/enums";

export async function seedAdmin() {
    try {
        const adminEmail = env.ADMIN.EMAIL;
        const adminPassword = env.ADMIN.PASSWORD;
        const adminName = env.ADMIN.NAME;

        if (!adminEmail || !adminPassword) {
            console.error("Admin credentials are missing in environment variables!");
            throw new Error("Admin credentials are missing.");
        }

        const existingAdmin = await prisma.user.findUnique({
            where: {
                email: adminEmail,
            },
        });

        if (existingAdmin) {
            if (existingAdmin.role !== Role.ADMIN) {
                throw new Error("Configured admin email belongs to a non-admin account. Choose a dedicated admin email.");
            }
            console.log("Admin user already exists. Skipping seed.");
            return;
        }

        const res = await auth.api.signUpEmail({
            body: {
                email: adminEmail,
                password: adminPassword,
                name: adminName,
            },
            headers: new Headers(),
        });

        if (res?.user) {
            await prisma.user.update({
                where: {
                    id: res.user.id,
                },
                data: {
                    role: Role.ADMIN,
                },
            });
            await prisma.session.deleteMany({ where: { userId: res.user.id } });
        } else {
            throw new Error("Admin registration did not return a user.");
        }

        console.log("Admin user seeded successfully!");
    } catch (error) {
        console.error("Error seeding admin user:", error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }

}

await seedAdmin();
