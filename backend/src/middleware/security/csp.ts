/**
 * Configuration CSP (Content Security Policy) pour LogOn
 * Sécurisation des headers HTTP pour le développement et la production
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Configuration CSP par environnement
 */
const cspConfigs = {
  development: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https:"],
    scriptSrc: ["'self'", "'unsafe-eval'", "https:"], // unsafe-eval pour le dev
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "ws:", "wss:", "https:", "http:"], // WebSocket pour HMR
    fontSrc: ["'self'", "https:", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    childSrc: ["'none'"],
    workerSrc: ["'self'", "blob:"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"]
  },
  
  production: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    childSrc: ["'none'"],
    workerSrc: ["'self'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    manifestSrc: ["'self'"],
    upgradeInsecureRequests: true
  }
};

/**
 * Headers de sécurité additionnels
 */
const securityHeaders = {
  // Empêche le navigateur de deviner le type MIME
  'X-Content-Type-Options': 'nosniff',
  
  // Protection XSS intégrée du navigateur
  'X-XSS-Protection': '1; mode=block',
  
  // Empêche l'affichage dans une iframe (protection clickjacking)
  'X-Frame-Options': 'DENY',
  
  // Contrôle les informations de référent
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Force HTTPS en production
  'Strict-Transport-Security': process.env.NODE_ENV === 'production' 
    ? 'max-age=31536000; includeSubDomains; preload' 
    : undefined,
  
  // Permissions Policy (anciennement Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()'
  ].join(', ')
};

/**
 * Génère la directive CSP sous forme de string
 */
const generateCSPDirective = (config: any): string => {
  const directives: string[] = [];
  
  Object.entries(config).forEach(([directive, values]) => {
    if (directive === 'upgradeInsecureRequests' && values) {
      directives.push('upgrade-insecure-requests');
    } else if (Array.isArray(values)) {
      const kebabDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
      directives.push(`${kebabDirective} ${values.join(' ')}`);
    }
  });
  
  return directives.join('; ');
};

/**
 * Middleware CSP personnalisé
 */
export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  const config = cspConfigs[environment];
  
  // Appliquer CSP
  const cspDirective = generateCSPDirective(config);
  res.setHeader('Content-Security-Policy', cspDirective);
  
  // Appliquer les autres headers de sécurité
  Object.entries(securityHeaders).forEach(([header, value]) => {
    if (value !== undefined) {
      res.setHeader(header, value);
    }
  });
  
  next();
};

/**
 * Configuration CSP spécifique pour les API JSON
 */
export const apiCSPMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // CSP allégée pour les endpoints API
  const apiCSP = "default-src 'none'; frame-ancestors 'none';";
  res.setHeader('Content-Security-Policy', apiCSP);
  
  // Headers de sécurité pour API
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  next();
};

/**
 * Middleware pour définir le Content-Type sécurisé
 */
export const secureContentType = (req: Request, res: Response, next: NextFunction) => {
  // Force application/json pour les APIs
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  
  next();
};

/**
 * Configuration avancée pour les WebSockets (développement)
 */
export const wsSecurityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block'
};

/**
 * Utilitaire pour vérifier si une requête respecte CSP
 */
export const validateCSPCompliance = (req: Request): boolean => {
  // Vérifications basiques de conformité CSP
  const userAgent = req.get('User-Agent') || '';
  const origin = req.get('Origin');
  const referer = req.get('Referer');
  
  // Logs de sécurité pour analyse
  if (process.env.NODE_ENV === 'development') {
    console.log('🔒 CSP Validation:', { userAgent, origin, referer });
  }
  
  return true; // Placeholder - implémenter la logique de validation
};

/**
 * Rapport CSP pour les violations
 */
export const cspReportHandler = (req: Request, res: Response) => {
  if (req.body && req.body['csp-report']) {
    const report = req.body['csp-report'];
    
    // Logger les violations CSP
    console.warn('🚨 Violation CSP détectée:', {
      documentUri: report['document-uri'],
      violatedDirective: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      columnNumber: report['column-number']
    });
  }
  
  res.status(204).end();
};
