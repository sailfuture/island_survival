# Google Authentication Setup

## Prerequisites
Create a `.env.local` file in the root of your project with the following variables:

```env
# NextAuth Configuration
# Generate a secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-here

# NextAuth URL - Update this for production
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click on it and press "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - For development: `http://localhost:3000/api/auth/callback/google`
     - For production: `https://your-domain.com/api/auth/callback/google`
5. Copy the Client ID and Client Secret to your `.env.local` file

## Generating NEXTAUTH_SECRET

Run this command in your terminal to generate a secure secret:
```bash
openssl rand -base64 32
```

## Important Notes

- Never commit `.env.local` to version control
- Update `NEXTAUTH_URL` when deploying to production
- Make sure to add your production domain to the authorized redirect URIs in Google Cloud Console 