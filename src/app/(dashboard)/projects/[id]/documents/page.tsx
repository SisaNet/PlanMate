'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Upload,
  FileText,
  Image,
  File,
  Trash2,
  Download,
  Eye,
  FolderOpen,
} from 'lucide-react'

interface DocumentItem {
  id: string
  project_id: string
  file_name: string
  file_type: string
  file_size: number
  storage_path: string
  category: string
  uploaded_at: string
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const categories = [
  'site_plan',
  'floor_plan',
  'elevation',
  'section',
  'structural',
  'title_deed',
  'zoning_certificate',
  'professional_appointment',
  'engineer_report',
  'energy_compliance',
  'heritage',
  'other',
]

const categoryLabels: Record<string, string> = {
  site_plan: 'Site Plan',
  floor_plan: 'Floor Plan',
  elevation: 'Elevation',
  section: 'Section',
  structural: 'Structural',
  title_deed: 'Title Deed',
  zoning_certificate: 'Zoning Certificate',
  professional_appointment: 'Professional Appointment',
  engineer_report: 'Engineer Report',
  energy_compliance: 'Energy Compliance',
  heritage: 'Heritage',
  other: 'Other',
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type === 'application/pdf') return FileText
  return File
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentsPage() {
  const params = useParams()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('other')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [params.id])

  async function fetchDocuments() {
    const supabase = createClient()
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('project_id', params.id)
      .order('uploaded_at', { ascending: false })

    setDocuments(data || [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not authenticated')
      setUploading(false)
      return
    }

    let uploadCount = 0
    for (const file of Array.from(files)) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: File type not allowed`)
        continue
      }
      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File exceeds 50MB limit`)
        continue
      }
      // Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const storagePath = `${user.id}/${params.id}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file)

      if (uploadError) {
        toast.error(`Failed to upload ${file.name}`)
        continue
      }

      const { error: dbError } = await supabase.from('documents').insert({
        project_id: params.id as string,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        category: selectedCategory,
      })

      if (dbError) {
        toast.error(`Failed to save record for ${file.name}`)
        continue
      }

      uploadCount++
    }

    if (uploadCount > 0) {
      toast.success(`Uploaded ${uploadCount} file${uploadCount > 1 ? 's' : ''}`)
      await fetchDocuments()
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(doc: DocumentItem) {
    if (!confirm(`Delete ${doc.file_name}?`)) return

    const supabase = createClient()
    await supabase.storage.from('documents').remove([doc.storage_path])
    await supabase.from('documents').delete().eq('id', doc.id)

    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    toast.success('Document deleted')
  }

  async function handleDownload(doc: DocumentItem) {
    const supabase = createClient()
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 60)

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/projects/${params.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Upload and manage project files
        </p>
      </div>

      {/* Upload area */}
      <Card className="mb-6 rounded-2xl">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-neutral-500">Category</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-medium transition',
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                    )}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-neutral-300 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50 dark:border-neutral-600 dark:hover:border-blue-600 dark:hover:bg-blue-950/20"
          >
            <Upload className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {uploading ? 'Uploading...' : 'Click to upload or drag files here'}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              PDF, JPEG, PNG, TIFF, DOCX, XLSX &bull; Max 50MB per file
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.docx,.xlsx"
            onChange={handleUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Documents list */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 py-16 dark:border-neutral-700">
          <FolderOpen className="mb-3 h-10 w-10 text-neutral-300" />
          <p className="text-sm text-neutral-400">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const IconComponent = getFileIcon(doc.file_type)
            return (
              <Card key={doc.id} className="rounded-xl">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
                    <IconComponent className="h-5 w-5 text-neutral-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{doc.file_name}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <Badge variant="secondary" className="rounded-full text-[10px]">
                        {categoryLabels[doc.category] || doc.category}
                      </Badge>
                      <span>{new Date(doc.uploaded_at).toLocaleDateString('en-ZA')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc)}
                      className="h-8 w-8 rounded-lg"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc)}
                      className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
