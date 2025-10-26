const https = require('https');

// Set these as Environment Variables in Vercel:
// GITHUB_TOKEN - Personal access token with repo scope
// GITHUB_REPO - your-username/your-repo-name
// GITHUB_BRANCH - main (or master)

async function githubRequest(method, path, data) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/contents/${path}`,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'Vercel-Serverless',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function readLikes() {
  try {
    const result = await githubRequest('GET', 'likes.json');
    const content = Buffer.from(result.content, 'base64').toString('utf8');
    return { likes: JSON.parse(content), sha: result.sha };
  } catch (e) {
    return { likes: {}, sha: null };
  }
}

async function writeLikes(likes, sha) {
  const content = Buffer.from(JSON.stringify(likes, null, 2)).toString('base64');
  const branch = process.env.GITHUB_BRANCH || 'main';
  
  const data = {
    message: 'Update likes',
    content: content,
    branch: branch
  };
  
  if (sha) data.sha = sha;
  
  await githubRequest('PUT', 'likes.json', data);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { likes } = await readLikes();
    return res.status(200).json(likes);
  }

  if (req.method === 'POST') {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image path required' });
    }

    const { likes, sha } = await readLikes();
    likes[image] = (likes[image] || 0) + 1;
    
    await writeLikes(likes, sha);
    
    return res.status(200).json({ 
      success: true, 
      likes: likes[image] 
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};