'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Upload, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ContentUploadZone } from '@/components/content-upload-zone'

export default function ContentPage() {
  const [showUpload, setShowUpload] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Content</h1>
          <p className="text-muted-foreground">Manage your 3D models and projects</p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)} className="gap-2">
          <Plus className="w-4 h-4" />
          Upload Content
        </Button>
      </div>

      {showUpload && <ContentUploadZone onUploadComplete={() => setShowUpload(false)} />}

      {/* Search Bar */}
      <div className="mb-8 flex items-center gap-2">
        <Search className="w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search your content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="flex items-center justify-center p-12 border-2 border-dashed border-border rounded-lg text-center">
          <div>
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium">No content yet</p>
            <p className="text-sm text-muted-foreground mt-1">Upload your first 3D model to get started</p>
          </div>
        </div>
      </div>
    </div>
  )
}
