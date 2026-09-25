const GITHUB_API_URL = 'https://api.github.com';
const ISSUE_IMAGES_DIR = '.github/issue-images';
const BASE64_CHUNK_SIZE = 0x8000; // keeps String.fromCharCode under the argument limit

async function fileToBase64(file: File): Promise<string> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
        binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_SIZE));
    }
    return btoa(binary);
}

// GitHub has no API for issue attachments, so the image is committed to the repo
// (default branch, under ISSUE_IMAGES_DIR) and its raw URL is returned for the issue body.
export async function uploadImageToGitHub(params: {
    file: File;
    owner?: string | null;
    repo?: string | null;
    token?: string | null;
}): Promise<string> {
    if (!params.owner || !params.repo) throw new Error('Set the repository owner and name before uploading images');
    if (!params.token) throw new Error('Sign in with GitHub to upload images');

    const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, '-') || 'image';
    // A random prefix keeps parallel uploads of same-named files from colliding (GitHub rejects overwrites without a sha)
    const path = `${ISSUE_IMAGES_DIR}/${crypto.randomUUID()}-${safeName}`;
    const response = await fetch(`${GITHUB_API_URL}/repos/${params.owner}/${params.repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `token ${params.token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: `Upload issue image ${safeName}`,
            content: await fileToBase64(params.file),
        }),
    });
    if (!response.ok) {
        throw new Error(`Image upload failed with status ${response.status}`);
    }
    const result = (await response.json()) as { content: { html_url: string } };
    // ?raw=true serves the image itself and also works in private repos for people with access
    return `${result.content.html_url}?raw=true`;
}
