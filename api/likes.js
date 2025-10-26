const https = require('https');

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
          reject(new Error(`GitHub API error: ${res.statusCode} - ${body}`));
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

async function writeLikes(likes, sha, retries = 3) {
  const content = Buffer.from(JSON.stringify(likes, null, 2)).toString('base64');
  const branch = process.env.GITHUB_BRANCH || 'main';
  
  for (let i = 0; i < retries; i++) {
    try {
      // Re-fetch latest SHA before writing
      const { sha: latestSha } = await readLikes();
      
      const data = {
        message: 'Update likes',
        content: content,
        branch: branch
      };
      
      if (latestSha) data.sha = latestSha;
      
      await githubRequest('PUT', 'likes.json', data);
      return true;
    } catch (e) {
      if (i === retries - 1) throw e;
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  return false;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { likes } = await readLikes();
      return res.status(200).json(likes);
    } catch (e) {
      console.error('GET error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: 'Image path required' });
      }

      const { likes } = await readLikes();
      likes[image] = (likes[image] || 0) + 1;
      
      await writeLikes(likes);
      
      return res.status(200).json({ 
        success: true, 
        likes: likes[image] 
      });
    } catch (e) {
      console.error('POST error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};