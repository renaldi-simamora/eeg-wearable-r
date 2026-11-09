package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// ParseAllowedOrigins parses a comma-separated or space-separated list of origins.
// In development mode, localhost:3000 and 127.0.0.1:3000 are automatically included.
// In production mode, only explicit origins from allowedOriginsConfig are permitted.
func ParseAllowedOrigins(allowedOriginsConfig string, isProduction bool) map[string]bool {
	origins := make(map[string]bool)

	if !isProduction {
		origins["http://localhost:3000"] = true
		origins["http://127.0.0.1:3000"] = true
	}

	if allowedOriginsConfig != "" {
		parts := strings.Split(allowedOriginsConfig, ",")
		for _, p := range parts {
			trimmed := strings.TrimSpace(p)
			// Also support space separation if comma is not used
			for _, sub := range strings.Fields(trimmed) {
				clean := strings.TrimRight(strings.TrimSpace(sub), "/")
				if clean != "" {
					origins[clean] = true
				}
			}
		}
	}

	return origins
}

// IsOriginAllowed checks whether a given origin is present in the whitelist.
func IsOriginAllowed(origin string, allowedOriginsConfig string, isProduction bool) bool {
	if origin == "" {
		return false
	}
	clean := strings.TrimRight(strings.TrimSpace(origin), "/")
	whitelist := ParseAllowedOrigins(allowedOriginsConfig, isProduction)
	return whitelist[clean]
}

// GetWebSocketCheckOrigin returns an http.Request CheckOrigin function for gorilla/websocket.
func GetWebSocketCheckOrigin(allowedOriginsConfig string, isProduction bool) func(r *http.Request) bool {
	return func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		// If origin header is not provided (e.g., standard client or same-origin), allow
		if origin == "" {
			return true
		}
		return IsOriginAllowed(origin, allowedOriginsConfig, isProduction)
	}
}

// CORSMiddleware enforces strict origin whitelisting, prevents wildcards with credentials,
// and rejects unauthorized preflight OPTIONS requests.
func CORSMiddleware(allowedOriginConfig string, isProduction bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// If no Origin header (same-origin, server-to-server, or CLI), proceed
		if origin == "" {
			c.Next()
			return
		}

		if IsOriginAllowed(origin, allowedOriginConfig, isProduction) {
			// Origin is strictly authorized
			cleanOrigin := strings.TrimRight(strings.TrimSpace(origin), "/")
			c.Writer.Header().Set("Access-Control-Allow-Origin", cleanOrigin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, Accept, Origin, Cache-Control, X-Requested-With, X-Device-API-Key, X-Device-ID")
			c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

			if c.Request.Method == http.MethodOptions {
				c.AbortWithStatus(http.StatusNoContent)
				return
			}
		} else {
			// Origin is NOT recognized in whitelist: do NOT set Access-Control-Allow-Origin
			if c.Request.Method == http.MethodOptions {
				// Reject unauthorized preflight explicitly
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
		}

		c.Next()
	}
}
