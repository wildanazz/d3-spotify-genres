// Environment configuration for Spotify API
export const config = {
    spotify: {
        clientId: '', // ADD HERE YOUR CLIENT ID
        redirectUri: window.location.origin + window.location.pathname,
        scope: 'user-read-private user-read-email user-top-read'
    }
};