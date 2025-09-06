# PowerShell script to set up .env.local file

Write-Host "Setting up .env.local file for Edge of Survival..." -ForegroundColor Green

# Generate a random secret for NextAuth
$randomBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($randomBytes)
$secret = [System.Convert]::ToBase64String($randomBytes)

# Create the .env.local content
$envContent = @"
# NextAuth Configuration
NEXTAUTH_SECRET=$secret

# NextAuth URL - Update this for production
NEXTAUTH_URL=http://localhost:3000

# Google OAuth Configuration
# Replace these with your actual Google OAuth credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
"@

# Write to .env.local
$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "`n.env.local file created successfully!" -ForegroundColor Green
Write-Host "`nPlease update the following values in .env.local:" -ForegroundColor Yellow
Write-Host "  - GOOGLE_CLIENT_ID" -ForegroundColor Yellow
Write-Host "  - GOOGLE_CLIENT_SECRET" -ForegroundColor Yellow
Write-Host "`nYou can get these from: https://console.cloud.google.com/" -ForegroundColor Cyan 