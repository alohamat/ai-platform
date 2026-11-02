package routes

import (
	"net/http"

	"aiplatform/handlers"
	"aiplatform/middlewares"

	"github.com/gorilla/mux"
)

func NewRouter() *mux.Router {
	r := mux.NewRouter()
	r.Use(middlewares.CorsMiddleware)
	r.Methods(http.MethodOptions).HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.HandleFunc("/ping", handlers.PingHandler).Methods(http.MethodGet)
	r.HandleFunc("/auth/register", handlers.Register).Methods(http.MethodPost)
	r.HandleFunc("/auth/login", handlers.Login).Methods(http.MethodPost)
	r.HandleFunc("/ai/image/demo", handlers.DemoImageHandler).Methods(http.MethodPost)
	r.HandleFunc("/ai/demo/credits", handlers.DemoCreditsHandler).Methods(http.MethodGet)

	protected := r.PathPrefix("/auth").Subrouter()
	protected.Use(middlewares.AuthMiddleware)
	protected.HandleFunc("/me", handlers.Me).Methods(http.MethodGet)
	protected.HandleFunc("/token", handlers.SaveNvidiaToken).Methods(http.MethodPost)
	protected.HandleFunc("/hf-token", handlers.SaveHfToken).Methods(http.MethodPost)

	ai := r.PathPrefix("/ai").Subrouter()
	ai.Use(middlewares.AuthMiddleware)
	ai.HandleFunc("/image", handlers.ImageHandler).Methods(http.MethodPost)

	return r
}
