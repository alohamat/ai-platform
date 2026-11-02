from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field
import requests
import base64
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Image Generation API")

INVOKE_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"


class ImageRequest(BaseModel):
    prompt: str = Field(..., description="Text prompt for image generation or editing")
    image: str | None = Field(default=None, description="Optional base64 reference image for editing")
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=1024, ge=256, le=2048)
    seed: int | None = Field(default=0, ge=0)
    steps: int = Field(default=4, ge=1, le=50)


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


def _call_nvidia(payload: dict, token: str) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    has_image = bool(payload.get("image"))
    mode = "Image Editing" if has_image else "Image Generation"

    req_payload = {
        "mode": mode,
        "prompt": payload["prompt"],
        "width": payload.get("width", 1024),
        "height": payload.get("height", 1024),
        "seed": payload.get("seed", 0),
        "steps": payload.get("steps", 4),
    }

    if has_image:
        img = payload["image"].strip()
        if not img.startswith("data:"):
            img = f"data:image/png;base64,{img}"
        req_payload["image"] = img

    try:
        response = requests.post(INVOKE_URL, headers=headers, json=req_payload)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        detail = str(e)
        if "response" in locals() and response is not None:
            try:
                err_json = response.json()
                detail = err_json.get("detail") or err_json.get("message") or response.text
            except Exception:
                detail = response.text or str(e)
        raise HTTPException(status_code=500, detail=f"Image operation failed: {detail}")

    body = response.json()

    if "artifacts" not in body or len(body["artifacts"]) == 0:
        raise HTTPException(status_code=500, detail="No image returned by NVIDIA API")

    artifact = body["artifacts"][0]

    if artifact.get("finishReason") == "CONTENT_FILTERED":
        raise HTTPException(status_code=422, detail="Prompt blocked by content filter. Try a different description.")

    if not artifact.get("base64"):
        raise HTTPException(status_code=500, detail="Image generation returned empty result.")

    return artifact


@app.post("/generate", response_model=ImageResponse)
def generate_image(request: ImageRequest, req: Request):
    token = req.headers.get("X-Nvidia-Token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing NVIDIA token")

    artifact = _call_nvidia(request.model_dump(), token)
    return ImageResponse(
        message="Image generated successfully",
        image_base64=artifact["base64"],
        seed=artifact.get("seed", request.seed)
    )


@app.post("/generate/image")
def generate_image_file(request: ImageRequest, req: Request):
    token = req.headers.get("X-Nvidia-Token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing NVIDIA token")

    artifact = _call_nvidia(request.model_dump(), token)
    img_bytes = base64.b64decode(artifact["base64"])
    return Response(content=img_bytes, media_type="image/png")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
