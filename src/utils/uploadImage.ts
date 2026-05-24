export async function uploadImageToWebhook(file: File, owner?: string | null, repo?: string | null) {
    // Replace this with your actual upload webhook if different
    const webhookUrl = import.meta.env.VITE_GITHUB_UPLOAD_IMAGE
    const fd = new FormData()
    fd.append('image', file)
    if (owner) fd.append('owner', owner)
    if (repo) fd.append('repo', repo)

    const resp = await fetch(webhookUrl, { method: 'POST', body: fd })
    console.log('Upload response status:', resp.status, resp.statusText)
    if (!resp.ok) {
        throw new Error(`Upload failed with status ${resp.status}`)
    }

    // Read as text first to avoid "bodyUsed" issues in devtools, then parse
    const text = await resp.text()
    let json: any = null
    try {
        json = JSON.parse(text)
    } catch (e) {
        console.warn('Upload webhook returned non-JSON response:', text)
        return null
    }

    // Log full response JSON for debugging (can be removed later)
    console.log('Upload webhook JSON response:', json)

    // Try many common shapes for returned URL
    const url = json.url
        || (json.data && json.data.url)
        || json.fileUrl
        || json.file_url
        || json.location
        || json.link
        || json.path
        || (json.file && (json.file.url || json.filePath || json.file.path))
        || (json.result && json.result.url)
        || null

    return url
}
