class HTTPClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.token = null; // To store the token
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // Initial delay of 1 second
    }

    async setToken(token) {
        this.token = token;
    }

    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = this._createHeaders();

        try {
            const response = await this._fetch(url, method, headers, data);
            return response;
        } catch (error) {
            if (error.status === 401) {
                await this._handleTokenRefresh();
                // Retry once after refreshing token
                headers.Authorization = `Bearer ${this.token}`;
                const response = await this._fetch(url, method, headers, data);
                return response;
            }
            throw error;
        }
    }

    async _fetch(url, method, headers, data) {
        const options = {
            method,
            headers,
            body: JSON.stringify(data),
            timeout: 5000 // 5 seconds timeout
        };

        // Handle retries with exponential backoff
        return this._retry(async () => {
            const response = await fetch(url, options);
            if (!response.ok) {
                const error = new Error('HTTP error');
                error.status = response.status;
                throw error;
            }
            return response.json();
        });
    }

    async _retry(fn) {
        for (let i = 0; i < this.maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                this.retryCount += 1;
                if (this.retryCount > this.maxRetries) {
                    throw error;
                }
                await this._wait(this.retryDelay);
                this.retryDelay *= 2; // Exponential backoff
            }
        }
    }

    _wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _createHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers.Authorization = `Bearer ${this.token}`;
        }
        return headers;
    }

    async _handleTokenRefresh() {
        // Implement the token refresh logic here
        // This could be an API call that retrieves a new token
        const newTokenResponse = await fetch(`${this.baseURL}/refresh-token`, { method: 'POST' });
        const newTokenData = await newTokenResponse.json();
        this.token = newTokenData.token;
    }
}

export default HTTPClient;