from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
import requests
import base64
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Image Generation API")

TOKEN = os.getenv("IMAGE_API")
if not TOKEN:
    raise ValueError("Please set the IMAGE_API environment variable with your API token.")

INVOKE_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
}


class ImageRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation")
    width: int = Field(default=1024, ge=256, le=2048, description="Image width")
    height: int = Field(default=1024, ge=256, le=2048, description="Image height")
    seed: int | None= Field(default=0, ge=0, description="Random seed for reproducibility")
    steps: int = Field(default=4, ge=1, le=50, description="Number of diffusion steps")


class ImageResponse(BaseModel):
    message: str
    image_base64: str
    seed: int


@app.get("/")
def root():
    return {"msg": "AI Image Generation API Online"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}

def _call_nvidia(payload: dict) -> dict:
    try:
        response = requests.post(INVOKE_URL, headers=headers, json=payload)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {str(e)}")
    
    body = response.json()
    if "artifacts" not in body or len(body["artifacts"]) == 0:
        raise HTTPException(status_code=500, detail="No image generated")
    
    return body["artifacts"][0]

@app.post("/generate", response_model=ImageResponse)
def generate_image(request: ImageRequest):
    artifact = _call_nvidia(request.model_dump())
    return ImageResponse(
        message="Image generated successfully",
        image_base64=artifact["base64"],
        seed=artifact.get("seed", request.seed)
    )

@app.post("/generate/image")
def generate_image_file(request: ImageRequest):
    artifact = _call_nvidia(request.model_dump())
    img_bytes = base64.b64decode(artifact["base64"])
    return Response(content=img_bytes, media_type="image/png")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
