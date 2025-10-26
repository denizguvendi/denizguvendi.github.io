const https = require('https');

// Get from Environment Variables in Vercel:
// JSONBIN_BIN_ID - your bin ID from jsonbin.io
// JSONBIN_API_KEY - your API key from jsonbin.io

function jsonbinRequest(method, data) {
  const binId = process.env.JSONBIN_BIN_ID;
  const apiKey = process.env.JSONBIN_API_KEY;
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${binId}`,
      method: method,
      headers: {
        'X-Master-Key': apiKey,
        'Content-Type': 'application/json'
      }
    };

    if (method === 'PUT') {
      options.headers['X-Bin-Versioning'] = 'false';
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`JSONBin error: ${res.statusCode} - ${body}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${body}`));
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
    const result = await jsonbinRequest('GET');
    return result.record || {};
  } catch (e) {
    console.error('Read error:', e);
    return {};
  }
}

async function writeLikes(likes) {
  try {
    await jsonbinRequest('PUT', likes);
    return true;
  } catch (e) {
    console.error('Write error:', e);
    return false;
  }
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
      const likes = await readLikes();
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

      const likes = await readLikes();
      likes[image] = (likes[image] || 0) + 1;
      
      const success = await writeLikes(likes);
      
      if (success) {
        return res.status(200).json({ 
          success: true, 
          likes: likes[image] 
        });
      } else {
        return res.status(500).json({ error: 'Failed to save' });
      }
    } catch (e) {
      console.error('POST error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};