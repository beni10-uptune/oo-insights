import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import type { Adapter } from "next-auth/adapters";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            markets: true,
            image: true,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          markets: user.markets,
          image: user.image,
        };
      }
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      
      // Check if user exists in database
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });
      
      // If user exists, they're allowed
      if (existingUser) {
        return true;
      }
      
      // For new users, check if they're in the initial admin list
      const initialAdmins = (process.env.INITIAL_ADMIN_EMAILS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      
      // If this is an initial admin, create them with admin role
      if (initialAdmins.includes(user.email)) {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name,
            image: user.image,
            role: "ADMIN",
            emailVerified: new Date(),
          },
        });
        return true;
      }
      
      // Otherwise, deny access
      return false;
    },
    async session({ session, user }) {
      if (session.user) {
        // Fetch fresh user data to get current role and markets
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, markets: true },
        });
        
        session.user.id = user.id;
        session.user.role = dbUser?.role || "USER";
        session.user.markets = dbUser?.markets || [];
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.markets = user.markets;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};