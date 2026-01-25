
import { db } from "./db";
import { categories, type InsertCategory } from "@shared/schema";
import { eq } from "drizzle-orm";

const defaultCategories: InsertCategory[] = [
    // Income
    { name: "Maaş", type: "income", color: "#22c55e", icon: "wallet", userId: "default-user" },
    { name: "Ek Gelir", type: "income", color: "#3b82f6", icon: "trending-up", userId: "default-user" },
    { name: "Kira Geliri", type: "income", color: "#8b5cf6", icon: "home", userId: "default-user" },
    { name: "Yatırım Getirisi", type: "income", color: "#eab308", icon: "piggy-bank", userId: "default-user" },
    // Expense
    { name: "Market", type: "expense", color: "#ef4444", icon: "shopping-cart", userId: "default-user" },
    { name: "Ulaşım", type: "expense", color: "#f97316", icon: "bus", userId: "default-user" },
    { name: "Faturalar", type: "expense", color: "#6366f1", icon: "file-text", userId: "default-user" },
    { name: "Kira", type: "expense", color: "#ec4899", icon: "home", userId: "default-user" },
    { name: "Eğlence", type: "expense", color: "#14b8a6", icon: "music", userId: "default-user" },
    { name: "Sağlık", type: "expense", color: "#ef4444", icon: "heart", userId: "default-user" },
    { name: "Eğitim", type: "expense", color: "#3b82f6", icon: "book", userId: "default-user" },
    { name: "Giyim", type: "expense", color: "#a855f7", icon: "shopping-bag", userId: "default-user" }
];

async function seedCategories() {
    console.log("Seeding default categories...");

    // Since we don't have proper user auth flow yet for command line, we might need to fetch a user or use a placeholder
    // For now, let's assume we fetch the first user or create a temporary logic if needed. 
    // IMPORTANT: The schema requires userId. 

    // Fetch existing users
    const users = await db.query.users.findMany({ limit: 1 });
    let userId = users[0]?.id;

    if (!userId) {
        console.log("No users found. Creating a default user for seeding...");
        // Try to create one if allowed, or just warn
        // Assuming the app has created a user on login. 
        // If no user exists, we can't seed categories linked to a user properly without violating FK constraints if strict.
        // However, let's try to find ANY user.
    }

    if (userId) {
        for (const cat of defaultCategories) {
            // Check if exists
            const existing = await db.query.categories.findFirst({
                where: (table, { eq, and }) => and(
                    eq(table.name, cat.name),
                    eq(table.userId, userId)
                )
            });

            if (!existing) {
                await db.insert(categories).values({ ...cat, userId });
                console.log(`Created category: ${cat.name}`);
            }
        }
        console.log("Seeding complete.");
    } else {
        console.log("Skipping category seed (No user found to attach categories to). Login to the app first.");
    }
}

seedCategories().catch(console.error);
