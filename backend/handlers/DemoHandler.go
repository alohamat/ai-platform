package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/netip"
	"os"
	"strings"
	"time"

	"aiplatform/db"
	"aiplatform/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const demoLimit = 3

func getIP(r *http.Request) string {
	// respects X-Forwarded-For and X-Real-Ip, but falls back to RemoteAddr. Works behind proxies and load balancers. Also removes the port if present.
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.Split(ip, ",")[0]
	}
	if ip := r.Header.Get("X-Real-Ip"); ip != "" {
		return ip
	}
	addr := r.RemoteAddr
	if parsed, err := netip.ParseAddrPort(addr); err == nil {
		return parsed.Addr().String()
	}
	return addr
}

func DemoCreditsHandler(w http.ResponseWriter, r *http.Request) {
	ip := getIP(r)

	col := db.GetCollection("demo_usage")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var usage models.DemoUsage
	err := col.FindOne(ctx, bson.M{"ip": ip}).Decode(&usage)
	if err == mongo.ErrNoDocuments {
		usage.Count = 0
	} else if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	remaining := demoLimit - usage.Count
	if remaining < 0 {
		remaining = 0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"remaining": remaining})
}

func DemoImageHandler(w http.ResponseWriter, r *http.Request) {
	ip := getIP(r)
	// check if the IP has reached the demo limit
	col := db.GetCollection("demo_usage")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var usage models.DemoUsage
	err := col.FindOne(ctx, bson.M{"ip": ip}).Decode(&usage)

	if err != nil && err != mongo.ErrNoDocuments {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	if usage.Count >= demoLimit {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "demo limit reached",
			"hint":  "create an account to keep generating",
		})
		return
	}

	// decodes body and validates
	var req ImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Steps == 0 { req.Steps = 4 }
	if req.Width == 0  { req.Width = 1024 }
	if req.Height == 0 { req.Height = 1024 }

	// calll python
	body, _ := json.Marshal(req)
	pythonReq, err := http.NewRequest("POST", os.Getenv("PYTHON_SERVICE_URL")+"/generate", bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "failed to build request", http.StatusInternalServerError)
		return
	}
	pythonReq.Header.Set("Content-Type", "application/json")
	pythonReq.Header.Set("X-Nvidia-Token", os.Getenv("NVIDIA_TOKEN"))

	resp, err := http.DefaultClient.Do(pythonReq)
	if err != nil {
		http.Error(w, "failed to reach AI service", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// increment if successful after 200 ok
	if resp.StatusCode == http.StatusOK {
		col.FindOneAndUpdate(
			ctx,
			bson.M{"ip": ip},
			bson.M{
				"$inc": bson.M{"count": 1},
				"$set": bson.M{"updated_at": time.Now()},
				"$setOnInsert": bson.M{"ip": ip},
			},
			options.FindOneAndUpdate().SetUpsert(true),
		)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}