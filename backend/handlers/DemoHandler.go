package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
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

const (
	demoGenLimit  = 3
	demoEditLimit = 1
)

func getIP(r *http.Request) string {
	if ip := r.Header.Get("X-Forwarded-For"); ip != "" {
		return strings.TrimSpace(strings.Split(ip, ",")[0])
	}
	if ip := r.Header.Get("X-Real-Ip"); ip != "" {
		return strings.TrimSpace(ip)
	}
	if parsed, err := netip.ParseAddrPort(r.RemoteAddr); err == nil {
		return parsed.Addr().String()
	}
	return r.RemoteAddr
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
		usage.EditCount = 0
	} else if err != nil {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	remaining := demoGenLimit - usage.Count
	if remaining < 0 {
		remaining = 0
	}

	editRemaining := demoEditLimit - usage.EditCount
	if editRemaining < 0 {
		editRemaining = 0
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{
		"remaining":     remaining,
		"editRemaining": editRemaining,
	})
}

func DemoImageHandler(w http.ResponseWriter, r *http.Request) {
	ip := getIP(r)

	col := db.GetCollection("demo_usage")
	findCtx, findCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer findCancel()

	var usage models.DemoUsage
	err := col.FindOne(findCtx, bson.M{"ip": ip}).Decode(&usage)
	if err != nil && err != mongo.ErrNoDocuments {
		http.Error(w, "internal error", http.StatusInternalServerError)
		return
	}

	var req ImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	NormalizeImageRequest(&req)

	isEdit := req.Image != ""

	if isEdit {
		if usage.EditCount >= demoEditLimit {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "demo edit limit reached",
				"hint":  "create an account to keep editing images",
			})
			return
		}
	} else {
		if usage.Count >= demoGenLimit {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "demo limit reached",
				"hint":  "create an account to keep generating",
			})
			return
		}
	}

	body, err := json.Marshal(req)
	if err != nil {
		http.Error(w, "failed to encode request", http.StatusInternalServerError)
		return
	}

	pythonReq, err := http.NewRequest("POST", os.Getenv("PYTHON_SERVICE_URL")+"/generate", bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "failed to build request", http.StatusInternalServerError)
		return
	}
	pythonReq.Header.Set("Content-Type", "application/json")

	nvidiaToken := os.Getenv("IMAGE_API")
	if nvidiaToken == "" {
		nvidiaToken = os.Getenv("NVIDIA_TOKEN")
	}
	pythonReq.Header.Set("X-Nvidia-Token", nvidiaToken)
	pythonReq.Header.Set("X-Hf-Token", os.Getenv("HF_TOKEN"))

	client := &http.Client{Timeout: 90 * time.Second}
	resp, err := client.Do(pythonReq)
	if err != nil {
		http.Error(w, "failed to reach AI service", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		updateCtx, updateCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer updateCancel()

		incField := "count"
		if isEdit {
			incField = "edit_count"
		}
		res := col.FindOneAndUpdate(
			updateCtx,
			bson.M{"ip": ip},
			bson.M{
				"$inc":         bson.M{incField: 1},
				"$set":         bson.M{"updated_at": time.Now()},
				"$setOnInsert": bson.M{"ip": ip},
			},
			options.FindOneAndUpdate().SetUpsert(true),
		)
		if res.Err() != nil {
			log.Println("Failed to update demo usage:", res.Err())
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
