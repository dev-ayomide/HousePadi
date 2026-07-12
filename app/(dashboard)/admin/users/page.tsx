'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download } from 'lucide-react'
import { useState } from 'react'

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Users</h1>
          <p className="text-muted-foreground">Manage platform users and permissions</p>
        </div>
        <Button className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Search */}
      <div className="mb-8 flex items-center gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 max-w-md"
        />
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Plan</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Projects</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                No users yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
