import "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
    markets?: string[];
  }

  interface Session {
    user: {
      id: string;
      role: string;
      markets: string[];
    } & DefaultSession["user"];
  }
}