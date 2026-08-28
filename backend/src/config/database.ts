import { Sequelize } from "sequelize";

// Database connection instance (reads connection string from environment variables)
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Check if connecting to a remote Supabase host to configure SSL
const isRemote = databaseUrl.includes("supabase.co") || databaseUrl.includes("supabase.com");

const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: isRemote
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  define: {
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  },
});

export default sequelize;
