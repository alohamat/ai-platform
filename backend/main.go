package main

import (
	"log"
	"net/http"

	"aiplatform/db"
	"aiplatform/routes"
)

func main() {
	db.Connect()

	r := routes.NewRouter()
	log.Println("backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
