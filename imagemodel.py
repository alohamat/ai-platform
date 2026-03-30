import requests
import base64
import os
from dotenv import load_dotenv
load_dotenv()

TOKEN = os.getenv("IMAGE_API")
if not TOKEN:
    raise ValueError("Please set the IMAGE_API environment variable with your API token.")

invoke_url = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json",
}

payload = {
    "prompt": "A group of 3 people taking a selfie, some partially occluded, different facial expressions, natural imperfections, motion blur, low light",
    "width": 1024,
    "height": 1024,
    "seed": 0,
    "steps": 4
}

response = requests.post(invoke_url, headers=headers, json=payload)
response.raise_for_status()

response_body = response.json()

image64 = response_body["artifacts"][0]["base64"]

img_bytes = base64.b64decode(image64)

with open("generated_image.png", "wb") as f:
    f.write(img_bytes)
print("saved as generated_image.png")
