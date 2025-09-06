import { NextResponse } from "next/server"

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 })
    }

    // Create FormData for Xano upload
    const xanoFormData = new FormData()
    xanoFormData.append('file', file)

    // Upload to Xano
    const xanoResponse = await fetch('https://xsc3-mvx7-r86m.n7e.xano.io/api:N0QpoI29/upload/attachment', {
      method: 'POST',
      body: xanoFormData,
    })

    if (!xanoResponse.ok) {
      const errorText = await xanoResponse.text()
      console.error('Xano upload failed:', errorText)
      return NextResponse.json({ error: "Failed to upload to Xano." }, { status: 500 })
    }

    const xanoResult = await xanoResponse.json()
    
    // Return the uploaded file URL
    return NextResponse.json({ 
      url: xanoResult.url || xanoResult.path,
      id: xanoResult.id 
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred."
    console.error("Error uploading file:", message)
    return NextResponse.json({ error: `Failed to upload file: ${message}` }, { status: 500 })
  }
}
