package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DemoUsage struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	IP        string             `bson:"ip"`
	Count     int                `bson:"count"`
	UpdatedAt time.Time          `bson:"updated_at"`
}