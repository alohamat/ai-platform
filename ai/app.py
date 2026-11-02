import base64
import os
import tempfile
from io import BytesIO
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from gradio_client import Client, handle_file
from PIL import Image
from pydantic import BaseModel, Field
import requests

load_dotenv()

app = FastAPI(title="AI Image Generation & Editing API")

INVOKE_URL = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"

_hf_client = None


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
    return {"msg": "AI Image API Online"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


def _call_nvidia(payload: dict, token: str) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    req_payload = {
        "prompt": payload["prompt"],
        "width": payload.get("width", 1024),
        "height": payload.get("height", 1024),
        "seed": payload.get("seed", 0),
        "steps": payload.get("steps", 4),
    }

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
        raise HTTPException(status_code=500, detail=f"Image generation failed: {detail}")

    body = response.json()

    if "artifacts" not in body or len(body["artifacts"]) == 0:
        raise HTTPException(status_code=500, detail="No image returned by NVIDIA API")

    artifact = body["artifacts"][0]

    if artifact.get("finishReason") == "CONTENT_FILTERED":
        raise HTTPException(status_code=422, detail="Prompt blocked by content filter. Try a different description.")

    if not artifact.get("base64"):
        raise HTTPException(status_code=500, detail="Image generation returned empty result.")

    return artifact


def _get_instruct_pix2pix_client(token: str | None = None) -> Client:
    global _hf_client
    auth_token = token or os.getenv("HF_TOKEN")
    if _hf_client is None:
        _hf_client = Client("timbrooks/instruct-pix2pix", token=auth_token)
    return _hf_client


def _call_instruct_pix2pix(payload: dict, token: str | None = None) -> dict:
    auth_token = token or os.getenv("HF_TOKEN")
    if not auth_token:
        raise HTTPException(status_code=401, detail="Missing Hugging Face token for image editing")

    img_data = payload.get("image", "").strip()
    if not img_data:
        raise HTTPException(status_code=400, detail="Missing image for image editing")

    if "," in img_data:
        img_data = img_data.split(",", 1)[1]

    try:
        raw_bytes = base64.b64decode(img_data)
        pil_img = Image.open(BytesIO(raw_bytes)).convert("RGB")
        max_dim = 1024
        if max(pil_img.size) > max_dim:
            pil_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")

    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        pil_img.save(tmp, format="PNG")
        tmp_path = tmp.name

    try:
        client = _get_instruct_pix2pix_client(auth_token)
        steps = max(10, min(int(payload.get("steps", 20)), 50))
        seed = int(payload.get("seed", 0) or 0)
        randomize_seed = "Randomize Seed" if seed == 0 else "Fix Seed"

        res = client.predict(
            input_image=handle_file(tmp_path),
            instruction=payload["prompt"],
            steps=steps,
            randomize_seed=randomize_seed,
            seed=seed or 1371,
            randomize_cfg="Fix CFG",
            text_cfg_scale=7.5,
            image_cfg_scale=1.5,
            api_name="/generate",
        )
        out_path = res[3]
        used_seed = res[0]
        with open(out_path, "rb") as out_f:
            out_b64 = base64.b64encode(out_f.read()).decode("utf-8")

        return {
            "base64": out_b64,
            "seed": used_seed,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"InstructPix2Pix editing failed: {e}")
    finally:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


@app.post("/generate", response_model=ImageResponse)
def generate_image(request: ImageRequest, req: Request):
    has_image = bool(request.image and request.image.strip())

    if has_image:
        hf_token = req.headers.get("X-Hf-Token") or os.getenv("HF_TOKEN")
        artifact = _call_instruct_pix2pix(request.model_dump(), hf_token)
        return ImageResponse(
            message="Image edited successfully",
            image_base64=artifact["base64"],
            seed=artifact.get("seed", request.seed or 0),
        )

    nvidia_token = req.headers.get("X-Nvidia-Token") or os.getenv("IMAGE_API")
    if not nvidia_token:
        raise HTTPException(status_code=401, detail="Missing NVIDIA token")

    artifact = _call_nvidia(request.model_dump(), nvidia_token)
    return ImageResponse(
        message="Image generated successfully",
        image_base64=artifact["base64"],
        seed=artifact.get("seed", request.seed or 0),
    )


@app.post("/generate/image")
def generate_image_file(request: ImageRequest, req: Request):
    has_image = bool(request.image and request.image.strip())

    if has_image:
        hf_token = req.headers.get("X-Hf-Token") or os.getenv("HF_TOKEN")
        artifact = _call_instruct_pix2pix(request.model_dump(), hf_token)
    else:
        nvidia_token = req.headers.get("X-Nvidia-Token") or os.getenv("IMAGE_API")
        if not nvidia_token:
            raise HTTPException(status_code=401, detail="Missing NVIDIA token")
        artifact = _call_nvidia(request.model_dump(), nvidia_token)

    img_bytes = base64.b64decode(artifact["base64"])
    return Response(content=img_bytes, media_type="image/png")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
