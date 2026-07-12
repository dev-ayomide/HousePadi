'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ContentUploadZoneProps {
  onUploadComplete?: () => void
}

export function ContentUploadZone({ onUploadComplete }: ContentUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files).filter(file =>
        file.name.match(/\.(glb|gltf|fbx|obj|usdz)$/i)
      )
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = Array.from(e.target.files)
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    setUploading(true)
    try {
      const { convertModelToGLB } = await import('@/lib/model-converter')
      const optimizedFiles = []

      for (const file of files) {
        const isGLB = file.name.match(/\.(glb|gltf)$/i)
        if (!isGLB) setOptimizing(true)
        
        const glbFile = await convertModelToGLB(file)
        optimizedFiles.push(glbFile)
      }
      setOptimizing(false)

      // TODO: Implement actual Cloudflare R2 upload logic using optimizedFiles
      console.log('[v0] Uploading optimized files:', optimizedFiles)
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setFiles([])
      onUploadComplete?.()
    } catch (error) {
      console.error('Optimization/Upload failed:', error)
      alert('Failed to optimize and upload models.')
      setOptimizing(false)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mb-8 p-6 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50 dark:bg-purple-900/20">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className="cursor-pointer"
      >
        <label htmlFor="file-input" className="flex flex-col items-center justify-center py-8 cursor-pointer">
          <Upload className="w-12 h-12 text-purple-500 mb-2" />
          <p className="font-medium text-center">
            {dragActive ? 'Drop files here' : 'Drag & drop your files or click to browse'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Supported formats: .glb, .fbx, .obj, .usdz
          </p>
          <Input
            ref={inputRef}
            id="file-input"
            type="file"
            multiple
            onChange={handleChange}
            className="hidden"
            accept=".glb,.gltf,.fbx,.obj,.usdz"
          />
        </label>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="font-medium">Selected Files ({files.length})</p>
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-card rounded-lg border border-border">
              <span className="text-sm">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="flex-1"
            >
              {uploading ? (optimizing ? 'Optimizing Models...' : 'Uploading...') : 'Upload Files'}
            </Button>
            <Button
              onClick={() => setFiles([])}
              variant="outline"
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
