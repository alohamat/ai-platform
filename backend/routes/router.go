package routes

import (
	"github.com/gorilla/mux"
	"aiplatform/middlewares"
	"aiplatform/handlers"

	"net/http"
)


func NewRouter() *mux.Router {
	r := mux.NewRouter()
	r.Use(middlewares.CorsMiddleware)
	r.Methods("OPTIONS").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.HandleFunc("/ping", handlers.PingHandler)
	r.HandleFunc("/auth/register", handlers.Register).Methods("POST")
	r.HandleFunc("/auth/login", handlers.Login).Methods("POST")
	r.HandleFunc("/ai/image/demo", handlers.DemoImageHandler).Methods("POST")
	r.HandleFunc("/ai/demo/credits", handlers.DemoCreditsHandler).Methods("GET")
	
	protected := r.PathPrefix("/auth").Subrouter()
	protected.Use(middlewares.AuthMiddleware)
	protected.HandleFunc("/me", handlers.Me).Methods("GET")
	protected.HandleFunc("/token", handlers.SaveNvidiaToken).Methods("POST")

	ai := r.PathPrefix("/ai").Subrouter()
	ai.Use(middlewares.AuthMiddleware)
	ai.HandleFunc("/image", handlers.ImageHandler).Methods("POST")

	return r
}