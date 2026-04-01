package main

import (
	"log"
	"aiplatform/routes"
	"net/http"
)

func main() {
	r := routes.NewRouter()
	log.Println("backend running")
	log.Fatal(http.ListenAndServe(":8080", r))
}