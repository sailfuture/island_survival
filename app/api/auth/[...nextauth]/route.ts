import NextAuth from "next-auth"
import { AuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/access-denied", // Custom error page
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only check for Google provider
      if (account?.provider === "google") {
        const userEmail = user.email
        
        if (!userEmail) {
          console.log("No email provided by Google")
          return false
        }

        try {
          // Fetch allowed users from the database endpoint
          const response = await fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:TfBSMVa_/allowed_users_story")
          
          if (!response.ok) {
            console.error("Failed to fetch allowed users:", response.statusText)
            return false
          }

          const allowedUsers = await response.json()
          
          // Check if the user's email is in the allowed list
          const isAllowed = allowedUsers.some((allowedUser: any) => 
            allowedUser.allowed_email === userEmail
          )

          if (!isAllowed) {
            console.log(`Access denied for email: ${userEmail}`)
            // Return a URL to redirect to the access denied page
            return "/access-denied"
          }

          console.log(`Access granted for email: ${userEmail}`)
          return true
        } catch (error) {
          console.error("Error checking allowed users:", error)
          return false
        }
      }

      // Allow other providers (if any) to proceed
      return true
    },
    async session({ session, token }) {
      return session
    },
    async jwt({ token, user, account, profile }) {
      return token
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST } 