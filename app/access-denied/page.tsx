"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Shield, Mail } from "lucide-react"

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
              <Shield className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
          <CardDescription className="text-center">
            Your email address is not authorized to access this application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-medium mb-1">Authorization Required</p>
                <p>Only authorized personnel can access the Extraction Protocol: Code Black command center.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Need Access?</p>
                <p>If you believe you should have access to this system, please contact your system administrator to request authorization.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full" 
              asChild
            >
              <Link href="/login">
                Try Different Account
              </Link>
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Error Code: UNAUTHORIZED_EMAIL
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 