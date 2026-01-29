import { clerkClient } from '@clerk/clerk-sdk-node';

/**
 * Middleware to verify Clerk JWT tokens
 */
const requireAuth = async (req, res, next) => {
  try {
    // In development mode, allowing requests without auth for testing
    if (process.env.NODE_ENV === 'development' && !req.headers.authorization) {
      req.auth = { userId: 'dev-user' };
      return next();
    }

    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    // Verify the token with Clerk
    const verified = await clerkClient.verifyToken(token);
    
    if (!verified) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authorization token'
      });
    }

    // Attach user info to request
    req.auth = {
      userId: verified.sub
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Optional auth - doesn't fail if no token provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const verified = await clerkClient.verifyToken(token);
      if (verified) {
        req.auth = {
          userId: verified.sub
        };
      }
    }

    next();
  } catch (error) {
    // Continue without auth
    next();
  }
};

export {
  requireAuth,
  optionalAuth
};