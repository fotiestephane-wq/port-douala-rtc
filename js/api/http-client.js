class APIError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'APIError';
        this.status = status;
    }
}

class HttpClient {
    constructor(baseURL, jwtToken) {
        this.baseURL = baseURL;
        this.jwtToken = jwtToken;
    }

    async request(url, options = {}) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.jwtToken}`
        };

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const response = await fetch(`${this.baseURL}${url}`, options);
                if (!response.ok) {
                    if (response.status === 401) {
                        // Trigger JWT refresh logic here
                        await this.refreshToken();
                        // Retry the request after refreshing the token
                        continue;
                    }
                    throw new APIError('API Error', response.status);
                }
                return await response.json();
            } catch (error) {
                if (attempt === maxRetries - 1) throw error;
                await this.delay(this.exponentialBackoff(attempt));
                attempt++;
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    exponentialBackoff(attempt) {
        return Math.pow(2, attempt) * 100; // backoff for 100ms, 200ms, 400ms, etc.
    }

    async refreshToken() {
        // Implement token refresh logic here
    }
}

export default HttpClient;
