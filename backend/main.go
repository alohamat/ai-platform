package main

import (
	"log"
	"aiplatform/routes"
	"aiplatform/db"
	"net/http"
)

func main() {
	db.Connect()
	
	r := routes.NewRouter()
	log.Println("backend running")
	log.Fatal(http.ListenAndServe(":8080", r))
}