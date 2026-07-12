'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function AdminContentPage() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Content Moderation</h1>
        <p className="text-muted-foreground">Review and manage uploaded 3D content</p>
      </div>

      {/* Search */}
      <div className="mb-8 flex items-center gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 max-w-md"
        />
      </div>

      {/* Content Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">File Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Owner</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Uploaded</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Size</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                No content uploaded yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
