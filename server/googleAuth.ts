import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

const SESSION_SECRET = process.env.SESSION_SECRET || "meta-ads-auditor-secret-key";

export function setupGoogleAuth(app: Express) {
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  }));

  // Passport configuration
  app.use(passport.initialize());
  app.use(passport.session());

  // Only setup Google OAuth if credentials are provided
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (googleClientId && googleClientSecret) {
    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      callbackURL: "/api/auth/google/callback"
    },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists by Google ID
      let user = await storage.getUserByGoogleId(profile.id);
      
      if (!user) {
        // Check if user exists by email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await storage.getUserByEmail(email);
          if (user) {
            // Update existing user with Google ID
            user = await storage.updateUser(user.id, { googleId: profile.id });
          }
        }
        
        // Create new user if doesn't exist
        if (!user && email) {
          user = await storage.createUser({
            email,
            firstName: profile.name?.givenName || null,
            lastName: profile.name?.familyName || null,
            profileImageUrl: profile.photos?.[0]?.value || null,
            googleId: profile.id,
          });
        }
      }

      return done(null, user || false);
    } catch (error) {
      return done(error, false);
    }
  }));

    // Serialize/deserialize user for session
    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await storage.getUser(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });

    // Auth routes
    app.get('/api/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get('/api/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/' }),
      (req, res) => {
        // Successful authentication, redirect to home
        res.redirect('/');
      }
    );
  } else {
    console.log('Google OAuth credentials not found. Google authentication will be disabled.');
  }

  app.get('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
};