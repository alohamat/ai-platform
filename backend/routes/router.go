package routes

import (
	"github.com/gorilla/mux"
	"aiplatform/middlewares"
	"aiplatform/handlers"
)


func NewRouter() *mux.Router {
	r := mux.NewRouter()
	r.Use(middlewares.CorsMiddleware)
	r.HandleFunc("/ping", handlers.PingHandler)
	
	return r
}