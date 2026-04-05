package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type User struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email          string             `bson:"email" json:"email"`
	PasswordHash   string             `bson:"password_hash" json:"-"`  // json:"-" will never expose the hash
	NvidiaTokenEnc string             `bson:"nvidia_token_enc,omitempty" json:"-"`
}