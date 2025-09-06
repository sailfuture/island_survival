"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"

interface CrewRole {
  id: number
  name: string
  description: string
  bonus: string
  bonus_value: number
  penalty: string
  penalty_value: number
  role: string
  tools: string
  image: string
}

export default function CrewRolesPage() {
  const [roles, setRoles] = useState<CrewRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRoles() {
      try {
        const response = await fetch("https://xsc3-mvx7-r86m.n7e.xano.io/api:N0QpoI29/spacepirates_roles")
        const data = await response.json()
        setRoles(data)
      } catch (error) {
        console.error("Failed to fetch roles:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchRoles()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[500px]" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Crew Roles</h1>
          <p className="text-muted-foreground">
            Choose your role aboard the vessel and shape your destiny among the stars.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              <div className="aspect-video relative overflow-hidden">
                <Image
                  src={role.image || "/placeholder.svg?width=400&height=225&query=space+role"}
                  alt={role.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <CardHeader>
                <CardTitle>{role.name}</CardTitle>
                <CardDescription className="text-sm font-mono">{role.role}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <p className="text-sm text-muted-foreground leading-relaxed font-mono">{role.description}</p>

                <div className="space-y-2">
                  <Badge className="font-mono text-xs bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-700 dark:text-green-100 dark:hover:bg-green-600 inline-flex">
                    {role.bonus}: +{role.bonus_value}
                  </Badge>
                  <Badge
                    variant="destructive"
                    className="font-mono text-xs bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-700 dark:text-red-100 dark:hover:bg-red-600 inline-flex"
                  >
                    {role.penalty}: -{role.penalty_value}
                  </Badge>
                </div>

                <div className="pt-2 border-t">
                  <h4 className="text-sm font-medium mb-2 font-mono">Equipment</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 font-mono">
                    {role.tools
                      .split(",")
                      .map((tool) => tool.trim())
                      .filter((tool) => tool)
                      .map((tool, index) => (
                        <li key={index}>{tool}</li>
                      ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
