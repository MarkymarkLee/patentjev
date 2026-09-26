import os

from dotenv import load_dotenv

load_dotenv()

GCP_PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
TYPESAFE_API_KEY = os.environ.get("JEVAPIKEY")
GMI_API_KEY = os.environ.get("GMI_API_KEY")
CORS_ORIGINS = [
	origin.strip()
	for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
	if origin.strip()
]
CORS_ORIGIN_REGEX = os.environ.get("CORS_ORIGIN_REGEX")
