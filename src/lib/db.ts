import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

if (!globalForPrisma.prisma) {
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  
  // Clean copy-paste errors (whitespaces or surrounding quotes)
  databaseUrl = databaseUrl.trim();
  if (databaseUrl.startsWith('"') && databaseUrl.endsWith('"')) {
    databaseUrl = databaseUrl.slice(1, -1).trim();
  }
  if (databaseUrl.startsWith("'") && databaseUrl.endsWith("'")) {
    databaseUrl = databaseUrl.slice(1, -1).trim();
  }

  let formattedUrl = databaseUrl;
  try {
    const match = databaseUrl.match(/^(mysql|mariadb):\/\/([^:]+):(.*)@([^:\/]+)(?::([0-9]+))?\/([^?]+)(?:\?(.*))?$/);
    if (match) {
      const [, , user, password, host, port, db, query] = match;
      const encodedUser = encodeURIComponent(user);
      const encodedPass = encodeURIComponent(password);
      
      const params = new URLSearchParams(query || "");
      params.set("sslaccept", "accept_invalid_certs");
      params.set("connect_timeout", "30");
      params.set("pool_timeout", "30");
      
      const portString = port ? `:${port}` : "";
      formattedUrl = `mariadb://${encodedUser}:${encodedPass}@${host}${portString}/${db}?${params.toString()}`;
    } else {
      if (databaseUrl.startsWith("mysql://")) {
        formattedUrl = databaseUrl.replace("mysql://", "mariadb://");
      }
    }
  } catch (error) {
    console.error("Database URL formatting failed:", error);
    if (databaseUrl.startsWith("mysql://")) {
      formattedUrl = databaseUrl.replace("mysql://", "mariadb://");
    }
  }

  const adapter = new PrismaMariaDb(formattedUrl);
  globalForPrisma.prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma;
