import { VercelRequest, VercelResponse } from '@vercel/node';
import { KITE_CONFIG } from '../server/config';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { action } = req.query;

    if (action === 'login') {
      // Generate Kite Connect login URL
      const loginUrl = `${KITE_CONFIG.LOGIN_URL}?api_key=${KITE_CONFIG.API_KEY}&v=3`;
      
      res.status(200).json({
        status: 'success',
        loginUrl,
        message: 'Please visit this URL to authenticate with Kite Connect'
      });
    } else if (action === 'callback') {
      // Handle the callback from Kite Connect
      const { request_token } = req.query;
      
      if (!request_token) {
        res.status(400).json({
          status: 'error',
          message: 'Request token is required'
        });
        return;
      }

      // In a real implementation, you would:
      // 1. Generate session token using request_token
      // 2. Store the access_token securely
      // 3. Return success response
      
      res.status(200).json({
        status: 'success',
        message: 'Authentication successful',
        request_token
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Invalid action. Use ?action=login or ?action=callback'
      });
    }
  } else {
    res.status(405).json({ 
      status: 'error',
      message: 'Method not allowed' 
    });
  }
}
