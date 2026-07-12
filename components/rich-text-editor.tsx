'use client'

import React, { useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useToast } from '@/components/ui/use-toast'

// Dynamically import react-quill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <div className="h-40 w-full flex items-center justify-center bg-neutral-900 border border-neutral-800 text-neutral-500">Loading editor...</div>
})
import 'react-quill-new/dist/quill.snow.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const { toast } = useToast()
  const quillRef = useRef<any>(null)

  // Custom image handler to upload to our API instead of base64
  const imageHandler = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null
      if (!file) return

      // Show uploading toast
      toast({
        title: 'Uploading Image...',
        description: 'Please wait while the image is uploaded.'
      })

      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', 'article-embed-' + Date.now())

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        const result = await res.json()

        if (res.ok && result.success) {
          const quill = quillRef.current.getEditor()
          const range = quill.getSelection(true)
          quill.insertEmbed(range.index, 'image', result.fileUrl)
          toast({ title: 'Success', description: 'Image inserted.' })
        } else {
          throw new Error(result.error || 'Upload failed')
        }
      } catch (err: any) {
        console.error('Image upload failed', err)
        toast({ title: 'Error', description: err.message || 'Image upload failed', variant: 'destructive' })
      }
    }
  }

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), [])

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet',
    'link', 'image'
  ]

  return (
    <div className="proxima-quill-container">
      <style dangerouslySetInnerHTML={{__html: `
        .proxima-quill-container .ql-toolbar {
          background: #000;
          border-color: #262626 !important;
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
        }
        .proxima-quill-container .ql-container {
          background: #050505;
          border-color: #262626 !important;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          color: #fff;
          font-family: inherit;
          min-height: 400px;
          font-size: 1rem;
        }
        .proxima-quill-container .ql-stroke {
          stroke: #888 !important;
        }
        .proxima-quill-container .ql-fill {
          fill: #888 !important;
        }
        .proxima-quill-container .ql-picker {
          color: #888 !important;
        }
        .proxima-quill-container .ql-editor p {
          color: #d4d4d4;
        }
        .proxima-quill-container .ql-editor h1, 
        .proxima-quill-container .ql-editor h2, 
        .proxima-quill-container .ql-editor h3 {
          color: #fff;
        }
        .proxima-quill-container .ql-editor a {
          color: #3b82f6;
        }
      `}} />
      {/* @ts-expect-error ReactQuill dynamic typing issue */}
      <ReactQuill 
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
      />
    </div>
  )
}
