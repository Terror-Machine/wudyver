import jwt from 'jsonwebtoken';

class ConfigManager {
    constructor() {
        this.PASSWORD = process.env.PASSWORD;
        this.MONGODB_URI = process.env.MONGODB_URI;
        this.DOMAIN_URL = process.env.DOMAIN_URL;
        this.EMAIL = process.env.EMAIL;
        this.LIMIT_POINTS = this._parseIntOrDefault(process.env.LIMIT_POINTS);
        this.LIMIT_DURATION = this._parseIntOrDefault(process.env.LIMIT_DURATION);
        this.SONIVA_KEY = process.env.SONIVA_KEY;
        this.JWT_SECRET = this.getJwtSecret(); 
        this._validateEssentialConfig();
    }

    _parseIntOrDefault(value) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
            console.warn(`Warning: Environment variable "${value}" could not be parsed as an integer.`);
            return null;
        }
        return parsed;
    }

    getJwtSecret() {
        if (!this.DOMAIN_URL || !this.PASSWORD) {
            console.error("Configuration Error: Missing DOMAIN_URL or PASSWORD for JWT generation.");
            return null;
        }
        const payload = { domain: this.DOMAIN_URL, iat: Math.floor(Date.now() / 1000) };
        return jwt.sign(payload, this.PASSWORD, { algorithm: 'HS256' });
    }

    _validateEssentialConfig() {
        if (!this.PASSWORD) {
            console.error("FATAL CONFIG ERROR: NEXT_PUBLIC_APP_PASSWORD is not defined.");
        }
        if (!this.MONGODB_URI) {
            console.error("FATAL CONFIG ERROR: NEXT_PUBLIC_MONGODB_URI is not defined.");
        }
        if (!this.DOMAIN_URL) {
            console.error("FATAL CONFIG ERROR: NEXT_PUBLIC_DOMAIN_URL is not defined.");
        }
        if (this.JWT_SECRET === null) {
            console.error("FATAL CONFIG ERROR: Failed to generate a valid JWT secret.");
        }
    }
}

export default new ConfigManager();