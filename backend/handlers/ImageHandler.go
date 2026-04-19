package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"aiplatform/db"
	"aiplatform/middlewares"
	"aiplatform/models"
	"aiplatform/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ImageRequest struct {
	Prompt string `json:"prompt"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
	Steps  int    `json:"steps"`
}

func ImageHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middlewares.UserIDKey).(string)

	col := db.GetCollection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		http.Error(w, "invalid user", http.StatusUnauthorized)
		return
	}

	var user models.User
if err := col.FindOne(ctx, bson.M{"_id": objID}).Decode(&user); err != nil {
    http.Error(w, "user not found", http.StatusUnauthorized)
    return
}

if user.NvidiaTokenEnc == "" {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusPaymentRequired)
    json.NewEncoder(w).Encode(map[string]string{
        "error": "no token configured",
        "hint":  "add your NVIDIA token in settings",
    })
    return
}

nvidiaToken, err := utils.Decrypt(user.NvidiaTokenEnc)
if err != nil {
    http.Error(w, "failed to decrypt token", http.StatusInternalServerError)
    return
}

	// decodes and validates the req body
	var req ImageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if req.Steps == 0 {
		req.Steps = 4
	}
	if req.Width == 0 {
		req.Width = 1024
	}
	if req.Height == 0 {
		req.Height = 1024
	}

	body, _ := json.Marshal(req)

	pythonReq, err := http.NewRequest("POST", os.Getenv("PYTHON_SERVICE_URL")+"/generate", bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "failed to build request", http.StatusInternalServerError)
		return
	}
	pythonReq.Header.Set("Content-Type", "application/json")
	pythonReq.Header.Set("X-Nvidia-Token", nvidiaToken) // pass token to Python via header

	bodyBytes, _ := json.Marshal(req)
	log.Printf("sending to python: %s", string(bodyBytes))

	resp, err := http.DefaultClient.Do(pythonReq)
	if err != nil {
		http.Error(w, "failed to reach AI service", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// only decrement credits if the request was successful and the user had free credits
	if resp.StatusCode == http.StatusOK {
		col.UpdateOne(
			ctx,
			bson.M{"_id": objID},
			bson.M{"$inc": bson.M{"free_credits": -1}},
		)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
