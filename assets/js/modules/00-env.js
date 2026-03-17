// No início do arquivo, adicione esta função
const getEnv = (key, defaultValue) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key] || defaultValue;
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key] || defaultValue;
    }
    return defaultValue;
};

// Depois, na função getConfigSummary:
export const getConfigSummary = () => {
    const firebaseApiKey = get('FIREBASE_API_KEY') || getEnv('VITE_FIREBASE_API_KEY');
    
    return {
        environment: getEnv('VITE_APP_ENVIRONMENT', 'development'),
        firebaseConfigured: !!firebaseApiKey && firebaseApiKey !== 'AIzaSyDemoKeyForDevelopmentOnly',
        analyticsEnabled: get('FIREBASE_ANALYTICS_ENABLED') || getEnv('VITE_FIREBASE_ANALYTICS_ENABLED') === 'true',
        loggingEnabled: get('ENABLE_LOGGING') || true,
        performanceMonitoring: get('FIREBASE_PERFORMANCE_ENABLED') || true,
        appVersion: getEnv('VITE_APP_VERSION', '1.0.0'),
        debugMode: getEnv('VITE_APP_DEBUG', 'true') === 'true'
    };
};