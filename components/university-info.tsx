"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { School } from "lucide-react"
import { useEffect, useState } from "react"

export function UniversityInfo() {
  const [userInfo, setUserInfo] = useState({
    university: "北海道大学",
    email: "",
    anonymousName: "",
    year: "",
    department: ""
  })

  useEffect(() => {
    // localStorageからユーザー情報を取得
    const university = localStorage.getItem('university') || "北海道大学"
    const email = localStorage.getItem('user_email') || ""
    const anonymousName = localStorage.getItem('anonymous_name') || ""
    const year = localStorage.getItem('year') || ""
    const department = localStorage.getItem('department') || ""

    setUserInfo({ university, email, anonymousName, year, department })
  }, [])

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <School className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">{userInfo.university}</h2>
            <p className="text-sm text-muted-foreground">
              {userInfo.anonymousName} {userInfo.department && userInfo.year && `(${userInfo.department} ${userInfo.year})`}
            </p>
          </div>
          <div className="ml-auto">
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              ログイン中
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
